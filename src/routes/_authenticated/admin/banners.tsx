import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { deleteBanner, listBanners, saveBanner } from "@/lib/admin.functions";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/banners")({
  component: BannersPage,
});

const variantStyles: Record<string, string> = {
  info: "bg-blue-500/20 border-blue-400/40 text-blue-100",
  success: "bg-emerald-500/20 border-emerald-400/40 text-emerald-100",
  warning: "bg-amber-500/20 border-amber-400/40 text-amber-100",
  promo: "bg-fuchsia-500/20 border-fuchsia-400/40 text-fuchsia-100",
};

function BannersPage() {
  const list = useServerFn(listBanners);
  const save = useServerFn(saveBanner);
  const del = useServerFn(deleteBanner);
  const qc = useQueryClient();
  const { data: banners, isLoading } = useQuery({
    queryKey: ["admin-banners"],
    queryFn: () => list(),
  });

  const [draft, setDraft] = useState<any>({
    title: "",
    body: "",
    link_url: "",
    variant: "info",
    is_active: true,
  });

  const saveMut = useMutation({
    mutationFn: save,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-banners"] });
      setDraft({ title: "", body: "", link_url: "", variant: "info", is_active: true });
      toast.success("Banner salvo");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: del,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-banners"] });
      toast.success("Banner removido");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display">Banners</h1>
        <p className="text-sm text-white/60">Avisos exibidos no topo do feed.</p>
      </div>

      <Card className="bg-slate-900/60 border-white/10 text-white p-5 space-y-4">
        <div className="font-display text-lg">Novo banner</div>
        <div className="grid md:grid-cols-2 gap-3">
          <Input
            placeholder="Título"
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            className="bg-slate-800 border-white/10 text-white"
          />
          <Input
            placeholder="Link (opcional)"
            value={draft.link_url}
            onChange={(e) => setDraft({ ...draft, link_url: e.target.value })}
            className="bg-slate-800 border-white/10 text-white"
          />
        </div>
        <Textarea
          placeholder="Mensagem"
          value={draft.body}
          onChange={(e) => setDraft({ ...draft, body: e.target.value })}
          className="bg-slate-800 border-white/10 text-white"
        />
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex gap-2">
            {(["info", "success", "warning", "promo"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setDraft({ ...draft, variant: v })}
                className={`px-3 py-1.5 rounded-md text-xs border ${
                  draft.variant === v ? variantStyles[v] : "border-white/10 text-white/60"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Switch
              checked={draft.is_active}
              onCheckedChange={(v) => setDraft({ ...draft, is_active: v })}
            />
            Ativo
          </label>
          <Button
            onClick={() => saveMut.mutate({ data: draft })}
            disabled={!draft.title || saveMut.isPending}
            className="ml-auto gradient-beach text-white border-0"
          >
            <Plus className="size-4 mr-1" />
            Publicar banner
          </Button>
        </div>
        {draft.title && (
          <div className={`rounded-xl border p-4 ${variantStyles[draft.variant]}`}>
            <div className="font-semibold">{draft.title}</div>
            {draft.body && <div className="text-sm opacity-90">{draft.body}</div>}
          </div>
        )}
      </Card>

      <Card className="bg-slate-900/60 border-white/10 text-white overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex items-center justify-center">
            <Loader2 className="size-5 animate-spin text-white/60" />
          </div>
        ) : (banners?.length ?? 0) === 0 ? (
          <p className="p-6 text-sm text-white/50">Nenhum banner cadastrado.</p>
        ) : (
          <ul className="divide-y divide-white/5">
            {banners!.map((b: any) => (
              <li key={b.id} className="p-4 flex items-center gap-4">
                <div className={`flex-1 rounded-lg border p-3 ${variantStyles[b.variant]}`}>
                  <div className="font-semibold">{b.title}</div>
                  {b.body && <div className="text-sm opacity-80">{b.body}</div>}
                </div>
                <div className="text-xs text-white/40 hidden md:block">
                  {b.is_active ? "Ativo" : "Inativo"}
                </div>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => delMut.mutate({ data: { id: b.id } })}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
