import { Award, UserPlus } from "lucide-react";

type TournamentsHeaderProps = {
  activeCount: number;
  registrationCount: number;
};

export function TournamentsHeader({ activeCount, registrationCount }: TournamentsHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10">
      <div>
        <h1 className="font-display text-4xl sm:text-5xl lg:text-[3rem] tracking-wide text-primary mb-2 leading-[1.1]">
          Torneios Internos
        </h1>
        <p className="text-muted-foreground text-base sm:text-lg max-w-xl leading-relaxed">
          Participe das competições oficiais da Arena PlayBeach. Mostre sua habilidade nas areias!
        </p>
      </div>
      <div className="flex flex-wrap gap-4">
        <div className="bg-card border border-border/40 rounded-2xl px-6 py-4 shadow-sm flex items-center gap-4 min-w-[160px]">
          <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Award className="size-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground/80 font-semibold uppercase tracking-wide">
              Torneios Ativos
            </p>
            <p className="font-display text-2xl leading-none mt-0.5">
              {String(activeCount).padStart(2, "0")}
            </p>
          </div>
        </div>
        <div className="bg-card border border-border/40 rounded-2xl px-6 py-4 shadow-sm flex items-center gap-4 min-w-[160px]">
          <div className="size-12 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
            <UserPlus className="size-5 text-accent" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground/80 font-semibold uppercase tracking-wide">
              Inscrições
            </p>
            <p className="font-display text-2xl leading-none mt-0.5">
              {String(registrationCount).padStart(2, "0")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
