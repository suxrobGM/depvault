"use client";

import { createContext, useState, type PropsWithChildren, type ReactElement } from "react";
import { useRouter } from "next/navigation";
import { client } from "@/lib/api";
import { ROUTES } from "@/lib/constants";

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  emailVerified: boolean;
  avatarUrl: string | null;
}

export interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: AuthUser | null) => void;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps extends PropsWithChildren {
  initialUser: AuthUser | null;
}

export function AuthProvider(props: AuthProviderProps): ReactElement {
  const { initialUser, children } = props;

  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(initialUser);
  const [isLoading, setIsLoading] = useState(false);

  const logout = async () => {
    setIsLoading(true);
    try {
      await client.api.auth.logout.post();
    } finally {
      setUser(null);
      setIsLoading(false);
      router.push(ROUTES.login);
    }
  };

  const value: AuthContextValue = {
    user,
    isAuthenticated: !!user,
    isLoading,
    setUser,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
