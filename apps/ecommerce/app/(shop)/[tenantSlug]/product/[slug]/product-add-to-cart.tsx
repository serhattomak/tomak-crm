"use client";

import { Minus, Plus, ShoppingBag } from "lucide-react";
import { useState } from "react";
import { EcommerceClient } from "@/lib/ecommerce-client";
import { ensureGuestToken } from "@/lib/guest-token";

interface VariantOption {
  id: string;
  name: string;
  price: number;
  sku?: string;
}

interface ProductAddToCartProps {
  productId: string;
  tenantSlug: string;
  variants?: VariantOption[];
}

export function ProductAddToCart({
  productId,
  tenantSlug,
  variants,
}: ProductAddToCartProps) {
  const [quantity, setQuantity] = useState(1);
  const [selectedVariantId, setSelectedVariantId] = useState<string>(
    variants?.[0]?.id ?? ""
  );
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const effectiveProductId =
    selectedVariantId && variants?.length ? selectedVariantId : productId;

  const handleAdd = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const guestToken = ensureGuestToken();
      const res = await EcommerceClient.addToCart(
        { guestToken, productId: effectiveProductId, quantity },
        tenantSlug
      );
      if (res.success) {
        setMessage("Sepete eklendi ✓");
      } else {
        setMessage(res.message ?? "Eklenemedi");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      {variants && variants.length > 0 ? (
        <div>
          <label className="mb-1 block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            Varyant
          </label>
          <select
            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs focus:border-violet-400 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900"
            onChange={(e) => setSelectedVariantId(e.target.value)}
            value={selectedVariantId}
          >
            {variants.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} — ₺{v.price.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
                {v.sku ? ` (${v.sku})` : ""}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="flex items-center gap-3">
        <div className="flex items-center rounded-xl border border-zinc-200 dark:border-zinc-800">
          <button
            aria-label="Azalt"
            className="flex h-9 w-9 items-center justify-center hover:bg-zinc-50 disabled:opacity-40"
            disabled={quantity <= 1}
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            type="button"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="w-10 text-center text-sm font-semibold">{quantity}</span>
          <button
            aria-label="Artır"
            className="flex h-9 w-9 items-center justify-center hover:bg-zinc-50"
            onClick={() => setQuantity((q) => q + 1)}
            type="button"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <button
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2.5 font-semibold text-white text-sm hover:bg-violet-700 disabled:opacity-50"
          disabled={loading}
          onClick={handleAdd}
          type="button"
        >
          <ShoppingBag className="h-4 w-4" />
          {loading ? "Ekleniyor…" : "Sepete ekle"}
        </button>
      </div>

      {message ? (
        <p className="text-center text-xs text-zinc-500">{message}</p>
      ) : null}
    </div>
  );
}
