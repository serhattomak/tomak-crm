"use client";

import { ConfirmDialog } from "@workspace/ui/components/confirm-dialog";
import { NumberInput } from "@workspace/ui/components/number-input";
import { PageContainer } from "@workspace/ui/components/page-container";
import {
  AlertCircle,
  BarChart3,
  Calendar,
  Check,
  ChevronRight,
  Coins,
  Copy,
  Flame,
  Layers,
  Loader2,
  Pencil,
  Percent,
  Plus,
  RefreshCw,
  Search,
  ShoppingCart,
  Sparkles,
  Tag,
  Ticket,
  Trash2,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";
import { useParams, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { PermissionGate } from "@/components/permission-gate";
import {
  ApiClient,
  type CampaignListItemDto,
  type CartItemPayload,
  type CartPromotionEvaluationResultDto,
  type CouponListItemDto,
  type ProductListDto,
  type PromotionsStatsDto,
} from "@/lib/api-client";
import { usePermissions } from "@/lib/permissions/permission-context";
import { BulkCouponModal } from "./components/bulk-coupon-modal";
import { CampaignModal } from "./components/campaign-modal";

export default function PromotionsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const tenantSlug = (params?.tenantSlug as string) || "";
  const { activeTenant } = usePermissions();

  const [activeTab, setActiveTab] = useState<
    "campaigns" | "coupons" | "simulator"
  >("campaigns");
  const [campaigns, setCampaigns] = useState<CampaignListItemDto[]>([]);
  const [coupons, setCoupons] = useState<CouponListItemDto[]>([]);
  const [stats, setStats] = useState<PromotionsStatsDto | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters for Campaigns
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [triggerFilter, setTriggerFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("");

  // Filters for Coupons
  const [couponSearch, setCouponSearch] = useState("");
  const [couponCampaignFilter, setCouponCampaignFilter] = useState("");

  // Modals
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(
    null
  );
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Confirm Dialog State
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    variant?: "destructive" | "warning" | "default";
    loading?: boolean;
    onConfirm: () => void | Promise<void>;
  }>({
    description: "",
    onConfirm: () => {},
    open: false,
    title: "",
  });

  useEffect(() => {
    const create = searchParams.get("create");
    const edit = searchParams.get("edit");
    if (create === "true") {
      setEditingCampaignId(null);
      setIsCampaignModalOpen(true);
    } else if (edit) {
      setEditingCampaignId(edit);
      setIsCampaignModalOpen(true);
    }
  }, [searchParams]);

  // Simulator state
  const [availableProducts, setAvailableProducts] = useState<ProductListDto[]>(
    []
  );
  const [simCartItems, setSimCartItems] = useState<CartItemPayload[]>([]);
  const [simCouponCode, setSimCouponCode] = useState("");
  const [simResult, setSimResult] =
    useState<CartPromotionEvaluationResultDto | null>(null);
  const [simLoading, setSimLoading] = useState(false);

  const loadData = useCallback(async () => {
    if (!activeTenant) {
      return;
    }
    setLoading(true);
    try {
      const [campRes, coupRes, statsRes, prodRes] = await Promise.all([
        ApiClient.getCampaigns(
          {
            isActive:
              activeFilter === "true"
                ? true
                : activeFilter === "false"
                  ? false
                  : undefined,
            search: search || undefined,
            triggerType: triggerFilter || undefined,
            type: typeFilter || undefined,
          },
          activeTenant.id
        ),
        ApiClient.getCoupons(
          {
            campaignId: couponCampaignFilter || undefined,
            search: couponSearch || undefined,
          },
          activeTenant.id
        ),
        ApiClient.getPromotionsStats(activeTenant.id),
        ApiClient.getProducts({ pageSize: 50 }, activeTenant.id),
      ]);

      if (campRes.success && campRes.data) {
        setCampaigns(campRes.data.items || []);
      }
      if (coupRes.success && coupRes.data) {
        setCoupons(coupRes.data.items || []);
      }
      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data);
      }
      if (prodRes.success && prodRes.data) {
        setAvailableProducts(prodRes.data.items || []);
      }
    } catch {
      toast.error("Veriler yüklenirken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  }, [
    activeTenant,
    search,
    typeFilter,
    triggerFilter,
    activeFilter,
    couponSearch,
    couponCampaignFilter,
  ]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggleCampaign = async (id: string) => {
    if (!activeTenant) {
      return;
    }
    try {
      const res = await ApiClient.toggleCampaignStatus(id, activeTenant.id);
      if (res.success && res.data) {
        toast.success(res.data.message);
        setCampaigns((prev) =>
          prev.map((c) =>
            c.id === id ? { ...c, isActive: res.data!.isActive } : c
          )
        );
      } else {
        toast.error(res.message || "Durum güncellenemedi.");
      }
    } catch {
      toast.error("Durum güncellenirken hata oluştu.");
    }
  };

  const handleDeleteCampaign = (id: string, name: string) => {
    if (!activeTenant) {
      return;
    }

    setConfirmDialog({
      confirmText: "Kampanyayı Sil",
      description: `"${name}" kampanyasını ve ilişkili tüm kuralları silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`,
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, loading: true }));
        try {
          const res = await ApiClient.deleteCampaign(id, activeTenant.id);
          if (res.success) {
            toast.success("Kampanya başarıyla silindi.");
            setCampaigns((prev) => prev.filter((c) => c.id !== id));
            loadData();
          } else {
            toast.error(res.message || "Silme işlemi başarısız.");
          }
        } catch {
          toast.error("Silme işlemi sırasında bir hata oluştu.");
        } finally {
          setConfirmDialog((prev) => ({
            ...prev,
            loading: false,
            open: false,
          }));
        }
      },
      open: true,
      title: "Kampanyayı Sil",
      variant: "destructive",
    });
  };

  const handleDeleteCoupon = (id: string, code: string) => {
    if (!activeTenant) {
      return;
    }

    setConfirmDialog({
      confirmText: "Kuponu Sil",
      description: `"${code}" kupon kodunu silmek istediğinize emin misiniz? Müşteriler bu kuponu artık kullanamaz.`,
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, loading: true }));
        try {
          const res = await ApiClient.deleteCoupon(id, activeTenant.id);
          if (res.success) {
            toast.success("Kupon başarıyla silindi.");
            setCoupons((prev) => prev.filter((c) => c.id !== id));
            loadData();
          } else {
            toast.error(res.message || "Silme işlemi başarısız.");
          }
        } catch {
          toast.error("Silme işlemi sırasında bir hata oluştu.");
        } finally {
          setConfirmDialog((prev) => ({
            ...prev,
            loading: false,
            open: false,
          }));
        }
      },
      open: true,
      title: "Kuponu Sil",
      variant: "destructive",
    });
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success(`"${code}" kopyalandı.`);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Simulator helper
  const addSimItem = (product: ProductListDto) => {
    setSimCartItems((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        return prev.map((i) =>
          i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        {
          brand: product.brand,
          categoryId: product.categoryId,
          productId: product.id,
          productName: product.name,
          quantity: 1,
          unitPrice: product.sellingPrice,
        },
      ];
    });
  };

  const removeSimItem = (productId?: string) => {
    setSimCartItems((prev) => prev.filter((i) => i.productId !== productId));
  };

  const runSimulation = async () => {
    if (!activeTenant || simCartItems.length === 0) {
      return;
    }
    setSimLoading(true);
    try {
      const res = await ApiClient.evaluateCartPromotions(
        {
          couponCode: simCouponCode.trim() || undefined,
          items: simCartItems,
          shippingFee: 50,
        },
        activeTenant.id
      );
      if (res.success && res.data) {
        setSimResult(res.data);
      } else {
        toast.error(res.message || "Simülasyon başarısız.");
      }
    } catch {
      toast.error("Simülasyon çalıştırılırken hata oluştu.");
    } finally {
      setSimLoading(false);
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "Percentage":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 font-semibold text-blue-700 text-xs dark:bg-blue-950/60 dark:text-blue-300">
            <Percent className="h-3 w-3" /> Yüzde İndirimi
          </span>
        );
      case "FixedAmount":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 font-semibold text-blue-700 text-xs dark:bg-blue-950/60 dark:text-blue-300">
            <Coins className="h-3 w-3" /> Sabit Tutar
          </span>
        );
      case "CartThreshold":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 font-semibold text-amber-700 text-xs dark:bg-amber-950/60 dark:text-amber-300">
            <TrendingUp className="h-3 w-3" /> Sepet Barajı
          </span>
        );
      case "BuyXGetY":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 font-semibold text-emerald-700 text-xs dark:bg-emerald-950/60 dark:text-emerald-300">
            <Layers className="h-3 w-3" /> X Al Y Öde
          </span>
        );
      case "FreeShipping":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-2.5 py-0.5 font-semibold text-teal-700 text-xs dark:bg-teal-950/60 dark:text-teal-300">
            <Zap className="h-3 w-3" /> Kargo Bedava
          </span>
        );
      default:
        return (
          <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 font-semibold text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            {type}
          </span>
        );
    }
  };

  return (
    <PageContainer className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 border-zinc-200/80 border-b pb-5 sm:flex-row sm:items-center dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2 font-medium text-xs text-zinc-500">
            <span>Satış CRM</span>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-zinc-900 dark:text-zinc-100">
              Kampanyalar & Kuponlar
            </span>
          </div>
          <h1 className="mt-1 flex items-center gap-2.5 font-bold text-2xl text-zinc-900 tracking-tight dark:text-zinc-50">
            <Tag className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            Kampanya & Promosyon Yönetimi
          </h1>
          <p className="mt-0.5 text-xs text-zinc-500">
            Seçili ürünlerde indirimler, kupon kodları, sepet barajları ve çoklu
            alım fırsatlarını yönetin
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <PermissionGate permission="Promotions.GenerateCoupons">
            <button
              className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 font-semibold text-xs text-zinc-700 shadow-sm transition-all hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
              onClick={() => setIsBulkModalOpen(true)}
              type="button"
            >
              <Ticket className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              Kupon Üret
            </button>
          </PermissionGate>

          <PermissionGate permission="Promotions.Create">
            <button
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white text-xs shadow-sm transition-all hover:bg-blue-700"
              onClick={() => {
                setEditingCampaignId(null);
                setIsCampaignModalOpen(true);
              }}
              type="button"
            >
              <Plus className="h-4 w-4" />
              Yeni Kampanya Oluştur
            </button>
          </PermissionGate>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm transition-all hover:shadow dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="font-medium text-xs">Aktif Kampanyalar</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
              <Flame className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 font-bold text-2xl text-zinc-900 tracking-tight dark:text-zinc-100">
            {stats?.activeCampaigns ?? 0}
            <span className="ml-1 font-normal text-xs text-zinc-400">
              / {stats?.totalCampaigns ?? 0} toplam
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm transition-all hover:shadow dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="font-medium text-xs">Toplam Kupon Sayısı</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
              <Ticket className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 font-bold text-2xl text-zinc-900 tracking-tight dark:text-zinc-100">
            {stats?.totalCoupons ?? 0}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm transition-all hover:shadow dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="font-medium text-xs">
              Toplam Dağıtılan İndirim
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
              <Coins className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 font-bold text-2xl text-emerald-600 tracking-tight dark:text-emerald-400">
            ₺
            {(stats?.totalDiscountDistributed ?? 0).toLocaleString("tr-TR", {
              minimumFractionDigits: 2,
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm transition-all hover:shadow dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="font-medium text-xs">Kampanyalı Ciro</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 font-bold text-2xl text-zinc-900 tracking-tight dark:text-zinc-100">
            ₺
            {(stats?.totalRevenueInfluenced ?? 0).toLocaleString("tr-TR", {
              minimumFractionDigits: 2,
            })}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-zinc-200 border-b dark:border-zinc-800">
        <button
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 font-semibold text-xs transition-all ${
            activeTab === "campaigns"
              ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
              : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
          }`}
          onClick={() => setActiveTab("campaigns")}
          type="button"
        >
          <Tag className="h-4 w-4" />
          Kampanyalar ({campaigns.length})
        </button>
        <button
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 font-semibold text-xs transition-all ${
            activeTab === "coupons"
              ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
              : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
          }`}
          onClick={() => setActiveTab("coupons")}
          type="button"
        >
          <Ticket className="h-4 w-4" />
          Kupon Kodları ({coupons.length})
        </button>
        <button
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 font-semibold text-xs transition-all ${
            activeTab === "simulator"
              ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
              : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
          }`}
          onClick={() => setActiveTab("simulator")}
          type="button"
        >
          <Sparkles className="h-4 w-4" />
          Canlı Sepet Simülatörü
        </button>
      </div>

      {/* TAB 1: CAMPAIGNS */}
      {activeTab === "campaigns" && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200/80 bg-white p-3.5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex flex-1 flex-wrap items-center gap-2.5">
              <div className="relative min-w-[240px] flex-1">
                <Search className="absolute top-2.5 left-3 h-4 w-4 text-zinc-400" />
                <input
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50/70 py-1.5 pr-3 pl-9 text-xs text-zinc-800 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Kampanya adı veya kod ile ara..."
                  type="text"
                  value={search}
                />
              </div>

              <select
                className="rounded-xl border border-zinc-200 bg-zinc-50/70 px-3 py-1.5 text-xs text-zinc-800 focus:border-blue-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
                onChange={(e) => setTypeFilter(e.target.value)}
                value={typeFilter}
              >
                <option value="">Tüm İndirim Tipleri</option>
                <option value="Percentage">Yüzde İndirimi (%)</option>
                <option value="FixedAmount">Sabit Tutar (₺)</option>
                <option value="CartThreshold">Sepet Barajı</option>
                <option value="BuyXGetY">X Al Y Öde</option>
                <option value="FreeShipping">Ücretsiz Kargo</option>
              </select>

              <select
                className="rounded-xl border border-zinc-200 bg-zinc-50/70 px-3 py-1.5 text-xs text-zinc-800 focus:border-blue-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
                onChange={(e) => setTriggerFilter(e.target.value)}
                value={triggerFilter}
              >
                <option value="">Tüm Tetikleyiciler</option>
                <option value="Automatic">Otomatik Kural</option>
                <option value="CouponCode">Kupon Kodu Gerektiren</option>
              </select>

              <select
                className="rounded-xl border border-zinc-200 bg-zinc-50/70 px-3 py-1.5 text-xs text-zinc-800 focus:border-blue-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
                onChange={(e) => setActiveFilter(e.target.value)}
                value={activeFilter}
              >
                <option value="">Tüm Durumlar</option>
                <option value="true">Sadece Aktif</option>
                <option value="false">Sadece Pasif</option>
              </select>
            </div>

            <button
              className="rounded-xl border border-zinc-200 p-2 text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800"
              onClick={loadData}
              type="button"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
            </button>
          </div>

          {/* Campaigns Table */}
          <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            {loading ? (
              <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              </div>
            ) : campaigns.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800">
                  <Tag className="h-6 w-6 text-zinc-400" />
                </div>
                <h3 className="mt-3 font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                  Henüz Kampanya Bulunamadı
                </h3>
                <p className="mt-1 max-w-sm text-xs text-zinc-500">
                  Yeni bir indirim veya promosyon oluşturarak müşterilerinize
                  cazip teklifler sunmaya başlayın.
                </p>
                <button
                  className="mt-4 flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 font-medium text-white text-xs shadow-sm hover:bg-blue-700"
                  onClick={() => {
                    setEditingCampaignId(null);
                    setIsCampaignModalOpen(true);
                  }}
                  type="button"
                >
                  <Plus className="h-4 w-4" />
                  Kampanya Oluştur
                </button>
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="border-zinc-100 border-b bg-zinc-50/70 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/50">
                  <tr>
                    <th className="px-4 py-3.5 font-semibold">Kampanya Adı</th>
                    <th className="px-4 py-3.5 font-semibold">Tür & Değer</th>
                    <th className="px-4 py-3.5 font-semibold">Tetikleyici</th>
                    <th className="px-4 py-3.5 font-semibold">Geçerlilik</th>
                    <th className="px-4 py-3.5 font-semibold">
                      Kural & Öncelik
                    </th>
                    <th className="px-4 py-3.5 font-semibold">Kullanım</th>
                    <th className="px-4 py-3.5 text-center font-semibold">
                      Durum
                    </th>
                    <th className="px-4 py-3.5 text-right font-semibold">
                      İşlemler
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {campaigns.map((camp) => (
                    <tr
                      className="transition-colors hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40"
                      key={camp.id}
                    >
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                          {camp.name}
                        </div>
                        {camp.description && (
                          <div className="line-clamp-1 text-[11px] text-zinc-400">
                            {camp.description}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-col gap-1">
                          <div>{getTypeBadge(camp.type)}</div>
                          <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                            {camp.type === "Percentage" &&
                              `%${camp.discountValue}`}
                            {camp.type === "FixedAmount" &&
                              `₺${camp.discountValue.toLocaleString("tr-TR")}`}
                            {camp.type === "CartThreshold" &&
                              `₺${camp.minOrderAmount} üzeri ${camp.discountValue}%`}
                            {camp.type === "BuyXGetY" && "X Al Y Öde"}
                            {camp.type === "FreeShipping" && "Ücretsiz Kargo"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        {camp.triggerType === "Automatic" ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-2 py-0.5 font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                            <Zap className="h-3 w-3 text-amber-500" /> Otomatik
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 font-medium text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                            <Ticket className="h-3 w-3" /> Kupon Kodu
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-zinc-600 dark:text-zinc-400">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                          <span>
                            {new Date(camp.startDate).toLocaleDateString(
                              "tr-TR"
                            )}
                          </span>
                          {camp.endDate && (
                            <>
                              <span>-</span>
                              <span>
                                {new Date(camp.endDate).toLocaleDateString(
                                  "tr-TR"
                                )}
                              </span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap gap-1">
                          <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-medium text-[10px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                            Öncelik: {camp.priority}
                          </span>
                          {camp.isStackable && (
                            <span className="rounded bg-emerald-100 px-1.5 py-0.5 font-medium text-[10px] text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                              Birleşebilir
                            </span>
                          )}
                          {camp.targetsCount > 0 && (
                            <span className="rounded bg-blue-100 px-1.5 py-0.5 font-medium text-[10px] text-blue-700 dark:bg-blue-950 dark:text-blue-400">
                              {camp.targetsCount} Hedef
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                          {camp.currentUsageCount}
                          {camp.totalUsageLimit && (
                            <span className="font-normal text-zinc-400">
                              {" "}
                              / {camp.totalUsageLimit}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <button
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            camp.isActive
                              ? "bg-emerald-500"
                              : "bg-zinc-300 dark:bg-zinc-700"
                          }`}
                          onClick={() => handleToggleCampaign(camp.id)}
                          type="button"
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                              camp.isActive ? "translate-x-4" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                            onClick={() => {
                              setEditingCampaignId(camp.id);
                              setIsCampaignModalOpen(true);
                            }}
                            title="Düzenle"
                            type="button"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            className="rounded-lg p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/50 dark:hover:text-red-400"
                            onClick={() =>
                              handleDeleteCampaign(camp.id, camp.name)
                            }
                            title="Sil"
                            type="button"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: COUPONS */}
      {activeTab === "coupons" && (
        <div className="space-y-4">
          {/* Coupon Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200/80 bg-white p-3.5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex flex-1 flex-wrap items-center gap-2.5">
              <div className="relative min-w-[240px] flex-1">
                <Search className="absolute top-2.5 left-3 h-4 w-4 text-zinc-400" />
                <input
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50/70 py-1.5 pr-3 pl-9 text-xs text-zinc-800 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
                  onChange={(e) => setCouponSearch(e.target.value)}
                  placeholder="Kupon kodu ile ara..."
                  type="text"
                  value={couponSearch}
                />
              </div>

              <select
                className="rounded-xl border border-zinc-200 bg-zinc-50/70 px-3 py-1.5 text-xs text-zinc-800 focus:border-blue-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
                onChange={(e) => setCouponCampaignFilter(e.target.value)}
                value={couponCampaignFilter}
              >
                <option value="">Tüm Kampanyalar</option>
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-1.5 font-semibold text-white text-xs hover:bg-blue-700"
              onClick={() => setIsBulkModalOpen(true)}
              type="button"
            >
              <Plus className="h-3.5 w-3.5" />
              Kupon Üret
            </button>
          </div>

          {/* Coupons Table */}
          <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            {loading ? (
              <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              </div>
            ) : coupons.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800">
                  <Ticket className="h-6 w-6 text-zinc-400" />
                </div>
                <h3 className="mt-3 font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                  Kayıtlı Kupon Kodu Bulunamadı
                </h3>
                <p className="mt-1 max-w-sm text-xs text-zinc-500">
                  Kampanyalarınıza özel tekil veya toplu kupon kodları üreterek
                  pazarlama faaliyetlerinizi hızlandırın.
                </p>
                <button
                  className="mt-4 flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 font-medium text-white text-xs shadow-sm hover:bg-blue-700"
                  onClick={() => setIsBulkModalOpen(true)}
                  type="button"
                >
                  <Ticket className="h-4 w-4" />
                  Kupon Üreticiyi Aç
                </button>
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="border-zinc-100 border-b bg-zinc-50/70 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/50">
                  <tr>
                    <th className="px-4 py-3.5 font-semibold">Kupon Kodu</th>
                    <th className="px-4 py-3.5 font-semibold">Kampanya</th>
                    <th className="px-4 py-3.5 font-semibold">Tür</th>
                    <th className="px-4 py-3.5 font-semibold">
                      Kullanım Durumu
                    </th>
                    <th className="px-4 py-3.5 font-semibold">Son Kullanma</th>
                    <th className="px-4 py-3.5 font-semibold">Batch ID</th>
                    <th className="px-4 py-3.5 text-right font-semibold">
                      İşlemler
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {coupons.map((coup) => (
                    <tr
                      className="transition-colors hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40"
                      key={coup.id}
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <code className="rounded bg-zinc-100 px-2 py-1 font-bold font-mono text-blue-700 dark:bg-zinc-800 dark:text-blue-300">
                            {coup.code}
                          </code>
                          <button
                            className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800"
                            onClick={() => handleCopyCode(coup.code)}
                            title="Kodu Kopyala"
                            type="button"
                          >
                            {copiedCode === coup.code ? (
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-medium text-zinc-900 dark:text-zinc-100">
                        {coup.campaignName || "Genel Kampanya"}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="rounded-md bg-zinc-100 px-2 py-0.5 font-medium text-[11px] text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                          {coup.type === "SingleUse"
                            ? "Tek Kullanımlık"
                            : "Standart / Çoklu"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                            <div
                              className="h-full bg-blue-600"
                              style={{
                                width: `${Math.min(100, (coup.usedCount / coup.maxUses) * 100)}%`,
                              }}
                            />
                          </div>
                          <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                            {coup.usedCount} / {coup.maxUses}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-zinc-500">
                        {coup.expiresAt
                          ? new Date(coup.expiresAt).toLocaleDateString("tr-TR")
                          : "Süresiz"}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-[11px] text-zinc-400">
                        {coup.batchId || "-"}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <button
                          className="rounded-lg p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/50 dark:hover:text-red-400"
                          onClick={() => handleDeleteCoupon(coup.id, coup.code)}
                          title="Sil"
                          type="button"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: SIMULATOR */}
      {activeTab === "simulator" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Column: Cart Builder */}
          <div className="space-y-4 lg:col-span-7">
            <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <h3 className="flex items-center gap-2 font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                <ShoppingCart className="h-4 w-4 text-blue-600" />
                Örnek Sepet Oluştur
              </h3>
              <p className="mt-1 text-xs text-zinc-500">
                Kataloğunuzdaki ürünlerden sepete ekleyin ve kampanyaların
                indirim sonuçlarını test edin.
              </p>

              {/* Product quick add */}
              <div className="mt-4">
                <label className="font-medium text-xs text-zinc-600 dark:text-zinc-400">
                  Ürün Ekle
                </label>
                <div className="mt-1.5 flex max-h-36 flex-wrap gap-2 overflow-y-auto p-1">
                  {availableProducts.slice(0, 15).map((p) => (
                    <button
                      className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs text-zinc-800 hover:border-blue-500 hover:bg-blue-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:border-blue-500"
                      key={p.id}
                      onClick={() => addSimItem(p)}
                      type="button"
                    >
                      <Plus className="h-3 w-3 text-blue-600" />
                      <span>{p.name}</span>
                      <span className="font-semibold text-zinc-500">
                        ₺{p.sellingPrice}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Selected Cart Items */}
              <div className="mt-5 space-y-2">
                <label className="font-medium text-xs text-zinc-600 dark:text-zinc-400">
                  Sepetteki Ürünler ({simCartItems.length})
                </label>
                {simCartItems.length === 0 ? (
                  <div className="rounded-xl border border-zinc-200 border-dashed p-6 text-center text-xs text-zinc-400 dark:border-zinc-800">
                    Sepetiniz boş. Yukarıdaki ürünlerden tıklayarak sepete
                    ekleyin.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {simCartItems.map((item) => (
                      <div
                        className="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50/60 p-3 text-xs dark:border-zinc-800 dark:bg-zinc-950"
                        key={item.productId}
                      >
                        <div>
                          <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                            {item.productName}
                          </span>
                          <div className="text-[11px] text-zinc-400">
                            ₺{item.unitPrice} / adet
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-24">
                            <NumberInput
                              className="h-8 text-xs"
                              min={1}
                              onChange={(val) => {
                                setSimCartItems((prev) =>
                                  prev.map((i) =>
                                    i.productId === item.productId
                                      ? { ...i, quantity: val }
                                      : i
                                  )
                                );
                              }}
                              value={item.quantity}
                            />
                          </div>
                          <span className="min-w-[70px] text-right font-bold text-zinc-900 dark:text-zinc-100">
                            ₺
                            {(item.unitPrice * item.quantity).toLocaleString(
                              "tr-TR",
                              { minimumFractionDigits: 2 }
                            )}
                          </span>
                          <button
                            className="rounded p-1 text-zinc-400 hover:text-red-500"
                            onClick={() => removeSimItem(item.productId)}
                            type="button"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Coupon Code Input & Test Button */}
              <div className="mt-5 flex items-center gap-3 border-zinc-100 border-t pt-4 dark:border-zinc-800">
                <div className="relative flex-1">
                  <Ticket className="absolute top-2.5 left-3 h-4 w-4 text-zinc-400" />
                  <input
                    className="w-full rounded-xl border border-zinc-200 bg-white py-2 pr-3 pl-9 font-mono text-xs text-zinc-800 uppercase focus:border-blue-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
                    onChange={(e) =>
                      setSimCouponCode(e.target.value.toUpperCase())
                    }
                    placeholder="Opsiyonel Kupon Kodu (Örn: YAZ2026)"
                    type="text"
                    value={simCouponCode}
                  />
                </div>
                <button
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 font-semibold text-white text-xs shadow-sm hover:bg-blue-700 disabled:opacity-50"
                  disabled={simLoading || simCartItems.length === 0}
                  onClick={runSimulation}
                  type="button"
                >
                  {simLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  Hesapla & Test Et
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Simulation Result */}
          <div className="space-y-4 lg:col-span-5">
            <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <h3 className="flex items-center gap-2 font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                <BarChart3 className="h-4 w-4 text-emerald-600" />
                İndirim Motoru Sonuç Özeti
              </h3>

              {simResult ? (
                <div className="mt-4 space-y-4 text-xs">
                  {simResult.couponValidationMessage && (
                    <div
                      className={`flex items-center gap-2 rounded-xl border p-3 ${
                        simResult.isCouponValid
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300"
                          : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300"
                      }`}
                    >
                      {simResult.isCouponValid ? (
                        <Check className="h-4 w-4 shrink-0" />
                      ) : (
                        <AlertCircle className="h-4 w-4 shrink-0" />
                      )}
                      <span>{simResult.couponValidationMessage}</span>
                    </div>
                  )}

                  {/* Applied Promotions Breakdown */}
                  <div>
                    <span className="font-semibold text-zinc-600 dark:text-zinc-400">
                      Uygulanan Kampanyalar:
                    </span>
                    {simResult.appliedPromotions.length === 0 ? (
                      <p className="mt-1 text-zinc-400 italic">
                        Hiçbir kampanya koşulu sağlanmadı.
                      </p>
                    ) : (
                      <div className="mt-2 space-y-2">
                        {simResult.appliedPromotions.map((p, idx) => (
                          <div
                            className="flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50/50 p-2.5 dark:border-blue-900/30 dark:bg-blue-950/20"
                            key={idx}
                          >
                            <div>
                              <div className="font-semibold text-blue-950 dark:text-blue-200">
                                {p.campaignName}
                              </div>
                              <div className="text-[11px] text-blue-600 dark:text-blue-400">
                                {p.description}
                              </div>
                            </div>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">
                              -₺
                              {p.discountAmount.toLocaleString("tr-TR", {
                                minimumFractionDigits: 2,
                              })}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Totals */}
                  <div className="space-y-2 border-zinc-100 border-t pt-3 dark:border-zinc-800">
                    <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                      <span>Ara Toplam (Brüt):</span>
                      <span className="font-medium">
                        ₺
                        {simResult.subtotal.toLocaleString("tr-TR", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                      <span>Toplam İndirim:</span>
                      <span className="font-bold">
                        -₺
                        {simResult.totalDiscountAmount.toLocaleString("tr-TR", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                      <span>Kargo Ücreti:</span>
                      <span>
                        {simResult.isFreeShipping ? (
                          <span className="font-semibold text-emerald-600">
                            Ücretsiz (0,00 ₺)
                          </span>
                        ) : (
                          `₺${simResult.shippingFee.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}`
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between border-zinc-200 border-t pt-2 font-bold text-sm text-zinc-900 dark:border-zinc-700 dark:text-zinc-100">
                      <span>Net Ödenecek Tutar:</span>
                      <span className="text-blue-600 dark:text-blue-400">
                        ₺
                        {(
                          simResult.netTotal + simResult.shippingFee
                        ).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-zinc-200 border-dashed p-8 text-center text-xs text-zinc-400 dark:border-zinc-800">
                  Sonuçları görmek için sol taraftan ürün seçip &quot;Hesapla
                  &amp; Test Et&quot; butonuna tıklayın.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Campaign Create & Edit Modal */}
      {activeTenant && (
        <CampaignModal
          campaignId={editingCampaignId}
          isOpen={isCampaignModalOpen}
          onClose={() => setIsCampaignModalOpen(false)}
          onSuccess={() => {
            loadData();
          }}
          tenantId={activeTenant.id}
        />
      )}

      {/* Bulk Coupon Generator Modal */}
      <BulkCouponModal
        campaigns={campaigns}
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        onSuccess={() => {
          loadData();
        }}
        tenantId={activeTenant?.id}
      />

      {/* Confirm Dialog */}
      <ConfirmDialog
        cancelText={confirmDialog.cancelText}
        confirmText={confirmDialog.confirmText}
        description={confirmDialog.description}
        loading={confirmDialog.loading}
        onConfirm={confirmDialog.onConfirm}
        onOpenChange={(open) => setConfirmDialog((prev) => ({ ...prev, open }))}
        open={confirmDialog.open}
        title={confirmDialog.title}
        variant={confirmDialog.variant}
      />
    </PageContainer>
  );
}
