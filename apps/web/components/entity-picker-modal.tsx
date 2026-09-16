"use client";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Check, ChevronDown, Plus, Search, User, X } from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import type {
  CustomerListDto,
  EmployeeDto,
  ProductListDto,
} from "@/lib/api-client";

export interface EntityPickerOption<T = unknown> {
  avatar?: {
    color?: string;
    image?: string;
    text?: string;
  };
  badge?: {
    label: string;
    variant?: "blue" | "emerald" | "amber" | "rose" | "purple" | "zinc";
  };
  id: string;
  label: string;
  raw: T;
  searchKeywords?: string;
  subLabel?: string;
}

export interface EntityPickerModalProps<T = unknown> {
  addNewLabel?: string;
  description?: string;
  emptyMessage?: string;
  isOpen: boolean;
  items: EntityPickerOption<T>[];
  onAddNew?: () => void;
  onClose: () => void;
  onSelect: (item: EntityPickerOption<T> | null) => void;
  searchPlaceholder?: string;
  selectedId?: string | null;
  title: string;
}

const BADGE_STYLES: Record<string, string> = {
  amber:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800",
  blue: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800",
  emerald:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800",
  purple:
    "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800",
  rose: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800",
  zinc: "bg-zinc-100 text-zinc-700 border-border dark:bg-zinc-800 dark:text-zinc-300",
};

