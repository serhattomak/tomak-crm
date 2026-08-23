"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ApiClient } from "@/lib/api-client";

export default function QuotesRootRedirect() {
  const router = useRouter();

  useEffect(() => {
    const redirect = async () => {
      try {
        const res = await ApiClient.getMyTenants();
        if (res.success && res.data && res.data.length > 0) {
          router.replace(`/${res.data[0]?.slug}/quotes`);
        } else {
          router.replace("/");
        }
      } catch {
        router.replace("/");
      }
    };
    redirect();
  }, [router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 text-slate-600">
      <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-2" />
      <span className="font-semibold text-xs">Teklifler açılıyor...</span>
    </div>
  );
}
