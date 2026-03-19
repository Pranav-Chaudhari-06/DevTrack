import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import api from '../api/axios';
import Sidebar from '../components/Sidebar';

// ── Colour palette ──────────────────────────────────────────────────────────
const C = {
  indigo:  '#6366f1',
  violet:  '#8b5cf6',
  emerald: '#10b981',
  amber:   '#f59e0b',
  blue:    '#3b82f6',
  red:     '#ef4444',
  cyan:    '#06b6d4',
  pink:    '#ec4899',
};

const STATUS_COLORS  = [C.indigo, C.amber, C.emerald];
const TYPE_COLORS    = [C.blue, C.red];
const ASSIGNEE_COLORS = [C.indigo, C.violet, C.cyan, C.emerald, C.amber, C.blue, C.pink, C.red];

// ── Shared dark tooltip ──────────────────────────────────────────────────────
const DarkTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#0a0f1e',
      border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: '10px',
      padding: '10px 14px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    }}>
      {label && <p style={{ color: '#94a3b8', fontSize: '11px', marginBottom: '6px', fontWeight: 600 }}>{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || p.fill, fontSize: '13px', fontWeight: 600, margin: '2px 0' }}>
          {p.name}: <span style={{ color: '#e2e8f0' }}>{p.value}</span>
        </p>
      ))}
    </div>
  );
};

// ── Pie chart custom label ───────────────────────────────────────────────────
const PieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, name, value, percent }) => {
  if (percent < 0.05) return null; // skip tiny slices
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central"
      fontSize={11} fontWeight={700}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

// ── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, accent }) {
  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-1 animate-fade-in-up"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: `1px solid ${accent}30`,
        boxShadow: `0 0 24px ${accent}15`,
      }}
    >
      <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: accent }}>{label}</p>
      <p className="text-3xl font-bold text-slate-100">{value}</p>
      {sub && <p className="text-xs text-slate-600">{sub}</p>}
    </div>
  );
}

// ── Chart card wrapper ───────────────────────────────────────────────────────
function ChartCard({ title, children, className = '' }) {
  return (
    <div
      className={`rounded-2xl p-5 ${className}`}
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      <p className="text-sm font-semibold text-slate-300 mb-4">{title}</p>
      {children}
    </div>
  );
}

// ── Empty chart placeholder ──────────────────────────────────────────────────
function EmptyChart({ message = 'No data yet' }) {
  return (
    <div className="flex items-center justify-center h-40 text-slate-700 text-sm italic">
      {message}
    </div>
  );
}

// ── Shared axis / grid props ─────────────────────────────────────────────────
const axisStyle  = { fill: '#475569', fontSize: 11 };
const gridStyle  = { stroke: 'rgba(255,255,255,0.06)' };

