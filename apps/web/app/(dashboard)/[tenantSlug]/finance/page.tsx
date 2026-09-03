"use client";

import {
  ArrowDownLeft,
  ArrowUpRight,
  CreditCard,
  FileText,
  Landmark,
  Layers,
  Plus,
  Printer,
  Receipt,
  RefreshCw,
  Search,
  Users2,
  Wallet,
  X,
} from "lucide-react";
import { useParams } from "next/navigation";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ApiClient,
  type CariAccountDto,
  type CariTransactionDto,
  type CreateCariPayload,
  type CreateFinancialAccountPayload,
  type CreateFinancialTransactionPayload,
  type FinancialAccountDto,
  type FinancialTransactionDto,
  type TransferBetweenAccountsPayload,
} from "@/lib/api-client";

// --- Helper Functions for Formatting ---

function getCariTypeClass(type: string): string {
  if (type === "Customer") {
    return "bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300";
  }
  if (type === "Supplier") {
    return "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300";
  }
  return "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300";
}

function getCariTypeLabel(type: string): string {
  if (type === "Customer") {
    return "Müşteri";
  }
  if (type === "Supplier") {
    return "Tedarikçi";
  }
  return "Personel / Diğer";
}

function getBalanceColor(isDebtor: boolean, isCreditor: boolean): string {
  if (isDebtor) {
    return "text-emerald-600 dark:text-emerald-400";
  }
  if (isCreditor) {
    return "text-rose-600 dark:text-rose-400";
  }
  return "text-zinc-500";
}

function getBalanceSuffix(isDebtor: boolean, isCreditor: boolean): string {
  if (isDebtor) {
    return "(Borçlu)";
  }
  if (isCreditor) {
    return "(Alacaklı)";
  }
  return "(Sıfır)";
}

function getTxBadgeClass(type: string): string {
  if (type === "Collection") {
    return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300";
  }
  if (type === "Payment") {
    return "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300";
  }
  return "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300";
}

function getTxLabel(type: string): string {
  if (type === "Collection") {
    return "Tahsilat";
  }
  if (type === "Payment") {
    return "Ödeme";
  }
  return "Virman";
}

// --- Subcomponents ---

interface KpiCardProps {
  colorClass: string;
  icon: React.ElementType;
  label: string;
  trend?: string;
  value: string;
}

