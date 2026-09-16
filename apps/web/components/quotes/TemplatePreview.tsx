"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Copy, Eye, RefreshCw } from "lucide-react";
import type { QuoteSummaryDto } from "@/lib/api-client";

type ZoomLevel = 60 | 80 | 100 | 140;

type TemplatePreviewProps = {
  error: string | null;
  fallbackHtml: string;
  isLoading: boolean;
  isQuotesLoading: boolean;
  onCopy: () => void;
  onQuoteChange: (quoteId: string | null) => void;
  onZoomChange: (zoom: ZoomLevel) => void;
  previewHtml: string;
  previewSubject: string;
  quoteId: string | null;
  quoteOptions: QuoteSummaryDto[];
  zoom: ZoomLevel;
};

const ZOOM_OPTIONS: ZoomLevel[] = [60, 80, 100, 140];

export function TemplatePreview({
  error,
  fallbackHtml,
  isLoading,
  isQuotesLoading,
  onCopy,
  onQuoteChange,
  onZoomChange,
  previewHtml,
  previewSubject,
  quoteId,
  quoteOptions,
  zoom,
}: TemplatePreviewProps): React.ReactElement {
  const displayHtml: string = previewHtml || fallbackHtml;
  const selectedQuote: QuoteSummaryDto | undefined = quoteOptions.find(
    (q) => q.id === quoteId
  );

  const handleCopyInternal = async (): Promise<void> => {
    await onCopy();
  };

  return (
    <div className="flex h-full flex-col gap-3">
      {/* Header controls — Bento 1px border, no gradients */}
      <div className="rounded-xl border border-border bg-card p-3 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold text-xs text-zinc-700 dark:text-zinc-300">
              Önizleme
            </span>
            {quoteId && selectedQuote ? (
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-bold text-3xs text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                Gerçek Veri: {selectedQuote.quoteNumber}
              </span>
            ) : (
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 font-bold text-3xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                Mock Veri
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {/* Quote selector for real data preview */}
            <div className="w-[200px]">
              <Select
                onValueChange={(val) =>
                  onQuoteChange(val === "mock" ? null : val)
                }
                value={quoteId ?? "mock"}
              >
                <SelectTrigger className="h-7 text-2xs">
                  <SelectValue
                    placeholder={
                      isQuotesLoading
                        ? "Yükleniyor..."
                        : "Mock veri (varsayılan)"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mock">Mock Veri (örnek)</SelectItem>
                  {quoteOptions.map((q) => (
                    <SelectItem key={q.id} value={q.id}>
                      {q.quoteNumber} — {q.customerName.slice(0, 18)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {previewSubject ? (
          <p className="mt-2 truncate rounded-lg border border-border bg-zinc-50 px-2.5 py-1.5 font-medium text-2xs text-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-300">
            Konu: {previewSubject}
          </p>
        ) : null}

        {/* Zoom + Copy controls */}
        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-border border-t pt-2.5">
          <div className="flex items-center gap-1 rounded-lg border border-border bg-zinc-50 p-1 dark:bg-zinc-800/50">
            {ZOOM_OPTIONS.map((level) => (
              <button
                className={`rounded-md px-2.5 py-1 font-bold text-2xs transition ${zoom === level ? "bg-card text-zinc-900 shadow-2xs dark:bg-zinc-700 dark:text-zinc-100" : "text-muted-foreground hover:bg-white hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"}`}
                key={level}
                onClick={() => onZoomChange(level)}
                type="button"
              >
                {level}%
              </button>
            ))}
          </div>

          <button
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 font-semibold text-2xs text-zinc-700 shadow-2xs transition hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-700 dark:hover:text-zinc-100"
            onClick={() => {
              void handleCopyInternal();
            }}
            type="button"
          >
            <Copy className="h-3.5 w-3.5" />
            <span>HTML Kopyala</span>
          </button>
        </div>
      </div>

      {/* Preview body — iframe srcDoc only, no dangerouslySetInnerHTML */}
      <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xs">
        {isLoading ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-muted-foreground">
            <RefreshCw className="h-6 w-6 animate-spin text-blue-600 dark:text-blue-400" />
            <span className="font-semibold text-xs">Preview yükleniyor...</span>
            <span className="text-2xs text-muted-foreground">
              Handlebars derleniyor...
            </span>
          </div>
        ) : error ? (
          <div className="m-4 rounded-xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-800/60 dark:bg-rose-950/40">
            <p className="font-semibold text-rose-800 text-xs dark:text-rose-200">
              Önizleme alınamadı
            </p>
            <p className="mt-1 text-2xs text-rose-700 dark:text-rose-300">
              {error}
            </p>
          </div>
        ) : (
          <div className="flex flex-1 flex-col overflow-hidden p-2">
            <div className="flex-1 overflow-auto rounded-lg border border-border bg-card dark:bg-white">
              <iframe
                className="h-[600px] w-full border-0"
                sandbox="allow-same-origin"
                srcDoc={displayHtml}
                style={
                  {
                    zoom: `${zoom}%`,
                  } as React.CSSProperties
                }
                title="E-posta Önizleme"
              />
            </div>
            <p className="mt-2 text-center text-3xs text-muted-foreground">
              iframe sandbox=&quot;allow-same-origin&quot; · srcDoc render ·
              bağlantılar rel noopener ile korunur
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
