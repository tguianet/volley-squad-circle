import { Plus } from "lucide-react";
import { toast } from "sonner";

export function TournamentsFab() {
  return (
    <button
      type="button"
      onClick={() => toast.info("Criação de torneios pelo admin em breve.")}
      className="fixed bottom-10 right-10 size-16 bg-accent text-accent-foreground rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-40 group"
      aria-label="Criar torneio"
    >
      <Plus className="size-8" />
      <span className="absolute right-20 bg-foreground text-background px-4 py-2 rounded-lg text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none hidden sm:block">
        Criar Torneio
      </span>
    </button>
  );
}