function KpiCard({
  icon: Icon,
  label,
  value,
  trend,
  colorClass,
}: KpiCardProps) {
  return (
    <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-xs dark:border-zinc-800/80 dark:bg-zinc-900">
      <div className="flex items-center justify-between">
        <span className="font-medium text-xs text-zinc-500 dark:text-zinc-400">
          {label}
        </span>
        <div className={`rounded-xl p-2 ${colorClass}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="font-bold text-xl text-zinc-900 dark:text-zinc-100">
          {value}
        </span>
        {trend ? (
          <span className="font-medium text-[11px] text-zinc-400">{trend}</span>
        ) : null}
      </div>
    </div>
  );
}

// --- Tab 1: Cari Kartlar Table Body ---

interface CariRowProps {
  cari: CariAccountDto;
  onOpenStatement: (cari: CariAccountDto) => void;
  onQuickTx: (cari: CariAccountDto) => void;
}

function CariRow({ cari, onOpenStatement, onQuickTx }: CariRowProps) {
  const handleStatement = useCallback(() => {
    onOpenStatement(cari);
  }, [cari, onOpenStatement]);

  const handleTx = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onQuickTx(cari);
    },
    [cari, onQuickTx]
  );

  const isDebtor = cari.balance > 0;
  const isCreditor = cari.balance < 0;

  return (
    <tr
      className="cursor-pointer border-zinc-100 border-b transition-colors hover:bg-zinc-50/80 dark:border-zinc-800/60 dark:hover:bg-zinc-800/40"
      onClick={handleStatement}
    >
      <td className="py-3.5 pr-3 pl-4">
        <div className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
          {cari.title}
        </div>
        <div className="font-mono text-[11px] text-zinc-400">
          {cari.code} • {cari.city || "Şehir Belirtilmemiş"}
        </div>
      </td>
      <td className="px-3 py-3.5">
        <span
          className={`inline-flex rounded-md px-2 py-0.5 font-semibold text-xs ${getCariTypeClass(
            cari.type
          )}`}
        >
          {getCariTypeLabel(cari.type)}
        </span>
      </td>
      <td className="px-3 py-3.5 font-mono text-xs text-zinc-600 dark:text-zinc-400">
        {cari.taxNumber || "—"}
        {cari.taxOffice ? ` (${cari.taxOffice} VD)` : null}
      </td>
      <td className="px-3 py-3.5 text-right font-mono text-xs text-zinc-600 dark:text-zinc-400">
        {cari.totalDebit.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}{" "}
        {cari.currency}
      </td>
      <td className="px-3 py-3.5 text-right font-mono text-xs text-zinc-600 dark:text-zinc-400">
        {cari.totalCredit.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}{" "}
        {cari.currency}
      </td>
      <td className="px-3 py-3.5 text-right">
        <div
          className={`font-bold font-mono text-sm ${getBalanceColor(
            isDebtor,
            isCreditor
          )}`}
        >
          {Math.abs(cari.balance).toLocaleString("tr-TR", {
            minimumFractionDigits: 2,
          })}{" "}
          {cari.currency}
          <span className="ml-1 font-normal text-[10px]">
            {getBalanceSuffix(isDebtor, isCreditor)}
          </span>
        </div>
      </td>
      <td className="py-3.5 pr-4 pl-3 text-right">
        <div className="flex items-center justify-end gap-1.5">
          <button
            className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1 font-semibold text-xs text-zinc-700 shadow-2xs hover:bg-zinc-50 active:scale-95 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
            onClick={handleTx}
            title="Tahsilat / Ödeme Girişi"
            type="button"
          >
            Fiş Kes
          </button>
          <button
            className="rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-1 font-semibold text-violet-700 text-xs shadow-2xs hover:bg-violet-100 active:scale-95 dark:border-violet-800/60 dark:bg-violet-950/60 dark:text-violet-300"
            onClick={handleStatement}
            title="Ekstre Görüntüle"
            type="button"
          >
            Ekstre
          </button>
        </div>
      </td>
    </tr>
  );
}

interface CariTableBodyProps {
  cariList: CariAccountDto[];
  isCariLoading: boolean;
  onOpenStatement: (cari: CariAccountDto) => void;
  onQuickTx: (cari: CariAccountDto) => void;
}

function CariTableBody({
  isCariLoading,
  cariList,
  onOpenStatement,
  onQuickTx,
}: CariTableBodyProps) {
  if (isCariLoading) {
    return (
      <tr>
        <td className="py-8 text-center text-zinc-400" colSpan={7}>
          Cari hesaplar yükleniyor...
        </td>
      </tr>
    );
  }

  if (cariList.length === 0) {
    return (
      <tr>
        <td className="py-12 text-center text-zinc-400" colSpan={7}>
          <Users2 className="mx-auto mb-2 h-8 w-8 opacity-40" />
          Kayıtlı cari hesap bulunamadı.
        </td>
      </tr>
    );
  }

  return (
    <>
      {cariList.map((c) => (
        <CariRow
          cari={c}
          key={c.id}
          onOpenStatement={onOpenStatement}
          onQuickTx={onQuickTx}
        />
      ))}
    </>
  );
}

// --- Tab 2: Kasa & Bankalar Kartı ---

interface AccountCardProps {
  account: FinancialAccountDto;
  onTransfer: (acc: FinancialAccountDto) => void;
}

function AccountCard({ account, onTransfer }: AccountCardProps) {
  const isBank = account.type === "Bank";
  const handleTransferClick = useCallback(() => {
    onTransfer(account);
  }, [account, onTransfer]);

  return (
    <div className="flex flex-col justify-between rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-xs transition-all hover:shadow-md dark:border-zinc-800/80 dark:bg-zinc-900">
      <div>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`rounded-xl p-2.5 ${
                isBank
                  ? "bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400"
                  : "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400"
              }`}
            >
              {isBank ? (
                <Landmark className="h-5 w-5" />
              ) : (
                <Wallet className="h-5 w-5" />
              )}
            </div>
            <div>
              <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                {account.name}
              </h3>
              <span className="font-medium text-xs text-zinc-400">
                {isBank
                  ? `${account.bankName || "Banka"} • ${account.branchName || "Şube"}`
                  : "Nakit Kasa"}
              </span>
            </div>
          </div>

          <span className="rounded-full bg-zinc-100 px-2 py-0.5 font-bold font-mono text-[11px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            {account.currency}
          </span>
        </div>

        {account.iban ? (
          <div className="mt-4 rounded-xl bg-zinc-50 p-2.5 font-mono text-[11px] text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-400">
            IBAN: {account.iban}
          </div>
        ) : null}
      </div>

      <div className="mt-6 flex items-baseline justify-between border-zinc-100 border-t pt-4 dark:border-zinc-800">
        <div>
          <span className="block font-medium text-[11px] text-zinc-400 uppercase tracking-wider">
            Güncel Bakiye
          </span>
          <span className="font-extrabold font-mono text-xl text-zinc-900 dark:text-zinc-100">
            {account.balance.toLocaleString("tr-TR", {
              minimumFractionDigits: 2,
            })}{" "}
            {account.currency}
          </span>
        </div>

        <button
          className="inline-flex items-center gap-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-1.5 font-semibold text-xs text-zinc-700 shadow-2xs hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
          onClick={handleTransferClick}
          type="button"
        >
          <RefreshCw className="h-3 w-3" /> Virman
        </button>
      </div>
    </div>
  );
}

// --- Statement Table Body ---

interface StatementTableBodyProps {
  isStatementLoading: boolean;
  statementTx: CariTransactionDto[];
}

function StatementTableBody({
  isStatementLoading,
  statementTx,
}: StatementTableBodyProps) {
  if (isStatementLoading) {
    return (
      <tr>
        <td className="py-8 text-center text-zinc-400" colSpan={5}>
          Ekstre yükleniyor...
        </td>
      </tr>
    );
  }

  if (statementTx.length === 0) {
    return (
      <tr>
        <td className="py-8 text-center text-zinc-400" colSpan={5}>
          Bu cari hesaba ait hareket bulunamadı.
        </td>
      </tr>
    );
  }

  return (
    <>
      {statementTx.map((tx) => (
        <tr key={tx.id}>
          <td className="py-2 font-mono text-zinc-500">
            {new Date(tx.transactionDate).toLocaleDateString("tr-TR")}
          </td>
          <td className="py-2">
            <div className="font-medium text-zinc-800 dark:text-zinc-200">
              {tx.description}
            </div>
            {tx.documentNumber ? (
              <div className="font-mono text-[10px] text-zinc-400">
                {tx.documentNumber}
              </div>
            ) : null}
          </td>
          <td className="py-2 text-right font-mono text-zinc-700 dark:text-zinc-300">
            {tx.debit > 0
              ? tx.debit.toLocaleString("tr-TR", {
                  minimumFractionDigits: 2,
                })
              : "—"}
          </td>
          <td className="py-2 text-right font-mono text-zinc-700 dark:text-zinc-300">
            {tx.credit > 0
              ? tx.credit.toLocaleString("tr-TR", {
                  minimumFractionDigits: 2,
                })
              : "—"}
          </td>
          <td className="py-2 text-right font-bold font-mono text-zinc-900 dark:text-zinc-100">
            {tx.balanceAfter.toLocaleString("tr-TR", {
              minimumFractionDigits: 2,
            })}
          </td>
        </tr>
      ))}
    </>
  );
}

// --- Main Page Component ---

export default function FinancePage() {
  const params = useParams();
  const tenantSlug = (params.tenantSlug as string) || "";

  const [activeTab, setActiveTab] = useState<
    "cari" | "accounts" | "transactions"
  >("cari");

  // Cari Data
  const [cariList, setCariList] = useState<CariAccountDto[]>([]);
  const [cariTotalCount, setCariTotalCount] = useState(0);
  const [overallDebit, setOverallDebit] = useState(0);
  const [overallCredit, setOverallCredit] = useState(0);
  const [overallBalance, setOverallBalance] = useState(0);
  const [cariSearch, setCariSearch] = useState("");
  const [cariTypeFilter, setCariTypeFilter] = useState("All");
  const [isCariLoading, setIsCariLoading] = useState(true);

  // Accounts Data
  const [accounts, setAccounts] = useState<FinancialAccountDto[]>([]);
  const [totalLiquidity, setTotalLiquidity] = useState(0);

  // Transactions Data
  const [transactions, setTransactions] = useState<FinancialTransactionDto[]>(
    []
  );
  const [txTotalCount, setTxTotalCount] = useState(0);

  // Modals & Drawers
  const [isCreateCariOpen, setIsCreateCariOpen] = useState(false);
  const [isCreateAccountOpen, setIsCreateAccountOpen] = useState(false);
  const [isCreateTxOpen, setIsCreateTxOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [selectedCariForStatement, setSelectedCariForStatement] =
    useState<CariAccountDto | null>(null);
  const [statementTx, setStatementTx] = useState<CariTransactionDto[]>([]);
  const [isStatementLoading, setIsStatementLoading] = useState(false);
  const [selectedCariForTx, setSelectedCariForTx] =
    useState<CariAccountDto | null>(null);
  const [selectedAccountForTransfer, setSelectedAccountForTransfer] =
    useState<FinancialAccountDto | null>(null);

  // 1. Load Cari
  const loadCari = useCallback(async () => {
    if (!tenantSlug) {
      return;
    }
    setIsCariLoading(true);
    try {
      const res = await ApiClient.getCariAccounts(tenantSlug, {
        page: 1,
        pageSize: 50,
        search: cariSearch || undefined,
        type: cariTypeFilter === "All" ? undefined : cariTypeFilter,
      });
      if (res.success && res.data) {
        setCariList(res.data.items);
        setCariTotalCount(res.data.totalCount);
        setOverallDebit(res.data.overallDebit);
        setOverallCredit(res.data.overallCredit);
        setOverallBalance(res.data.overallBalance);
      }
    } catch {
      toast.error("Cari hesaplar yüklenemedi.");
    } finally {
      setIsCariLoading(false);
    }
  }, [tenantSlug, cariSearch, cariTypeFilter]);

  // 2. Load Accounts
  const loadAccounts = useCallback(async () => {
    if (!tenantSlug) {
      return;
    }
    try {
      const res = await ApiClient.getFinancialAccounts(tenantSlug);
      if (res.success && res.data) {
        setAccounts(res.data);
        const sum = res.data.reduce(
          (acc, a) => acc + (a.currency === "TRY" ? a.balance : 0),
          0
        );
        setTotalLiquidity(sum);
      }
    } catch {
      toast.error("Kasa ve banka hesapları yüklenemedi.");
    }
  }, [tenantSlug]);

  // 3. Load Transactions
  const loadTransactions = useCallback(async () => {
    if (!tenantSlug) {
      return;
    }
    try {
      const res = await ApiClient.getFinancialTransactions(tenantSlug, {
        page: 1,
        pageSize: 50,
      });
      if (res.success && res.data) {
        setTransactions(res.data.items);
        setTxTotalCount(res.data.totalCount);
      }
    } catch {
      toast.error("Finans hareketleri yüklenemedi.");
    }
  }, [tenantSlug]);

  useEffect(() => {
    loadCari();
    loadAccounts();
    loadTransactions();
  }, [loadCari, loadAccounts, loadTransactions]);

  // Handle Statement Drawer
  const handleOpenStatement = useCallback(
    async (cari: CariAccountDto) => {
      setSelectedCariForStatement(cari);
      setIsStatementLoading(true);
      try {
        const res = await ApiClient.getCariStatement(cari.id, tenantSlug);
        if (res.success && res.data) {
          setStatementTx(res.data);
        }
      } catch {
        toast.error("Cari ekstre yüklenemedi.");
      } finally {
        setIsStatementLoading(false);
      }
    },
    [tenantSlug]
  );

  const handleCloseStatement = useCallback(() => {
    setSelectedCariForStatement(null);
    setStatementTx([]);
  }, []);

  const handleQuickTx = useCallback((cari: CariAccountDto) => {
    setSelectedCariForTx(cari);
    setIsCreateTxOpen(true);
  }, []);

  const handleTransfer = useCallback((acc: FinancialAccountDto) => {
    setSelectedAccountForTransfer(acc);
    setIsTransferOpen(true);
  }, []);

  const handlePrintStatement = useCallback(() => {
    window.print();
  }, []);

  const handleTabCari = useCallback(() => setActiveTab("cari"), []);
  const handleTabAccounts = useCallback(() => setActiveTab("accounts"), []);
  const handleTabTransactions = useCallback(
    () => setActiveTab("transactions"),
    []
  );

  const handleCariSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setCariSearch(e.target.value);
    },
    []
  );

  const handleCariTypeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setCariTypeFilter(e.target.value);
    },
    []
  );

  const handleOpenTx = useCallback(() => {
    setSelectedCariForTx(null);
    setIsCreateTxOpen(true);
  }, []);

  const handleOpenCariModal = useCallback(() => setIsCreateCariOpen(true), []);
  const handleCloseCariModal = useCallback(
    () => setIsCreateCariOpen(false),
    []
  );
  const handleCariSuccess = useCallback(() => {
    setIsCreateCariOpen(false);
    loadCari();
  }, [loadCari]);

  const handleOpenAccountModal = useCallback(
    () => setIsCreateAccountOpen(true),
    []
  );
  const handleCloseAccountModal = useCallback(
    () => setIsCreateAccountOpen(false),
    []
  );
  const handleAccountSuccess = useCallback(() => {
    setIsCreateAccountOpen(false);
    loadAccounts();
  }, [loadAccounts]);

  const handleCloseTxModal = useCallback(() => setIsCreateTxOpen(false), []);
  const handleTxSuccess = useCallback(() => {
    setIsCreateTxOpen(false);
    loadCari();
    loadAccounts();
    loadTransactions();
  }, [loadCari, loadAccounts, loadTransactions]);

  const handleCloseTransferModal = useCallback(
    () => setIsTransferOpen(false),
    []
  );
  const handleTransferSuccess = useCallback(() => {
    setIsTransferOpen(false);
    loadAccounts();
    loadTransactions();
  }, [loadAccounts, loadTransactions]);

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* 1. Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-2xl text-zinc-900 tracking-tight dark:text-zinc-100">
              Cari & Finans Yönetimi
            </h1>
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 font-semibold text-emerald-700 text-xs dark:bg-emerald-950/60 dark:text-emerald-300">
              Aktif Çift Taraflı Finans Motoru
            </span>
          </div>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Cari kartlar, borç/alacak bakiyeleri, kasa & banka likiditesi ve
            tahsilat/ödeme makbuzları.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 font-semibold text-sm text-zinc-700 shadow-2xs hover:bg-zinc-50 active:scale-95 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
            onClick={handleOpenTx}
            type="button"
          >
            <CreditCard className="h-4 w-4 text-emerald-600" />
            Fiş / Makbuz Kes
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 font-semibold text-sm text-white shadow-xs transition-all hover:bg-violet-700 active:scale-95"
            onClick={handleOpenCariModal}
            type="button"
          >
            <Plus className="h-4 w-4" />
            Yeni Cari Kart
          </button>
        </div>
      </div>

      {/* 2. Top Bento KPI Cards */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          colorClass="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400"
          icon={ArrowDownLeft}
          label="Müşteri Alacaklarımız"
          value={`${overallDebit.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺`}
        />
        <KpiCard
          colorClass="bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400"
          icon={ArrowUpRight}
          label="Tedarikçi Borçlarımız"
          value={`${overallCredit.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺`}
        />
        <KpiCard
          colorClass="bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-400"
          icon={Layers}
          label="Net Cari Bakiye Dengesi"
          value={`${overallBalance.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺`}
        />
        <KpiCard
          colorClass="bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400"
          icon={Landmark}
          label="Kasa & Banka Likiditesi"
          value={`${totalLiquidity.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺`}
        />
      </div>

      {/* 3. Navigation Tabs */}
      <div className="flex border-zinc-200 border-b dark:border-zinc-800">
        <button
          className={`flex items-center gap-2 border-b-2 px-4 py-3 font-semibold text-sm transition-all ${
            activeTab === "cari"
              ? "border-violet-600 text-violet-600 dark:border-violet-400 dark:text-violet-400"
              : "border-transparent text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
          }`}
          onClick={handleTabCari}
          type="button"
        >
          <Users2 className="h-4 w-4" /> Cari Kartlar ({cariTotalCount})
        </button>
        <button
          className={`flex items-center gap-2 border-b-2 px-4 py-3 font-semibold text-sm transition-all ${
            activeTab === "accounts"
              ? "border-violet-600 text-violet-600 dark:border-violet-400 dark:text-violet-400"
              : "border-transparent text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
          }`}
          onClick={handleTabAccounts}
          type="button"
        >
          <Landmark className="h-4 w-4" /> Kasa & Bankalar ({accounts.length})
        </button>
        <button
          className={`flex items-center gap-2 border-b-2 px-4 py-3 font-semibold text-sm transition-all ${
            activeTab === "transactions"
              ? "border-violet-600 text-violet-600 dark:border-violet-400 dark:text-violet-400"
              : "border-transparent text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
          }`}
          onClick={handleTabTransactions}
          type="button"
        >
          <Receipt className="h-4 w-4" /> Tahsilat & Ödeme Fişleri (
          {txTotalCount})
        </button>
      </div>

      {/* 4. Tab Contents */}

      {/* TAB 1: Cari Kartlar */}
      {activeTab === "cari" && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200/80 bg-white p-3 shadow-2xs sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800/80 dark:bg-zinc-900">
            <div className="relative flex-1">
              <Search className="absolute top-2.5 left-3 h-4 w-4 text-zinc-400" />
              <input
                className="w-full rounded-xl border border-zinc-200/80 bg-zinc-50/60 py-2 pr-3 pl-9 text-sm text-zinc-800 placeholder:text-zinc-400 focus:border-violet-500 focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-800/40 dark:text-zinc-200"
                onChange={handleCariSearchChange}
                placeholder="Cari Ünvanı, Kodu veya Vergi No Ara..."
                type="text"
                value={cariSearch}
              />
            </div>

            <select
              className="rounded-xl border border-zinc-200/80 bg-white px-3 py-2 font-medium text-sm text-zinc-700 focus:outline-none dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-300"
              onChange={handleCariTypeChange}
              value={cariTypeFilter}
            >
              <option value="All">Tüm Cari Tipleri</option>
              <option value="Customer">Müşteriler</option>
              <option value="Supplier">Tedarikçiler</option>
              <option value="Personnel">Personel</option>
            </select>
          </div>

          <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-xs dark:border-zinc-800/80 dark:bg-zinc-900">
            <div className="overflow-x-auto">
              <table className="w-full text-left font-sans text-xs">
                <thead>
                  <tr className="border-zinc-200/80 border-b bg-zinc-50/80 font-semibold text-[11px] text-zinc-500 uppercase tracking-wider dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-400">
                    <th className="py-3 pr-3 pl-4">Cari Kart & Kod</th>
                    <th className="px-3 py-3">Tür</th>
                    <th className="px-3 py-3">VKN / TCKN</th>
                    <th className="px-3 py-3 text-right">Toplam Borç</th>
                    <th className="px-3 py-3 text-right">Toplam Alacak</th>
                    <th className="px-3 py-3 text-right">Net Bakiye</th>
                    <th className="py-3 pr-4 pl-3 text-right">Aksiyonlar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                  <CariTableBody
                    cariList={cariList}
                    isCariLoading={isCariLoading}
                    onOpenStatement={handleOpenStatement}
                    onQuickTx={handleQuickTx}
                  />
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Kasa & Bankalar */}
      {activeTab === "accounts" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 font-semibold text-sm text-white shadow-xs hover:bg-violet-700 active:scale-95"
              onClick={handleOpenAccountModal}
              type="button"
            >
              <Plus className="h-4 w-4" /> Yeni Kasa / Banka Hesabı Aç
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {accounts.map((acc) => (
              <AccountCard
                account={acc}
                key={acc.id}
                onTransfer={handleTransfer}
              />
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: Tahsilat & Ödeme Fişleri */}
      {activeTab === "transactions" && (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-xs dark:border-zinc-800/80 dark:bg-zinc-900">
            <div className="overflow-x-auto">
              <table className="w-full text-left font-sans text-xs">
                <thead>
                  <tr className="border-zinc-200/80 border-b bg-zinc-50/80 font-semibold text-[11px] text-zinc-500 uppercase tracking-wider dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-400">
                    <th className="py-3 pr-3 pl-4">Tarih & Evrak</th>
                    <th className="px-3 py-3">Hesap (Kasa/Banka)</th>
                    <th className="px-3 py-3">İşlem Türü</th>
                    <th className="px-3 py-3">İlişkili Cari</th>
                    <th className="px-3 py-3">Açıklama</th>
                    <th className="py-3 pr-4 pl-3 text-right">Tutar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                  {transactions.length === 0 ? (
                    <tr>
                      <td
                        className="py-12 text-center text-zinc-400"
                        colSpan={6}
                      >
                        <Receipt className="mx-auto mb-2 h-8 w-8 opacity-40" />
                        Henüz finansal fiş veya hareket kaydı bulunmuyor.
                      </td>
                    </tr>
                  ) : (
                    transactions.map((tx) => (
                      <tr
                        className="border-zinc-100 border-b hover:bg-zinc-50/80 dark:border-zinc-800/60 dark:hover:bg-zinc-800/40"
                        key={tx.id}
                      >
                        <td className="py-3.5 pr-3 pl-4 font-mono text-zinc-700 dark:text-zinc-300">
                          <div>
                            {new Date(tx.transactionDate).toLocaleDateString(
                              "tr-TR"
                            )}
                          </div>
                          <div className="text-[10px] text-zinc-400">
                            {tx.documentNumber || "—"}
                          </div>
                        </td>
                        <td className="px-3 py-3.5 font-medium text-zinc-900 dark:text-zinc-100">
                          {tx.financialAccountName}
                        </td>
                        <td className="px-3 py-3.5">
                          <span
                            className={`inline-flex rounded-md px-2 py-0.5 font-semibold text-xs ${getTxBadgeClass(
                              tx.type
                            )}`}
                          >
                            {getTxLabel(tx.type)}
                          </span>
                        </td>
                        <td className="px-3 py-3.5 font-medium text-zinc-800 dark:text-zinc-200">
                          {tx.cariTitle || "—"}
                        </td>
                        <td className="px-3 py-3.5 text-zinc-600 dark:text-zinc-400">
                          {tx.description}
                        </td>
                        <td className="py-3.5 pr-4 pl-3 text-right font-bold font-mono text-sm text-zinc-900 dark:text-zinc-100">
                          {tx.type === "Collection" ? "+" : "-"}
                          {tx.amount.toLocaleString("tr-TR", {
                            minimumFractionDigits: 2,
                          })}{" "}
                          {tx.currency}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 5. Cari Statement Drawer */}
      {selectedCariForStatement ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs">
          <div className="flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl dark:bg-zinc-900 print:max-w-none print:shadow-none">
            <div className="flex items-center justify-between border-zinc-200 border-b p-4 dark:border-zinc-800 print:hidden">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                <h2 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                  Cari Hesap Ekstresi
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 font-semibold text-xs text-zinc-700 shadow-2xs hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
                  onClick={handlePrintStatement}
                  type="button"
                >
                  <Printer className="h-3.5 w-3.5" /> Yazdır
                </button>
                <button
                  className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
                  onClick={handleCloseStatement}
                  type="button"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto p-6">
              {/* Account Overview Header */}
              <div className="flex items-start justify-between border-zinc-200 border-b pb-4 dark:border-zinc-800">
                <div>
                  <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-100">
                    {selectedCariForStatement?.title}
                  </h3>
                  <div className="font-mono text-xs text-zinc-400">
                    Cari Kodu: {selectedCariForStatement?.code} • VKN:{" "}
                    {selectedCariForStatement?.taxNumber || "—"}
                  </div>
                </div>
                <div className="text-right">
                  <span className="block font-medium text-[11px] text-zinc-400 uppercase tracking-wider">
                    Güncel Bakiye
                  </span>
                  <span className="font-bold font-mono text-lg text-violet-600 dark:text-violet-400">
                    {selectedCariForStatement?.balance.toLocaleString("tr-TR", {
                      minimumFractionDigits: 2,
                    })}{" "}
                    {selectedCariForStatement?.currency}
                  </span>
                </div>
              </div>

              {/* Transactions Table */}
              <div>
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-zinc-200 border-b font-semibold text-zinc-400 dark:border-zinc-800">
                      <th className="py-2">Tarih</th>
                      <th className="py-2">İşlem / Evrak</th>
                      <th className="py-2 text-right">Borç</th>
                      <th className="py-2 text-right">Alacak</th>
                      <th className="py-2 text-right">Bakiye</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/40">
                    <StatementTableBody
                      isStatementLoading={isStatementLoading}
                      statementTx={statementTx}
                    />
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* 6. Modals */}
      {isCreateCariOpen ? (
        <CreateCariModal
          onClose={handleCloseCariModal}
          onSuccess={handleCariSuccess}
          tenantSlug={tenantSlug}
        />
      ) : null}

      {isCreateAccountOpen ? (
        <CreateAccountModal
          onClose={handleCloseAccountModal}
          onSuccess={handleAccountSuccess}
          tenantSlug={tenantSlug}
        />
      ) : null}

      {isCreateTxOpen ? (
        <CreateTransactionModal
          accounts={accounts}
          cariList={cariList}
          defaultCari={selectedCariForTx}
          onClose={handleCloseTxModal}
          onSuccess={handleTxSuccess}
          tenantSlug={tenantSlug}
        />
      ) : null}

      {isTransferOpen ? (
        <TransferModal
          accounts={accounts}
          defaultSource={selectedAccountForTransfer}
          onClose={handleCloseTransferModal}
          onSuccess={handleTransferSuccess}
          tenantSlug={tenantSlug}
        />
      ) : null}
    </div>
  );
}

// --- Create Cari Modal ---

interface CreateCariModalProps {
  onClose: () => void;
  onSuccess: () => void;
  tenantSlug: string;
}

function CreateCariModal({
  tenantSlug,
  onClose,
  onSuccess,
}: CreateCariModalProps) {
  const [code, setCode] = useState(
    `CAR-${Math.floor(1000 + Math.random() * 9000)}`
  );
  const [title, setTitle] = useState("");
  const [type, setType] = useState("Customer");
  const [taxOffice, setTaxOffice] = useState("");
  const [taxNumber, setTaxNumber] = useState("");
  const [city, setCity] = useState("İstanbul");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCodeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setCode(e.target.value),
    []
  );
  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value),
    []
  );
  const handleTypeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => setType(e.target.value),
    []
  );
  const handleCityChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setCity(e.target.value),
    []
  );
  const handleTaxOfficeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setTaxOffice(e.target.value),
    []
  );
  const handleTaxNumberChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setTaxNumber(e.target.value),
    []
  );
  const handlePhoneChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setPhone(e.target.value),
    []
  );
  const handleEmailChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value),
    []
  );

  const handleSubmit = useCallback(async () => {
    if (!title.trim()) {
      toast.error("Lütfen cari hesap ünvanını girin.");
      return;
    }
    setIsSubmitting(true);
    try {
      const payload: CreateCariPayload = {
        city,
        code,
        email,
        paymentTermDays: 30,
        phone,
        taxNumber,
        taxOffice,
        title,
        type,
      };
      const res = await ApiClient.createCariAccount(payload, tenantSlug);
      if (res.success) {
        toast.success("Cari kart başarıyla oluşturuldu!");
        onSuccess();
      }
    } catch {
      toast.error("Cari kart oluşturulurken hata oluştu.");
    } finally {
      setIsSubmitting(false);
    }
  }, [
    code,
    title,
    type,
    taxOffice,
    taxNumber,
    city,
    phone,
    email,
    tenantSlug,
    onSuccess,
  ]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-2xl dark:bg-zinc-900">
        <div className="flex items-center justify-between border-zinc-200 border-b p-4 dark:border-zinc-800">
          <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
            Yeni Cari Kart Aç
          </h3>
          <button
            className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            onClick={onClose}
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3 p-4 text-xs">
          <div>
            <label
              className="mb-1 block font-semibold text-zinc-700 dark:text-zinc-300"
              htmlFor="cari-code-input"
            >
              Cari Kodu *
            </label>
            <input
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-2 font-mono text-zinc-800 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
              id="cari-code-input"
              onChange={handleCodeChange}
              type="text"
              value={code}
            />
          </div>

          <div>
            <label
              className="mb-1 block font-semibold text-zinc-700 dark:text-zinc-300"
              htmlFor="cari-title-input"
            >
              Cari Ünvan / Ad Soyad *
            </label>
            <input
              className="w-full rounded-xl border border-zinc-200 bg-white p-2 text-zinc-800 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
              id="cari-title-input"
              onChange={handleTitleChange}
              placeholder="Örn: ABC Lojistik A.Ş."
              type="text"
              value={title}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                className="mb-1 block font-semibold text-zinc-700 dark:text-zinc-300"
                htmlFor="cari-type-select"
              >
                Cari Türü
              </label>
              <select
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-2 text-zinc-800 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
                id="cari-type-select"
                onChange={handleTypeChange}
                value={type}
              >
                <option value="Customer">Müşteri</option>
                <option value="Supplier">Tedarikçi</option>
                <option value="Personnel">Personel</option>
              </select>
            </div>

            <div>
              <label
                className="mb-1 block font-semibold text-zinc-700 dark:text-zinc-300"
                htmlFor="cari-city-input"
              >
                Şehir
              </label>
              <input
                className="w-full rounded-xl border border-zinc-200 bg-white p-2 text-zinc-800 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
                id="cari-city-input"
                onChange={handleCityChange}
                type="text"
                value={city}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                className="mb-1 block font-semibold text-zinc-700 dark:text-zinc-300"
                htmlFor="cari-taxoffice-input"
              >
                Vergi Dairesi
              </label>
              <input
                className="w-full rounded-xl border border-zinc-200 bg-white p-2 text-zinc-800 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
                id="cari-taxoffice-input"
                onChange={handleTaxOfficeChange}
                placeholder="Örn: Maslak"
                type="text"
                value={taxOffice}
              />
            </div>

            <div>
              <label
                className="mb-1 block font-semibold text-zinc-700 dark:text-zinc-300"
                htmlFor="cari-taxno-input"
              >
                VKN / TCKN
              </label>
              <input
                className="w-full rounded-xl border border-zinc-200 bg-white p-2 font-mono text-zinc-800 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
                id="cari-taxno-input"
                onChange={handleTaxNumberChange}
                placeholder="10 veya 11 hane"
                type="text"
                value={taxNumber}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                className="mb-1 block font-semibold text-zinc-700 dark:text-zinc-300"
                htmlFor="cari-phone-input"
              >
                Telefon
              </label>
              <input
                className="w-full rounded-xl border border-zinc-200 bg-white p-2 text-zinc-800 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
                id="cari-phone-input"
                onChange={handlePhoneChange}
                placeholder="05..."
                type="text"
                value={phone}
              />
            </div>
            <div>
              <label
                className="mb-1 block font-semibold text-zinc-700 dark:text-zinc-300"
                htmlFor="cari-email-input"
              >
                E-posta
              </label>
              <input
                className="w-full rounded-xl border border-zinc-200 bg-white p-2 text-zinc-800 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
                id="cari-email-input"
                onChange={handleEmailChange}
                placeholder="info@..."
                type="email"
                value={email}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-zinc-200 border-t p-4 dark:border-zinc-800">
          <button
            className="rounded-xl border border-zinc-200 px-4 py-2 font-medium text-xs text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300"
            onClick={onClose}
            type="button"
          >
            Vazgeç
          </button>
          <button
            className="rounded-xl bg-violet-600 px-4 py-2 font-semibold text-white text-xs shadow-xs hover:bg-violet-700 disabled:opacity-50"
            disabled={isSubmitting}
            onClick={handleSubmit}
            type="button"
          >
            {isSubmitting ? "Kaydediliyor..." : "Kartı Aç"}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Create Account Modal ---

interface CreateAccountModalProps {
  onClose: () => void;
  onSuccess: () => void;
  tenantSlug: string;
}

function CreateAccountModal({
  tenantSlug,
  onClose,
  onSuccess,
}: CreateAccountModalProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState("Bank");
  const [bankName, setBankName] = useState("Garanti BBVA");
  const [iban, setIban] = useState("TR");
  const [currency, setCurrency] = useState("TRY");
  const [initialBalance, setInitialBalance] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value),
    []
  );
  const handleTypeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => setType(e.target.value),
    []
  );
  const handleCurrencyChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => setCurrency(e.target.value),
    []
  );
  const handleBankNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setBankName(e.target.value),
    []
  );
  const handleIbanChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setIban(e.target.value),
    []
  );
  const handleBalanceChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setInitialBalance(Number(e.target.value)),
    []
  );

  const handleSubmit = useCallback(async () => {
    if (!name.trim()) {
      toast.error("Lütfen hesap adını girin.");
      return;
    }
    setIsSubmitting(true);
    try {
      const payload: CreateFinancialAccountPayload = {
        bankName: type === "Bank" ? bankName : undefined,
        currency,
        iban: type === "Bank" ? iban : undefined,
        initialBalance,
        name,
        type,
      };
      const res = await ApiClient.createFinancialAccount(payload, tenantSlug);
      if (res.success) {
        toast.success("Kasa / Banka hesabı başarıyla açıldı!");
        onSuccess();
      }
    } catch {
      toast.error("Hesap açılırken bir hata oluştu.");
    } finally {
      setIsSubmitting(false);
    }
  }, [
    name,
    type,
    bankName,
    iban,
    currency,
    initialBalance,
    tenantSlug,
    onSuccess,
  ]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="flex max-h-[90vh] w-full max-w-md flex-col rounded-2xl bg-white shadow-2xl dark:bg-zinc-900">
        <div className="flex items-center justify-between border-zinc-200 border-b p-4 dark:border-zinc-800">
          <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
            Yeni Kasa / Banka Hesabı
          </h3>
          <button
            className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            onClick={onClose}
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3 p-4 text-xs">
          <div>
            <label
              className="mb-1 block font-semibold text-zinc-700 dark:text-zinc-300"
              htmlFor="acc-name-input"
            >
              Hesap Adı *
            </label>
            <input
              className="w-full rounded-xl border border-zinc-200 bg-white p-2 text-zinc-800 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
              id="acc-name-input"
              onChange={handleNameChange}
              placeholder="Örn: Garanti Ticari TL veya Merkez Kasa"
              type="text"
              value={name}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                className="mb-1 block font-semibold text-zinc-700 dark:text-zinc-300"
                htmlFor="acc-type-select"
              >
                Hesap Türü
              </label>
              <select
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-2 text-zinc-800 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
                id="acc-type-select"
                onChange={handleTypeChange}
                value={type}
              >
                <option value="Bank">Banka Hesabı</option>
                <option value="Cash">Nakit Kasa</option>
                <option value="Pos">Sanal / Fiziki POS</option>
              </select>
            </div>

            <div>
              <label
                className="mb-1 block font-semibold text-zinc-700 dark:text-zinc-300"
                htmlFor="acc-currency-select"
              >
                Para Birimi
              </label>
              <select
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-2 text-zinc-800 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
                id="acc-currency-select"
                onChange={handleCurrencyChange}
                value={currency}
              >
                <option value="TRY">TRY (₺)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </div>
          </div>

          {type === "Bank" ? (
            <>
              <div>
                <label
                  className="mb-1 block font-semibold text-zinc-700 dark:text-zinc-300"
                  htmlFor="acc-bankname-input"
                >
                  Banka Adı
                </label>
                <input
                  className="w-full rounded-xl border border-zinc-200 bg-white p-2 text-zinc-800 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
                  id="acc-bankname-input"
                  onChange={handleBankNameChange}
                  type="text"
                  value={bankName}
                />
              </div>

              <div>
                <label
                  className="mb-1 block font-semibold text-zinc-700 dark:text-zinc-300"
                  htmlFor="acc-iban-input"
                >
                  IBAN
                </label>
                <input
                  className="w-full rounded-xl border border-zinc-200 bg-white p-2 font-mono text-zinc-800 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
                  id="acc-iban-input"
                  onChange={handleIbanChange}
                  type="text"
                  value={iban}
                />
              </div>
            </>
          ) : null}

          <div>
            <label
              className="mb-1 block font-semibold text-zinc-700 dark:text-zinc-300"
              htmlFor="acc-balance-input"
            >
              Açılış Bakiyesi
            </label>
            <input
              className="w-full rounded-xl border border-zinc-200 bg-white p-2 font-mono text-zinc-800 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
              id="acc-balance-input"
              onChange={handleBalanceChange}
              step="0.01"
              type="number"
              value={initialBalance}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-zinc-200 border-t p-4 dark:border-zinc-800">
          <button
            className="rounded-xl border border-zinc-200 px-4 py-2 font-medium text-xs text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300"
            onClick={onClose}
            type="button"
          >
            Vazgeç
          </button>
          <button
            className="rounded-xl bg-violet-600 px-4 py-2 font-semibold text-white text-xs shadow-xs hover:bg-violet-700 disabled:opacity-50"
            disabled={isSubmitting}
            onClick={handleSubmit}
            type="button"
          >
            {isSubmitting ? "Kaydediliyor..." : "Hesabı Aç"}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Create Transaction Modal (Tahsilat / Ödeme) ---

interface CreateTransactionModalProps {
  accounts: FinancialAccountDto[];
  cariList: CariAccountDto[];
  defaultCari: CariAccountDto | null;
  onClose: () => void;
  onSuccess: () => void;
  tenantSlug: string;
}

function CreateTransactionModal({
  tenantSlug,
  accounts,
  cariList,
  defaultCari,
  onClose,
  onSuccess,
}: CreateTransactionModalProps) {
  const [financialAccountId, setFinancialAccountId] = useState(
    accounts[0]?.id || ""
  );
  const [cariAccountId, setCariAccountId] = useState(defaultCari?.id || "");
  const [type, setType] = useState<"Collection" | "Payment">("Collection");
  const [amount, setAmount] = useState(0);
  const [documentNumber, setDocumentNumber] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSelectCollection = useCallback(() => setType("Collection"), []);
  const handleSelectPayment = useCallback(() => setType("Payment"), []);
  const handleAccountChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) =>
      setFinancialAccountId(e.target.value),
    []
  );
  const handleCariChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) =>
      setCariAccountId(e.target.value),
    []
  );
  const handleAmountChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setAmount(Number(e.target.value)),
    []
  );
  const handleDocNoChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setDocumentNumber(e.target.value),
    []
  );
  const handleDescChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setDescription(e.target.value),
    []
  );

  const handleSubmit = useCallback(async () => {
    if (!financialAccountId) {
      toast.error("Lütfen bir kasa veya banka hesabı seçin.");
      return;
    }
    if (amount <= 0) {
      toast.error("Lütfen geçerli bir tutar girin.");
      return;
    }
    setIsSubmitting(true);
    try {
      const payload: CreateFinancialTransactionPayload = {
        amount,
        cariAccountId: cariAccountId || undefined,
        currency: "TRY",
        description:
          description ||
          `${type === "Collection" ? "Tahsilat" : "Ödeme"} Makbuzu`,
        documentNumber,
        exchangeRate: 1,
        financialAccountId,
        transactionDate: new Date().toISOString(),
        type,
      };
      const res = await ApiClient.createFinancialTransaction(
        payload,
        tenantSlug
      );
      if (res.success) {
        toast.success(
          type === "Collection"
            ? "Tahsilat kaydedildi ve cari hesaba alacak işlendi!"
            : "Ödeme kaydedildi ve cari hesaba borç işlendi!"
        );
        onSuccess();
      }
    } catch {
      toast.error("İşlem kaydedilemedi.");
    } finally {
      setIsSubmitting(false);
    }
  }, [
    financialAccountId,
    cariAccountId,
    type,
    amount,
    documentNumber,
    description,
    tenantSlug,
    onSuccess,
  ]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="flex max-h-[90vh] w-full max-w-md flex-col rounded-2xl bg-white shadow-2xl dark:bg-zinc-900">
        <div className="flex items-center justify-between border-zinc-200 border-b p-4 dark:border-zinc-800">
          <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
            Tahsilat & Ödeme Fişi
          </h3>
          <button
            className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            onClick={onClose}
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3 p-4 text-xs">
          <div>
            <span className="mb-1 block font-semibold text-zinc-700 dark:text-zinc-300">
              İşlem Yönü
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                className={`rounded-xl py-2 font-bold text-xs transition-all ${
                  type === "Collection"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "border border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-300"
                }`}
                onClick={handleSelectCollection}
                type="button"
              >
                + Tahsilat (Giriş)
              </button>
              <button
                className={`rounded-xl py-2 font-bold text-xs transition-all ${
                  type === "Payment"
                    ? "bg-rose-600 text-white shadow-xs"
                    : "border border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-300"
                }`}
                onClick={handleSelectPayment}
                type="button"
              >
                - Ödeme (Çıkış)
              </button>
            </div>
          </div>

          <div>
            <label
              className="mb-1 block font-semibold text-zinc-700 dark:text-zinc-300"
              htmlFor="tx-acc-select"
            >
              Kasa / Banka Hesabı *
            </label>
            <select
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-2 text-zinc-800 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
              id="tx-acc-select"
              onChange={handleAccountChange}
              value={financialAccountId}
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.balance.toLocaleString("tr-TR")} {a.currency})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              className="mb-1 block font-semibold text-zinc-700 dark:text-zinc-300"
              htmlFor="tx-cari-select"
            >
              İlgili Cari Hesap (İsteğe Bağlı)
            </label>
            <select
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-2 text-zinc-800 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
              id="tx-cari-select"
              onChange={handleCariChange}
              value={cariAccountId}
            >
              <option value="">— Cari Yok (Genel Masraf / Gelir) —</option>
              {cariList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title} (Bakiye: {c.balance.toLocaleString("tr-TR")}{" "}
                  {c.currency})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              className="mb-1 block font-semibold text-zinc-700 dark:text-zinc-300"
              htmlFor="tx-amount-input"
            >
              Tutar (TL) *
            </label>
            <input
              className="w-full rounded-xl border border-zinc-200 bg-white p-2 font-bold font-mono text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-100"
              id="tx-amount-input"
              min={0}
              onChange={handleAmountChange}
              placeholder="0.00"
              step="0.01"
              type="number"
              value={amount}
            />
          </div>

          <div>
            <label
              className="mb-1 block font-semibold text-zinc-700 dark:text-zinc-300"
              htmlFor="tx-docno-input"
            >
              Dekont / Makbuz No
            </label>
            <input
              className="w-full rounded-xl border border-zinc-200 bg-white p-2 text-zinc-800 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
              id="tx-docno-input"
              onChange={handleDocNoChange}
              placeholder="Örn: DEK-2026-0012"
              type="text"
              value={documentNumber}
            />
          </div>

          <div>
            <label
              className="mb-1 block font-semibold text-zinc-700 dark:text-zinc-300"
              htmlFor="tx-desc-input"
            >
              Açıklama
            </label>
            <input
              className="w-full rounded-xl border border-zinc-200 bg-white p-2 text-zinc-800 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
              id="tx-desc-input"
              onChange={handleDescChange}
              placeholder="Örn: Fatura ödemesi veya peşinat..."
              type="text"
              value={description}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-zinc-200 border-t p-4 dark:border-zinc-800">
          <button
            className="rounded-xl border border-zinc-200 px-4 py-2 font-medium text-xs text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300"
            onClick={onClose}
            type="button"
          >
            Vazgeç
          </button>
          <button
            className={`rounded-xl px-4 py-2 font-semibold text-white text-xs shadow-xs disabled:opacity-50 ${
              type === "Collection"
                ? "bg-emerald-600 hover:bg-emerald-700"
                : "bg-rose-600 hover:bg-rose-700"
            }`}
            disabled={isSubmitting}
            onClick={handleSubmit}
            type="button"
          >
            {isSubmitting ? "İşleniyor..." : "Fişi Kaydet"}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Transfer Modal (Virman) ---

interface TransferModalProps {
  accounts: FinancialAccountDto[];
  defaultSource: FinancialAccountDto | null;
  onClose: () => void;
  onSuccess: () => void;
  tenantSlug: string;
}

function TransferModal({
  tenantSlug,
  accounts,
  defaultSource,
  onClose,
  onSuccess,
}: TransferModalProps) {
  const [sourceAccountId, setSourceAccountId] = useState(
    defaultSource?.id || accounts[0]?.id || ""
  );
  const [targetAccountId, setTargetAccountId] = useState(
    accounts.find((a) => a.id !== (defaultSource?.id || accounts[0]?.id))?.id ||
      ""
  );
  const [amount, setAmount] = useState(0);
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSourceChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) =>
      setSourceAccountId(e.target.value),
    []
  );
  const handleTargetChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) =>
      setTargetAccountId(e.target.value),
    []
  );
  const handleAmountChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setAmount(Number(e.target.value)),
    []
  );
  const handleDescChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setDescription(e.target.value),
    []
  );

  const handleSubmit = useCallback(async () => {
    if (
      !(sourceAccountId && targetAccountId) ||
      sourceAccountId === targetAccountId
    ) {
      toast.error("Lütfen farklı kaynak ve hedef hesaplar seçin.");
      return;
    }
    if (amount <= 0) {
      toast.error("Lütfen geçerli bir virman tutarı girin.");
      return;
    }
    setIsSubmitting(true);
    try {
      const payload: TransferBetweenAccountsPayload = {
        amount,
        description: description || "Hesaplar arası virman transferi",
        sourceAccountId,
        targetAccountId,
        transactionDate: new Date().toISOString(),
      };
      const res = await ApiClient.transferBetweenAccounts(payload, tenantSlug);
      if (res.success) {
        toast.success("Virman işlemi başarıyla gerçekleştirildi!");
        onSuccess();
      }
    } catch {
      toast.error("Transfer gerçekleştirilemedi.");
    } finally {
      setIsSubmitting(false);
    }
  }, [
    sourceAccountId,
    targetAccountId,
    amount,
    description,
    tenantSlug,
    onSuccess,
  ]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="flex max-h-[90vh] w-full max-w-md flex-col rounded-2xl bg-white shadow-2xl dark:bg-zinc-900">
        <div className="flex items-center justify-between border-zinc-200 border-b p-4 dark:border-zinc-800">
          <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
            Hesaplar Arası Virman
          </h3>
          <button
            className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            onClick={onClose}
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3 p-4 text-xs">
          <div>
            <label
              className="mb-1 block font-semibold text-zinc-700 dark:text-zinc-300"
              htmlFor="transfer-source-select"
            >
              Kaynak Hesap (Para Çıkacak) *
            </label>
            <select
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-2 text-zinc-800 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
              id="transfer-source-select"
              onChange={handleSourceChange}
              value={sourceAccountId}
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.balance.toLocaleString("tr-TR")} {a.currency})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              className="mb-1 block font-semibold text-zinc-700 dark:text-zinc-300"
              htmlFor="transfer-target-select"
            >
              Hedef Hesap (Para Girecek) *
            </label>
            <select
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-2 text-zinc-800 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
              id="transfer-target-select"
              onChange={handleTargetChange}
              value={targetAccountId}
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.balance.toLocaleString("tr-TR")} {a.currency})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              className="mb-1 block font-semibold text-zinc-700 dark:text-zinc-300"
              htmlFor="transfer-amount-input"
            >
              Transfer Tutarı *
            </label>
            <input
              className="w-full rounded-xl border border-zinc-200 bg-white p-2 font-bold font-mono text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-100"
              id="transfer-amount-input"
              min={0}
              onChange={handleAmountChange}
              placeholder="0.00"
              step="0.01"
              type="number"
              value={amount}
            />
          </div>

          <div>
            <label
              className="mb-1 block font-semibold text-zinc-700 dark:text-zinc-300"
              htmlFor="transfer-desc-input"
            >
              Açıklama
            </label>
            <input
              className="w-full rounded-xl border border-zinc-200 bg-white p-2 text-zinc-800 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
              id="transfer-desc-input"
              onChange={handleDescChange}
              placeholder="Örn: Kasadan bankaya nakit yatırma..."
              type="text"
              value={description}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-zinc-200 border-t p-4 dark:border-zinc-800">
          <button
            className="rounded-xl border border-zinc-200 px-4 py-2 font-medium text-xs text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300"
            onClick={onClose}
            type="button"
          >
            Vazgeç
          </button>
          <button
            className="rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white text-xs shadow-xs hover:bg-blue-700 disabled:opacity-50"
            disabled={isSubmitting}
            onClick={handleSubmit}
            type="button"
          >
            {isSubmitting ? "Aktarılıyor..." : "Virmanı Tamamla"}
          </button>
        </div>
      </div>
    </div>
  );
}
