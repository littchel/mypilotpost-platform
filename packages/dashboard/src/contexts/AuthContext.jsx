import React, { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("mpp_token"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      // Decode JWT or fetch user info if needed
      // For now, we assume token existence means authenticated
      localStorage.setItem("mpp_token", token);
      // Mock user extraction from JWT payload
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        
        // Expiration check (SaaS production safety)
        const isExpired = payload.exp && (payload.exp * 1000 < Date.now());
        if (isExpired) throw new Error("Session expired");

        setUser({
          id: payload.user_id,
          email: payload.email,
          role: payload.role,
          activeBrandId: payload.brand_id,
          first_name: payload.first_name || null
        });
      } catch (e) {
        console.error("Invalid token", e);
        setToken(null);
        localStorage.removeItem("mpp_token");
      }
    } else {
      localStorage.removeItem("mpp_token");
      setUser(null);
    }
    setLoading(false);
  }, [token]);

  const login = (newToken) => {
    localStorage.setItem("mpp_token", newToken);
    setToken(newToken);
  };

  const logout = () => {
    localStorage.clear();
    setToken(null);
    setUser(null);
    // Force a full clean state
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
