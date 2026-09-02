"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

/**
 * useUrlFilters — URL'i filtre state'i ile iki yönlü senkronize eder.
 *
 * Kullanım:
 *   const { getParam, setParams, clearParams } = useUrlFilters();
 *   const search = getParam("search", "");
 *   setParams({ search: "foo", page: "2" });
 *
 * - setParams: Verilen key/value çiftlerini URL query string'e yazar.
 *   Boş string veya undefined değerler URL'den çıkarılır.
 * - clearParams: Verilen key'leri URL'den siler.
 * - getParam: Şu anki URL'den bir değer okur (default fallback ile).
 */
export function useUrlFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const getParam = useCallback(
    (key: string, defaultValue = "") => searchParams.get(key) ?? defaultValue,
    [searchParams]
  );

  const getIntParam = useCallback(
    (key: string, defaultValue = 1) => {
      const raw = searchParams.get(key);
      if (!raw) {
        return defaultValue;
      }
      const parsed = Number.parseInt(raw, 10);
      return Number.isNaN(parsed) ? defaultValue : parsed;
    },
    [searchParams]
  );

  const setParams = useCallback(
    (updates: Record<string, string | number | undefined | null>) => {
      const params = new URLSearchParams(searchParams.toString());

      for (const [key, value] of Object.entries(updates)) {
        if (value === undefined || value === null || value === "") {
          params.delete(key);
        } else {
          params.set(key, String(value));
        }
      }

      // preserve the `create` param intentionally — it opens modals
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  const clearParams = useCallback(
    (keys: string[]) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const key of keys) {
        params.delete(key);
      }
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  return { clearParams, getIntParam, getParam, setParams };
}
