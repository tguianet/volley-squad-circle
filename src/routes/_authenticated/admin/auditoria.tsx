import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listAudit } from "@/lib/admin.functions";
import { formatDateTimeBR } from "@/lib/date-format";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/auditoria")({
  component: AuditPage,
});

function AuditPage() {
  const fn = useServerFn(listAudit);
  const { data, isLoading } = useQuery({ queryKey: ["admin-audit"], queryFn: () => fn() });
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-display">Auditoria</h1>
        <p className="text-sm text-white/60">Histórico de tudo que admins fizeram no painel.</p>
      </div>
      <Card className="bg-slate-900/60 border-white/10 text-white overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex items-center justify-center">
            <Loader2 className="size-5 animate-spin text-white/60" />
          </div>
        ) : (data?.length ?? 0) === 0 ? (
          <p className="p-6 text-sm text-white/50">Nenhuma ação ainda.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-white/40 uppercase">
              <tr>
                <th className="p-3">Quando</th>
                <th className="p-3">Ação</th>
                <th className="p-3">Alvo</th>
                <th className="p-3">Payload</th>
              </tr>
            </thead>
            <tbody>
              {data!.map((a: any) => (
                <tr key={a.id} className="border-t border-white/5">
                  <td className="p-3 text-xs text-white/60">{formatDateTimeBR(a.created_at)}</td>
                  <td className="p-3 font-mono text-xs">{a.action}</td>
                  <td className="p-3 text-xs text-white/70">
                    {a.target_type ?? "—"} {a.target_id ? `· ${a.target_id.slice(0, 10)}` : ""}
                  </td>
                  <td className="p-3 text-xs text-white/50 max-w-md truncate">
                    {a.payload ? JSON.stringify(a.payload) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
