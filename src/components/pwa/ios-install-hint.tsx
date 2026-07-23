"use client";

import { useEffect, useState } from "react";
import { Share, X } from "lucide-react";

export function IosInstallHint() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const ua = window.navigator.userAgent;
    const isIOS = /iphone|ipad|ipod/i.test(ua);
    const isSafari = isIOS && !/crios|fxios|edgios/i.test(ua); // exclui Chrome/Firefox/Edge no iOS
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    const dismissed = localStorage.getItem("ios-install-hint-dismissed") === "1";
    if (isSafari && !standalone && !dismissed) setShow(true);
  }, []);

  if (!show) return null;

  function dismiss() {
    localStorage.setItem("ios-install-hint-dismissed", "1");
    setShow(false);
  }

  return (
    <div className="glass mb-4 flex items-center gap-3 rounded-2xl border border-border p-4">
      <Share className="h-5 w-5 shrink-0 text-primary" />
      <p className="flex-1 text-sm text-muted-foreground">
        Instale o Zênite no seu iPhone: toque em{" "}
        <span className="font-medium text-foreground">Compartilhar</span> e depois em{" "}
        <span className="font-medium text-foreground">Adicionar à Tela de Início</span>.
      </p>
      <button
        onClick={dismiss}
        aria-label="Dispensar"
        title="Dispensar"
        className="rounded-lg p-2 text-muted-foreground hover:bg-accent"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
