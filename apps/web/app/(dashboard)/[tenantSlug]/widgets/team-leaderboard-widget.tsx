/* Hallmark · component: team-leaderboard · genre: modern-minimal · theme: Adaptive Zinc/Violet */
"use client";

import { Award, Flame, Medal, Plus, Trophy } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ApiClient } from "@/lib/api-client";
import { usePermissions } from "@/lib/permissions/permission-context";
import type { TeamMemberScore } from "./dashboard-types";

const AVATAR_COLORS = [
  "bg-violet-600",
  "bg-indigo-600",
  "bg-blue-600",
  "bg-emerald-600",
  "bg-amber-600",
  "bg-rose-600",
  "bg-cyan-600",
];

export function TeamLeaderboardWidget() {
  const { activeTenant } = usePermissions();
  const [members, setMembers] = useState<TeamMemberScore[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!activeTenant?.id) {
        return;
      }
      setIsLoading(true);
      try {
        const [empRes, dealsRes, quotesRes, ordersRes] =
          await Promise.allSettled([
            ApiClient.getEmployees(
              { pageSize: 50, status: "Active" },
              activeTenant.id
            ),
            ApiClient.getDeals({ pageSize: 100 }, activeTenant.id),
            ApiClient.getQuotes({ pageSize: 100 }, activeTenant.id),
            ApiClient.getOrders({ pageSize: 100 }, activeTenant.id),
          ]);

        const employees =
          empRes.status === "fulfilled" &&
          empRes.value.success &&
          empRes.value.data?.items
            ? empRes.value.data.items
            : [];

        const deals =
          dealsRes.status === "fulfilled" &&
          dealsRes.value.success &&
          dealsRes.value.data?.items
            ? dealsRes.value.data.items
            : [];

        const quotes =
          quotesRes.status === "fulfilled" &&
          quotesRes.value.success &&
          quotesRes.value.data?.items
            ? quotesRes.value.data.items
            : [];

        const orders =
          ordersRes.status === "fulfilled" &&
          ordersRes.value.success &&
          ordersRes.value.data?.items
            ? ordersRes.value.data.items
            : [];

        if (
          employees.length === 0 &&
          deals.length === 0 &&
          orders.length === 0
        ) {
          setMembers([]);
          return;
        }

        // Map performance per employee or assigned user
        const scoreMap = new Map<
          string,
          { name: string; role: string; achieved: number; dealsClosed: number }
        >();

        // 1. Seed with active employees
        for (const emp of employees) {
          const empName =
            emp.fullName ||
            `${emp.firstName} ${emp.lastName}`.trim() ||
            emp.email;
          const role =
            emp.jobPositionTitle || emp.departmentName || "Satış Temsilcisi";
          scoreMap.set(emp.id, {
            achieved: 0,
            dealsClosed: 0,
            name: empName,
            role,
          });
        }

        // 2. Aggregate won deals
        for (const deal of deals) {
          if (
            deal.status === "Won" ||
            deal.stageName?.toLowerCase().includes("kazan")
          ) {
            const key =
              deal.assignedUserId || deal.assignedUserName || "unassigned";
            const existing = scoreMap.get(key) || {
              achieved: 0,
              dealsClosed: 0,
              name: deal.assignedUserName || "Temsilci",
              role: "Hesap Yöneticisi",
            };
            existing.achieved += Number(deal.value || 0);
            existing.dealsClosed += 1;
            scoreMap.set(key, existing);
          }
        }

        // 3. Aggregate accepted quotes
        for (const quote of quotes) {
          if (quote.status === "Accepted") {
            const key =
              quote.assignedUserId || quote.assignedUserName || "unassigned";
            const existing = scoreMap.get(key) || {
              achieved: 0,
              dealsClosed: 0,
              name: quote.assignedUserName || "Temsilci",
              role: "Satış Uzmanı",
            };
            existing.achieved += Number(quote.totalAmount || 0);
            existing.dealsClosed += 1;
            scoreMap.set(key, existing);
          }
        }

        // 4. Aggregate completed orders
        for (const order of orders) {
          if (
            order.status === "Completed" ||
            order.status === "Approved" ||
            order.paymentStatus === "Paid"
          ) {
            const key =
              (order as any).assignedUserId ||
              order.customerName ||
              "unassigned";
            const existing = scoreMap.get(key);
            if (existing) {
              existing.achieved += Number(order.totalAmount || 0);
              existing.dealsClosed += 1;
            }
          }
        }

        // Build list and sort by achieved descending
        const items = Array.from(scoreMap.entries())
          .filter(([_, val]) => val.name && val.name !== "unassigned")
          .map(([id, val], idx) => {
            const initials = val.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .substring(0, 2)
              .toUpperCase();
            const target = Math.max(
              val.achieved > 0
                ? Math.ceil((val.achieved * 1.25) / 1000) * 1000
                : 50_000,
              25_000
            );
            return {
              achieved: val.achieved,
              avatarColor:
                AVATAR_COLORS[idx % AVATAR_COLORS.length] || "bg-violet-600",
              dealsClosed: val.dealsClosed,
              id,
              initials,
              name: val.name,
              rank: 1,
              role: val.role,
              target,
            };
          })
          .sort(
            (a, b) => b.achieved - a.achieved || b.dealsClosed - a.dealsClosed
          )
          .map((m, idx) => ({ ...m, rank: idx + 1 }))
          .slice(0, 5);

        setMembers(items);
      } catch {
        setMembers([]);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [activeTenant?.id]);

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return (
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 font-bold text-amber-600 text-xs dark:bg-amber-950/60 dark:text-amber-400">
            <Trophy className="h-3 w-3" />
          </div>
        );
      case 2:
        return (
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-200 font-bold text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            <Medal className="h-3 w-3" />
          </div>
        );
      case 3:
        return (
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-50 font-bold text-amber-800 text-xs dark:bg-amber-950/40 dark:text-amber-300">
            <Award className="h-3 w-3" />
          </div>
        );
      default:
        return (
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-100 font-bold text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
            {rank}
          </div>
        );
    }
  };

  return (
    <div className="flex h-full flex-col justify-between rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-2xs transition-all hover:border-zinc-300 dark:border-zinc-800/90 dark:bg-zinc-900/90 dark:hover:border-zinc-700">
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-50 text-violet-600 shadow-2xs dark:bg-violet-950/60 dark:text-violet-400">
              <Trophy className="h-4 w-4" />
            </div>
            <div>
              <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                Satış Liderlik Tablosu
              </span>
              <div className="font-medium text-[11px] text-zinc-500 dark:text-zinc-400">
                Dönemin en başarılı temsilcileri
              </div>
            </div>
          </div>

          {members.length > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 font-bold text-[10px] text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
              <Flame className="h-3 w-3 text-amber-500" />
              Yarış Sürüyor
            </span>
          )}
        </div>

        {/* Content Area */}
        {isLoading ? (
          <div className="space-y-2 py-3">
            {[1, 2, 3].map((i) => (
              <div
                className="h-10 w-full animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800"
                key={i}
              />
            ))}
          </div>
        ) : members.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-7 text-center">
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400 shadow-2xs dark:bg-zinc-800 dark:text-zinc-500">
              <Trophy className="h-5 w-5" />
            </div>
            <h4 className="font-bold text-xs text-zinc-800 dark:text-zinc-200">
              Henüz satış performansı kaydedilmedi
            </h4>
            <p className="mt-0.5 max-w-xs text-[11px] text-zinc-400 dark:text-zinc-500">
              Temsilcilerinizin kapattığı satışlar ve siparişler burada liderlik
              sıralaması olarak görüntülenecektir.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <Link
                className="inline-flex items-center gap-1 rounded-xl bg-violet-600 px-3.5 py-1.5 font-bold text-white text-xs shadow-xs transition hover:bg-violet-700 active:scale-95"
                href={`/${activeTenant?.slug || "workspace"}/pipelines`}
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Fırsat Ekle</span>
              </Link>
              <Link
                className="inline-flex items-center gap-1 rounded-xl border border-zinc-200 bg-white px-3.5 py-1.5 font-bold text-xs text-zinc-700 shadow-2xs transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                href={`/${activeTenant?.slug || "workspace"}/orders`}
              >
                <span>Sipariş Gir</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {members.map((member) => {
              const pct =
                member.target > 0
                  ? Math.round((member.achieved / member.target) * 100)
                  : 0;
              return (
                <div
                  className="group rounded-xl border border-zinc-100 p-2.5 transition-all hover:border-zinc-300 hover:bg-zinc-50/50 dark:border-zinc-800/80 dark:hover:border-zinc-700 dark:hover:bg-zinc-800/40"
                  key={member.id}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      {getRankBadge(member.rank)}
                      <div
                        className={`flex h-7 w-7 items-center justify-center rounded-full font-bold text-[11px] text-white ${member.avatarColor} shadow-2xs`}
                      >
                        {member.initials}
                      </div>
                      <div>
                        <div className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                          {member.name}
                        </div>
                        <div className="text-[10px] text-zinc-400 dark:text-zinc-500">
                          {member.role}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                        ₺{member.achieved.toLocaleString("tr-TR")}
                      </div>
                      <div className="text-[10px] text-zinc-400 dark:text-zinc-500">
                        {member.dealsClosed} Satış
                      </div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                      <div
                        className={`h-full rounded-full transition-all ${
                          pct >= 100 ? "bg-emerald-500" : "bg-violet-500"
                        }`}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                    <span
                      className={`font-semibold text-[10px] ${
                        pct >= 100
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-zinc-500 dark:text-zinc-400"
                      }`}
                    >
                      %{pct}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {members.length > 0 && (
        <div className="mt-3 border-zinc-100 border-t pt-2.5 text-center dark:border-zinc-800/80">
          <Link
            className="font-bold text-violet-600 text-xs transition hover:text-violet-700 dark:hover:text-violet-400"
            href={`/${activeTenant?.slug || "workspace"}/orders`}
          >
            Tüm Satışları Görüntüle →
          </Link>
        </div>
      )}
    </div>
  );
}
