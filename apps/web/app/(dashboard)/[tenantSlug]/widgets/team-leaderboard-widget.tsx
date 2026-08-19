"use client";

import { Flame, Trophy } from "lucide-react";
import type { TeamMemberScore } from "./dashboard-types";

export function TeamLeaderboardWidget() {
  const members: TeamMemberScore[] = [
    {
      id: "mem-1",
      name: "Ahmet Yılmaz",
      role: "Kıdemli Satış Yöneticisi",
      initials: "AY",
      avatarColor: "bg-indigo-600",
      target: 200000,
      achieved: 245000,
      dealsClosed: 14,
      rank: 1,
    },
    {
      id: "mem-2",
      name: "Selin Kaya",
      role: "Müşteri Temsilcisi",
      initials: "SK",
      avatarColor: "bg-fuchsia-600",
      target: 150000,
      achieved: 142000,
      dealsClosed: 11,
      rank: 2,
    },
    {
      id: "mem-3",
      name: "Mehmet Demir",
      role: "Kurumsal Satış Uzmanı",
      initials: "MD",
      avatarColor: "bg-cyan-600",
      target: 180000,
      achieved: 158000,
      dealsClosed: 9,
      rank: 3,
    },
    {
      id: "mem-4",
      name: "Canan Öz",
      role: "SDR / Lead Uzmanı",
      initials: "CÖ",
      avatarColor: "bg-emerald-600",
      target: 100000,
      achieved: 89000,
      dealsClosed: 6,
      rank: 4,
    },
  ];

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return (
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-amber-600 font-bold text-xs">
            🥇
          </div>
        );
      case 2:
        return (
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-slate-600 font-bold text-xs">
            🥈
          </div>
        );
      case 3:
        return (
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-50 text-amber-800 font-bold text-xs">
            🥉
          </div>
        );
      default:
        return (
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-500 font-bold text-xs">
            {rank}
          </div>
        );
    }
  };

  return (
    <div className="flex h-full flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs transition-all hover:border-slate-300">
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Trophy className="h-4 w-4" />
            </div>
            <div>
              <span className="font-bold text-slate-900 text-sm">Satış Liderlik Tablosu</span>
              <div className="text-[11px] text-slate-500">Bu ayın en başarılı temsilcileri</div>
            </div>
          </div>

          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 font-bold text-[10px] text-amber-700">
            <Flame className="h-3 w-3 text-amber-500" />
            Yarış Sürüyor
          </span>
        </div>

        {/* Members Leaderboard */}
        <div className="space-y-3">
          {members.map((member) => {
            const pct = Math.round((member.achieved / member.target) * 100);
            return (
              <div
                className="group rounded-xl border border-slate-100 p-3 transition-all hover:border-slate-300 hover:bg-slate-50/50"
                key={member.id}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getRankBadge(member.rank)}
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full font-bold text-white text-xs ${member.avatarColor} shadow-2xs`}
                    >
                      {member.initials}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-xs">{member.name}</div>
                      <div className="text-[10px] text-slate-400">{member.role}</div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-extrabold text-slate-900 text-xs">
                      ₺{member.achieved.toLocaleString("tr-TR")}
                    </div>
                    <div className="text-[10px] text-slate-400">{member.dealsClosed} Satış</div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-2.5 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full transition-all ${
                        pct >= 100 ? "bg-emerald-500" : "bg-indigo-500"
                      }`}
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                  <span
                    className={`font-semibold text-[10px] ${
                      pct >= 100 ? "text-emerald-600" : "text-slate-500"
                    }`}
                  >
                    %{pct}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 border-slate-100 border-t pt-3 text-center">
        <span className="font-semibold text-slate-700 text-xs">
          Aylık Hedef Birincisi Ödülü: <strong>₺25.000 Prim + Tatil</strong> 🏆
        </span>
      </div>
    </div>
  );
}
