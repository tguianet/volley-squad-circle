import { useEffect, useState } from "react";
import { RefreshCw, X } from "lucide-react";

import { applyPwaUpdate, PWA_UPDATE_AVAILABLE_EVENT } from "../lib/pwa-register";

export function PwaUpdatePrompt() {
  const [visible, setVisible] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const showUpdate = () => setVisible(true);
    window.addEventListener(PWA_UPDATE_AVAILABLE_EVENT, showUpdate);
    return () => window.removeEventListener(PWA_UPDATE_AVAILABLE_EVENT, showUpdate);
  }, []);

  const update = async () => {
    setUpdating(true);
    const applied = await applyPwaUpdate();

    if (!applied) {
      setUpdating(false);
      setVisible(false);
    }
  };

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-3 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-[70] mx-auto max-w-md rounded-2xl border border-black/5 bg-white/95 p-3 shadow-2xl backdrop-blur md:inset-x-auto md:right-4 md:bottom-4 md:left-auto"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-[#00A3AD]/10 text-[#00A3AD]">
          <RefreshCw className="h-5 w-5" />
        </div>
        <div className="flex-1 text-sm">
          <p className="font-semibold text-foreground">Nova versão disponível</p>
          <p className="text-muted-foreground">Atualize para usar as melhorias mais recentes.</p>
        </div>
        <button
          type="button"
          onClick={() => setVisible(false)}
          aria-label="Fechar aviso de atualização"
          className="flex-none rounded-full p-1 text-muted-foreground hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <button
        type="button"
        onClick={update}
        disabled={updating}
        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#00A3AD] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#006970] disabled:cursor-wait disabled:opacity-70"
      >
        <RefreshCw className={`h-4 w-4 ${updating ? "animate-spin" : ""}`} />
        {updating ? "Atualizando..." : "Atualizar agora"}
      </button>
    </div>
  );
}
