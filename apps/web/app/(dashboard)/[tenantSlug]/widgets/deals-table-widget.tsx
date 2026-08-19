"use client";

import { ArrowRight, Building2 } from "lucide-react";
import type { DealItem } from "./dashboard-types";

export function DealsTableWidget() {
  const deals: DealItem[] = [
    {
      id: "deal-1",
      title: "Kurumsal ERP Entegrasyonu",
      company: "Acme Holding A.Ş.",
      value: 125000,
      stage: "Negotiation",
      closingDate: "24 Ağu 2026",
      probability: 85,
      owner: {
        name: "Ahmet Yılmaz",
        initials: "AY",
      },
    },
    {
      id: "deal-2",
      title: "Bulut Altyapı & CRM Lisansı",
      company: "TechNova Yazılım",
      value: 78000,
      stage: "Proposal",
      closingDate: "28 Ağu 2026",
      probability: 60,
      owner: {
        name: "Selin Kaya",
        initials: "SK",
      },
    },
    {
      id: "deal-3",
      title: "Siber Güvenlik & Denetim Paketi",
      company: "Vortex Lojistik",
      value: 94500,
      stage: "Won",
      closingDate: "18 Ağu 2026",
      probability: 100,
      owner: {
        name: "Mehmet Demir",
        initials: "MD",
      },
    },
    {
      id: "deal-4",
      title: "Özel API & Çağrı Merkezi Modülü",
      company: "MegaFinans Danışmanlık",
      value: 52000,
      stage: "Discovery",
      closingDate: "05 Eyl 2026",
      probability: 35,
      owner: {
        name: "Canan Öz",
        initials: "CÖ",
      },
    },
  ];

  const getStageBadge = (stage: DealItem["stage"]) => {
    switch (stage) {
      case "Won":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "Negotiation":
        return "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200";
      case "Proposal":
        return "bg-violet-50 text-violet-700 border-violet-200";
      case "Discovery":
        return "bg-blue-50 text-blue-700 border-blue-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  const getStageLabel = (stage: DealItem["stage"]) => {
    switch (stage) {
      case "Won":
        return "Kazanıldı";
      case "Negotiation":
        return "Müzakere";
      case "Proposal":
        return "Teklif";
      case "Discovery":
        return "Keşif";
      default:
        return stage;
    }
  };

  return (
    <div className="flex h-full flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs transition-all hover:border-slate-300">
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600">
              <Building2 className="h-4 w-4" />
            </div>
            <div>
              <span className="font-bold text-slate-900 text-sm">Sıcak Fırsatlar (Top Deals)</span>
              <div className="text-[11px] text-slate-500">En yüksek potansiyelli anlaşmalar</div>
            </div>
          </div>

          <button
            className="flex items-center gap-1 font-semibold text-cyan-600 text-xs hover:text-cyan-700"
            type="button"
          >
            <span>Tümünü Gör</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Deals Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-slate-100 border-b text-[11px] text-slate-400">
                <th className="pb-2.5 font-medium">Anlaşma & Şirket</th>
                <th className="pb-2.5 font-medium">Tutar</th>
                <th className="pb-2.5 font-medium">Aşama</th>
                <th className="pb-2.5 font-medium">Olasılık</th>
                <th className="pb-2.5 font-medium text-right">Temsilci</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {deals.map((deal) => (
                <tr className="group transition-colors hover:bg-slate-50/80" key={deal.id}>
                  <td className="py-3 pr-3">
                    <div className="font-semibold text-slate-900">{deal.title}</div>
                    <div className="flex items-center gap-1 text-[11px] text-slate-500">
                      <Building2 className="h-3 w-3 text-slate-400" />
                      <span>{deal.company}</span>
                    </div>
                  </td>

                  <td className="py-3 pr-3">
                    <span className="font-bold text-slate-900">
                      ₺{deal.value.toLocaleString("tr-TR")}
                    </span>
                    <div className="text-[10px] text-slate-400">{deal.closingDate}</div>
                  </td>

                  <td className="py-3 pr-3">
                    <span
                      className={`inline-flex items-center rounded-lg border px-2 py-0.5 font-semibold text-[10px] ${getStageBadge(
                        deal.stage
                      )}`}
                    >
                      {getStageLabel(deal.stage)}
                    </span>
                  </td>

                  <td className="py-3 pr-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-12 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-cyan-500"
                          style={{ width: `${deal.probability}%` }}
                        />
                      </div>
                      <span className="font-medium text-[11px] text-slate-600">
                        %{deal.probability}
                      </span>
                    </div>
                  </td>

                  <td className="py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <div
                        className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 font-bold text-[10px] text-white shadow-2xs"
                        title={deal.owner.name}
                      >
                        {deal.owner.initials}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 border-slate-100 border-t pt-3 text-[11px] text-slate-400">
        4 fırsatın toplam potansiyeli:{" "}
        <strong className="text-slate-700">₺349.500</strong>
      </div>
    </div>
  );
}
