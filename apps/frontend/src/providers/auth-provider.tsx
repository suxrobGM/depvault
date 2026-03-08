"use client";

import {
  createContext,
  useCallback,
  useMemo,
  useState,
  type PropsWithChildren,
  type ReactElement,
} from "react";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/lib/constants";

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  role: string;
  emailVerified: boolean;
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

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } finally {
      setUser(null);
      setIsLoading(false);
      router.push(ROUTES.login);
    }
  }, [router]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: !!user,
      isLoading,
      setUser,
      logout,
    }),
    [user, isLoading, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
