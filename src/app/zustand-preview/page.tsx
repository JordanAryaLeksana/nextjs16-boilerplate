"use client";

import { Button } from "@/components/ui/button";
import { useCartStore } from "@/features/cart/store";

// Preview Page
export default function ZustandPreviewPage() {
  const openCart = useCartStore((state) => state.openCart);
  const toggleCart = useCartStore((state) => state.toggleCart);
  const isOpen = useCartStore((state) => state.isOpen);
  const closeCart = useCartStore((state) => state.closeCart);
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 py-16">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold">Zustand Preview</h1>

        <p className="text-muted-foreground">
          Testing shared client state across components.
        </p>
      </div>

      <div className="flex gap-3">
        <Button onClick={openCart}>Open Cart</Button>

        <Button variant="outline" onClick={toggleCart}>
          Toggle Cart
        </Button>
      </div>
      <section className="space-y-4 rounded-lg border p-6">
        <p className="text-sm text-muted-foreground">
          Cart status: {isOpen ? "Open" : "Closed"}
        </p>

        {isOpen && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Your Cart</h2>

            <p>This cart is controlled by Zustand.</p>

            <Button variant="outline" onClick={closeCart}>
              Close Cart
            </Button>
          </div>
        )}
      </section>
    </main>
  );
}
