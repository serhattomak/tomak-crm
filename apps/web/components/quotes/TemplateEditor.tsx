"use client";

import { Checkbox } from "@workspace/ui/components/checkbox";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import type React from "react";
import { type RefObject, useState } from "react";
import { VariableChips } from "./VariableChips";

type TemplateEditorProps = {
  bankDetails: string;
  deliveryTerms: string;
  htmlBody: string;
  htmlBodyError?: string;
  htmlBodyRef: RefObject<HTMLTextAreaElement | null>;
  isDefault: boolean;
  isSaving: boolean;
  name: string;
  nameError?: string;
  onBankDetailsChange: (value: string) => void;
  onDelete?: () => void;
  onDeliveryTermsChange: (value: string) => void;
  onHtmlBodyChange: (value: string) => void;
  onInsertVariable: (variable: string) => void;
  onIsDefaultChange: (checked: boolean) => void;
  onNameChange: (value: string) => void;
  onPaymentTermsChange: (value: string) => void;
  onSave: (e: React.FormEvent) => void;
  onSubjectChange: (value: string) => void;
  onTermsChange: (value: string) => void;
  paymentTerms: string;
  showDelete: boolean;
  subject: string;
  subjectError?: string;
  termsAndConditions: string;
};

export function TemplateEditor({
  bankDetails,
  deliveryTerms,
  htmlBody,
  htmlBodyError,
  htmlBodyRef,
  isDefault,
  isSaving,
  name,
  nameError,
  onBankDetailsChange,
  onDelete,
  onDeliveryTermsChange,
  onHtmlBodyChange,
  onInsertVariable,
  onIsDefaultChange,
  onNameChange,
  onPaymentTermsChange,
  onSave,
  onSubjectChange,
  onTermsChange,
  paymentTerms,
  showDelete,
  subject,
  subjectError,
  termsAndConditions,
}: TemplateEditorProps) {
  const [showExtraFields, setShowExtraFields] = useState(false);

  return (
    <form className="space-y-4" onSubmit={onSave}>
      {/* Template Name */}
      <div className="space-y-1.5">
        <Label className="text-xs" required>
          Şablon Adı
        </Label>
        <Input
          error={nameError}
          maxLength={255}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            onNameChange(e.target.value)
          }
          placeholder="Örn: Standart Kurumsal Teklif"
          required
          value={name}
        />
      </div>

      {/* Subject */}
      <div className="space-y-1.5">
        <Label className="text-xs" required>
          E-posta Konusu
        </Label>
        <Input
          error={subjectError}
          maxLength={200}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            onSubjectChange(e.target.value)
          }
          placeholder="{{companyName}} Teklif #{{quoteNumber}}"
          required
          value={subject}
        />
        <p className="text-2xs text-zinc-500 dark:text-zinc-500">
          {subject.length}/200 karakter — Handlebars değişkenleri desteklenir.
        </p>
      </div>

      {/* HtmlBody */}
      <div className="space-y-1.5">
        <Label className="text-xs" required>
          E-posta HTML Gövdesi
        </Label>
        <Textarea
          className="min-h-[180px] font-mono text-xs leading-relaxed"
          error={htmlBodyError}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            onHtmlBodyChange(e.target.value)
          }
          placeholder="<h1>Merhaba {{customerName}}</h1> <p>Teklif tutarı: {{totalAmount}}</p> {{itemsTable}}"
          ref={htmlBodyRef}
          required
          rows={12}
          value={htmlBody}
        />
      </div>

      {/* Variable Chips */}
      <div className="rounded-xl border border-border bg-zinc-50/50 p-3 dark:bg-zinc-800/30">
        <VariableChips onInsert={onInsertVariable} />
      </div>

      {/* IsDefault */}
      <div className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2.5">
        <div>
          <p className="font-semibold text-xs text-zinc-800 dark:text-zinc-200">
            Varsayılan şablon
          </p>
          <p className="text-2xs text-zinc-500 dark:text-zinc-400">
            Yeni tekliflerde otomatik seçilir (tek bir varsayılan).
          </p>
        </div>
        <Checkbox
          checked={isDefault}
          onCheckedChange={(checked) => onIsDefaultChange(checked === true)}
        />
      </div>

      {/* Extra fields collapsible */}
      <div className="rounded-xl border border-border">
        <button
          className="flex w-full items-center justify-between px-3 py-2.5 text-left"
          onClick={() => setShowExtraFields((prev) => !prev)}
          type="button"
        >
          <span className="font-semibold text-xs text-zinc-700 dark:text-zinc-300">
            Ek Alanlar (ödeme / teslimat / banka / şartlar)
          </span>
          <span className="text-2xs text-zinc-500 dark:text-zinc-400">
            {showExtraFields ? "Gizle" : "Göster"}
          </span>
        </button>
        {showExtraFields ? (
          <div className="space-y-3 border-border border-t p-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Ödeme Şartları</Label>
                <Textarea
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    onPaymentTermsChange(e.target.value)
                  }
                  placeholder="Ödeme koşulları..."
                  rows={2}
                  value={paymentTerms}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Teslimat Koşulları</Label>
                <Textarea
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    onDeliveryTermsChange(e.target.value)
                  }
                  placeholder="Teslimat koşulları..."
                  rows={2}
                  value={deliveryTerms}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Banka & IBAN Bilgileri</Label>
              <Textarea
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  onBankDetailsChange(e.target.value)
                }
                placeholder="Banka bilgileri..."
                rows={2}
                value={bankDetails}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Genel Şartlar & Koşullar</Label>
              <Textarea
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  onTermsChange(e.target.value)
                }
                placeholder="Genel hükümler..."
                rows={2}
                value={termsAndConditions}
              />
            </div>
          </div>
        ) : null}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-2 pt-2">
        {showDelete && onDelete ? (
          <button
            className="rounded-xl border border-rose-200 bg-card px-4 py-2 font-semibold text-rose-600 text-xs transition hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-400 dark:hover:bg-rose-950/30"
            onClick={onDelete}
            type="button"
          >
            Sil
          </button>
        ) : (
          <span />
        )}
        <button
          className="rounded-xl bg-blue-600 px-5 py-2 font-semibold text-white text-xs shadow-xs transition hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50"
          disabled={isSaving}
          type="submit"
        >
          {isSaving ? "Kaydediliyor..." : "Kaydet"}
        </button>
      </div>
    </form>
  );
}
