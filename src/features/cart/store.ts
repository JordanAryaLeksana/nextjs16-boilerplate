import { create } from "zustand";

// Types
type CartUIStore = {
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
};

// Store
export const useCartStore = create<CartUIStore>()((set) => ({
  isOpen: false,

  openCart: () => set({ isOpen: true }),

  closeCart: () => set({ isOpen: false }),

  toggleCart: () =>
    set((state) => ({
      isOpen: !state.isOpen,
    })),
}));
