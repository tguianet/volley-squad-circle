import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { Card } from "@/components/ui/card";
import { arenas } from "@/lib/mock-data";
import { MapPin, Star } from "lucide-react";

export const Route = createFileRoute("/arenas/")({
  head: () => ({ meta: [{ title: "Arenas — BeachPlay Arena" }] }),
  component: ArenasPage,
});

function ArenasPage() {
  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 py-6">
        <h1 className="text-3xl">Arenas</h1>
        <p className="text-sm text-muted-foreground mb-6">As melhores areias para jogar.</p>
        <div className="grid sm:grid-cols-2 gap-4">
          {arenas.map(a => (
            <Link key={a.id} to="/arenas/$id" params={{ id: a.id }}>
              <Card className="overflow-hidden shadow-card hover:shadow-glow transition-shadow group">
                <div className="relative h-44">
                  <img src={a.cover} className="w-full h-full object-cover group-hover:scale-105 transition-transform"/>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"/>
                  <div className="absolute bottom-3 left-3 right-3 text-white">
                    <div className="font-display text-xl">{a.name}</div>
                    <div className="flex items-center justify-between text-xs opacity-90">
                      <span className="flex items-center gap-1"><MapPin className="size-3"/>{a.city}</span>
                      <span className="flex items-center gap-1"><Star className="size-3 fill-accent text-accent"/>{a.rating}</span>
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
