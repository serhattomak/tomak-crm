"use client";

import { ShoppingBag } from "lucide-react";
import { useState } from "react";
import { EcommerceClient } from "@/lib/ecommerce-client";
import { ensureGuestToken } from "@/lib/guest-token";

interface AddToCartButtonProps {
  productId: string;
  slug: string;
  tenantSlug: string;
}

export function AddToCartButton({
  productId,
  tenantSlug,
}: AddToCartButtonProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleAdd = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const guestToken = ensureGuestToken();
      const res = await EcommerceClient.addToCart(
        { guestToken, productId, quantity: 1 },
        tenantSlug
      );
      if (res.success) {
        setMessage("Sepete eklendi");
        setTimeout(() => setMessage(null), 1500);
      } else {
        setMessage(res.message ?? "Eklenemedi");
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Hata oluştu";
      setMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-3">
      <button
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-violet-600 px-3 py-2 font-semibold text-white text-xs hover:bg-violet-700 disabled:opacity-50"
        disabled={loading}
        onClick={handleAdd}
        type="button"
      >
        <ShoppingBag className="h-4 w-4" />
        {loading ? "Ekleniyor…" : "Sepete ekle"}
      </button>
      {message ? (
        <p className="mt-1 text-center text-[11px] text-zinc-500">{message}</p>
      ) : null}
    </div>
  );
}
