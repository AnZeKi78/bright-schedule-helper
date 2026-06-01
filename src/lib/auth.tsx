import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Role = "admin" | "teacher";

export type User = {
  id: string;
  name: string;
  role: Role;
  /** Список предметов, доступных пользователю (для роли teacher). Пусто = все. */
  subjects: string[];
};

type Ctx = {
  user: User | null;
  login: (u: User) => void;
  logout: () => void;
  /** Список всех зарегистрированных пользователей (для админки). */
  users: User[];
  upsertUser: (u: User) => void;
  removeUser: (id: string) => void;
};

const AuthContext = createContext<Ctx | null>(null);

const DEFAULT_USERS: User[] = [
  { id: "admin-1", name: "Администратор", role: "admin", subjects: [] },
  { id: "teacher-1", name: "Мустафина А.К.", role: "teacher", subjects: ["Программирование"] },
  { id: "teacher-2", name: "Иванов С.П.", role: "teacher", subjects: ["Математика"] },
];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>(DEFAULT_USERS);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const u = localStorage.getItem("auth.user");
    if (u) setUser(JSON.parse(u));
    const all = localStorage.getItem("auth.users");
    if (all) setUsers(JSON.parse(all));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("auth.users", JSON.stringify(users));
  }, [users]);

  const login = (u: User) => {
    setUser(u);
    if (typeof window !== "undefined") localStorage.setItem("auth.user", JSON.stringify(u));
    // Гарантируем, что пользователь есть в списке
    setUsers((prev) => (prev.some((x) => x.id === u.id) ? prev : [...prev, u]));
  };

  const logout = () => {
    setUser(null);
    if (typeof window !== "undefined") localStorage.removeItem("auth.user");
  };

  const upsertUser = (u: User) =>
    setUsers((prev) => {
      const i = prev.findIndex((x) => x.id === u.id);
      if (i === -1) return [...prev, u];
      const next = [...prev];
      next[i] = u;
      return next;
    });

  const removeUser = (id: string) => setUsers((prev) => prev.filter((x) => x.id !== id));

  return (
    <AuthContext.Provider value={{ user, login, logout, users, upsertUser, removeUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}