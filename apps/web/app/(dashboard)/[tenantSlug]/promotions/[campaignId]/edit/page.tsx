"use client";

import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  Check,
  Coins,
  Layers,
  Loader2,
  Package,
  Percent,
  Plus,
  Save,
  Sparkles,
  Tag,
  Trash2,
  TrendingUp,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { DatePicker } from "@workspace/ui/components/date-picker";
import { NumberInput } from "@workspace/ui/components/number-input";
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
  const [maxDiscountAmount, setMaxDiscountAmount] = useState<number | undefined>(undefined);
  const [minQuantity, setMinQuantity] = useState<number>(1);
  const [buyQuantity, setBuyQuantity] = useState<number>(2);
  const [getQuantity, setGetQuantity] = useState<number>(1);
  const [getDiscountRate, setGetDiscountRate] = useState<number>(100);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [priority, setPriority] = useState<number>(10);
  const [isStackable, setIsStackable] = useState<boolean>(false);
  const [totalUsageLimit, setTotalUsageLimit] = useState<number | undefined>(undefined);
  const [perCustomerUsageLimit, setPerCustomerUsageLimit] = useState<number>(1);
  const [targets, setTargets] = useState<CreateCampaignTargetPayload[]>([]);

  useEffect(() => {
    if (!activeTenant || !campaignId) return;

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
              targetType: t.targetType,
              targetId: t.targetId,
              targetName: t.targetName,
              ruleCondition: t.ruleCondition,
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
    if (!prod) return;
    if (targets.some((t) => t.targetType === "Product" && t.targetId === productId)) return;

    setTargets((prev) => [
      ...prev,
      {
        targetType: "Product",
        targetId: productId,
        targetName: prod.name,
        ruleCondition: "Include",
      },
    ]);
  };

  const addCategoryTarget = (categoryId: string) => {
    const cat = categories.find((c) => c.id === categoryId);
    if (!cat) return;
    if (targets.some((t) => t.targetType === "Category" && t.targetId === categoryId)) return;

    setTargets((prev) => [
      ...prev,
      {
        targetType: "Category",
        targetId: categoryId,
        targetName: cat.name,
        ruleCondition: "Include",
      },
    ]);
  };

  const removeTarget = (index: number) => {
    setTargets((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTenant) return;
    setSaving(true);
    setError(null);

    try {
      const payload: UpdateCampaignPayload = {
        name: name.trim(),
        code: code.trim() || undefined,
        description: description.trim() || undefined,
        type,
        triggerType,
        discountValue,
        minOrderAmount,
        maxDiscountAmount: maxDiscountAmount || undefined,
        minQuantity,
        buyQuantity: type === "BuyXGetY" ? buyQuantity : undefined,
        getQuantity: type === "BuyXGetY" ? getQuantity : undefined,
        getDiscountRate: type === "BuyXGetY" ? getDiscountRate : undefined,
        startDate: startDate ? new Date(startDate).toISOString() : new Date().toISOString(),
        endDate: endDate ? new Date(endDate).toISOString() : undefined,
        isActive,
        priority,
        isStackable,
        totalUsageLimit: totalUsageLimit || undefined,
        perCustomerUsageLimit,
        targets,
      };

      const res = await ApiClient.updateCampaign(campaignId, payload, activeTenant.id);
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
        <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-16">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-200/80 pb-4 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <Link
            href={`/${tenantSlug}/promotions`}
            className="rounded-xl border border-zinc-200 p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
              Kampanyayı Düzenle
            </h1>
            <p className="text-xs text-zinc-500">{name}</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Section */}
        <div className="space-y-4 rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Tag className="h-4 w-4 text-violet-600" />
            Genel Bilgiler & Zamanlama
          </h2>

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Kampanya Adı *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-sm text-zinc-800 focus:border-violet-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Dahili Takip Kodu
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-sm font-mono uppercase text-zinc-800 focus:border-violet-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Öncelik Sırası (Priority)
                </label>
                <NumberInput
                  value={priority}
                  onChange={(val) => setPriority(val)}
                  min={0}
                  step={5}
                  className="w-full"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Açıklama
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-sm text-zinc-800 focus:border-violet-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Başlangıç Tarihi *
                </label>
                <DatePicker
                  value={startDate}
                  onChange={(val) => setStartDate(val)}
                  placeholder="Başlangıç tarihi"
                  className="w-full"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Bitiş Tarihi
                </label>
                <DatePicker
                  value={endDate}
                  onChange={(val) => setEndDate(val)}
                  placeholder="Bitiş tarihi (Süresiz için boş)"
                  className="w-full"
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50/70 p-3.5 dark:border-zinc-800 dark:bg-zinc-950">
              <div>
                <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                  Diğer Kampanyalarla Birleşebilir (Stackable)
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={isStackable}
                onClick={() => setIsStackable(!isStackable)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isStackable ? "bg-violet-600" : "bg-zinc-200 dark:bg-zinc-700"
                }`}
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

        {/* Discount & Targets */}
        <div className="space-y-4 rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Coins className="h-4 w-4 text-violet-600" />
            İndirim Değeri & Kapsam
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                İndirim Değeri ({type === "Percentage" ? "%" : "₺"})
              </label>
              <NumberInput
                value={discountValue}
                onChange={(val) => setDiscountValue(val)}
                min={0}
                prefix={type === "Percentage" ? undefined : "₺"}
                suffix={type === "Percentage" ? "%" : undefined}
                className="w-full"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Maksimum İndirim Tavanı (TL)
              </label>
              <NumberInput
                value={maxDiscountAmount ?? 0}
                onChange={(val) => setMaxDiscountAmount(val > 0 ? val : undefined)}
                min={0}
                step={50}
                prefix="₺"
                className="w-full"
              />
            </div>
          </div>

          {/* Targets management */}
          <div className="space-y-3 border-t border-zinc-100 pt-4 dark:border-zinc-800">
            <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
              Hedef Ürün ve Kategoriler ({targets.length})
            </span>
            <div className="grid grid-cols-2 gap-3">
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    addProductTarget(e.target.value);
                    e.target.value = "";
                  }
                }}
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-800 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
              >
                <option value="">Ürün Ekle...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>

              <select
                onChange={(e) => {
                  if (e.target.value) {
                    addCategoryTarget(e.target.value);
                    e.target.value = "";
                  }
                }}
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-800 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
              >
                <option value="">Kategori Ekle...</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              {targets.map((t, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 p-2.5 text-xs dark:border-zinc-800 dark:bg-zinc-950"
                >
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                    {t.targetName} ({t.targetType})
                  </span>
                  <button
                    type="button"
                    onClick={() => removeTarget(idx)}
                    className="rounded p-1 text-zinc-400 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3 border-t border-zinc-200/80 pt-4 dark:border-zinc-800">
          <Link
            href={`/${tenantSlug}/promotions`}
            className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            İptal
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-2 text-xs font-bold text-white shadow-xs hover:bg-violet-700 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Değişiklikleri Kaydet
          </button>
        </div>
      </form>
    </div>
  );
}
