import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { toast } from 'sonner';
import { useAuth } from './AuthContext';
import { getToken } from '../utils/tokenStore';
import api from '../api/axios';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount]     = useState(0);
  const socketRef = useRef(null);

  // ── Fetch persisted notifications from MongoDB on login ──────────────────
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    api.get('/api/notifications')
      .then(({ data }) => {
        setNotifications(data);
        setUnreadCount(data.filter((n) => !n.read).length);
      })
      .catch(console.error);
  }, [user]);

  // ── Socket connection — reconnect whenever user changes ──────────────────
  useEffect(() => {
    if (!user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
      auth: { token: getToken() },
      reconnectionAttempts: 5,
    });

    socket.on('notification', (notif) => {
      setNotifications((prev) => [notif, ...prev]);
      setUnreadCount((c) => c + 1);
      // Surface as a toast so it doesn't sit invisible in the bell menu.
      toast(notif.message);
    });

    socket.on('connect_error', (err) => {
      console.warn('Socket connection error:', err.message);
    });

    socketRef.current = socket;
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user]);

  // ── Helpers exposed to consumers ──────────────────────────────────────────
  const markAsRead = async (id) => {
    try {
      await api.patch(`/api/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const markAllRead = async () => {
    try {
      await api.patch('/api/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  return (
    <SocketContext.Provider
      value={{ notifications, unreadCount, markAsRead, markAllRead }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
