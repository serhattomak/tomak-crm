"use client";

import { Combobox } from "@workspace/ui/components/combobox";
import { DatePicker } from "@workspace/ui/components/date-picker";
import { NumberInput } from "@workspace/ui/components/number-input";
import { PageContainer } from "@workspace/ui/components/page-container";
import {
  AlertCircle,
  ArrowLeft,
  Coins,
  Loader2,
  Save,
  Tag,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import type React from "react";
import { useEffect, useState } from "react";
import {
  ApiClient,
  type CreateCampaignTargetPayload,
  type ProductCategoryDto,
  type ProductListDto,
  type UpdateCampaignPayload,
} from "@/lib/api-client";
import { usePermissions } from "@/lib/permissions/permission-context";

export default function EditCampaignPage() {
  const params = useParams();
  const router = useRouter();
  const tenantSlug = (params?.tenantSlug as string) || "";
  const campaignId = (params?.campaignId as string) || "";
  const { activeTenant } = usePermissions();

  useEffect(() => {
    if (tenantSlug && campaignId) {
      router.replace(`/${tenantSlug}/promotions?edit=${campaignId}`);
    }
  }, [tenantSlug, campaignId, router]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Catalog
  const [products, setProducts] = useState<ProductListDto[]>([]);
  const [categories, setCategories] = useState<ProductCategoryDto[]>([]);

  // Form State
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<string>("Percentage");
  const [triggerType, setTriggerType] = useState<string>("Automatic");
  const [discountValue, setDiscountValue] = useState<number>(20);
  const [minOrderAmount, setMinOrderAmount] = useState<number>(0);
  const [maxDiscountAmount, setMaxDiscountAmount] = useState<
    number | undefined
  >(undefined);
  const [minQuantity, setMinQuantity] = useState<number>(1);
  const [buyQuantity, setBuyQuantity] = useState<number>(2);
  const [getQuantity, setGetQuantity] = useState<number>(1);
  const [getDiscountRate, setGetDiscountRate] = useState<number>(100);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [priority, setPriority] = useState<number>(10);
  const [isStackable, setIsStackable] = useState<boolean>(false);
  const [totalUsageLimit, setTotalUsageLimit] = useState<number | undefined>(
    undefined
  );
  const [perCustomerUsageLimit, setPerCustomerUsageLimit] = useState<number>(1);
  const [targets, setTargets] = useState<CreateCampaignTargetPayload[]>([]);

  useEffect(() => {
    if (!(activeTenant && campaignId)) {
      return;
    }

    const loadData = async () => {
      setLoading(true);
      try {
        const [campRes, prodRes, catRes] = await Promise.all([
          ApiClient.getCampaignById(campaignId, activeTenant.id),
          ApiClient.getProducts({ pageSize: 100 }, activeTenant.id),
          ApiClient.getProductCategories(activeTenant.id),
        ]);

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
          setTargets(
            c.targets.map((t) => ({
              ruleCondition: t.ruleCondition,
              targetId: t.targetId,
              targetName: t.targetName,
              targetType: t.targetType,
            }))
          );
        }

        if (prodRes.success && prodRes.data) {
          setProducts(prodRes.data.items || []);
        }
        if (catRes.success && catRes.data) {
          setCategories(catRes.data || []);
        }
      } catch {
        setError("Kampanya bilgileri yüklenemedi.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [activeTenant, campaignId]);

  const addProductTarget = (productId: string) => {
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
        ruleCondition: "Include",
        targetId: productId,
        targetName: prod.name,
        targetType: "Product",
      },
    ]);
  };

  const addCategoryTarget = (categoryId: string) => {
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
        ruleCondition: "Include",
        targetId: categoryId,
        targetName: cat.name,
        targetType: "Category",
      },
    ]);
  };

  const removeTarget = (index: number) => {
    setTargets((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTenant) {
      return;
    }
    setSaving(true);
    setError(null);

    try {
      const payload: UpdateCampaignPayload = {
        buyQuantity: type === "BuyXGetY" ? buyQuantity : undefined,
        code: code.trim() || undefined,
        description: description.trim() || undefined,
        discountValue,
        endDate: endDate ? new Date(endDate).toISOString() : undefined,
        getDiscountRate: type === "BuyXGetY" ? getDiscountRate : undefined,
        getQuantity: type === "BuyXGetY" ? getQuantity : undefined,
        isActive,
        isStackable,
        maxDiscountAmount: maxDiscountAmount || undefined,
        minOrderAmount,
        minQuantity,
        name: name.trim(),
        perCustomerUsageLimit,
        priority,
        startDate: startDate
          ? new Date(startDate).toISOString()
          : new Date().toISOString(),
        targets,
        totalUsageLimit: totalUsageLimit || undefined,
        triggerType,
        type,
      };

      const res = await ApiClient.updateCampaign(
        campaignId,
        payload,
        activeTenant.id
      );
      if (res.success) {
        router.push(`/${tenantSlug}/promotions`);
      } else {
        setError(res.message || "Güncelleme başarısız.");
      }
    } catch {
      setError("Sunucuya bağlanırken bir hata oluştu.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <PageContainer className="mx-auto max-w-4xl space-y-6 pb-16">
      {/* Header */}
      <div className="flex items-center justify-between border-border border-b pb-4">
        <div className="flex items-center gap-3">
          <Link
            className="rounded-xl border border-border p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800"
            href={`/${tenantSlug}/promotions`}
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="font-bold text-xl text-zinc-900 dark:text-zinc-50">
              Kampanyayı Düzenle
            </h1>
            <p className="text-xs text-zinc-500">{name}</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-red-700 text-xs dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form className="space-y-6" onSubmit={handleSubmit}>
        {/* Basic Section */}
        <div className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-xs">
          <h2 className="flex items-center gap-2 font-semibold text-sm text-zinc-900 dark:text-zinc-100">
            <Tag className="h-4 w-4 text-blue-600" />
            Genel Bilgiler & Zamanlama
          </h2>

          <div className="space-y-4">
            <div>
              <label className="mb-1 block font-medium text-xs text-zinc-700 dark:text-zinc-300">
                Kampanya Adı *
              </label>
              <input
                className="w-full rounded-xl border border-border bg-card px-3.5 py-2 text-sm text-zinc-800 focus:border-blue-500 focus:outline-none dark:text-zinc-200"
                onChange={(e) => setName(e.target.value)}
                required
                type="text"
                value={name}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block font-medium text-xs text-zinc-700 dark:text-zinc-300">
                  Dahili Takip Kodu
                </label>
                <input
                  className="w-full rounded-xl border border-border bg-card px-3.5 py-2 font-mono text-sm text-zinc-800 uppercase focus:border-blue-500 focus:outline-none dark:text-zinc-200"
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
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
                Açıklama
              </label>
              <textarea
                className="w-full rounded-xl border border-border bg-card px-3.5 py-2 text-sm text-zinc-800 focus:border-blue-500 focus:outline-none dark:text-zinc-200"
                onChange={(e) => setDescription(e.target.value)}
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
                  placeholder="Başlangıç tarihi"
                  value={startDate}
                />
              </div>

              <div>
                <label className="mb-1 block font-medium text-xs text-zinc-700 dark:text-zinc-300">
                  Bitiş Tarihi
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
                  Diğer Kampanyalarla Birleşebilir (Stackable)
                </span>
              </div>
              <button
                aria-checked={isStackable}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-crm-in-out focus:outline-none ${
                  isStackable ? "bg-blue-600" : "bg-zinc-200 dark:bg-zinc-700"
                }`}
                onClick={() => setIsStackable(!isStackable)}
                role="switch"
                type="button"
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-card shadow-md ring-0 transition duration-200 ease-crm-in-out ${ isStackable ? "translate-x-5" : "translate-x-0" }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Discount & Targets */}
        <div className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-xs">
          <h2 className="flex items-center gap-2 font-semibold text-sm text-zinc-900 dark:text-zinc-100">
            <Coins className="h-4 w-4 text-blue-600" />
            İndirim Değeri & Kapsam
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block font-medium text-xs text-zinc-700 dark:text-zinc-300">
                İndirim Değeri ({type === "Percentage" ? "%" : "₺"})
              </label>
              <NumberInput
                className="w-full"
                min={0}
                onChange={(val) => setDiscountValue(val)}
                prefix={type === "Percentage" ? undefined : "₺"}
                suffix={type === "Percentage" ? "%" : undefined}
                value={discountValue}
              />
            </div>

            <div>
              <label className="mb-1 block font-medium text-xs text-zinc-700 dark:text-zinc-300">
                Maksimum İndirim Tavanı (TL)
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

          {/* Targets management */}
          <div className="space-y-3 border-border border-t pt-4">
            <span className="font-semibold text-xs text-zinc-800 dark:text-zinc-200">
              Hedef Ürün ve Kategoriler ({targets.length})
            </span>
            <div className="grid grid-cols-2 gap-3">
              <Combobox
                aria-label="Ürün ekle"
                onChange={(value) => {
                  if (value) {
                    addProductTarget(value);
                  }
                }}
                options={[
                  { label: "Ürün Ekle...", value: "" },
                  ...products.map((p) => ({ label: p.name, value: p.id })),
                ]}
                placeholder="Ürün Ekle..."
                value=""
              />

              <Combobox
                aria-label="Kategori ekle"
                onChange={(value) => {
                  if (value) {
                    addCategoryTarget(value);
                  }
                }}
                options={[
                  { label: "Kategori Ekle...", value: "" },
                  ...categories.map((c) => ({ label: c.name, value: c.id })),
                ]}
                placeholder="Kategori Ekle..."
                value=""
              />
            </div>

            <div className="space-y-2">
              {targets.map((t, idx) => (
                <div
                  className="flex items-center justify-between rounded-xl border border-border bg-zinc-50 p-2.5 text-xs dark:bg-zinc-950"
                  key={idx}
                >
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                    {t.targetName} ({t.targetType})
                  </span>
                  <button
                    aria-label="Hedefi kaldır"
                    className="rounded p-1 text-zinc-400 hover:text-red-600"
                    onClick={() => removeTarget(idx)}
                    type="button"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3 border-border border-t pt-4">
          <Link
            className="rounded-xl border border-border bg-card px-4 py-2 font-semibold text-xs text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
            href={`/${tenantSlug}/promotions`}
          >
            İptal
          </Link>
          <button
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2 font-bold text-white text-xs shadow-xs hover:bg-blue-700 disabled:opacity-50"
            disabled={saving}
            type="submit"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Değişiklikleri Kaydet
          </button>
        </div>
      </form>
    </PageContainer>
  );
}
