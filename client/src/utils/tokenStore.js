/**
 * In-memory token store.
 *
 * Keeps the access token out of localStorage (XSS-proof) and provides
 * a clean seam between AuthContext (which sets the token) and the Axios
 * instance (which reads it per request) without circular imports.
 */

let _token = null;
let _onUnauthenticated = null;

export const setToken          = (t)  => { _token = t; };
export const getToken          = ()   => _token;
export const onUnauthenticated = (cb) => { _onUnauthenticated = cb; };
export const triggerUnauthenticated = () => { if (_onUnauthenticated) _onUnauthenticated(); };
