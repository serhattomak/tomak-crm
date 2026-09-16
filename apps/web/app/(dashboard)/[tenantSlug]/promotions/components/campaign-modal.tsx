"use client";

import { Combobox } from "@workspace/ui/components/combobox";
import { DatePicker } from "@workspace/ui/components/date-picker";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { NumberInput } from "@workspace/ui/components/number-input";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  Coins,
  Layers,
  Loader2,
  Percent,
  Save,
  Tag,
  Ticket,
  Trash2,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ApiClient,
  type CreateCampaignPayload,
  type CreateCampaignTargetPayload,
  type ProductCategoryDto,
  type ProductListDto,
  type UpdateCampaignPayload,
} from "@/lib/api-client";

interface CampaignModalProps {
  campaignId?: string | null; // null = Create mode, string = Edit mode
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  tenantId: string;
}

export function CampaignModal({
  isOpen,
  onClose,
  campaignId,
  tenantId,
  onSuccess,
}: CampaignModalProps) {
  const isEditMode = Boolean(campaignId);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Catalog
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
  const [isActive, setIsActive] = useState<boolean>(true);

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

  // Load catalog & existing data
  useEffect(() => {
    if (!(isOpen && tenantId)) {
      return;
    }

    const loadInitialData = async () => {
      setFetching(true);
      setError(null);
      try {
        const [prodRes, catRes] = await Promise.all([
          ApiClient.getProducts({ pageSize: 100 }, tenantId),
          ApiClient.getProductCategories(tenantId),
        ]);

        if (prodRes.success && prodRes.data) {
          setProducts(prodRes.data.items || []);
        }
        if (catRes.success && catRes.data) {
          setCategories(catRes.data || []);
        }

        if (campaignId) {
          const campRes = await ApiClient.getCampaignById(campaignId, tenantId);
          if (campRes.success && campRes.data) {
            const c = campRes.data;
            setName(c.name);
            setCode(c.code || "");
            setDescription(c.description || "");
            setType(c.type);
            setTriggerType(c.triggerType);
            setDiscountValue(c.discountValue);
            setMinOrderAmount(c.minOrderAmount);
            setMaxDiscountAmount(c.maxDiscountAmount);
            setMinQuantity(c.minQuantity);
            setBuyQuantity(c.buyQuantity);
            setGetQuantity(c.getQuantity);
            setGetDiscountRate(c.getDiscountRate);
            setStartDate(c.startDate ? c.startDate.split("T")[0] || "" : "");
            setEndDate(c.endDate ? c.endDate.split("T")[0] || "" : "");
            setIsActive(c.isActive);
            setPriority(c.priority);
            setIsStackable(c.isStackable);
            setTotalUsageLimit(c.totalUsageLimit);
            setPerCustomerUsageLimit(c.perCustomerUsageLimit || 1);
            setScopeMode(c.targets && c.targets.length > 0 ? "custom" : "all");
            setTargets(
              (c.targets || []).map((t) => ({
                ruleCondition: t.ruleCondition,
                targetId: t.targetId,
                targetName: t.targetName,
                targetType: t.targetType,
              }))
            );
          }
        } else {
          // Reset for new creation
          setCurrentStep(1);
          setName("");
          setCode("");
          setDescription("");
          setStartDate(new Date().toISOString().split("T")[0]);
          setEndDate("");
          setPriority(10);
          setIsStackable(false);
          setIsActive(true);
          setType("Percentage");
          setDiscountValue(20);
          setMinOrderAmount(0);
          setMaxDiscountAmount(undefined);
          setMinQuantity(1);
          setBuyQuantity(2);
          setGetQuantity(1);
          setGetDiscountRate(100);
          setScopeMode("all");
          setTargets([]);
          setTriggerType("Automatic");
          setInitialCouponCode("");
          setTotalUsageLimit(undefined);
          setPerCustomerUsageLimit(1);
        }
      } catch {
        setError("Veriler yüklenirken bir hata oluştu.");
      } finally {
        setFetching(false);
      }
    };

    loadInitialData();
  }, [isOpen, campaignId, tenantId]);

  if (!isOpen) {
    return null;
  }

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
      !isEditMode &&
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
    setLoading(true);
    setError(null);

    try {
      if (isEditMode && campaignId) {
        const updatePayload: UpdateCampaignPayload = {
          buyQuantity: type === "BuyXGetY" ? buyQuantity : undefined,
          code: code.trim() || undefined,
          description: description.trim() || undefined,
          discountValue: type === "FreeShipping" ? 0 : discountValue,
          endDate: endDate ? new Date(endDate).toISOString() : undefined,
          getDiscountRate: type === "BuyXGetY" ? getDiscountRate : undefined,
          getQuantity: type === "BuyXGetY" ? getQuantity : undefined,
          isActive,
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

        const res = await ApiClient.updateCampaign(
          campaignId,
          updatePayload,
          tenantId
        );
        if (res.success) {
          toast.success("Kampanya başarıyla güncellendi.");
          onSuccess();
          onClose();
        } else {
          const msg = res.message || "Güncelleme başarısız oldu.";
          setError(msg);
          toast.error(msg);
        }
      } else {
        const createPayload: CreateCampaignPayload = {
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

        const res = await ApiClient.createCampaign(createPayload, tenantId);
        if (res.success) {
          toast.success("Yeni kampanya başarıyla oluşturuldu.");
          onSuccess();
          onClose();
        } else {
          const msg = res.message || "Kampanya oluşturulurken bir hata oluştu.";
          setError(msg);
          toast.error(msg);
        }
      }
    } catch {
      const msg = "Sunucuya bağlanırken bir hata oluştu.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { num: 1, title: "Genel Bilgiler" },
    { num: 2, title: "İndirim Tipi" },
    { num: 3, title: "Hedefleme" },
    { num: 4, title: "Tetikleyici & Kota" },
    { num: 5, title: "Özet & Onay" },
  ];

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
      open
    >
      <DialogContent
        aria-describedby={undefined}
        className="flex max-h-[90vh] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl"
        showCloseButton={false}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-border border-b px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
              <Tag className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                {isEditMode ? "Kampanyayı Düzenle" : "Yeni Kampanya Oluştur"}
              </DialogTitle>
              <p className="text-xs text-zinc-500">
                {isEditMode
                  ? name
                  : "5 adımda gelişmiş indirim ve promosyon kuralları tanımlayın"}
              </p>
            </div>
          </div>
          <DialogClose asChild>
            <button
              className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              type="button"
            >
              <X className="h-5 w-5" />
            </button>
          </DialogClose>
        </div>

        {/* Step Indicators */}
        <div className="grid grid-cols-5 border-border border-b bg-zinc-50/50 px-6 py-2.5 dark:bg-zinc-950/30">
          {steps.map((s) => {
            const isDone = currentStep > s.num;
            const isCurrent = currentStep === s.num;
            return (
              <button
                className={`flex items-center justify-center gap-1.5 py-1 font-semibold text-xs transition-all ${
                  isCurrent
                    ? "border-blue-600 border-b-2 font-bold text-blue-600 dark:text-blue-400"
                    : isDone
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                }`}
                key={s.num}
                onClick={() => setCurrentStep(s.num)}
                type="button"
              >
                {isDone ? <Check className="h-3 w-3" /> : <span>{s.num}.</span>}
                <span className="hidden sm:inline">{s.title}</span>
              </button>
            );
          })}
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {fetching ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : (
            <div className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-red-700 text-xs dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* STEP 1: Basic Info */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block font-medium text-xs text-zinc-700 dark:text-zinc-300">
                      Kampanya Başlığı / Adı *
                    </label>
                    <input
                      className="w-full rounded-xl border border-border bg-card px-3.5 py-2 text-xs text-zinc-800 focus:border-blue-500 focus:outline-none dark:text-zinc-200"
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
                        className="w-full rounded-xl border border-border bg-card px-3.5 py-2 font-mono text-xs text-zinc-800 uppercase focus:border-blue-500 focus:outline-none dark:text-zinc-200"
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
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block font-medium text-xs text-zinc-700 dark:text-zinc-300">
                      Açıklama & Kampanya Detayları
                    </label>
                    <textarea
                      className="w-full rounded-xl border border-border bg-card px-3.5 py-2 text-xs text-zinc-800 focus:border-blue-500 focus:outline-none dark:text-zinc-200"
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
                        placeholder="Bitiş tarihi (Süresiz için boş)"
                        value={endDate}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-border bg-zinc-50/70 p-3.5 dark:bg-zinc-950">
                    <div>
                      <span className="font-semibold text-xs text-zinc-800 dark:text-zinc-200">
                        Diğer Kampanyalarla Birleşebilir (Stacking)
                      </span>
                      <p className="text-2xs text-zinc-500">
                        Açık ise diğer sepet indirimlerinin üzerine ilave
                        uygulanır.
                      </p>
                    </div>
                    <button
                      aria-checked={isStackable}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        isStackable
                          ? "bg-blue-600"
                          : "bg-zinc-200 dark:bg-zinc-700"
                      }`}
                      onClick={() => setIsStackable(!isStackable)}
                      role="switch"
                      type="button"
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-card shadow-md ring-0 transition duration-200 ease-in-out ${ isStackable ? "translate-x-5" : "translate-x-0" }`}
                      />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: Discount Mechanism */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                    {[
                      {
                        desc: "%X indirim",
                        icon: Percent,
                        id: "Percentage",
                        name: "Yüzde İndirimi",
                      },
                      {
                        desc: "X TL indirim",
                        icon: Coins,
                        id: "FixedAmount",
                        name: "Sabit Tutar",
                      },
                      {
                        desc: "X TL üzeri indirim",
                        icon: TrendingUp,
                        id: "CartThreshold",
                        name: "Sepet Barajı",
                      },
                      {
                        desc: "Paket kampanyası",
                        icon: Layers,
                        id: "BuyXGetY",
                        name: "X Al Y Öde",
                      },
                      {
                        desc: "0 TL kargo",
                        icon: Zap,
                        id: "FreeShipping",
                        name: "Kargo Bedava",
                      },
                    ].map((t) => {
                      const Icon = t.icon;
                      const isSelected = type === t.id;
                      return (
                        <button
                          className={`flex flex-col items-start rounded-xl border p-3 text-left transition-all ${ isSelected ? "border-blue-600 bg-blue-50/70 shadow-xs dark:border-blue-500 dark:bg-blue-950/40" : "border-border bg-card hover:border-zinc-300" }`}
                          key={t.id}
                          onClick={() => setType(t.id)}
                          type="button"
                        >
                          <div
                            className={`flex h-7 w-7 items-center justify-center rounded-lg ${isSelected ? "bg-blue-600 text-white" : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"}`}
                          >
                            <Icon className="h-3.5 w-3.5" />
                          </div>
                          <span className="mt-2 font-semibold text-xs text-zinc-900 dark:text-zinc-100">
                            {t.name}
                          </span>
                          <span className="mt-0.5 text-3xs text-zinc-500">
                            {t.desc}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="space-y-3 border-border border-t pt-3">
                    {type === "Percentage" && (
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                            Maksimum İndirim Tavanı (TL Cap - 0 = Limitsiz)
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
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                            Sağlanan İndirim (TL) *
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
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div>
                          <label className="mb-1 block font-medium text-xs text-zinc-700 dark:text-zinc-300">
                            Satın Al (X)
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
                            Hediye/İndirimli (Y)
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
                            Y İndirimi (%100 Bedava)
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
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                          <label className="mb-1 block font-medium text-xs text-zinc-700 dark:text-zinc-300">
                            Min Sepet Tutarı (0 = Limitsiz)
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
                            Min Ürün Adedi
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

              {/* STEP 3: Targets & Scope */}
              {currentStep === 3 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      className={`rounded-xl border p-3.5 text-left transition-all ${ scopeMode === "all" ? "border-blue-600 bg-blue-50/70 dark:border-blue-500 dark:bg-blue-950/40" : "border-border bg-card" }`}
                      onClick={() => setScopeMode("all")}
                      type="button"
                    >
                      <div className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">
                        Tüm Katalog
                      </div>
                      <p className="mt-0.5 text-2xs text-zinc-500">
                        Tüm ürün ve kategorilerde geçerli.
                      </p>
                    </button>

                    <button
                      className={`rounded-xl border p-3.5 text-left transition-all ${ scopeMode === "custom" ? "border-blue-600 bg-blue-50/70 dark:border-blue-500 dark:bg-blue-950/40" : "border-border bg-card" }`}
                      onClick={() => setScopeMode("custom")}
                      type="button"
                    >
                      <div className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">
                        Seçili Ürün & Kategoriler
                      </div>
                      <p className="mt-0.5 text-2xs text-zinc-500">
                        Belirli ürün veya kategorileri hedefleyin.
                      </p>
                    </button>
                  </div>

                  {scopeMode === "custom" && (
                    <div className="space-y-3 border-border border-t pt-3">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                          <label className="mb-1 block font-medium text-xs text-zinc-700 dark:text-zinc-300">
                            Ürün Ekle
                          </label>
                          <Combobox
                            aria-label="Ürün ekle"
                            onChange={(value) => {
                              if (value) {
                                addProductTarget(value, "Include");
                              }
                            }}
                            options={[
                              { label: "Ürün seçerek ekle...", value: "" },
                              ...products.map((p) => ({
                                label: `${p.name} (₺${p.sellingPrice})`,
                                value: p.id,
                              })),
                            ]}
                            placeholder="Ürün seçerek ekle..."
                            value=""
                          />
                        </div>

                        <div>
                          <label className="mb-1 block font-medium text-xs text-zinc-700 dark:text-zinc-300">
                            Kategori Ekle
                          </label>
                          <Combobox
                            aria-label="Kategori ekle"
                            onChange={(value) => {
                              if (value) {
                                addCategoryTarget(value, "Include");
                              }
                            }}
                            options={[
                              { label: "Kategori seçerek ekle...", value: "" },
                              ...categories.map((c) => ({
                                label: c.name,
                                value: c.id,
                              })),
                            ]}
                            placeholder="Kategori seçerek ekle..."
                            value=""
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <span className="font-medium text-xs text-zinc-600 dark:text-zinc-400">
                          Hedef Kurallar ({targets.length})
                        </span>
                        {targets.length === 0 ? (
                          <p className="rounded-xl border border-border border-dashed p-3 text-center text-xs text-zinc-400">
                            Henüz ürün veya kategori seçilmedi.
                          </p>
                        ) : (
                          <div className="max-h-36 space-y-1.5 overflow-y-auto">
                            {targets.map((t, idx) => (
                              <div
                                className="flex items-center justify-between rounded-xl border border-border bg-zinc-50 p-2 text-xs dark:bg-zinc-950"
                                key={idx}
                              >
                                <div className="flex items-center gap-2">
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
                                  <Trash2 className="h-3.5 w-3.5" />
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

              {/* STEP 4: Triggers & Coupon */}
              {currentStep === 4 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      className={`rounded-xl border p-3.5 text-left transition-all ${ triggerType === "Automatic" ? "border-blue-600 bg-blue-50/70 dark:border-blue-500 dark:bg-blue-950/40" : "border-border bg-card" }`}
                      onClick={() => setTriggerType("Automatic")}
                      type="button"
                    >
                      <div className="flex items-center gap-1.5 font-semibold text-xs text-zinc-900 dark:text-zinc-100">
                        <Zap className="h-3.5 w-3.5 text-amber-500" />
                        Otomatik Kural
                      </div>
                      <p className="mt-0.5 text-3xs text-zinc-500">
                        Sepet sağlandığında doğrudan uygulanır.
                      </p>
                    </button>

                    <button
                      className={`rounded-xl border p-3.5 text-left transition-all ${ triggerType === "CouponCode" ? "border-blue-600 bg-blue-50/70 dark:border-blue-500 dark:bg-blue-950/40" : "border-border bg-card" }`}
                      onClick={() => setTriggerType("CouponCode")}
                      type="button"
                    >
                      <div className="flex items-center gap-1.5 font-semibold text-xs text-zinc-900 dark:text-zinc-100">
                        <Ticket className="h-3.5 w-3.5 text-blue-600" />
                        Kupon Kodu Gerektiren
                      </div>
                      <p className="mt-0.5 text-3xs text-zinc-500">
                        Müşteri kupon girdiğinde aktif olur.
                      </p>
                    </button>
                  </div>

                  <div className="space-y-3 border-border border-t pt-3">
                    {triggerType === "CouponCode" && !isEditMode && (
                      <div>
                        <label className="mb-1 block font-medium text-xs text-zinc-700 dark:text-zinc-300">
                          Birincil Kupon Kodu *
                        </label>
                        <input
                          className="w-full rounded-xl border border-border bg-card px-3.5 py-2 font-mono text-xs text-zinc-800 uppercase focus:border-blue-500 focus:outline-none dark:text-zinc-200"
                          onChange={(e) =>
                            setInitialCouponCode(e.target.value.toUpperCase())
                          }
                          placeholder="Örn: BAHAR2026"
                          required
                          type="text"
                          value={initialCouponCode}
                        />
                      </div>
                    )}

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block font-medium text-xs text-zinc-700 dark:text-zinc-300">
                          Toplam Kullanım Limiti (0 = Limitsiz)
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
                          Müşteri Başı Kullanım Limiti
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

              {/* STEP 5: Review & Confirm */}
              {currentStep === 5 && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
                    <div className="space-y-1.5 rounded-xl border border-border bg-zinc-50/50 p-3.5 dark:bg-zinc-950">
                      <span className="font-semibold text-zinc-600 dark:text-zinc-400">
                        Kampanya Bilgileri:
                      </span>
                      <div className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                        {name}
                      </div>
                      {code && (
                        <div className="font-mono text-zinc-500">
                          Kod: {code}
                        </div>
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
                        <span className="rounded bg-zinc-200 px-2 py-0.5 font-medium text-2xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                          Öncelik: {priority}
                        </span>
                        {isStackable && (
                          <span className="rounded bg-emerald-100 px-2 py-0.5 font-medium text-2xs text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                            Birleşebilir
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5 rounded-xl border border-border bg-zinc-50/50 p-3.5 dark:bg-zinc-950">
                      <span className="font-semibold text-zinc-600 dark:text-zinc-400">
                        İndirim & Kapsam:
                      </span>
                      <div className="font-bold text-sm text-blue-600 dark:text-blue-400">
                        {type === "Percentage" &&
                          `%${discountValue} Yüzde İndirimi`}
                        {type === "FixedAmount" &&
                          `₺${discountValue} Sabit Tutar`}
                        {type === "CartThreshold" &&
                          `₺${minOrderAmount} Üzeri ₺${discountValue} İndirim`}
                        {type === "BuyXGetY" &&
                          `${buyQuantity} Al ${getQuantity} Öde`}
                        {type === "FreeShipping" && "Ücretsiz Kargo"}
                      </div>
                      <div className="text-zinc-500">
                        Tetikleyici:{" "}
                        {triggerType === "Automatic"
                          ? "Otomatik Kural"
                          : "Kupon Kodu"}
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
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between border-border border-t px-6 py-3.5">
          {currentStep > 1 ? (
            <button
              className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-1.5 font-semibold text-xs text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
              onClick={handlePrev}
              type="button"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Geri
            </button>
          ) : (
            <div />
          )}

          {currentStep < 5 ? (
            <button
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-1.5 font-semibold text-white text-xs shadow-xs hover:bg-blue-700"
              onClick={handleNext}
              type="button"
            >
              <span>İleri</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2 font-bold text-white text-xs shadow-xs hover:bg-emerald-700 disabled:opacity-50"
              disabled={loading}
              onClick={handleSubmit}
              type="button"
            >
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              <span>
                {isEditMode
                  ? "Değişiklikleri Kaydet"
                  : "Kampanyayı Başlat & Kaydet"}
              </span>
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
