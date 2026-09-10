/* Hallmark · component: team-leaderboard · genre: modern-minimal · theme: Adaptive Zinc/Violet */
"use client";

import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { EmptyState } from "@workspace/ui/components/empty-state";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Award, Flame, Medal, Trophy } from "lucide-react";
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
          <Badge
            className="h-5 w-5 justify-center rounded-full p-0"
            variant="warning"
          >
            <Trophy className="h-3 w-3" />
          </Badge>
        );
      case 2:
        return (
          <Badge
            className="h-5 w-5 justify-center rounded-full p-0"
            variant="neutral"
          >
            <Medal className="h-3 w-3" />
          </Badge>
        );
      case 3:
        return (
          <Badge
            className="h-5 w-5 justify-center rounded-full p-0"
            variant="accent"
          >
            <Award className="h-3 w-3" />
          </Badge>
        );
      default:
        return (
          <Badge
            className="h-5 w-5 justify-center rounded-full p-0"
            variant="outline"
          >
            {rank}
          </Badge>
        );
    }
  };

  return (
    <Card className="flex h-full flex-col justify-between">
      <div>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Trophy className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="font-semibold text-sm tracking-tight">
                Satış Liderlik Tablosu
              </CardTitle>
              <p className="text-[11px] text-muted-foreground">
                Dönemin en başarılı temsilcileri
              </p>
            </div>
          </div>

          {members.length > 0 && (
            <Badge className="gap-1 text-[10px]" variant="warning">
              <Flame className="h-3 w-3 text-amber-500" />
              Yarış Sürüyor
            </Badge>
          )}
        </CardHeader>

        <CardContent className="pt-0">
          {/* Content Area */}
          {isLoading ? (
            <div className="space-y-2 py-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : members.length === 0 ? (
            <EmptyState
              action={
                <Button asChild size="sm" variant="outline">
                  <Link
                    href={`/${activeTenant?.slug || "workspace"}/pipelines`}
                  >
                    Fırsat Ekle
                  </Link>
                </Button>
              }
              description="Temsilcilerinizin kapattığı satışlar ve siparişler burada liderlik sıralaması olarak görüntülenecektir."
              icon={Trophy}
              title="Henüz satış performansı kaydedilmedi"
            />
          ) : (
            <div className="space-y-2">
              {members.map((member) => {
                const pct =
                  member.target > 0
                    ? Math.round((member.achieved / member.target) * 100)
                    : 0;
                return (
                  <div
                    className="group rounded-lg border border-border/70 p-2.5 transition-all hover:border-border hover:bg-muted/40"
                    key={member.id}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        {getRankBadge(member.rank)}
                        <Avatar className="h-7 w-7 font-bold text-[11px]">
                          <AvatarFallback className={member.avatarColor}>
                            {member.initials}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-semibold text-foreground text-xs">
                            {member.name}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {member.role}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-semibold text-foreground text-xs">
                          ₺{member.achieved.toLocaleString("tr-TR")}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {member.dealsClosed} Satış
                        </div>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full rounded-full transition-all ${
                            pct >= 100 ? "bg-emerald-500" : "bg-primary"
                          }`}
                          style={{ width: `${Math.min(100, pct)}%` }}
                        />
                      </div>
                      <span
                        className={`font-semibold text-[10px] ${
                          pct >= 100
                            ? "text-emerald-500"
                            : "text-muted-foreground"
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
        </CardContent>
      </div>

      {members.length > 0 && (
        <CardFooter className="justify-center border-border/80 border-t pt-2 pb-3">
          <Link
            className="font-semibold text-primary text-xs transition hover:underline"
            href={`/${activeTenant?.slug || "workspace"}/orders`}
          >
            Tüm Satışları Görüntüle →
          </Link>
        </CardFooter>
      )}
    </Card>
  );
}
