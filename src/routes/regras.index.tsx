import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Swords, CalendarDays, TrendingDown, Trophy, ShieldAlert, Users, Award, Clock,
} from "lucide-react";

export const Route = createFileRoute("/regras/")({
  head: () => ({
    meta: [
      { title: "Regras do Ranking — BeachPlay Arena" },
      { name: "description", content: "Entenda como funciona o ranking, os desafios aos domingos e a pontuação." },
    ],
  }),
  component: RegrasPage,
});

function RegrasPage() {
  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-8">
        <div>
          <h1 className="text-3xl">Regras do Ranking</h1>
          <p className="text-sm text-muted-foreground">
            Os jogos do ranking acontecem exclusivamente aos domingos.
          </p>
        </div>

        {/* Disponibilidade mensal */}
        <Section
          icon={<CalendarDays className="size-4 text-white"/>}
          title="Disponibilidade mensal"
        >
          <Card className="p-5 space-y-3 shadow-card">
            <p className="text-sm">
              Cada dupla ou quarteto informa, a cada mês:
            </p>
            <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
              <li>Quais <strong>domingos do mês</strong> está disponível.</li>
              <li>O <strong>horário</strong> disponível em cada domingo.</li>
              <li>A <strong>arena preferida</strong>.</li>
            </ul>
            <p className="text-xs text-muted-foreground">
              A disponibilidade é renovada automaticamente a cada novo mês. Apenas o capitão da equipe edita.
            </p>
          </Card>
        </Section>

        {/* Como funciona o desafio */}
        <Section
          icon={<Swords className="size-4 text-white"/>}
          title="Como funciona o desafio"
        >
          <Card className="p-5 space-y-3 shadow-card">
            <ol className="text-sm space-y-2 list-decimal list-inside">
              <li>Ao desafiar uma equipe, o sistema busca <strong>automaticamente um domingo em comum</strong>.</li>
              <li>Os <strong>horários coincidentes</strong> são exibidos.</li>
              <li>O desafiante escolhe um dos horários disponíveis.</li>
              <li>O desafio já é criado com data e horário definidos.</li>
              <li>
                O adversário pode:{" "}
                <Badge variant="default">Aceitar</Badge>{" "}
                <Badge variant="outline">Reagendar</Badge>{" "}
                <Badge variant="destructive">Recusar</Badge>
              </li>
              <li>Após aceitação, o horário fica bloqueado e o desafio passa para <strong>Agendado</strong>.</li>
            </ol>
            <p className="text-xs text-muted-foreground border-t pt-3 flex items-start gap-2">
              <Clock className="size-3 mt-0.5"/>
              Se não houver domingo compatível: "Nenhum domingo disponível em comum neste mês."
            </p>
          </Card>
        </Section>

        {/* Penalidades */}
        <Section
          icon={<ShieldAlert className="size-4 text-white"/>}
          title="Regras de movimentação"
        >
          <Card className="p-5 space-y-3 shadow-card">
            <PenaltyRow
              icon={<TrendingDown className="size-4 text-destructive"/>}
              label="Sem desafio realizado no mês"
              value="-20 pontos"
            />
            <PenaltyRow
              icon={<TrendingDown className="size-4 text-destructive"/>}
              label="Recusa de desafio válido"
              value="-30 pontos"
            />
            <PenaltyRow
              icon={<TrendingDown className="size-4 text-destructive"/>}
              label="W.O. (não comparecer)"
              value="-50 pontos"
            />
            <p className="text-xs text-muted-foreground border-t pt-3">
              Cada dupla/quarteto deve realizar pelo menos <strong>1 desafio por mês</strong>. As penalidades são aplicadas automaticamente pelo sistema.
            </p>
          </Card>
        </Section>

        {/* Ranking individual */}
        <Section
          icon={<Users className="size-4 text-white"/>}
          title="Ranking Individual"
        >
          <Card className="p-5 space-y-2 shadow-card">
            <p className="text-sm">
              O Ranking Individual é apenas a <strong>soma dos resultados obtidos em Duplas e Quartetos</strong>.
            </p>
            <p className="text-xs text-muted-foreground">
              As regras de movimentação acima (-20, -30, -50) <strong>não se aplicam</strong> ao Ranking Individual.
            </p>
          </Card>
        </Section>

        {/* Bônus */}
        <Section
          icon={<Trophy className="size-4 text-white"/>}
          title="Bônus por atividade"
        >
          <Card className="p-5 space-y-2 shadow-card text-sm">
            <BonusRow label="Partida registrada" value="+5 pts"/>
            <BonusRow label="Vitória" value="+15 pts"/>
            <BonusRow label="Vitória por 2x0" value="+20 pts"/>
            <BonusRow label="Sequência de 5 vitórias" value="+25 pts"/>
          </Card>
        </Section>
      </div>
    </AppLayout>
  );
}

function Section({
  icon, title, children,
}: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="size-8 rounded-lg gradient-beach flex items-center justify-center">{icon}</div>
        <h2 className="text-xl">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function PenaltyRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2">{icon}<span>{label}</span></div>
      <span className="font-display text-destructive">{value}</span>
    </div>
  );
}

function BonusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2"><Award className="size-4 text-primary"/>{label}</div>
      <span className="font-display text-primary">{value}</span>
    </div>
  );
}
