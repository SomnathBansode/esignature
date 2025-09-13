// frontend/src/contexts/AppContext.jsx
import React, { createContext, useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const AppContext = createContext();

export const useApp = () => {
  return useContext(AppContext);
};

export const AppProvider = ({ children }) => {
  const [auth, setAuth] = useState({ user: null, token: null });
  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const storedToken = localStorage.getItem("authToken");
    if (storedUser && storedToken) {
      setAuth({ user: JSON.parse(storedUser), token: storedToken });
    }
  }, []);

  const login = (user, token) => {
    setAuth({ user, token });
    localStorage.setItem("user", JSON.stringify(user));
    localStorage.setItem("authToken", token);
    navigate("/dashboard");
  };

  const logout = () => {
    setAuth({ user: null, token: null });
    localStorage.removeItem("user");
    localStorage.removeItem("authToken");
    navigate("/login");
  };

  return (
    <AppContext.Provider value={{ auth, login, logout }}>
      {children}
    </AppContext.Provider>
  );
};
