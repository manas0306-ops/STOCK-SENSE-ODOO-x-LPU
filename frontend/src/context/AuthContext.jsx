import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('stocksense_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => {
    return localStorage.getItem('stocksense_token') || null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function verifyAuth() {
      const savedToken = localStorage.getItem('stocksense_token');
      if (!savedToken) {
        setLoading(false);
        return;
      }
      try {
        const res = await api.get('/auth/me');
        if (res && res.data && res.data.user) {
          setUser(res.data.user);
          localStorage.setItem('stocksense_user', JSON.stringify(res.data.user));
          setToken(savedToken);
        }
      } catch (err) {
        localStorage.removeItem('stocksense_token');
        localStorage.removeItem('stocksense_user');
        setUser(null);
        setToken(null);
      } finally {
        setLoading(false);
      }
    }
    verifyAuth();
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { token: receivedToken, user: loggedUser } = res.data;
    localStorage.setItem('stocksense_token', receivedToken);
    localStorage.setItem('stocksense_user', JSON.stringify(loggedUser));
    setToken(receivedToken);
    setUser(loggedUser);
    return loggedUser;
  };

  const register = async (name, email, password, role = 'Inventory Manager') => {
    const res = await api.post('/auth/register', { name, email, password, role });
    const { token: receivedToken, user: registeredUser } = res.data;
    localStorage.setItem('stocksense_token', receivedToken);
    localStorage.setItem('stocksense_user', JSON.stringify(registeredUser));
    setToken(receivedToken);
    setUser(registeredUser);
    return registeredUser;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
    }
    localStorage.removeItem('stocksense_token');
    localStorage.removeItem('stocksense_user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        loading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
