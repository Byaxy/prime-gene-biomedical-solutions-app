import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { Models } from "appwrite";

interface AuthState {
  user: Models.User<Models.Preferences> | null;
  isAdmin: boolean;
  isLoading: boolean;
  setUser: (user: Models.User<Models.Preferences> | null) => void;
  setIsAdmin: (isAdmin: boolean) => void;
  setIsLoading: (isLoading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    immer((set) => ({
      user: null,
      isAdmin: false,
      isLoading: false,
      setUser: (user) =>
        set((state) => {
          state.user = user;
        }),
      setIsAdmin: (isAdmin) =>
        set((state) => {
          state.isAdmin = isAdmin;
        }),
      setIsLoading: (isLoading) =>
        set((state) => {
          state.isLoading = isLoading;
        }),
    })),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
