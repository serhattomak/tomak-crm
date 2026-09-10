/* Hallmark · component: pipeline-settings-modal · genre: modern-minimal · theme: Adaptive Zinc/Violet */
"use client";

import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { toast } from "@workspace/ui/components/sonner";
import { Layers, Plus, Settings, Trash2, X } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { ApiClient, type PipelineDto } from "@/lib/api-client";
import { usePermissions } from "@/lib/permissions/permission-context";

interface PipelineSettingsModalProps {
  onClose: () => void;
  onUpdated: () => void;
  pipeline?: PipelineDto;
  tenantSlug: string;
}

export function PipelineSettingsModal({
  pipeline,
  tenantSlug: _tenantSlug,
  onClose,
  onUpdated,
}: PipelineSettingsModalProps) {
  const { activeTenant } = usePermissions();
  const [name, setName] = useState(pipeline?.name || "");
  const [description, setDescription] = useState(pipeline?.description || "");
  const [routingStrategy, setRoutingStrategy] = useState(
    pipeline?.routingStrategy || "RoundRobin"
  );
  const [stages, setStages] = useState<
    {
      id?: string;
      name: string;
      orderIndex: number;
      color: string;
      probability: number;
      slaHours?: number;
      isWonStage: boolean;
      isLostStage: boolean;
    }[]
  >(
    pipeline?.stages?.map((s) => ({
      color: s.color || "#3B82F6",
      id: s.id,
      isLostStage: s.isLostStage,
      isWonStage: s.isWonStage,
      name: s.name,
      orderIndex: s.orderIndex,
      probability: s.probability,
      slaHours: s.slaHours || undefined,
    })) || []
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleAddStage = () => {
    setStages((prev) => [
      ...prev,
      {
        color: "#3B82F6",
        isLostStage: false,
        isWonStage: false,
        name: "Yeni Aşama",
        orderIndex: prev.length,
        probability: 50,
      },
    ]);
  };

  const handleRemoveStage = (index: number) => {
    setStages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!(name.trim() && activeTenant?.id && pipeline?.id)) {
      return;
    }

    setIsSaving(true);
    try {
      const res = await ApiClient.updatePipeline(
        pipeline.id,
        {
          description: description.trim() || undefined,
          id: pipeline.id,
          isActive: true,
          isDefault: pipeline.isDefault,
          name: name.trim(),
          routingStrategy,
          stages: stages.map((s, idx) => ({
            ...s,
            orderIndex: idx,
          })),
        },
        activeTenant.id
      );

      if (res.success) {
        toast.success("Pipeline ve aşama ayarları kaydedildi");
        onUpdated();
      } else {
        toast.error(res.message || "Kaydedilemedi");
      }
    } catch {
      toast.error("Hata oluştu");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fade-in fixed inset-0 z-50 flex animate-in items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-border/80 bg-background shadow-2xl">
        <div className="flex items-center justify-between border-border/80 border-b bg-muted/30 p-4 sm:p-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Settings className="h-4 w-4" />
            </div>
            <h3 className="font-semibold text-foreground text-sm sm:text-base">
              Pipeline ve Aşama Yapılandırması
            </h3>
          </div>
          <Button
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={onClose}
            size="icon"
            type="button"
            variant="ghost"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form
          className="custom-scrollbar flex-1 space-y-4 overflow-y-auto p-5"
          onSubmit={handleSave}
        >
          {/* General Pipeline Settings */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">Pipeline Adı</Label>
              <Input
                className="h-8 text-xs"
                onChange={(e) => setName(e.target.value)}
                required
                type="text"
                value={name}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">
                Otomatik Dağıtım Algoritması (Routing)
              </Label>
              <select
                className="h-8 w-full rounded-md border border-input bg-background px-2.5 font-medium text-foreground text-xs shadow-xs focus:border-primary focus:outline-none"
                onChange={(e) => setRoutingStrategy(e.target.value)}
                value={routingStrategy}
              >
                <option value="RoundRobin">
                  Round-Robin (Sırayla Eşit Dağıtım)
                </option>
                <option value="LeastLoaded">
                  İş Yükü Dengeli (En Az İşi Olana)
                </option>
                <option value="OnlineOnly">
                  Sadece Çevrimiçi / Aktif Personele
                </option>
                <option value="Manual">Manuel / Açık Havuz Modeli</option>
              </select>
            </div>

            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs">Açıklama</Label>
              <Input
                className="h-8 text-xs"
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Pipeline'ın kullanım amacını belirtin"
                type="text"
                value={description}
              />
            </div>
          </div>

          {/* Stages Configuration */}
          <div className="space-y-3 border-border/80 border-t pt-4">
            <div className="flex items-center justify-between">
              <h4 className="flex items-center gap-1.5 font-semibold text-foreground text-xs">
                <Layers className="h-3.5 w-3.5 text-primary" />
                Pipeline Aşamaları ({stages.length})
              </h4>
              <Button
                className="h-7 gap-1 text-xs"
                onClick={handleAddStage}
                size="sm"
                type="button"
                variant="outline"
              >
                <Plus className="h-3 w-3" />
                Aşama Ekle
              </Button>
            </div>

            <div className="space-y-2">
              {stages.map((stage, idx) => (
                <div
                  className="flex flex-wrap items-center gap-2.5 rounded-lg border border-border/80 bg-muted/30 p-2.5 shadow-2xs sm:flex-nowrap"
                  key={idx}
                >
                  <span className="w-4 font-semibold text-muted-foreground text-xs">
                    {idx + 1}.
                  </span>

                  {/* Stage Name */}
                  <Input
                    className="h-7 flex-1 text-xs"
                    onChange={(e) => {
                      const val = e.target.value;
                      setStages((prev) =>
                        prev.map((s, i) =>
                          i === idx ? { ...s, name: val } : s
                        )
                      );
                    }}
                    placeholder="Aşama Adı"
                    required
                    type="text"
                    value={stage.name}
                  />

                  {/* Probability */}
                  <div className="flex w-20 items-center gap-1">
                    <span className="font-medium text-[10px] text-muted-foreground">
                      %
                    </span>
                    <Input
                      className="h-7 text-right text-xs"
                      max="100"
                      min="0"
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setStages((prev) =>
                          prev.map((s, i) =>
                            i === idx ? { ...s, probability: val } : s
                          )
                        );
                      }}
                      type="number"
                      value={stage.probability}
                    />
                  </div>

                  {/* SLA Hours */}
                  <div className="flex w-24 items-center gap-1">
                    <span className="font-medium text-[10px] text-muted-foreground">
                      SLA:
                    </span>
                    <Input
                      className="h-7 text-right text-xs"
                      min="1"
                      onChange={(e) => {
                        const val = e.target.value
                          ? Number(e.target.value)
                          : undefined;
                        setStages((prev) =>
                          prev.map((s, i) =>
                            i === idx ? { ...s, slaHours: val } : s
                          )
                        );
                      }}
                      placeholder="Yok"
                      type="number"
                      value={stage.slaHours || ""}
                    />
                  </div>

                  {/* Color Picker */}
                  <input
                    className="h-7 w-7 cursor-pointer rounded-md border border-input bg-background p-0.5"
                    onChange={(e) => {
                      const val = e.target.value;
                      setStages((prev) =>
                        prev.map((s, i) =>
                          i === idx ? { ...s, color: val } : s
                        )
                      );
                    }}
                    title="Aşama Rengi"
                    type="color"
                    value={stage.color}
                  />

                  {/* Remove stage button */}
                  {stages.length > 2 && (
                    <Button
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => handleRemoveStage(idx)}
                      size="icon"
                      title="Aşamayı Kaldır"
                      type="button"
                      variant="ghost"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Save Button */}
          <div className="flex items-center justify-end gap-2 border-border/80 border-t pt-4">
            <Button onClick={onClose} size="sm" type="button" variant="outline">
              Vazgeç
            </Button>
            <Button disabled={isSaving} size="sm" type="submit">
              {isSaving ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
