import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "playbeach-pwa-install-dismissed";

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia?.("(display-mode: standalone)").matches || nav.standalone === true;
}

function isIOS(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  return /iphone|ipad|ipod/i.test(ua) && !/crios|fxios|edgios/i.test(ua);
}

export function PwaInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [showIOS, setShowIOS] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isStandalone()) return;
    if (window.localStorage.getItem(DISMISS_KEY)) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);

    const installed = () => {
      setVisible(false);
      setShowIOS(false);
      window.localStorage.setItem(DISMISS_KEY, "installed");
    };
    window.addEventListener("appinstalled", installed);

    // iOS: no beforeinstallprompt — show hint after a short delay.
    if (isIOS()) {
      const t = setTimeout(() => setShowIOS(true), 4000);
      return () => {
        clearTimeout(t);
        window.removeEventListener("beforeinstallprompt", handler);
        window.removeEventListener("appinstalled", installed);
      };
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installed);
    };
  }, []);

  const dismiss = () => {
    setVisible(false);
    setShowIOS(false);
    try {
      window.localStorage.setItem(DISMISS_KEY, "dismissed");
    } catch {
      // localStorage indisponível (modo privado) — sem impacto no fluxo
    }
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === "accepted") {
      window.localStorage.setItem(DISMISS_KEY, "accepted");
    } else {
      window.localStorage.setItem(DISMISS_KEY, "dismissed");
    }
    setDeferred(null);
    setVisible(false);
  };

  if (!visible && !showIOS) return null;

  return (
    <div
      role="dialog"
      aria-label="Instalar PlayBeach"
      className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-md rounded-2xl border border-black/5 bg-white/95 p-3 shadow-2xl backdrop-blur sm:inset-x-auto sm:right-4 sm:bottom-4 sm:left-auto"
    >
      <div className="flex items-start gap-3">
        <img src="/pwa-192x192.png" alt="" className="h-11 w-11 flex-none rounded-xl" />
        <div className="flex-1 text-sm">
          {visible ? (
            <>
              <p className="font-semibold text-foreground">Instalar PlayBeach</p>
              <p className="text-muted-foreground">Acesso rápido direto da tela inicial.</p>
            </>
          ) : (
            <>
              <p className="font-semibold text-foreground">Adicione à tela de início</p>
              <p className="text-muted-foreground">
                Toque em <Share className="mx-1 inline h-3.5 w-3.5" aria-label="Compartilhar" />
                Compartilhar e depois em <strong>Adicionar à Tela de Início</strong>.
              </p>
            </>
          )}
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dispensar"
          className="flex-none rounded-full p-1 text-muted-foreground hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {visible && (
        <button
          type="button"
          onClick={install}
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#00A3AD] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#006970]"
        >
          <Download className="h-4 w-4" /> Instalar PlayBeach
        </button>
      )}
    </div>
  );
}
