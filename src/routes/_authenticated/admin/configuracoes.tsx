import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getSettings, updateSetting } from "@/lib/admin.functions";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/configuracoes")({
  component: SettingsPage,
});

function SettingsPage() {
  const list = useServerFn(getSettings);
  const upd = useServerFn(updateSetting);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-settings"], queryFn: () => list() });
  const [draft, setDraft] = useState<Record<string, string>>({});

  useEffect(() => {
    if (data) {
      const init: Record<string, string> = {};
      for (const s of data) init[s.key] = JSON.stringify(s.value, null, 2);
      setDraft(init);
    }
  }, [data]);

  const mut = useMutation({
    mutationFn: upd,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-settings"] });
      toast.success("Salvo");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const save = (key: string) => {
    try {
      const value = JSON.parse(draft[key]);
      mut.mutate({ data: { key, value } });
    } catch {
      toast.error("JSON inválido");
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-display">Configurações</h1>
        <p className="text-sm text-white/60">
          Modo manutenção, feature flags e listas globais. Edite os valores JSON.
        </p>
      </div>
      {isLoading ? (
        <div className="p-12 flex items-center justify-center">
          <Loader2 className="size-5 animate-spin text-white/60" />
        </div>
      ) : (
        <div className="space-y-4">
          {data!.map((s: any) => (
            <Card key={s.key} className="bg-slate-900/60 border-white/10 text-white p-5">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="font-display text-lg">{s.key}</div>
                  <div className="text-xs text-white/50">{s.description}</div>
                </div>
                <Button
                  size="sm"
                  onClick={() => save(s.key)}
                  disabled={mut.isPending}
                  className="gradient-beach text-white border-0"
                >
                  <Save className="size-3.5 mr-1" /> Salvar
                </Button>
              </div>
              <Textarea
                rows={5}
                value={draft[s.key] ?? ""}
                onChange={(e) => setDraft({ ...draft, [s.key]: e.target.value })}
                className="bg-slate-800 border-white/10 text-white font-mono text-xs"
              />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
