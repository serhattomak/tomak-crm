"use client";

import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { toast } from "@workspace/ui/components/sonner";
import { Eraser, FileSignature, Loader2, ShieldCheck, X } from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { ApiClient, type PublicContractDto } from "@/lib/api-client";

interface ContractSignModalProps {
  contract: PublicContractDto;
  isOpen: boolean;
  onClose: () => void;
  onSigned: (signedAt: string, auditHash: string) => void;
  token: string;
}

export function ContractSignModal({
  isOpen,
  onClose,
  contract,
  token,
  onSigned,
}: ContractSignModalProps) {
  const [signerName, setSignerName] = useState(contract.customerName || "");
  const [signerEmail, setSignerEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // HTML5 Signature Canvas
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    ctx.strokeStyle = "#1e1b4b"; // Dark indigo / ink
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, [isOpen]);

  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    setIsDrawing(true);
    setHasSignature(true);
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e && e.touches.length > 0 ? (e.touches[0]?.clientX ?? 0) : ("clientX" in e ? e.clientX : 0);
    const clientY = "touches" in e && e.touches.length > 0 ? (e.touches[0]?.clientY ?? 0) : ("clientY" in e ? e.clientY : 0);
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!isDrawing) {
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e && e.touches.length > 0 ? (e.touches[0]?.clientX ?? 0) : ("clientX" in e ? e.clientX : 0);
    const clientY = "touches" in e && e.touches.length > 0 ? (e.touches[0]?.clientY ?? 0) : ("clientY" in e ? e.clientY : 0);
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signerName.trim()) {
      toast.error("Lütfen imzalayan ad soyad bilgisini girin.");
      return;
    }
    if (!signerEmail.trim()) {
      toast.error("Lütfen imzalayan e-posta adresini girin.");
      return;
    }
    if (!(hasSignature && canvasRef.current)) {
      toast.error("Lütfen imza alanına dijital imzanızı çizin.");
      return;
    }

    const signatureImageUrl = canvasRef.current.toDataURL("image/png");

    setIsSubmitting(true);
    try {
      const res = await ApiClient.signPublicContract(token, {
        signatureImageUrl,
        signedByEmail: signerEmail.trim(),
        signedByName: signerName.trim(),
      });

      if (res.success || res.data?.auditHash) {
        toast.success("Sözleşme başarıyla dijital olarak imzalandı!");
        onSigned(
          res.data?.signedAt || new Date().toISOString(),
          res.data?.auditHash || ""
        );
        onClose();
      } else {
        toast.error(res.message || "İmzalama işlemi başarısız.");
      }
    } catch {
      toast.error("İmza kaydedilirken hata oluştu.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) {
    return null;
  }

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
        className="flex max-h-[92vh] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg"
        showCloseButton={false}
      >
        <div className="flex items-center justify-between border-zinc-200 border-b p-5 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 text-violet-600 dark:bg-violet-950/60 dark:text-violet-400">
              <FileSignature className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="font-semibold text-base text-zinc-900 dark:text-zinc-100">
                Sözleşmeyi Dijital Olarak İmzala
              </DialogTitle>
              <p className="font-mono text-[11px] text-zinc-500">
                {contract.contractNumber}
              </p>
            </div>
          </div>
          <DialogClose asChild>
            <button
              className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              type="button"
            >
              <X className="h-5 w-5" />
            </button>
          </DialogClose>
        </div>

        <form className="flex-1 overflow-y-auto p-6" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl border border-violet-200/80 bg-violet-50/50 p-3.5 text-violet-900 text-xs dark:border-violet-900/40 dark:bg-violet-950/20 dark:text-violet-300">
              <div className="flex items-center gap-1.5 font-semibold">
                <ShieldCheck className="h-4 w-4 text-violet-600" />
                Yasal Denetim İzi (Audit Trail)
              </div>
              <p className="mt-1 text-[11px] text-violet-800/80 dark:text-violet-400">
                İmzalama anında IP adresiniz, zaman damganız ve doküman SHA-256
                bütünlük özeti sistemde kalıcı ve değiştirilemez olarak
                kaydedilecektir.
              </p>
            </div>

            <div>
              <label className="mb-1 block font-medium text-xs text-zinc-700 dark:text-zinc-300">
                Ad Soyad (Yetkili) *
              </label>
              <input
                className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-xs text-zinc-900 outline-hidden focus:border-violet-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                onChange={(e) => setSignerName(e.target.value)}
                placeholder="Örn: Ahmet Yılmaz"
                required
                type="text"
                value={signerName}
              />
            </div>

            <div>
              <label className="mb-1 block font-medium text-xs text-zinc-700 dark:text-zinc-300">
                E-posta Adresi *
              </label>
              <input
                className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-xs text-zinc-900 outline-hidden focus:border-violet-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                onChange={(e) => setSignerEmail(e.target.value)}
                placeholder="Örn: ahmet@sirket.com"
                required
                type="email"
                value={signerEmail}
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="font-medium text-xs text-zinc-700 dark:text-zinc-300">
                  Dokunmatik / Fare ile İmzanızı Çizin *
                </label>
                <button
                  className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                  onClick={clearCanvas}
                  type="button"
                >
                  <Eraser className="h-3 w-3" />
                  Temizle
                </button>
              </div>

              <div className="relative overflow-hidden rounded-2xl border-2 border-zinc-200 border-dashed bg-white dark:border-zinc-800 dark:bg-zinc-900">
                <canvas
                  className="h-36 w-full cursor-crosshair touch-none"
                  height={144}
                  onMouseDown={startDrawing}
                  onMouseLeave={stopDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onTouchEnd={stopDrawing}
                  onTouchMove={draw}
                  onTouchStart={startDrawing}
                  ref={canvasRef}
                  width={460}
                />
                {!hasSignature && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-zinc-400">
                    İmzanızı bu alana çizin
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-2 border-zinc-200 border-t pt-4 dark:border-zinc-800">
            <Button onClick={onClose} type="button" variant="outline">
              Vazgeç
            </Button>
            <Button
              className="bg-violet-600 text-white hover:bg-violet-700"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  İmzalanıyor...
                </>
              ) : (
                "Onayla ve İmzala"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
