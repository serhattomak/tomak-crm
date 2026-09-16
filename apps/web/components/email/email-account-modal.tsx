"use client";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { NumberInput } from "@workspace/ui/components/number-input";
import { SelectField } from "@workspace/ui/components/select";
import {
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  Mail,
  RefreshCw,
  Server,
  X,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ApiClient,
  type EmailAccountDto,
  type TestEmailAccountConnectionResultDto,
} from "@/lib/api-client";

interface EmailAccountModalProps {
  account: EmailAccountDto | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  tenantId: string;
}

interface GenericImapFieldsProps {
  imapHost: string;
  imapPort: number;
  onImapHostChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onImapPortChange: (val: number) => void;
  onSmtpHostChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSmtpPortChange: (val: number) => void;
  smtpHost: string;
  smtpPort: number;
}

function GenericImapFields({
  imapHost,
  imapPort,
  onImapHostChange,
  onImapPortChange,
  onSmtpHostChange,
  onSmtpPortChange,
  smtpHost,
  smtpPort,
}: GenericImapFieldsProps) {
  return (
    <div className="space-y-3 rounded-xl border border-border bg-zinc-50/50 p-3.5 dark:bg-zinc-900/40">
      <div className="flex items-center gap-1.5 font-semibold text-xs text-zinc-700 dark:text-zinc-300">
        <Server className="h-3.5 w-3.5" />
        <span>Sunucu Ayarları</span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-2">
          <label
            className="mb-1 block font-medium text-2xs text-zinc-600 dark:text-zinc-400"
            htmlFor="account-imap-host"
          >
            IMAP Sunucusu *
          </label>
          <input
            className="w-full rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs text-zinc-900 focus:outline-none dark:text-zinc-100"
            id="account-imap-host"
            onChange={onImapHostChange}
            placeholder="imap.domain.com"
            type="text"
            value={imapHost}
          />
        </div>
        <div>
          <label
            className="mb-1 block font-medium text-2xs text-zinc-600 dark:text-zinc-400"
            htmlFor="account-imap-port"
          >
            IMAP Port
          </label>
          <NumberInput
            id="account-imap-port"
            inputSize="sm"
            max={65_535}
            min={1}
            onChange={onImapPortChange}
            precision={0}
            showStepper
            step={1}
            value={imapPort}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-2">
          <label
            className="mb-1 block font-medium text-2xs text-zinc-600 dark:text-zinc-400"
            htmlFor="account-smtp-host"
          >
            SMTP Sunucusu *
          </label>
          <input
            className="w-full rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs text-zinc-900 focus:outline-none dark:text-zinc-100"
            id="account-smtp-host"
            onChange={onSmtpHostChange}
            placeholder="smtp.domain.com"
            type="text"
            value={smtpHost}
          />
        </div>
        <div>
          <label
            className="mb-1 block font-medium text-2xs text-zinc-600 dark:text-zinc-400"
            htmlFor="account-smtp-port"
          >
            SMTP Port
          </label>
          <NumberInput
            id="account-smtp-port"
            inputSize="sm"
            max={65_535}
            min={1}
            onChange={onSmtpPortChange}
            precision={0}
            showStepper
            step={1}
            value={smtpPort}
          />
        </div>
      </div>
    </div>
  );
}

function TestResultCard({
  provider,
  result,
}: {
  provider: string;
  result: TestEmailAccountConnectionResultDto;
}) {
  const isSuccess = result.success;
  return (
    <div
      className={`rounded-xl border p-3 text-xs ${
        isSuccess
          ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-300"
          : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-300"
      }`}
    >
      <p className="mb-1 font-semibold">{result.message}</p>
      {provider === "generic_imap" ? (
        <div className="space-y-0.5 text-2xs">
          <div>{`IMAP: ${result.imapSuccess ? "✓ Bağlandı" : `✗ ${result.imapMessage}`}`}</div>
          <div>{`SMTP: ${result.smtpSuccess ? "✓ Bağlandı" : `✗ ${result.smtpMessage}`}`}</div>
        </div>
      ) : null}
    </div>
  );
}

