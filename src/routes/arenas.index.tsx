import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { Card } from "@/components/ui/card";
import { MapPin, Star } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/arenas/")({
  head: () => ({ meta: [{ title: "Arenas — PlayBeach" }] }),
  component: ArenasPage,
});

type ArenaRow = {
  id: string;
  name: string;
  city: string | null;
  cover_url: string | null;
  rating: number | null;
};

async function fetchArenas(): Promise<ArenaRow[]> {
  const { data, error } = await supabase
    .from("arenas")
    .select("id, name, city, cover_url, rating")
    .eq("is_active", true)
    .order("name");
  if (error) throw error;
  return (data ?? []) as ArenaRow[];
}

function ArenasPage() {
  const q = useQuery({ queryKey: ["arenas"], queryFn: fetchArenas });
  const arenas = q.data ?? [];

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 py-6">
        <h1 className="text-3xl">Arenas</h1>
        <p className="text-sm text-muted-foreground mb-6">As melhores areias para jogar.</p>

        {q.isLoading && (
          <Card className="p-6 text-center text-sm text-muted-foreground">Carregando…</Card>
        )}
        {!q.isLoading && arenas.length === 0 && (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            Nenhuma arena cadastrada ainda.
          </Card>
        )}

        <div className="grid sm:grid-cols-2 gap-4">
          {arenas.map((a) => (
            <Link key={a.id} to="/arenas/$id" params={{ id: a.id }}>
              <Card className="overflow-hidden shadow-card hover:shadow-glow transition-shadow group">
                <div className="relative h-44 bg-secondary">
                  {a.cover_url && (
                    <img
                      src={a.cover_url}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      alt={a.name}
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3 text-white">
                    <div className="font-display text-xl">{a.name}</div>
                    <div className="flex items-center justify-between text-xs opacity-90">
                      <span className="flex items-center gap-1">
                        <MapPin className="size-3" />
                        {a.city ?? "—"}
                      </span>
                      {a.rating != null && (
                        <span className="flex items-center gap-1">
                          <Star className="size-3 fill-accent text-accent" />
                          {Number(a.rating).toFixed(1)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
