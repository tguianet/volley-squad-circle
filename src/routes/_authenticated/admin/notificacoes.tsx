import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { broadcastNotification } from "@/lib/admin.functions";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/notificacoes")({
  component: NotifPage,
});

function NotifPage() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [link, setLink] = useState("");
  const [city, setCity] = useState("");
  const fn = useServerFn(broadcastNotification);
  const mut = useMutation({
    mutationFn: fn,
    onSuccess: (r) => {
      toast.success(`Enviado para ${r.sent} jogadores`);
      setTitle("");
      setBody("");
      setLink("");
      setCity("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-display">Notificações</h1>
        <p className="text-sm text-white/60">Disparo em massa para todos ou por cidade.</p>
      </div>
      <Card className="bg-slate-900/60 border-white/10 text-white p-5 space-y-3">
        <Input
          placeholder="Título"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="bg-slate-800 border-white/10 text-white"
        />
        <Textarea
          placeholder="Mensagem"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="bg-slate-800 border-white/10 text-white"
        />
        <Input
          placeholder="Link (opcional)"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          className="bg-slate-800 border-white/10 text-white"
        />
        <Input
          placeholder="Filtrar por cidade (opcional, ex: Rio de Janeiro)"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="bg-slate-800 border-white/10 text-white"
        />
        <Button
          onClick={() =>
            mut.mutate({
              data: {
                title,
                body: body || undefined,
                link_url: link || undefined,
                city: city || undefined,
              },
            })
          }
          disabled={!title || mut.isPending}
          className="gradient-beach text-white border-0"
        >
          <Send className="size-4 mr-1" />
          Disparar
        </Button>
      </Card>
    </div>
  );
}