interface AccountSubmitData {
  description: string;
  email: string;
  imapHost: string;
  imapPort: number;
  isActive: boolean;
  isEdit: boolean;
  password: string;
  provider: "generic_imap" | "resend";
  smtpHost: string;
  smtpPort: number;
}

function buildAccountPayload(data: AccountSubmitData) {
  const isGeneric = data.provider === "generic_imap";
  return {
    description: data.description.trim() || undefined,
    email: data.email.trim(),
    imapHost: isGeneric ? data.imapHost.trim() : undefined,
    imapPort: isGeneric ? data.imapPort : undefined,
    isActive: data.isActive,
    password: data.password.trim() || undefined,
    provider: data.provider,
    smtpHost: isGeneric ? data.smtpHost.trim() : undefined,
    smtpPort: isGeneric ? data.smtpPort : undefined,
  };
}

async function executeAccountSave(
  accountId: string | undefined,
  data: AccountSubmitData,
  tenantId: string
) {
  const payload = buildAccountPayload(data);
  if (data.isEdit && accountId) {
    return await ApiClient.updateEmailAccount(
      accountId,
      { id: accountId, ...payload },
      tenantId
    );
  }
  return await ApiClient.createEmailAccount(
    { ...payload, password: data.password.trim() },
    tenantId
  );
}