export default function Analytics() {
  const [projects,    setProjects]    = useState([]);
  const [selectedId,  setSelectedId]  = useState('');
  const [data,        setData]        = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [projLoading, setProjLoading] = useState(true);

  // Fetch projects for the selector
  useEffect(() => {
    api.get('/api/projects')
      .then(({ data }) => {
        setProjects(data);
        if (data.length > 0) setSelectedId(data[0]._id);
      })
      .catch(console.error)
      .finally(() => setProjLoading(false));
  }, []);

  // Fetch analytics whenever selected project changes
  useEffect(() => {
    if (!selectedId) return;
    setLoading(true);
    setData(null);
    api.get(`/api/analytics/${selectedId}`)
      .then(({ data }) => setData(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedId]);

  const selectedProject = projects.find((p) => p._id === selectedId);

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#07091a' }}>
      <Sidebar />

      <div className="flex-1 overflow-y-auto px-8 py-8">

        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-8 animate-fade-in">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Insights</p>
            <h1 className="text-2xl font-bold text-slate-100">Analytics</h1>
          </div>

          {/* Project selector */}
          {!projLoading && (
            <div className="flex items-center gap-3">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Project</label>
              {projects.length === 0 ? (
                <span className="text-sm text-slate-600">No projects yet</span>
              ) : (
                <select
                  value={selectedId}
                  onChange={(e) => setSelectedId(e.target.value)}
                  className="field px-4 py-2 text-sm pr-8 rounded-xl"
                  style={{ minWidth: '200px' }}
                >
                  {projects.map((p) => (
                    <option key={p._id} value={p._id}>{p.name}</option>
                  ))}
                </select>
              )}
            </div>
          )}
        </div>

        {/* ── No projects ── */}
        {!projLoading && projects.length === 0 && (
          <div
            className="rounded-2xl p-12 text-center glass"
          >
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-base font-semibold text-slate-300 mb-1">No projects to analyse</h3>
            <p className="text-sm text-slate-600">Create a project and add some tasks first.</p>
          </div>
        )}

        {/* ── Loading ── */}
        {loading && (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
          </div>
        )}

        {/* ── Analytics content ── */}
        {data && !loading && (
          <div className="space-y-6">

            {/* ── Summary cards ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                label="Total Tasks"
                value={data.summary.totalTasks}
                sub={`in ${selectedProject?.name}`}
                accent={C.indigo}
              />
              <StatCard
                label="Open Bugs"
                value={data.summary.openBugs}
                sub="unresolved bugs"
                accent={C.red}
              />
              <StatCard
                label="Resolved This Week"
                value={data.summary.resolvedThisWeek}
                sub="since Sunday"
                accent={C.emerald}
              />
              <StatCard
                label="Avg Resolution Time"
                value={data.summary.avgResolutionDays > 0 ? `${data.summary.avgResolutionDays}d` : '—'}
                sub={data.summary.avgResolutionDays > 0 ? 'days to resolve' : 'no resolved tasks yet'}
                accent={C.amber}
              />
            </div>

            {/* ── Weekly bar chart ── */}
            <ChartCard title="Tasks Created vs Resolved — Last 6 Weeks">
              {data.weeklyData.every((w) => w.created === 0 && w.resolved === 0) ? (
                <EmptyChart message="No task activity in the last 6 weeks" />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={data.weeklyData} barGap={4} barCategoryGap="30%">
                    <CartesianGrid vertical={false} strokeDasharray="3 3" {...gridStyle} />
                    <XAxis dataKey="week" tick={axisStyle} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={axisStyle} axisLine={false} tickLine={false} />
                    <Tooltip content={<DarkTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                    <Legend
                      wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }}
                      formatter={(val) => <span style={{ color: '#94a3b8' }}>{val}</span>}
                    />
                    <Bar dataKey="created"  name="Created"  fill={C.indigo}  radius={[4,4,0,0]} />
                    <Bar dataKey="resolved" name="Resolved" fill={C.emerald} radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            {/* ── Pie charts row ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* Status distribution */}
              <ChartCard title="Task Distribution by Status">
                {data.summary.totalTasks === 0 ? (
                  <EmptyChart />
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={data.statusDist}
                        cx="50%"
                        cy="50%"
                        outerRadius={85}
                        dataKey="value"
                        labelLine={false}
                        label={PieLabel}
                      >
                        {data.statusDist.map((_, i) => (
                          <Cell key={i} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<DarkTooltip />} />
                      <Legend
                        wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
                        formatter={(val, entry) => (
                          <span style={{ color: entry.color }}>{val}</span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              {/* Type breakdown */}
              <ChartCard title="Task Breakdown by Type">
                {data.summary.totalTasks === 0 ? (
                  <EmptyChart />
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={data.typeDist}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        dataKey="value"
                        labelLine={false}
                        label={PieLabel}
                      >
                        {data.typeDist.map((_, i) => (
                          <Cell key={i} fill={TYPE_COLORS[i % TYPE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<DarkTooltip />} />
                      <Legend
                        wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
                        formatter={(val, entry) => (
                          <span style={{ color: entry.color }}>{val}</span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>
            </div>

            {/* ── Assignee bar chart ── */}
            <ChartCard title="Tasks Assigned per Team Member">
              {data.assigneeDist.length === 0 ? (
                <EmptyChart message="No tasks have been assigned yet" />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.assigneeDist} barCategoryGap="35%">
                    <CartesianGrid vertical={false} strokeDasharray="3 3" {...gridStyle} />
                    <XAxis dataKey="name" tick={axisStyle} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={axisStyle} axisLine={false} tickLine={false} />
                    <Tooltip content={<DarkTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                    <Bar dataKey="tasks" name="Tasks" radius={[4,4,0,0]}>
                      {data.assigneeDist.map((_, i) => (
                        <Cell key={i} fill={ASSIGNEE_COLORS[i % ASSIGNEE_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

          </div>
        )}
      </div>
    </div>
  );
}
