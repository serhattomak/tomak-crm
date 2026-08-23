"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ApiClient } from "@/lib/api-client";

export default function PipelinesRootRedirect() {
  const router = useRouter();

  useEffect(() => {
    const redirect = async () => {
      try {
        const res = await ApiClient.getMyTenants();
        if (res.success && res.data && res.data.length > 0) {
          router.replace(`/${res.data[0]?.slug}/pipelines`);
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
      <Loader2 className="mb-2 h-8 w-8 animate-spin text-blue-600" />
      <span className="font-semibold text-xs">Pipeline açılıyor...</span>
    </div>
  );
}