export function EmailAccountModal({
  account,
  isOpen,
  onClose,
  onSaved,
  tenantId,
}: EmailAccountModalProps) {
  const isEdit = Boolean(account);

  const [email, setEmail] = useState("");
  const [provider, setProvider] = useState<"generic_imap" | "resend">(
    "generic_imap"
  );
  const [imapHost, setImapHost] = useState("");
  const [imapPort, setImapPort] = useState(993);
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState(587);
  const [password, setPassword] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] =
    useState<TestEmailAccountConnectionResultDto | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (account) {
      setEmail(account.email || "");
      setProvider(
        (account.provider as "generic_imap" | "resend") || "generic_imap"
      );
      setImapHost(account.imapHost || "");
      setImapPort(account.imapPort || 993);
      setSmtpHost(account.smtpHost || "");
      setSmtpPort(account.smtpPort || 587);
      setPassword("");
      setDescription(account.description || "");
      setIsActive(account.isActive);
    } else {
      setEmail("");
      setProvider("generic_imap");
      setImapHost("");
      setImapPort(993);
      setSmtpHost("");
      setSmtpPort(587);
      setPassword("");
      setDescription("");
      setIsActive(true);
    }
    setTestResult(null);
    setValidationError(null);
  }, [account]);

  const handleEmailChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setEmail(e.target.value);
    },
    []
  );

  const handleProviderChange = useCallback((value: string) => {
    setProvider(value as "generic_imap" | "resend");
  }, []);

  const handleImapHostChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setImapHost(e.target.value);
    },
    []
  );

  const handleImapPortChange = useCallback((val: number) => {
    setImapPort(Number.isNaN(val) ? 993 : val);
  }, []);

  const handleSmtpHostChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSmtpHost(e.target.value);
    },
    []
  );

  const handleSmtpPortChange = useCallback((val: number) => {
    setSmtpPort(Number.isNaN(val) ? 587 : val);
  }, []);

  const handlePasswordChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setPassword(e.target.value);
    },
    []
  );

  const handleDescriptionChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setDescription(e.target.value);
    },
    []
  );

  const handleIsActiveChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setIsActive(e.target.checked);
    },
    []
  );

  const handleTogglePassword = useCallback(() => {
    setShowPassword((prev) => !prev);
  }, []);

  const validate = useCallback((): boolean => {
    setValidationError(null);
    if (!(email.trim() && email.includes("@"))) {
      setValidationError("Geçerli bir e-posta adresi giriniz.");
      return false;
    }

    if (provider === "generic_imap" && !(imapHost.trim() && smtpHost.trim())) {
      setValidationError("IMAP ve SMTP sunucu adresleri zorunludur.");
      return false;
    }

    if (!(isEdit || password.trim())) {
      setValidationError("Hesap şifresi veya API anahtarı zorunludur.");
      return false;
    }

    return true;
  }, [email, provider, imapHost, smtpHost, isEdit, password]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!validate()) {
        return;
      }

      setIsSubmitting(true);
      try {
        const res = await executeAccountSave(
          account?.id,
          {
            description,
            email,
            imapHost,
            imapPort,
            isActive,
            isEdit,
            password,
            provider,
            smtpHost,
            smtpPort,
          },
          tenantId
        );

        if (res.success) {
          toast.success(
            isEdit ? "E-posta hesabı güncellendi." : "E-posta hesabı bağlandı."
          );
          onSaved();
          onClose();
        } else {
          toast.error(res.message || "İşlem sırasında hata oluştu.");
        }
      } catch (err: unknown) {
        toast.error(
          err instanceof Error ? err.message : "Beklenmeyen bir hata oluştu."
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      validate,
      isEdit,
      account,
      email,
      provider,
      imapHost,
      imapPort,
      smtpHost,
      smtpPort,
      password,
      description,
      isActive,
      tenantId,
      onSaved,
      onClose,
    ]
  );

  const handleTestConnection = useCallback(async () => {
    if (!account?.id) {
      toast.info("Bağlantı testi yapabilmek için lütfen önce hesabı kaydedin.");
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await ApiClient.testEmailAccountConnection(
        account.id,
        tenantId
      );
      if (res.success && res.data) {
        setTestResult(res.data);
        if (res.data.success) {
          toast.success(res.data.message || "Bağlantı başarılı!");
        } else {
          toast.error(res.data.message || "Bağlantı testi başarısız oldu.");
        }
      } else {
        toast.error(res.message || "Test tamamlanamadı.");
      }
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Test sırasında hata oluştu."
      );
    } finally {
      setIsTesting(false);
    }
  }, [account?.id, tenantId]);

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
        className="w-full gap-0 sm:max-w-lg"
        showCloseButton={false}
      >
        <div className="flex items-center justify-between border-border border-b pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800">
              <Mail className="h-5 w-5 text-zinc-700 dark:text-zinc-300" />
            </div>
            <div>
              <DialogTitle className="font-semibold text-base text-zinc-900 dark:text-zinc-100">
                {isEdit
                  ? "E-posta Hesabını Düzenle"
                  : "Yeni E-posta Hesabı Bağla"}
              </DialogTitle>
              <p className="text-xs text-muted-foreground">
                {isEdit
                  ? "Bağlı hesap bilgilerini ve sunucu ayarlarını güncelleyin."
                  : "IMAP/SMTP veya Resend ile ortak gelen kutusu oluşturun."}
              </p>
            </div>
          </div>
          <DialogClose asChild>
            <button
              aria-label="Kapat"
              className="rounded-lg p-1 text-muted-foreground hover:text-zinc-600 dark:hover:text-zinc-300"
              type="button"
            >
              <X className="h-5 w-5" />
            </button>
          </DialogClose>
        </div>

        <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
          {validationError ? (
            <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-800 text-xs dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{validationError}</span>
            </div>
          ) : null}

          {/* Email and Provider */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label
                className="mb-1 block font-medium text-xs text-zinc-700 dark:text-zinc-300"
                htmlFor="account-email"
              >
                E-posta Adresi *
              </label>
              <input
                className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none dark:text-zinc-100"
                id="account-email"
                onChange={handleEmailChange}
                placeholder="destek@sirketiniz.com"
                required
                type="email"
                value={email}
              />
            </div>
            <div>
              <span className="mb-1 block font-medium text-xs text-zinc-700 dark:text-zinc-300">
                Sağlayıcı Türü
              </span>
              <SelectField
                onChange={handleProviderChange}
                options={[
                  { label: "Generic IMAP / SMTP", value: "generic_imap" },
                  { label: "Resend (API Fallback)", value: "resend" },
                ]}
                placeholder="Sağlayıcı seçin"
                value={provider}
              />
            </div>
          </div>

          {/* Generic IMAP Server settings */}
          {provider === "generic_imap" ? (
            <GenericImapFields
              imapHost={imapHost}
              imapPort={imapPort}
              onImapHostChange={handleImapHostChange}
              onImapPortChange={handleImapPortChange}
              onSmtpHostChange={handleSmtpHostChange}
              onSmtpPortChange={handleSmtpPortChange}
              smtpHost={smtpHost}
              smtpPort={smtpPort}
            />
          ) : null}

          {/* Password / API key */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label
                className="font-medium text-xs text-zinc-700 dark:text-zinc-300"
                htmlFor="account-password"
              >
                {provider === "resend"
                  ? "Resend API Anahtarı"
                  : "Hesap Şifresi / Uygulama Şifresi"}
                {isEdit ? null : " *"}
              </label>
              {isEdit && account?.secretMasked ? (
                <span className="font-mono text-2xs text-muted-foreground">
                  Mevcut: {account.secretMasked}
                </span>
              ) : null}
            </div>
            <div className="relative">
              <input
                className="w-full rounded-xl border border-border bg-card px-3 py-2 pr-10 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none dark:text-zinc-100"
                id="account-password"
                onChange={handlePasswordChange}
                placeholder={
                  isEdit
                    ? "Değiştirmek istemiyorsanız boş bırakın"
                    : "••••••••••••"
                }
                type={showPassword ? "text" : "password"}
                value={password}
              />
              <button
                aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-zinc-600 dark:hover:text-zinc-200"
                onClick={handleTogglePassword}
                tabIndex={-1}
                type="button"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            <p className="mt-1 text-2xs text-muted-foreground">
              Şifreler AES-256 ile veritabanında şifrelenerek saklanır; hiçbir
              zaman açık gösterilmez.
            </p>
          </div>

          {/* Description */}
          <div>
            <label
              className="mb-1 block font-medium text-xs text-zinc-700 dark:text-zinc-300"
              htmlFor="account-description"
            >
              Açıklama (Opsiyonel)
            </label>
            <input
              className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none dark:text-zinc-100"
              id="account-description"
              onChange={handleDescriptionChange}
              placeholder="Örn: Müşteri Destek & Teklif Postası"
              type="text"
              value={description}
            />
          </div>

          {/* IsActive */}
          <div className="flex items-center gap-2 pt-1">
            <input
              checked={isActive}
              className="h-4 w-4 rounded border-border text-zinc-900 focus:ring-zinc-400 dark:bg-zinc-800"
              id="isActiveCheck"
              onChange={handleIsActiveChange}
              type="checkbox"
            />
            <label
              className="font-medium text-xs text-zinc-700 dark:text-zinc-300"
              htmlFor="isActiveCheck"
            >
              Bu hesabı aktif olarak kullan ve periyodik senkronizasyonu
              çalıştır
            </label>
          </div>

          {/* Test results indicator if tested */}
          {testResult ? (
            <TestResultCard provider={provider} result={testResult} />
          ) : null}

          {/* Actions */}
          <div className="flex items-center justify-between border-border border-t pt-4">
            {isEdit && account ? (
              <button
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-zinc-50 px-3 py-2 font-medium text-xs text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 dark:bg-zinc-800 dark:text-zinc-300"
                disabled={isTesting}
                onClick={handleTestConnection}
                type="button"
              >
                {isTesting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                Bağlantıyı Test Et
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                className="rounded-xl border border-border bg-card px-4 py-2 font-medium text-xs text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300"
                disabled={isSubmitting}
                onClick={onClose}
                type="button"
              >
                Vazgeç
              </button>
              <button
                className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-900 px-4 py-2 font-medium text-white text-xs hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                disabled={isSubmitting}
                type="submit"
              >
                {isSubmitting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : null}
                {isEdit ? "Değişiklikleri Kaydet" : "Hesabı Bağla"}
              </button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
