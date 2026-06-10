import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Swords,
  Clock,
  TrendingUp,
  TrendingDown,
  Target,
  Trophy,
  Zap,
  ShieldAlert,
  ChevronRight,
  Users,
  Award,
} from "lucide-react";

export const Route = createFileRoute("/regras/")({
  head: () => ({
    meta: [
      { title: "Regras do Ranking — BeachPlay Arena" },
      { name: "description", content: "Entenda como funciona o ranking, os desafios e a pontuação." },
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
            Como funciona a pontuação, os desafios e as regras de posição.
          </p>
        </div>

        {/* 1. Desafios obrigatórios */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg gradient-beach flex items-center justify-center">
              <Swords className="size-4 text-white" />
            </div>
            <h2 className="text-xl">Desafios obrigatórios</h2>
          </div>
          <Card className="p-5 space-y-4 shadow-card">
            <p className="text-sm text-muted-foreground">
              O erro da maioria dos rankings é que ninguém desafia ninguém. Por isso, existem regras obrigatórias de movimentação.
            </p>
            <div className="grid gap-3">
              <div className="flex items-start gap-3">
                <Clock className="size-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <div className="font-semibold text-sm">Prazo de 15 dias</div>
                  <div className="text-xs text-muted-foreground">
                    Cada dupla/quarteto deve fazer pelo menos <strong>1 desafio a cada 15 dias</strong>.
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <TrendingDown className="size-5 text-destructive mt-0.5 shrink-0" />
                <div>
                  <div className="font-semibold text-sm">Não jogar</div>
                  <div className="text-xs text-muted-foreground">
                    Se não cumprir o prazo, a equipe perde <Badge variant="destructive" className="text-[10px]">-20 pts</Badge> automaticamente.
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <ShieldAlert className="size-5 text-destructive mt-0.5 shrink-0" />
                <div>
                  <div className="font-semibold text-sm">Recusar desafio</div>
                  <div className="text-xs text-muted-foreground">
                    Se recusar um desafio válido, a equipe perde <Badge variant="destructive" className="text-[10px]">-30 pts</Badge>.
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </section>

        {/* 2. Sistema de desafio por posições */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg gradient-beach flex items-center justify-center">
              <Target className="size-4 text-white" />
            </div>
            <h2 className="text-xl">Sistema de desafio por posições</h2>
          </div>
          <Card className="p-5 space-y-4 shadow-card">
            <p className="text-sm text-muted-foreground">
              Você só pode desafiar equipes que estão acima de você, mas com limite de posições — isso evita bagunça no ranking.
            </p>
            <div className="rounded-xl bg-secondary/60 p-4 space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Exemplo</div>
              <div className="flex items-center gap-2 text-sm">
                <span className="font-display text-lg text-gradient">5º</span>
                <ChevronRight className="size-4 text-muted-foreground" />
                <span>pode desafiar</span>
                <Badge className="gradient-beach text-white text-[10px]">4º</Badge>
                <span>e</span>
                <Badge className="gradient-beach text-white text-[10px]">3º</Badge>
              </div>
              <div className="text-xs text-muted-foreground">
                Não pode desafiar o <strong>1º</strong> direto — precisa subir degrau por degrau.
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Users className="size-5 text-primary mt-0.5 shrink-0" />
              <div className="text-sm text-muted-foreground">
                A mesma regra vale para <strong>quartetos</strong>: desafie até 2 posições acima.
              </div>
            </div>
          </Card>
        </section>

        {/* 3. Ganho e perda de pontos */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg gradient-beach flex items-center justify-center">
              <TrendingUp className="size-4 text-white" />
            </div>
            <h2 className="text-xl">Ganho e perda de pontos</h2>
          </div>
          <Card className="p-5 space-y-4 shadow-card">
            <p className="text-sm text-muted-foreground">
              A pontuação depende da diferença de posição entre as equipes.
            </p>
            <div className="grid gap-3">
              <div className="rounded-xl bg-success/10 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Trophy className="size-4 text-success" />
                  <span className="font-semibold text-sm">Vitória contra equipe ACIMA</span>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div>1 posição acima: <strong>+20 pts</strong> de base</div>
                  <div>2 posições acima: <strong>+30 pts</strong> de base</div>
                  <div>3 posições acima: <strong>+40 pts</strong> de base</div>
                  <div>4+ posições acima: <strong>+50 pts</strong> de base</div>
                </div>
              </div>
              <div className="rounded-xl bg-primary/10 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Award className="size-4 text-primary" />
                  <span className="font-semibold text-sm">Vitória contra equipe ABAIXO</span>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div>1 posição abaixo: <strong>+10 pts</strong> de base</div>
                  <div>2+ posições abaixo: <strong>+5 pts</strong> de base</div>
                </div>
              </div>
              <div className="rounded-xl bg-destructive/10 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="size-4 text-destructive" />
                  <span className="font-semibold text-sm">Derrota</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Você perde metade do que o vencedor ganharia (arredondado para cima), mas ainda ganha <strong>+5 pts</strong> por registrar a partida.
                </div>
              </div>
            </div>
          </Card>
        </section>

        {/* 4. Bônus por atividade */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg gradient-beach flex items-center justify-center">
              <Zap className="size-4 text-white" />
            </div>
            <h2 className="text-xl">Bônus por atividade</h2>
          </div>
          <Card className="p-5 shadow-card">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center gap-3 rounded-lg bg-secondary/60 p-3">
                <div className="size-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <Clock className="size-4 text-primary" />
                </div>
                <div>
                  <div className="font-semibold text-sm">Partida registrada</div>
                  <Badge className="text-[10px] mt-0.5 gradient-beach text-white">+5 pts</Badge>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg bg-secondary/60 p-3">
                <div className="size-8 rounded-full bg-success/20 flex items-center justify-center shrink-0">
                  <Trophy className="size-4 text-success" />
                </div>
                <div>
                  <div className="font-semibold text-sm">Vitória</div>
                  <Badge className="text-[10px] mt-0.5 gradient-beach text-white">+15 pts</Badge>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg bg-secondary/60 p-3">
                <div className="size-8 rounded-full bg-sunset/20 flex items-center justify-center shrink-0">
                  <Zap className="size-4 text-sunset" />
                </div>
                <div>
                  <div className="font-semibold text-sm">Vitória por 2x0</div>
                  <Badge className="text-[10px] mt-0.5 gradient-beach text-white">+20 pts</Badge>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg bg-secondary/60 p-3">
                <div className="size-8 rounded-full bg-ocean/20 flex items-center justify-center shrink-0">
                  <TrendingUp className="size-4 text-ocean" />
                </div>
                <div>
                  <div className="font-semibold text-sm">Sequência de 5 vitórias</div>
                  <Badge className="text-[10px] mt-0.5 gradient-beach text-white">+25 pts</Badge>
                </div>
              </div>
            </div>
          </Card>
        </section>
      </div>
    </AppLayout>
  );
}
