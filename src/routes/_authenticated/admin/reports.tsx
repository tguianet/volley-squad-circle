import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listReports, resolveReport } from "@/lib/admin.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/reports")({
  component: ReportsPage,
});

function ReportsPage() {
  const list = useServerFn(listReports);
  const resolve = useServerFn(resolveReport);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-reports"], queryFn: () => list() });

  const mut = useMutation({
    mutationFn: resolve,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-reports"] });
      toast.success("Atualizado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-display">Denúncias</h1>
        <p className="text-sm text-white/60">Fila de moderação.</p>
      </div>

      <Card className="bg-slate-900/60 border-white/10 text-white overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex items-center justify-center">
            <Loader2 className="size-5 animate-spin text-white/60" />
          </div>
        ) : (data?.length ?? 0) === 0 ? (
          <p className="p-6 text-sm text-white/50">Tudo limpo! Nenhuma denúncia.</p>
        ) : (
          <ul className="divide-y divide-white/5">
            {data!.map((r) => (
              <li key={r.id} className="p-4 flex flex-wrap items-center gap-3">
                <Badge variant={r.status === "pending" ? "destructive" : "secondary"}>
                  {r.status}
                </Badge>
                <div className="text-xs text-white/50 font-mono">
                  {r.target_type}:{r.target_id.slice(0, 10)}
                </div>
                <div className="flex-1 min-w-[200px]">
                  <div className="font-semibold text-sm">{r.reason}</div>
                  {r.details && <div className="text-xs text-white/60">{r.details}</div>}
                </div>
                {r.status === "pending" && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => mut.mutate({ data: { id: r.id, status: "resolved" } })}
                    >
                      <Check className="size-3.5 mr-1" /> Resolver
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => mut.mutate({ data: { id: r.id, status: "dismissed" } })}
                    >
                      <X className="size-3.5 mr-1" /> Descartar
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
