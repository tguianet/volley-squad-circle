import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { exportCsv } from "@/lib/admin.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/relatorios")({
  component: ReportsExportPage,
});

const TABLES = [
  { key: "profiles", label: "Jogadores" },
  { key: "user_roles", label: "Funções" },
  { key: "banners", label: "Banners" },
  { key: "notifications", label: "Notificações" },
  { key: "reports", label: "Denúncias" },
  { key: "audit_log", label: "Auditoria" },
] as const;

function ReportsExportPage() {
  const fn = useServerFn(exportCsv);
  const mut = useMutation({
    mutationFn: fn,
    onSuccess: (r) => {
      const blob = new Blob([r.csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = r.filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("CSV pronto");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-display">Relatórios</h1>
        <p className="text-sm text-white/60">Exporte dados em CSV.</p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {TABLES.map((t) => (
          <Card key={t.key} className="bg-slate-900/60 border-white/10 text-white p-5">
            <div className="font-display text-lg">{t.label}</div>
            <p className="text-xs text-white/50 mt-1">
              Tabela <code>{t.key}</code>
            </p>
            <Button
              className="mt-4 w-full gradient-beach text-white border-0"
              onClick={() => mut.mutate({ data: { table: t.key } })}
              disabled={mut.isPending}
            >
              {mut.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Download className="size-4 mr-1" />
              )}
              Baixar CSV
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
