import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/partidas/nova")({
  head: () => ({ meta: [{ title: "Criar partida — PlayBeach" }] }),
  component: NewMatchPage,
});

const MODALITIES = [
  { v: "beach_volley", l: "Vôlei de praia" },
  { v: "indoor_volley", l: "Vôlei indoor" },
  { v: "futevolei", l: "Futevôlei" },
];
const TYPES = [
  { v: "dupla", l: "Dupla", max: 4 },
  { v: "quarteto", l: "Quarteto", max: 8 },
  { v: "sexteto", l: "Sexteto", max: 12 },
];

function NewMatchPage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [arenaId, setArenaId] = useState<string>("");
  const [modality, setModality] = useState("beach_volley");
  const [matchType, setMatchType] = useState("dupla");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [maxPlayers, setMaxPlayers] = useState<number>(4);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: arenas = [] } = useQuery({
    queryKey: ["arenas-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("arenas").select("id, name, city").eq("is_active", true).order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  async function handleCreate() {
    if (!title || !date || !startTime) {
      toast.error("Preencha título, data e horário inicial.");
      return;
    }
    setSaving(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { toast.error("Faça login."); return; }
      const { data, error } = await supabase.from("matches").insert({
        creator_id: u.user.id,
        arena_id: arenaId || null,
        title,
        modality: modality as any,
        match_type: matchType as any,
        date,
        start_time: startTime,
        end_time: endTime || null,
        max_players: maxPlayers,
        notes: notes || null,
        status: "open" as any,
      }).select("id").single();
      if (error) throw error;
      toast.success("Partida criada!");
      navigate({ to: "/partidas" });
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao criar partida");
    } finally { setSaving(false); }
  }

  return (
    <AppLayout>
      <div className="max-w-xl mx-auto px-4 py-6">
        <button onClick={() => navigate({ to: "/partidas" })} className="flex items-center gap-1 text-sm text-muted-foreground mb-3 hover:text-foreground">
          <ArrowLeft className="size-4"/> Voltar
        </button>
        <h1 className="text-3xl mb-1">Criar partida amistosa</h1>
        <p className="text-sm text-muted-foreground mb-6">Monte sua partida e convoque a galera.</p>

        <Card className="p-5 shadow-card space-y-4">
          <div>
            <Label>Título</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Treino de quarta" maxLength={100}/>
          </div>
          <div>
            <Label>Arena</Label>
            <Select value={arenaId} onValueChange={setArenaId}>
              <SelectTrigger><SelectValue placeholder="Selecione uma arena (opcional)"/></SelectTrigger>
              <SelectContent>
                {arenas.map((a: any) => (
                  <SelectItem key={a.id} value={a.id}>{a.name}{a.city ? ` — ${a.city}` : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Modalidade</Label>
              <Select value={modality} onValueChange={setModality}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>
                  {MODALITIES.map(m => <SelectItem key={m.v} value={m.v}>{m.l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={matchType} onValueChange={(v) => { setMatchType(v); const t = TYPES.find(x => x.v === v); if (t) setMaxPlayers(t.max); }}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>
                  {TYPES.map(t => <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Data</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)}/>
            </div>
            <div>
              <Label>Início</Label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)}/>
            </div>
            <div>
              <Label>Fim</Label>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)}/>
            </div>
          </div>
          <div>
            <Label>Máximo de jogadores</Label>
            <Input type="number" min={2} max={20} value={maxPlayers} onChange={(e) => setMaxPlayers(Number(e.target.value))}/>
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Detalhes adicionais (opcional)" maxLength={500}/>
          </div>
          <Button className="w-full gradient-beach text-white border-0 shadow-glow" onClick={handleCreate} disabled={saving}>
            {saving ? "Criando..." : "Criar partida"}
          </Button>
        </Card>
      </div>
    </AppLayout>
  );
}