export function EntityPickerModal<T = unknown>({
  isOpen,
  onClose,
  onSelect,
  title,
  description,
  items,
  selectedId,
  searchPlaceholder = "İsim, e-posta veya detay ile ara...",
  emptyMessage = "Eşleşen kayıt bulunamadı.",
  onAddNew,
  addNewLabel = "+ Yeni Ekle",
}: EntityPickerModalProps<T>) {
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleClose = () => {
    setSearch("");
    onClose();
  };

  const handleSelect = (item: EntityPickerOption<T>) => {
    setSearch("");
    onSelect(item);
    onClose();
  };

  const filteredItems = useMemo(() => {
    if (!search.trim()) {
      return items;
    }
    const q = search.toLowerCase().trim();
    return items.filter((item) => {
      const matchLabel = item.label.toLowerCase().includes(q);
      const matchSub = item.subLabel?.toLowerCase().includes(q);
      const matchKeywords = item.searchKeywords?.toLowerCase().includes(q);
      const matchBadge = item.badge?.label.toLowerCase().includes(q);
      return matchLabel || matchSub || matchKeywords || matchBadge;
    });
  }, [items, search]);

  if (!isOpen) {
    return null;
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      handleClose();
    } else if (e.key === "Enter" && filteredItems.length > 0) {
      const first = filteredItems[0];
      if (first) {
        handleSelect(first);
      }
    }
  };

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) {
          handleClose();
        }
      }}
      open
    >
      <DialogContent
        aria-describedby={undefined}
        className="flex max-h-[85vh] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg"
        onKeyDown={handleKeyDown}
        showCloseButton={false}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-border border-b p-4 pb-3">
          <div>
            <DialogTitle className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
              {title}
            </DialogTitle>
            {description && (
              <p className="text-2xs text-zinc-500 dark:text-zinc-400">
                {description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {onAddNew && (
              <button
                className="flex items-center gap-1 rounded-xl bg-blue-50 px-2.5 py-1.5 font-bold text-2xs text-blue-700 transition hover:bg-blue-100 dark:bg-blue-950/60 dark:text-blue-300 dark:hover:bg-blue-900"
                onClick={() => {
                  handleClose();
                  onAddNew();
                }}
                type="button"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{addNewLabel}</span>
              </button>
            )}
            <DialogClose asChild>
              <button
                aria-label="Kapat"
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            </DialogClose>
          </div>
        </div>

        {/* Search Bar */}
        <div className="border-border border-b bg-zinc-50/50 p-3 dark:bg-zinc-900/50">
          <div className="relative">
            <Search className="absolute top-2.5 left-3 h-4 w-4 text-muted-foreground" />
            <input
              className="w-full rounded-xl border border-border bg-card py-2 pr-4 pl-9 font-medium text-xs text-zinc-900 placeholder:text-muted-foreground focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:text-zinc-100 dark:placeholder:text-zinc-500"
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              ref={inputRef}
              type="text"
              value={search}
            />
            {search && (
              <button
                aria-label="Aramayı temizle"
                className="absolute top-2.5 right-2.5 text-muted-foreground hover:text-zinc-600 dark:hover:text-zinc-300"
                onClick={() => setSearch("")}
                type="button"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* List Content */}
        <div className="custom-scrollbar max-h-80 space-y-1 overflow-y-auto p-2">
          {filteredItems.length === 0 ? (
            <div className="py-8 text-center">
              <p className="font-medium text-xs text-zinc-500 dark:text-zinc-400">
                {emptyMessage}
              </p>
              {onAddNew && (
                <button
                  className="mt-2 inline-flex items-center gap-1 font-bold text-blue-600 text-xs hover:underline dark:text-blue-400"
                  onClick={() => {
                    handleClose();
                    onAddNew();
                  }}
                  type="button"
                >
                  <Plus className="h-3 w-3" />
                  {addNewLabel}
                </button>
              )}
            </div>
          ) : (
            filteredItems.map((item: EntityPickerOption<T>) => {
              const isSelected = selectedId === item.id;
              const variant = item.badge?.variant || "zinc";
              const badgeCls = BADGE_STYLES[variant] || BADGE_STYLES.zinc;

              return (
                <div
                  className={`flex cursor-pointer items-center justify-between rounded-xl p-2.5 transition-all ${
                    isSelected
                      ? "border border-blue-200/80 bg-blue-50/80 dark:border-blue-800 dark:bg-blue-950/40"
                      : "border border-transparent hover:bg-zinc-100/70 dark:hover:bg-zinc-800/60"
                  }`}
                  key={item.id}
                  onClick={() => handleSelect(item)}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    {/* Avatar */}
                    {item.avatar?.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        alt={item.label}
                        className="h-8 w-8 shrink-0 rounded-xl object-cover"
                        src={item.avatar.image}
                      />
                    ) : item.avatar?.text ? (
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl font-bold text-white text-xs shadow-xs ${
                          item.avatar.color || "bg-blue-600"
                        }`}
                      >
                        {item.avatar.text}
                      </div>
                    ) : (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                        <User className="h-4 w-4" />
                      </div>
                    )}

                    {/* Text Details */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-semibold text-xs text-zinc-900 dark:text-zinc-100">
                          {item.label}
                        </span>
                        {item.badge && (
                          <span
                            className={`shrink-0 rounded-md border px-1.5 py-0.2 font-semibold text-3xs ${badgeCls}`}
                          >
                            {item.badge.label}
                          </span>
                        )}
                      </div>
                      {item.subLabel && (
                        <p className="truncate text-2xs text-zinc-500 dark:text-zinc-400">
                          {item.subLabel}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Selection Status */}
                  <div className="flex shrink-0 items-center pl-2">
                    {isSelected ? (
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white shadow-xs">
                        <Check className="h-3 w-3" />
                      </div>
                    ) : (
                      <span className="text-3xs text-muted-foreground opacity-0 group-hover:opacity-100 dark:text-zinc-500">
                        Seç
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-border border-t bg-zinc-50/50 p-2.5 px-3 text-2xs text-zinc-500 dark:bg-zinc-900/50 dark:text-zinc-400">
          <span>{filteredItems.length} kayıt listelendi</span>
          {selectedId && (
            <button
              className="font-semibold text-rose-600 hover:underline dark:text-rose-400"
              onClick={() => {
                onSelect(null);
                handleClose();
              }}
              type="button"
            >
              Seçimi Kaldır
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Specialized Representative / Sales Rep Picker
// ============================================================================
export interface SalesRepPickerProps {
  className?: string;
  clearable?: boolean;
  disabled?: boolean;
  employees: EmployeeDto[];
  onAddNew?: () => void;
  onChange: (employeeId: string, employee?: EmployeeDto) => void;
  placeholder?: string;
  value?: string;
}

export function SalesRepPicker({
  value,
  onChange,
  employees,
  placeholder = "Sorumlu Temsilci Seçiniz...",
  disabled = false,
  className,
  onAddNew,
  clearable = true,
}: SalesRepPickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedEmployee = useMemo(() => {
    if (!value) {
      return null;
    }
    return employees.find((e) => e.id === value || e.userId === value) || null;
  }, [value, employees]);

  const pickerOptions: EntityPickerOption<EmployeeDto>[] = useMemo(
    () =>
      employees.map((emp) => ({
        avatar: {
          color: "bg-gradient-to-br from-blue-600 to-indigo-600",
          image: emp.avatarUrl,
          text: (emp.firstName?.[0] || emp.fullName?.[0] || "T").toUpperCase(),
        },
        badge: {
          label: emp.departmentName || "Satış",
          variant: "purple",
        },
        id: emp.id,
        label:
          emp.fullName ||
          `${emp.firstName || ""} ${emp.lastName || ""}`.trim() ||
          emp.email,
        raw: emp,
        searchKeywords: `${emp.email} ${emp.title || ""} ${emp.phone || ""}`,
        subLabel: emp.title ? `${emp.title} • ${emp.email}` : emp.email,
      })),
    [employees]
  );

  return (
    <>
      <div className={`relative flex items-center ${className || ""}`}>
        <button
          className="flex h-9 w-full items-center justify-between gap-2 rounded-xl border border-border bg-card px-3 py-1.5 font-medium text-xs text-zinc-900 shadow-2xs transition-all hover:border-zinc-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:text-zinc-100 dark:hover:border-zinc-700"
          disabled={disabled}
          onClick={() => setIsOpen(true)}
          type="button"
        >
          <div className="flex min-w-0 items-center gap-2 truncate">
            {selectedEmployee ? (
              <>
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-lg bg-blue-600 font-bold text-3xs text-white">
                  {(
                    selectedEmployee.firstName?.[0] ||
                    selectedEmployee.fullName?.[0] ||
                    "T"
                  ).toUpperCase()}
                </div>
                <span className="truncate font-semibold text-zinc-900 dark:text-zinc-100">
                  {selectedEmployee.fullName || selectedEmployee.email}
                </span>
                {selectedEmployee.title && (
                  <span className="hidden truncate text-2xs text-muted-foreground sm:inline-block dark:text-zinc-500">
                    ({selectedEmployee.title})
                  </span>
                )}
              </>
            ) : (
              <>
                <User className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate font-normal text-muted-foreground">
                  {placeholder}
                </span>
              </>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {clearable && selectedEmployee && (
              <span
                className="rounded-full p-0.5 text-muted-foreground hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange("", undefined);
                }}
              >
                <X className="h-3.5 w-3.5" />
              </span>
            )}
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
        </button>
      </div>

      <EntityPickerModal<EmployeeDto>
        addNewLabel="+ Yeni Temsilci Ekle"
        description="Fırsat veya müşteriye atanacak ekip üyesini arayın veya seçin"
        emptyMessage="Eşleşen temsilci bulunamadı."
        isOpen={isOpen}
        items={pickerOptions}
        onAddNew={onAddNew}
        onClose={() => setIsOpen(false)}
        onSelect={(item) => {
          if (item) {
            onChange(item.id, item.raw);
          } else {
            onChange("", undefined);
          }
        }}
        searchPlaceholder="Temsilci adı, unvan veya e-posta ile ara..."
        selectedId={selectedEmployee?.id}
        title="Sorumlu Satış Temsilcisi Seç"
      />
    </>
  );
}

// ============================================================================
// Specialized Customer Picker
// ============================================================================
export interface CustomerPickerProps {
  className?: string;
  clearable?: boolean;
  customers: CustomerListDto[];
  disabled?: boolean;
  onAddNew?: () => void;
  onChange: (customerId: string, customer?: CustomerListDto) => void;
  placeholder?: string;
  value?: string;
}

export function CustomerPicker({
  value,
  onChange,
  customers,
  placeholder = "Müşteri Seçiniz...",
  disabled = false,
  className,
  onAddNew,
  clearable = true,
}: CustomerPickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedCustomer = useMemo(() => {
    if (!value) {
      return null;
    }
    return customers.find((c) => c.id === value) || null;
  }, [value, customers]);

  const pickerOptions: EntityPickerOption<CustomerListDto>[] = useMemo(
    () =>
      customers.map((c) => ({
        avatar: {
          color: "bg-blue-600",
          text: (c.name?.[0] || "M").toUpperCase(),
        },
        badge: {
          label: c.tier || "Standart",
          variant: c.tier === "VIP" ? "amber" : "blue",
        },
        id: c.id,
        label: c.name,
        raw: c,
        searchKeywords: `${c.email || ""} ${c.phone || ""} ${c.city || ""}`,
        subLabel: c.city
          ? `${c.city} • ${c.email || c.phone || ""}`
          : c.email || c.phone || "İletişim bilgisi yok",
      })),
    [customers]
  );

  return (
    <>
      <div className={`relative flex items-center ${className || ""}`}>
        <button
          className="flex h-9 w-full items-center justify-between gap-2 rounded-xl border border-border bg-card px-3 py-1.5 font-medium text-xs text-zinc-900 shadow-2xs transition-all hover:border-zinc-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:text-zinc-100 dark:hover:border-zinc-700"
          disabled={disabled}
          onClick={() => setIsOpen(true)}
          type="button"
        >
          <div className="flex min-w-0 items-center gap-2 truncate">
            {selectedCustomer ? (
              <>
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-lg bg-blue-600 font-bold text-3xs text-white">
                  {(selectedCustomer.name?.[0] || "M").toUpperCase()}
                </div>
                <span className="truncate font-semibold text-zinc-900 dark:text-zinc-100">
                  {selectedCustomer.name}
                </span>
                {selectedCustomer.city && (
                  <span className="hidden truncate text-2xs text-muted-foreground sm:inline-block dark:text-zinc-500">
                    ({selectedCustomer.city})
                  </span>
                )}
              </>
            ) : (
              <>
                <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate font-normal text-muted-foreground">
                  {placeholder}
                </span>
              </>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {clearable && selectedCustomer && (
              <span
                className="rounded-full p-0.5 text-muted-foreground hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange("", undefined);
                }}
              >
                <X className="h-3.5 w-3.5" />
              </span>
            )}
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
        </button>
      </div>

      <EntityPickerModal<CustomerListDto>
        addNewLabel="+ Yeni Müşteri Ekle"
        description="İşlem yapılacak müşteriyi arayın veya seçin"
        emptyMessage="Eşleşen müşteri bulunamadı."
        isOpen={isOpen}
        items={pickerOptions}
        onAddNew={onAddNew}
        onClose={() => setIsOpen(false)}
        onSelect={(item) => {
          if (item) {
            onChange(item.id, item.raw);
          } else {
            onChange("", undefined);
          }
        }}
        searchPlaceholder="Müşteri adı, e-posta, şehir veya telefon ile ara..."
        selectedId={selectedCustomer?.id}
        title="Müşteri Seç"
      />
    </>
  );
}

// ============================================================================
// Specialized Product Picker
// ============================================================================
export interface ProductPickerProps {
  className?: string;
  clearable?: boolean;
  disabled?: boolean;
  onAddNew?: () => void;
  onChange: (productId: string, product?: ProductListDto) => void;
  placeholder?: string;
  products: ProductListDto[];
  value?: string;
}

export function ProductPicker({
  value,
  onChange,
  products,
  placeholder = "Ürün / Hizmet Seçiniz...",
  disabled = false,
  className,
  onAddNew,
  clearable = true,
}: ProductPickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedProduct = useMemo(() => {
    if (!value) {
      return null;
    }
    return products.find((p) => p.id === value) || null;
  }, [value, products]);

  const pickerOptions: EntityPickerOption<ProductListDto>[] = useMemo(
    () =>
      products.map((p) => ({
        avatar: {
          color: "bg-emerald-600",
          text: (p.name?.[0] || "Ü").toUpperCase(),
        },
        badge: {
          label: p.type === "Service" ? "Hizmet" : "Ürün",
          variant: p.type === "Service" ? "purple" : "emerald",
        },
        id: p.id,
        label: p.name,
        raw: p,
        searchKeywords: `${p.sku || ""} ${p.categoryName || ""}`,
        subLabel: `${p.sku ? `SKU: ${p.sku} • ` : ""}${p.sellingPrice?.toLocaleString("tr-TR")} ₺`,
      })),
    [products]
  );

  return (
    <>
      <div className={`relative flex items-center ${className || ""}`}>
        <button
          className="flex h-9 w-full items-center justify-between gap-2 rounded-xl border border-border bg-card px-3 py-1.5 font-medium text-xs text-zinc-900 shadow-2xs transition-all hover:border-zinc-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:text-zinc-100 dark:hover:border-zinc-700"
          disabled={disabled}
          onClick={() => setIsOpen(true)}
          type="button"
        >
          <div className="flex min-w-0 items-center gap-2 truncate">
            {selectedProduct ? (
              <>
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-lg bg-emerald-600 font-bold text-3xs text-white">
                  {(selectedProduct.name?.[0] || "Ü").toUpperCase()}
                </div>
                <span className="truncate font-semibold text-zinc-900 dark:text-zinc-100">
                  {selectedProduct.name}
                </span>
                <span className="hidden truncate text-2xs text-muted-foreground sm:inline-block dark:text-zinc-500">
                  ({selectedProduct.sellingPrice?.toLocaleString("tr-TR")} ₺)
                </span>
              </>
            ) : (
              <>
                <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate font-normal text-muted-foreground">
                  {placeholder}
                </span>
              </>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {clearable && selectedProduct && (
              <span
                className="rounded-full p-0.5 text-muted-foreground hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange("", undefined);
                }}
              >
                <X className="h-3.5 w-3.5" />
              </span>
            )}
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
        </button>
      </div>

      <EntityPickerModal<ProductListDto>
        addNewLabel="+ Yeni Ürün Ekle"
        description="Teklif veya siparişe eklenecek ürün/hizmeti arayın veya seçin"
        emptyMessage="Eşleşen ürün/hizmet bulunamadı."
        isOpen={isOpen}
        items={pickerOptions}
        onAddNew={onAddNew}
        onClose={() => setIsOpen(false)}
        onSelect={(item) => {
          if (item) {
            onChange(item.id, item.raw);
          } else {
            onChange("", undefined);
          }
        }}
        searchPlaceholder="Ürün adı, stok kodu veya kategori ile ara..."
        selectedId={selectedProduct?.id}
        title="Ürün / Hizmet Seç"
      />
    </>
  );
}
