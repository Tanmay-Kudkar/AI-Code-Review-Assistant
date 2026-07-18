import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../services/api';

/**
 * 🌍 Global Authentication Context
 * 
 * This creates a shared "bubble" of state that any component inside the app can access.
 * We use this to store the current user's profile and check if they are logged in!
 */
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // 👤 Store the logged-in user's profile data
  const [user, setUser] = useState(null);
  
  // ⏳ Keep a loading state while we check the server for an existing session on refresh
  const [loading, setLoading] = useState(true);

  /**
   * 🔄 Session Restoration (Runs once when the app first loads)
   * 
   * Checks if we have an access token saved in LocalStorage.
   * If we do, we silently ask the backend "Who am I?" to restore the user profile.
   */
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setLoading(false);
      return;
    }
    
    // 🌐 Ping the server to get the user's profile
    authApi.me()
      .then(({ data }) => setUser(data.user))
      .catch((err) => {
        // ❌ Only wipe the token if the server explicitly tells us we are unauthorized (401 or 403)
        // If it's a 429 Too Many Requests, or 500 server error, DO NOT log them out!
        if (err.response?.status === 401 || err.response?.status === 403) {
          localStorage.removeItem('accessToken');
        }
      })
      .finally(() => setLoading(false)); // 🟢 We are done loading, show the app!
  }, []);

  /**
   * 🚪 Login Function
   * Sends credentials to the backend, saves the token, and updates the global user state.
   */
  const login = useCallback(async (email, password) => {
    const { data } = await authApi.login({ email, password });
    localStorage.setItem('accessToken', data.accessToken);
    setUser(data.user);
    return data.user;
  }, []);

  /**
   * 📝 Register Function
   * Creates a new account, saves the token, and updates the global user state.
   */
  const register = useCallback(async (name, email, password) => {
    const { data } = await authApi.register({ name, email, password });
    localStorage.setItem('accessToken', data.accessToken);
    setUser(data.user);
    return data.user;
  }, []);

  /**
   * 📤 Logout Function
   * Tells the backend to destroy the secure cookie session, then wipes local state.
   */
  const logout = useCallback(async () => {
    try { await authApi.logout(); } catch { /* ignore server errors on logout */ }
    localStorage.removeItem('accessToken');
    setUser(null);
  }, []);

  /**
   * 🖼️ Update Profile Function
   * Syncs profile changes (like a new avatar) with the backend and updates the global state.
   */
  const updateProfile = useCallback(async (profileData) => {
    const { data } = await authApi.updateProfile(profileData);
    setUser(data.user);
    return data.user;
  }, []);

  // 🎁 Wrap the entire app (children) in this provider so they can access the auth functions
  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * 🪝 Custom Hook: useAuth
 * 
 * Instead of writing `useContext(AuthContext)` everywhere, developers can just
 * write `const { user, login } = useAuth()` to magically access the global state!
 */
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
