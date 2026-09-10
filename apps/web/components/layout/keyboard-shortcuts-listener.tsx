"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

interface KeyboardShortcutsListenerProps {
  tenantSlug: string;
  isCommandPaletteOpen: boolean;
  setIsCommandPaletteOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  isShortcutsHelpOpen: boolean;
  setIsShortcutsHelpOpen: (open: boolean) => void;
  isMobileDrawerOpen: boolean;
  setIsMobileDrawerOpen: (open: boolean) => void;
}

function getSequenceRoute(seq: string, tenantSlug: string): string | null {
  const map: Record<string, string> = {
    gd: `/${tenantSlug}`,
    gp: `/${tenantSlug}/pipelines`,
    gc: `/${tenantSlug}/customers`,
    gq: `/${tenantSlug}/quotes`,
    go: `/${tenantSlug}/orders`,
    ga: `/${tenantSlug}/attendance`,
    gl: `/${tenantSlug}/leaves`,
    gv: `/${tenantSlug}/vehicles`,
    gs: `/${tenantSlug}/settings`,
    nc: `/${tenantSlug}/customers?create=true`,
    nd: `/${tenantSlug}/pipelines?create=true`,
    nq: `/${tenantSlug}/quotes?create=true`,
    ni: `/${tenantSlug}/leaves?create=true`,
    nl: `/${tenantSlug}/leaves?create=true`,
    nu: `/${tenantSlug}/products?create=true`,
  };

  return map[seq] || null;
}

export function KeyboardShortcutsListener({
  tenantSlug,
  isCommandPaletteOpen,
  setIsCommandPaletteOpen,
  isShortcutsHelpOpen,
  setIsShortcutsHelpOpen,
  isMobileDrawerOpen,
  setIsMobileDrawerOpen,
}: KeyboardShortcutsListenerProps) {
  const router = useRouter();

  useEffect(() => {
    let keyBuffer: string[] = [];
    let bufferTimeout: NodeJS.Timeout | null = null;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target?.isContentEditable;

      // 1. Command Palette Toggle (⌘K / Ctrl+K)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
        return;
      }

      if (isInput) {
        return;
      }

      // 2. Open Search with /
      if (e.key === "/" && !isCommandPaletteOpen && !isShortcutsHelpOpen) {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
        return;
      }

      // 3. Open Shortcuts Modal with ?
      if (e.key === "?" && !isCommandPaletteOpen && !isShortcutsHelpOpen) {
        e.preventDefault();
        setIsShortcutsHelpOpen(true);
        return;
      }

      // 4. Escape Key: Close open dialogs
      if (e.key === "Escape") {
        if (isCommandPaletteOpen) setIsCommandPaletteOpen(false);
        if (isShortcutsHelpOpen) setIsShortcutsHelpOpen(false);
        if (isMobileDrawerOpen) setIsMobileDrawerOpen(false);
        return;
      }

      // 5. Sequence Shortcuts (e.g., G D, N C)
      if (!e.metaKey && !e.ctrlKey && !e.altKey) {
        keyBuffer.push(e.key.toLowerCase());
        if (bufferTimeout) {
          clearTimeout(bufferTimeout);
        }
        bufferTimeout = setTimeout(() => {
          keyBuffer = [];
        }, 1000);

        const targetRoute = getSequenceRoute(keyBuffer.join(""), tenantSlug);
        if (targetRoute) {
          e.preventDefault();
          router.push(targetRoute);
          keyBuffer = [];
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (bufferTimeout) {
        clearTimeout(bufferTimeout);
      }
    };
  }, [
    router,
    tenantSlug,
    isCommandPaletteOpen,
    isShortcutsHelpOpen,
    isMobileDrawerOpen,
    setIsCommandPaletteOpen,
    setIsShortcutsHelpOpen,
    setIsMobileDrawerOpen,
  ]);

  return null;
}
