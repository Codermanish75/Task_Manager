import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      authAPI.me()
        .then(({ data }) => setUser(data))
        .catch(() => localStorage.clear())
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (credentials) => {
    const { data } = await authAPI.login(credentials);
    localStorage.setItem('access_token', data.access);
    localStorage.setItem('refresh_token', data.refresh);
    setUser(data.user);
    return data;
  };

  const register = async (credentials) => {
    const { data } = await authAPI.register(credentials);
    localStorage.setItem('access_token', data.access);
    localStorage.setItem('refresh_token', data.refresh);
    setUser(data.user);
    return data;
  };

  const logout = async () => {
    try {
      const refresh = localStorage.getItem('refresh_token');
      await authAPI.logout(refresh);
    } catch {}
    localStorage.clear();
    setUser(null);
  };

  // Helpers
  const isSystemAdmin = user?.system_role === 'admin';

  return (
    <AuthContext.Provider value={{ user, login, logout, register, loading, isSystemAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

/**
 * useProjectRole — returns the caller's role in a given project object
 * project must have caller_role set by the backend
 */
export const useProjectRole = (project) => {
  const { user, isSystemAdmin } = useAuth();
  if (!project || !user) return null;
  // System admins get owner-level access everywhere
  if (isSystemAdmin) return 'owner';
  return project.caller_role || null;
};

/**
 * Permission helpers
 */
export const canManageProject = (role) => role === 'owner' || role === 'admin';
export const canDeleteProject = (role) => role === 'owner';
export const canManageTasks = (role) => role === 'owner' || role === 'admin';
export const canManageMembers = (role) => role === 'owner' || role === 'admin';
export const canChangeRoles = (role) => role === 'owner';
