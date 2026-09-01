"use client";

import { DatePicker } from "@workspace/ui/components/date-picker";
import { NumberInput } from "@workspace/ui/components/number-input";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  Coins,
  Layers,
  Loader2,
  Package,
  Percent,
  Sparkles,
  Tag,
  Ticket,
  Trash2,
  TrendingUp,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ApiClient,
  type CreateCampaignPayload,
  type CreateCampaignTargetPayload,
  type ProductCategoryDto,
  type ProductListDto,
} from "@/lib/api-client";
import { usePermissions } from "@/lib/permissions/permission-context";

export default function NewCampaignPage() {
  const params = useParams();
  const router = useRouter();
  const tenantSlug = (params?.tenantSlug as string) || "";
  const { activeTenant } = usePermissions();

  useEffect(() => {
    if (tenantSlug) {
      router.replace(`/${tenantSlug}/promotions?create=true`);
    }
  }, [tenantSlug, router]);

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Available catalog
  const [products, setProducts] = useState<ProductListDto[]>([]);
  const [categories, setCategories] = useState<ProductCategoryDto[]>([]);

  // Step 1: Basic Info
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState("");
  const [priority, setPriority] = useState<number>(10);
  const [isStackable, setIsStackable] = useState<boolean>(false);

  // Step 2: Discount Mechanism
  const [type, setType] = useState<string>("Percentage");
  const [discountValue, setDiscountValue] = useState<number>(20);
  const [minOrderAmount, setMinOrderAmount] = useState<number>(0);
  const [maxDiscountAmount, setMaxDiscountAmount] = useState<
    number | undefined
  >(undefined);
  const [minQuantity, setMinQuantity] = useState<number>(1);
  const [buyQuantity, setBuyQuantity] = useState<number>(2);
  const [getQuantity, setGetQuantity] = useState<number>(1);
  const [getDiscountRate, setGetDiscountRate] = useState<number>(100);

  // Step 3: Targets & Scope
  const [scopeMode, setScopeMode] = useState<"all" | "custom">("all");
  const [targets, setTargets] = useState<CreateCampaignTargetPayload[]>([]);

  // Step 4: Triggers & Coupon
  const [triggerType, setTriggerType] = useState<string>("Automatic");
  const [initialCouponCode, setInitialCouponCode] = useState("");
  const [totalUsageLimit, setTotalUsageLimit] = useState<number | undefined>(
    undefined
  );
  const [perCustomerUsageLimit, setPerCustomerUsageLimit] = useState<number>(1);

  useEffect(() => {
    if (!activeTenant) {
      return;
    }
    const fetchCatalog = async () => {
      try {
        const [prodRes, catRes] = await Promise.all([
          ApiClient.getProducts({ pageSize: 100 }, activeTenant.id),
          ApiClient.getProductCategories(activeTenant.id),
        ]);
        if (prodRes.success && prodRes.data) {
          setProducts(prodRes.data.items || []);
        }
        if (catRes.success && catRes.data) {
          setCategories(catRes.data || []);
        }
      } catch {
        // ignore
      }
    };
    fetchCatalog();
  }, [activeTenant]);

  const addProductTarget = (
    productId: string,
    condition: "Include" | "Exclude"
  ) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) {
      return;
    }
    if (
      targets.some(
        (t) => t.targetType === "Product" && t.targetId === productId
      )
    ) {
      return;
    }

    setTargets((prev) => [
      ...prev,
      {
        ruleCondition: condition,
        targetId: productId,
        targetName: prod.name,
        targetType: "Product",
      },
    ]);
  };

  const addCategoryTarget = (
    categoryId: string,
    condition: "Include" | "Exclude"
  ) => {
    const cat = categories.find((c) => c.id === categoryId);
    if (!cat) {
      return;
    }
    if (
      targets.some(
        (t) => t.targetType === "Category" && t.targetId === categoryId
      )
    ) {
      return;
    }

    setTargets((prev) => [
      ...prev,
      {
        ruleCondition: condition,
        targetId: categoryId,
        targetName: cat.name,
        targetType: "Category",
      },
    ]);
  };

  const removeTarget = (index: number) => {
    setTargets((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleNext = () => {
    setError(null);
    if (currentStep === 1 && !name.trim()) {
      setError("Lütfen kampanya adını giriniz.");
      return;
    }
    if (currentStep === 2 && discountValue <= 0 && type !== "FreeShipping") {
      setError("Lütfen geçerli bir indirim değeri giriniz.");
      return;
    }
    if (
      currentStep === 4 &&
      triggerType === "CouponCode" &&
      !initialCouponCode.trim()
    ) {
      setError(
        "Kupon koduyla tetiklenen kampanya için bir kupon kodu belirlemelisiniz."
      );
      return;
    }
    setCurrentStep((prev) => prev + 1);
  };

  const handlePrev = () => {
    setError(null);
    setCurrentStep((prev) => prev - 1);
  };

  const handleSubmit = async () => {
    if (!activeTenant) {
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const payload: CreateCampaignPayload = {
        buyQuantity: type === "BuyXGetY" ? buyQuantity : undefined,
        code: code.trim() || undefined,
        description: description.trim() || undefined,
        discountValue: type === "FreeShipping" ? 0 : discountValue,
        endDate: endDate ? new Date(endDate).toISOString() : undefined,
        getDiscountRate: type === "BuyXGetY" ? getDiscountRate : undefined,
        getQuantity: type === "BuyXGetY" ? getQuantity : undefined,
        initialCouponCode:
          triggerType === "CouponCode"
            ? initialCouponCode.trim().toUpperCase()
            : undefined,
        isActive: true,
        isStackable,
        maxDiscountAmount: maxDiscountAmount || undefined,
        minOrderAmount: minOrderAmount || 0,
        minQuantity: minQuantity || 1,
        name: name.trim(),
        perCustomerUsageLimit: perCustomerUsageLimit || 1,
        priority: priority || 0,
        startDate: startDate
          ? new Date(startDate).toISOString()
          : new Date().toISOString(),
        targets: scopeMode === "custom" ? targets : [],
        totalUsageLimit: totalUsageLimit || undefined,
        triggerType,
        type,
      };

      const res = await ApiClient.createCampaign(payload, activeTenant.id);
      if (res.success) {
        router.push(`/${tenantSlug}/promotions`);
      } else {
        setError(res.message || "Kampanya oluşturulurken bir hata oluştu.");
      }
    } catch {
      setError("Sunucuya bağlanırken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { num: 1, title: "Genel Bilgiler" },
    { num: 2, title: "İndirim Tipi" },
    { num: 3, title: "Hedefleme" },
    { num: 4, title: "Tetikleyici & Limit" },
    { num: 5, title: "Özet & Onay" },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-16">
      {/* Header */}
      <div className="flex items-center justify-between border-zinc-200/80 border-b pb-4 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <Link
            className="rounded-xl border border-zinc-200 p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800"
            href={`/${tenantSlug}/promotions`}
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="font-bold text-xl text-zinc-900 dark:text-zinc-50">
              Yeni Kampanya Oluştur
            </h1>
            <p className="text-xs text-zinc-500">
              5 adımda gelişmiş indirim ve promosyon kuralları tanımlayın
            </p>
          </div>
        </div>
      </div>

      {/* Stepper Wizard Bar */}
      <div className="grid grid-cols-5 gap-2">
        {steps.map((s) => {
          const isDone = currentStep > s.num;
          const isCurrent = currentStep === s.num;
          return (
            <div
              className={`rounded-xl border p-2.5 text-center transition-all ${
                isCurrent
                  ? "border-violet-600 bg-violet-50/70 text-violet-700 shadow-xs dark:border-violet-500 dark:bg-violet-950/40 dark:text-violet-300"
                  : isDone
                    ? "border-emerald-200 bg-emerald-50/50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-400"
                    : "border-zinc-200 bg-zinc-50 text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900/50"
              }`}
              key={s.num}
            >
              <div className="flex items-center justify-center gap-1.5 font-semibold text-xs">
                {isDone ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <span>{s.num}.</span>
                )}
                <span className="hidden sm:inline">{s.title}</span>
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-red-700 text-xs dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* STEP 1: BASIC INFO */}
      {currentStep === 1 && (
        <div className="space-y-4 rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="flex items-center gap-2 font-semibold text-sm text-zinc-900 dark:text-zinc-100">
            <Tag className="h-4 w-4 text-violet-600" />
            Adım 1: Temel Bilgiler & Zamanlama
          </h2>

          <div className="space-y-4">
            <div>
              <label className="mb-1 block font-medium text-xs text-zinc-700 dark:text-zinc-300">
                Kampanya Başlığı / Adı *
              </label>
              <input
                className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-sm text-zinc-800 focus:border-violet-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
                onChange={(e) => setName(e.target.value)}
                placeholder="Örn: Yaz Sezonu %20 İndirimi, 1000 TL Üzeri Kargo Bedava"
                required
                type="text"
                value={name}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block font-medium text-xs text-zinc-700 dark:text-zinc-300">
                  Dahili Takip Kodu (Opsiyonel)
                </label>
                <input
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2 font-mono text-sm text-zinc-800 uppercase focus:border-violet-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="Örn: CAMP-SUMMER-2026"
                  type="text"
                  value={code}
                />
              </div>

              <div>
                <label className="mb-1 block font-medium text-xs text-zinc-700 dark:text-zinc-300">
                  Öncelik Sırası (Priority)
                </label>
                <NumberInput
                  className="w-full"
                  min={0}
                  onChange={(val) => setPriority(val)}
                  step={5}
                  value={priority}
                />
                <p className="mt-1 text-[11px] text-zinc-400">
                  Yüksek öncelikli kampanyalar ilk sırada hesaplanır.
                </p>
              </div>
            </div>

            <div>
              <label className="mb-1 block font-medium text-xs text-zinc-700 dark:text-zinc-300">
                Açıklama & Kampanya Detayları
              </label>
              <textarea
                className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-sm text-zinc-800 focus:border-violet-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Kampanya şartları ve müşteriye görünecek detaylar..."
                rows={2}
                value={description}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block font-medium text-xs text-zinc-700 dark:text-zinc-300">
                  Başlangıç Tarihi *
                </label>
                <DatePicker
                  className="w-full"
                  onChange={(val) => setStartDate(val)}
                  placeholder="Başlangıç tarihi seçiniz"
                  value={startDate}
                />
              </div>

              <div>
                <label className="mb-1 block font-medium text-xs text-zinc-700 dark:text-zinc-300">
                  Bitiş Tarihi (Opsiyonel)
                </label>
                <DatePicker
                  className="w-full"
                  onChange={(val) => setEndDate(val)}
                  placeholder="Bitiş tarihi seçiniz (Süresiz için boş)"
                  value={endDate}
                />
              </div>
            </div>

            {/* Custom Styled Switch for Stacking */}
            <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50/70 p-3.5 dark:border-zinc-800 dark:bg-zinc-950">
              <div>
                <span className="font-semibold text-xs text-zinc-800 dark:text-zinc-200">
                  Diğer Kampanyalarla Birleştirilebilir mi? (Stacking)
                </span>
                <p className="text-[11px] text-zinc-500">
                  Açık ise, bu kampanya diğer indirimlerin üzerine ilave olarak
                  uygulanabilir.
                </p>
              </div>
              <button
                aria-checked={isStackable}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isStackable ? "bg-violet-600" : "bg-zinc-200 dark:bg-zinc-700"
                }`}
                onClick={() => setIsStackable(!isStackable)}
                role="switch"
                type="button"
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    isStackable ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: DISCOUNT TYPE */}
      {currentStep === 2 && (
        <div className="space-y-4 rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="flex items-center gap-2 font-semibold text-sm text-zinc-900 dark:text-zinc-100">
            <Coins className="h-4 w-4 text-violet-600" />
            Adım 2: İndirim Türü ve Mekanizması
          </h2>

          {/* Type Selection Cards */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              {
                desc: "Seçili ürünlerde veya sepette %X indirim",
                icon: Percent,
                id: "Percentage",
                name: "Yüzde İndirimi",
              },
              {
                desc: "Sepette veya üründe X TL doğrudan indirim",
                icon: Coins,
                id: "FixedAmount",
                name: "Sabit Tutar",
              },
              {
                desc: "X TL ve üzeri alışverişlerde indirim",
                icon: TrendingUp,
                id: "CartThreshold",
                name: "Sepet Barajı",
              },
              {
                desc: "Çoklu alımlarda hediye/indirimli ürün",
                icon: Layers,
                id: "BuyXGetY",
                name: "X Al Y Öde",
              },
              {
                desc: "Sipariş kargo ücretini sıfırlar",
                icon: Zap,
                id: "FreeShipping",
                name: "Kargo Bedava",
              },
            ].map((t) => {
              const Icon = t.icon;
              const isSelected = type === t.id;
              return (
                <button
                  className={`flex flex-col items-start rounded-xl border p-4 text-left transition-all ${
                    isSelected
                      ? "border-violet-600 bg-violet-50/70 shadow-xs dark:border-violet-500 dark:bg-violet-950/40"
                      : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950"
                  }`}
                  key={t.id}
                  onClick={() => setType(t.id)}
                  type="button"
                >
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-lg ${isSelected ? "bg-violet-600 text-white" : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"}`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="mt-2 font-semibold text-xs text-zinc-900 dark:text-zinc-100">
                    {t.name}
                  </span>
                  <span className="mt-0.5 text-[11px] text-zinc-500">
                    {t.desc}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Dynamic Configuration Fields based on Type */}
          <div className="space-y-4 border-zinc-100 border-t pt-4 dark:border-zinc-800">
            {type === "Percentage" && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block font-medium text-xs text-zinc-700 dark:text-zinc-300">
                    İndirim Yüzdesi (%) *
                  </label>
                  <NumberInput
                    className="w-full"
                    max={100}
                    min={1}
                    onChange={(val) => setDiscountValue(val)}
                    suffix="%"
                    value={discountValue}
                  />
                </div>
                <div>
                  <label className="mb-1 block font-medium text-xs text-zinc-700 dark:text-zinc-300">
                    Maksimum İndirim Tavanı (TL Cap - Opsiyonel)
                  </label>
                  <NumberInput
                    className="w-full"
                    min={0}
                    onChange={(val) =>
                      setMaxDiscountAmount(val > 0 ? val : undefined)
                    }
                    prefix="₺"
                    step={50}
                    value={maxDiscountAmount ?? 0}
                  />
                </div>
              </div>
            )}

            {type === "FixedAmount" && (
              <div>
                <label className="mb-1 block font-medium text-xs text-zinc-700 dark:text-zinc-300">
                  Sabit İndirim Tutarı (TL) *
                </label>
                <NumberInput
                  className="w-full"
                  min={1}
                  onChange={(val) => setDiscountValue(val)}
                  prefix="₺"
                  step={10}
                  value={discountValue}
                />
              </div>
            )}

            {type === "CartThreshold" && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block font-medium text-xs text-zinc-700 dark:text-zinc-300">
                    Minimum Sepet Tutarı (TL) *
                  </label>
                  <NumberInput
                    className="w-full"
                    min={1}
                    onChange={(val) => setMinOrderAmount(val)}
                    prefix="₺"
                    step={100}
                    value={minOrderAmount}
                  />
                </div>
                <div>
                  <label className="mb-1 block font-medium text-xs text-zinc-700 dark:text-zinc-300">
                    Sağlanan İndirim (TL veya %) *
                  </label>
                  <NumberInput
                    className="w-full"
                    min={1}
                    onChange={(val) => setDiscountValue(val)}
                    prefix="₺"
                    step={10}
                    value={discountValue}
                  />
                </div>
              </div>
            )}

            {type === "BuyXGetY" && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block font-medium text-xs text-zinc-700 dark:text-zinc-300">
                    Satın Alınacak Adet (X)
                  </label>
                  <NumberInput
                    className="w-full"
                    min={1}
                    onChange={(val) => setBuyQuantity(val)}
                    suffix="adet"
                    value={buyQuantity}
                  />
                </div>
                <div>
                  <label className="mb-1 block font-medium text-xs text-zinc-700 dark:text-zinc-300">
                    İndirimli Verilecek Adet (Y)
                  </label>
                  <NumberInput
                    className="w-full"
                    min={1}
                    onChange={(val) => setGetQuantity(val)}
                    suffix="adet"
                    value={getQuantity}
                  />
                </div>
                <div>
                  <label className="mb-1 block font-medium text-xs text-zinc-700 dark:text-zinc-300">
                    Y Ürünü İndirimi (%100 = Bedava)
                  </label>
                  <NumberInput
                    className="w-full"
                    max={100}
                    min={1}
                    onChange={(val) => setGetDiscountRate(val)}
                    suffix="%"
                    value={getDiscountRate}
                  />
                </div>
              </div>
            )}

            {type !== "CartThreshold" && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block font-medium text-xs text-zinc-700 dark:text-zinc-300">
                    Minimum Sepet Tutarı Şartı (0 = Limitsiz)
                  </label>
                  <NumberInput
                    className="w-full"
                    min={0}
                    onChange={(val) => setMinOrderAmount(val)}
                    prefix="₺"
                    step={50}
                    value={minOrderAmount}
                  />
                </div>
                <div>
                  <label className="mb-1 block font-medium text-xs text-zinc-700 dark:text-zinc-300">
                    Minimum Adet Şartı
                  </label>
                  <NumberInput
                    className="w-full"
                    min={1}
                    onChange={(val) => setMinQuantity(val)}
                    suffix="adet"
                    value={minQuantity}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* STEP 3: SCOPE & TARGETS */}
      {currentStep === 3 && (
        <div className="space-y-4 rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="flex items-center gap-2 font-semibold text-sm text-zinc-900 dark:text-zinc-100">
            <Package className="h-4 w-4 text-violet-600" />
            Adım 3: Hedefleme & Kapsam Kısıtlamaları
          </h2>

          <div className="grid grid-cols-2 gap-3">
            <button
              className={`rounded-xl border p-4 text-left transition-all ${
                scopeMode === "all"
                  ? "border-violet-600 bg-violet-50/70 dark:border-violet-500 dark:bg-violet-950/40"
                  : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
              }`}
              onClick={() => setScopeMode("all")}
              type="button"
            >
              <div className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">
                Tüm Katalogda Geçerli
              </div>
              <p className="mt-1 text-[11px] text-zinc-500">
                İstisnasız tüm ürün ve kategorilerde geçerli olur.
              </p>
            </button>

            <button
              className={`rounded-xl border p-4 text-left transition-all ${
                scopeMode === "custom"
                  ? "border-violet-600 bg-violet-50/70 dark:border-violet-500 dark:bg-violet-950/40"
                  : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
              }`}
              onClick={() => setScopeMode("custom")}
              type="button"
            >
              <div className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">
                Seçili Ürün & Kategoriler
              </div>
              <p className="mt-1 text-[11px] text-zinc-500">
                Belirli ürün veya kategorileri dahil edin veya hariç tutun.
              </p>
            </button>
          </div>

          {scopeMode === "custom" && (
            <div className="space-y-4 border-zinc-100 border-t pt-4 dark:border-zinc-800">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Add Product Target */}
                <div>
                  <label className="mb-1 block font-medium text-xs text-zinc-700 dark:text-zinc-300">
                    Ürün Ekle
                  </label>
                  <select
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-800 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
                    onChange={(e) => {
                      if (e.target.value) {
                        addProductTarget(e.target.value, "Include");
                        e.target.value = "";
                      }
                    }}
                  >
                    <option value="">Ürün seçerek dahil et...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (₺{p.sellingPrice})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Add Category Target */}
                <div>
                  <label className="mb-1 block font-medium text-xs text-zinc-700 dark:text-zinc-300">
                    Kategori Ekle
                  </label>
                  <select
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-800 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
                    onChange={(e) => {
                      if (e.target.value) {
                        addCategoryTarget(e.target.value, "Include");
                        e.target.value = "";
                      }
                    }}
                  >
                    <option value="">Kategori seçerek dahil et...</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Targets List */}
              <div className="space-y-2">
                <span className="font-medium text-xs text-zinc-600 dark:text-zinc-400">
                  Tanımlı Hedef Kurallar ({targets.length})
                </span>
                {targets.length === 0 ? (
                  <p className="rounded-xl border border-zinc-200 border-dashed p-4 text-center text-xs text-zinc-400 dark:border-zinc-800">
                    Henüz ürün veya kategori seçilmedi.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {targets.map((t, idx) => (
                      <div
                        className="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 p-2.5 text-xs dark:border-zinc-800 dark:bg-zinc-950"
                        key={idx}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded px-1.5 py-0.5 font-bold text-[10px] ${
                              t.ruleCondition === "Include"
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                                : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                            }`}
                          >
                            {t.ruleCondition === "Include" ? "DAHİL" : "HARİÇ"}
                          </span>
                          <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                            {t.targetName}
                          </span>
                          <span className="text-zinc-400">
                            ({t.targetType})
                          </span>
                        </div>
                        <button
                          className="rounded p-1 text-zinc-400 hover:text-red-600"
                          onClick={() => removeTarget(idx)}
                          type="button"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 4: TRIGGERS & COUPONS */}
      {currentStep === 4 && (
        <div className="space-y-4 rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="flex items-center gap-2 font-semibold text-sm text-zinc-900 dark:text-zinc-100">
            <Ticket className="h-4 w-4 text-violet-600" />
            Adım 4: Tetikleyici & Kupon Kotaları
          </h2>

          <div className="grid grid-cols-2 gap-3">
            <button
              className={`rounded-xl border p-4 text-left transition-all ${
                triggerType === "Automatic"
                  ? "border-violet-600 bg-violet-50/70 dark:border-violet-500 dark:bg-violet-950/40"
                  : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
              }`}
              onClick={() => setTriggerType("Automatic")}
              type="button"
            >
              <div className="flex items-center gap-1.5 font-semibold text-xs text-zinc-900 dark:text-zinc-100">
                <Zap className="h-4 w-4 text-amber-500" />
                Otomatik Kural
              </div>
              <p className="mt-1 text-[11px] text-zinc-500">
                Sepet şartları sağlandığında indirim anında sepete yansır (kod
                gerekmez).
              </p>
            </button>

            <button
              className={`rounded-xl border p-4 text-left transition-all ${
                triggerType === "CouponCode"
                  ? "border-violet-600 bg-violet-50/70 dark:border-violet-500 dark:bg-violet-950/40"
                  : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
              }`}
              onClick={() => setTriggerType("CouponCode")}
              type="button"
            >
              <div className="flex items-center gap-1.5 font-semibold text-xs text-zinc-900 dark:text-zinc-100">
                <Ticket className="h-4 w-4 text-violet-600" />
                Kupon Kodu Gerektiren
              </div>
              <p className="mt-1 text-[11px] text-zinc-500">
                Müşteri geçerli bir promosyon kodu girdiğinde indirim aktif
                olur.
              </p>
            </button>
          </div>

          <div className="space-y-4 border-zinc-100 border-t pt-4 dark:border-zinc-800">
            {triggerType === "CouponCode" && (
              <div>
                <label className="mb-1 block font-medium text-xs text-zinc-700 dark:text-zinc-300">
                  Birincil Kupon Kodu *
                </label>
                <input
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2 font-mono text-sm text-zinc-800 uppercase focus:border-violet-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
                  onChange={(e) =>
                    setInitialCouponCode(e.target.value.toUpperCase())
                  }
                  placeholder="Örn: BAHAR2026, HOSGELDIN"
                  required
                  type="text"
                  value={initialCouponCode}
                />
                <p className="mt-1 text-[11px] text-zinc-400">
                  Kampanyayı kaydettikten sonra ayrıca &quot;Kupon Üret&quot;
                  butonundan toplu rastgele kodlar da üretebilirsiniz.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block font-medium text-xs text-zinc-700 dark:text-zinc-300">
                  Toplam Maksimum Kullanım Limiti (Kota - 0 = Limitsiz)
                </label>
                <NumberInput
                  className="w-full"
                  min={0}
                  onChange={(val) =>
                    setTotalUsageLimit(val > 0 ? val : undefined)
                  }
                  step={50}
                  suffix="kullanım"
                  value={totalUsageLimit ?? 0}
                />
              </div>

              <div>
                <label className="mb-1 block font-medium text-xs text-zinc-700 dark:text-zinc-300">
                  Müşteri Başı Maksimum Kullanım
                </label>
                <NumberInput
                  className="w-full"
                  min={1}
                  onChange={(val) => setPerCustomerUsageLimit(val)}
                  suffix="kez"
                  value={perCustomerUsageLimit}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 5: REVIEW & CONFIRM */}
      {currentStep === 5 && (
        <div className="space-y-4 rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="flex items-center gap-2 font-semibold text-sm text-zinc-900 dark:text-zinc-100">
            <Sparkles className="h-4 w-4 text-violet-600" />
            Adım 5: Kampanya Özeti & Onay
          </h2>

          <div className="grid grid-cols-1 gap-4 text-xs sm:grid-cols-2">
            <div className="space-y-2 rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
              <span className="font-semibold text-zinc-600 dark:text-zinc-400">
                Kampanya Bilgileri:
              </span>
              <div className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                {name}
              </div>
              {code && (
                <div className="font-mono text-zinc-500">Kod: {code}</div>
              )}
              <div className="text-zinc-500">
                Tarih:{" "}
                {startDate
                  ? new Date(startDate).toLocaleDateString("tr-TR")
                  : "-"}{" "}
                {endDate
                  ? `- ${new Date(endDate).toLocaleDateString("tr-TR")}`
                  : "(Süresiz)"}
              </div>
              <div className="flex gap-2">
                <span className="rounded bg-zinc-200 px-2 py-0.5 font-medium text-[11px] text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                  Öncelik: {priority}
                </span>
                {isStackable && (
                  <span className="rounded bg-emerald-100 px-2 py-0.5 font-medium text-[11px] text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                    Birleşebilir
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-2 rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
              <span className="font-semibold text-zinc-600 dark:text-zinc-400">
                İndirim & Tetikleyici:
              </span>
              <div className="font-bold text-sm text-violet-600 dark:text-violet-400">
                {type === "Percentage" && `%${discountValue} Yüzde İndirimi`}
                {type === "FixedAmount" &&
                  `₺${discountValue} Sabit Tutar İndirimi`}
                {type === "CartThreshold" &&
                  `₺${minOrderAmount} Üzeri %${discountValue} İndirim`}
                {type === "BuyXGetY" && `${buyQuantity} Al ${getQuantity} Öde`}
                {type === "FreeShipping" && "Ücretsiz Kargo"}
              </div>
              <div className="text-zinc-500">
                Tetikleyici:{" "}
                {triggerType === "Automatic"
                  ? "Otomatik Sepet Kuralı"
                  : `Kupon Kodu (${initialCouponCode})`}
              </div>
              <div className="text-zinc-500">
                Kapsam:{" "}
                {scopeMode === "all"
                  ? "Tüm Katalog"
                  : `${targets.length} Hedef Ürün/Kategori`}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between border-zinc-200/80 border-t pt-4 dark:border-zinc-800">
        {currentStep > 1 ? (
          <button
            className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2 font-semibold text-xs text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
            onClick={handlePrev}
            type="button"
          >
            <ArrowLeft className="h-4 w-4" />
            Önceki Adım
          </button>
        ) : (
          <div />
        )}

        {currentStep < 5 ? (
          <button
            className="flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2 font-semibold text-white text-xs shadow-xs hover:bg-violet-700"
            onClick={handleNext}
            type="button"
          >
            <span>Sonraki Adım</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 font-bold text-white text-xs shadow-xs hover:bg-emerald-700 disabled:opacity-50"
            disabled={loading}
            onClick={handleSubmit}
            type="button"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            <span>Kampanyayı Başlat & Kaydet</span>
          </button>
        )}
      </div>
    </div>
  );
}
