import React, { createContext, useContext, useEffect, useState } from "react";

import { clearData, loadData, saveData } from "@/lib/storage";

type User = {
  email: string;
  password: string;
};

type AuthResult = {
  success: boolean;
  message: string;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthResult>;
  logout: () => Promise<AuthResult>;
  register: (email: string, password: string) => Promise<AuthResult>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) throw new Error("useAuth must be used within an AuthProvider");

  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const savedUser = await loadData("user");

      if (savedUser) setUser(savedUser);

      setLoading(false);
    };

    init();
  }, []);

  const login = async (
    email: string,
    password: string
  ): Promise<AuthResult> => {
    const savedUser = await loadData("user");

    if (!savedUser) return { success: false, message: "No user registered" };

    if (savedUser.email !== email)
      return { success: false, message: "Invalid email" };

    if (password !== savedUser.password)
      return { success: false, message: "Invalid password" };

    return { success: true, message: "Login successful" };
  };

  const register = async (
    email: string,
    password: string
  ): Promise<AuthResult> => {
    const savedUser = await loadData("user");

    if (savedUser && savedUser.email === email)
      return { success: false, message: "Email already registered" };

    const newUser: User = { email, password: password };

    await saveData("user", newUser);

    setUser(newUser);
    return { success: true, message: "Registration successful" };
  };

  const logout = async (): Promise<AuthResult> => {
    await clearData("user");

    setUser(null);
    return { success: true, message: "Logged out successfully" };
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
};
