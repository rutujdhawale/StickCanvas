import { create } from "zustand";

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  provider: "email" | "google";
  createdAt: number;
}

export type AuthModalView = "login" | "signup" | "forgot" | "reset";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authModalOpen: boolean;
  authModalView: AuthModalView;
  resetToken: string | null;
  resetEmail: string | null;

  // Actions
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  signup: (name: string, email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  requestPasswordReset: (email: string) => Promise<{ success: boolean; token?: string; error?: string }>;
  resetPassword: (token: string, newPass: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  openAuthModal: (view?: AuthModalView) => void;
  closeAuthModal: () => void;
  setAuthModalView: (view: AuthModalView) => void;
}

const STORAGE_KEY = "stickercanvas_auth_user";

function loadSavedUser(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: loadSavedUser(),
  isAuthenticated: Boolean(loadSavedUser()),
  isLoading: false,
  authModalOpen: false,
  authModalView: "login",
  resetToken: null,
  resetEmail: null,

  login: async (email: string, pass: string) => {
    set({ isLoading: true });
    // Simulate brief network authentication
    await new Promise((r) => setTimeout(r, 450));

    if (!email || !email.includes("@")) {
      set({ isLoading: false });
      return { success: false, error: "Please enter a valid email address." };
    }
    if (!pass || pass.length < 6) {
      set({ isLoading: false });
      return { success: false, error: "Password must be at least 6 characters." };
    }

    const nameFromEmail = email.split("@")[0].replace(/[._]/g, " ");
    const formattedName = nameFromEmail.charAt(0).toUpperCase() + nameFromEmail.slice(1);

    const user: User = {
      id: `usr_${Date.now()}`,
      name: formattedName || "Creator",
      email: email.trim().toLowerCase(),
      provider: "email",
      createdAt: Date.now(),
    };

    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    }

    set({
      user,
      isAuthenticated: true,
      isLoading: false,
      authModalOpen: false,
    });

    return { success: true };
  },

  loginWithGoogle: async () => {
    set({ isLoading: true });
    // Simulate Google one-click OAuth flow
    await new Promise((r) => setTimeout(r, 600));

    const googleUser: User = {
      id: `usr_g_${Date.now()}`,
      name: "Google Creator",
      email: "creator@gmail.com",
      avatar: "https://lh3.googleusercontent.com/a/default-user=s96-c",
      provider: "google",
      createdAt: Date.now(),
    };

    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(googleUser));
    }

    set({
      user: googleUser,
      isAuthenticated: true,
      isLoading: false,
      authModalOpen: false,
    });

    return { success: true };
  },

  signup: async (name: string, email: string, pass: string) => {
    set({ isLoading: true });
    await new Promise((r) => setTimeout(r, 500));

    if (!name || name.trim().length < 2) {
      set({ isLoading: false });
      return { success: false, error: "Please enter your name." };
    }
    if (!email || !email.includes("@")) {
      set({ isLoading: false });
      return { success: false, error: "Please enter a valid email address." };
    }
    if (!pass || pass.length < 6) {
      set({ isLoading: false });
      return { success: false, error: "Password must be at least 6 characters." };
    }

    const user: User = {
      id: `usr_${Date.now()}`,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      provider: "email",
      createdAt: Date.now(),
    };

    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    }

    set({
      user,
      isAuthenticated: true,
      isLoading: false,
      authModalOpen: false,
    });

    return { success: true };
  },

  requestPasswordReset: async (email: string) => {
    set({ isLoading: true });
    await new Promise((r) => setTimeout(r, 500));

    if (!email || !email.includes("@")) {
      set({ isLoading: false });
      return { success: false, error: "Please enter a valid email address." };
    }

    const token = `rst_${Math.random().toString(36).substring(2, 10)}`;
    set({
      isLoading: false,
      resetToken: token,
      resetEmail: email.trim().toLowerCase(),
      authModalView: "reset",
    });

    return { success: true, token };
  },

  resetPassword: async (token: string, newPass: string) => {
    set({ isLoading: true });
    await new Promise((r) => setTimeout(r, 500));

    if (!newPass || newPass.length < 6) {
      set({ isLoading: false });
      return { success: false, error: "New password must be at least 6 characters." };
    }

    const email = get().resetEmail || "creator@example.com";
    const user: User = {
      id: `usr_${Date.now()}`,
      name: email.split("@")[0] || "Creator",
      email,
      provider: "email",
      createdAt: Date.now(),
    };

    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    }

    set({
      user,
      isAuthenticated: true,
      isLoading: false,
      resetToken: null,
      resetEmail: null,
      authModalOpen: false,
    });

    return { success: true };
  },

  logout: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
    }
    set({ user: null, isAuthenticated: false });
  },

  openAuthModal: (view = "login") =>
    set({ authModalOpen: true, authModalView: view }),

  closeAuthModal: () => set({ authModalOpen: false }),

  setAuthModalView: (view) => set({ authModalView: view }),
}));
