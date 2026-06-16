import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MapPin, Star } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/arenas/$id")({
  head: () => ({ meta: [{ title: "Arena — PlayBeach" }] }),
  component: ArenaDetail,
});

async function fetchArena(id: string) {
  const { data, error } = await supabase
    .from("arenas")
    .select("id, name, city, address, cover_url, rating")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

function ArenaDetail() {
  const { id } = useParams({ from: "/arenas/$id" });
  const q = useQuery({ queryKey: ["arena", id], queryFn: () => fetchArena(id) });

  if (q.isLoading) {
    return (
      <AppLayout>
        <div className="p-8 text-sm text-muted-foreground">Carregando…</div>
      </AppLayout>
    );
  }
  const a = q.data;
  if (!a) {
    return (
      <AppLayout>
        <div className="p-8">Arena não encontrada.</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 py-6">
        <Link
          to="/arenas"
          className="flex items-center gap-1 text-sm text-muted-foreground mb-3 hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Arenas
        </Link>

        <div className="relative h-56 rounded-3xl overflow-hidden shadow-card mb-6 bg-secondary">
          {a.cover_url && (
            <img src={a.cover_url} className="w-full h-full object-cover" alt={a.name} />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
          <div className="absolute bottom-0 p-6 text-white">
            <h1 className="font-display text-4xl">{a.name}</h1>
            <div className="flex flex-wrap gap-3 mt-1 text-sm">
              {(a.address || a.city) && (
                <span className="flex items-center gap-1">
                  <MapPin className="size-4" />
                  {[a.address, a.city].filter(Boolean).join(" • ")}
                </span>
              )}
              {a.rating != null && (
                <span className="flex items-center gap-1">
                  <Star className="size-4 fill-accent text-accent" />
                  {Number(a.rating).toFixed(1)}
                </span>
              )}
              <Badge className="bg-white/15 backdrop-blur text-white border-0">Arena oficial</Badge>
            </div>
          </div>
        </div>

        <section className="mb-6">
          <h2 className="text-xl mb-3">Agenda</h2>
          <Card className="p-6 text-center text-sm text-muted-foreground">
            Em breve: agenda de partidas desta arena.
          </Card>
        </section>

        <section>
          <h2 className="text-xl mb-3">Torneios</h2>
          <Card className="p-6 text-center text-sm text-muted-foreground">
            Em breve: torneios organizados nesta arena.
          </Card>
        </section>
      </div>
    </AppLayout>
  );
}
