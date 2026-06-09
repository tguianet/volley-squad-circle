import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { arenas } from "@/lib/mock-data";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/partidas/nova")({
  head: () => ({ meta: [{ title: "Criar partida — BeachPlay Arena" }] }),
  component: NewMatchPage,
});

function NewMatchPage() {
  const navigate = useNavigate();
  return (
    <AppLayout>
      <div className="max-w-xl mx-auto px-4 py-6">
        <button onClick={() => navigate({ to: "/partidas" })} className="flex items-center gap-1 text-sm text-muted-foreground mb-3 hover:text-foreground"><ArrowLeft className="size-4"/> Voltar</button>
        <h1 className="text-3xl mb-1">Criar partida amistosa</h1>
        <p className="text-sm text-muted-foreground mb-6">Monte sua partida e convoque a galera.</p>

        <Card className="p-6 shadow-card">
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); navigate({ to: "/partidas" }); }}>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Data</Label>
                <Input type="date" className="mt-1.5"/>
              </div>
              <div>
                <Label>Horário</Label>
                <Input type="time" className="mt-1.5"/>
              </div>
            </div>

            <div>
              <Label>Arena</Label>
              <Select>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Selecione a arena"/></SelectTrigger>
                <SelectContent>
                  {arenas.map(a => <SelectItem key={a.id} value={a.id}>{a.name} — {a.city}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Nível permitido</Label>
                <Select>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Nível"/></SelectTrigger>
                  <SelectContent>
                    {["Iniciante","Intermediário","Avançado","Profissional"].map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tipo de jogo</Label>
                <Select>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Modalidade"/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2x2">2 x 2</SelectItem>
                    <SelectItem value="3x3">3 x 3</SelectItem>
                    <SelectItem value="4x4">4 x 4</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Número de jogadores</Label>
              <Input type="number" min={2} max={12} defaultValue={4} className="mt-1.5"/>
            </div>

            <div>
              <Label>Observações</Label>
              <textarea rows={3} placeholder="Quadra, regras, valor por pessoa..." className="mt-1.5 w-full rounded-md border bg-background px-3 py-2 text-sm" />
            </div>

            <Button type="submit" className="w-full h-11 gradient-beach text-white border-0 shadow-glow">Publicar partida</Button>
          </form>
        </Card>
      </div>
    </AppLayout>
  );
}
