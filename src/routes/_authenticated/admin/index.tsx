import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  adminConfirmChallengeScore,
  adminCorrectChallengeScore,
  adminRejectChallengeScore,
  getAdminStats,
  listPendingAdminScoreReviews,
} from "@/lib/admin.functions";
import { formatDateTimeBR } from "@/lib/date-format";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useIsAdmin } from "@/hooks/use-auth";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  Users,
  BadgeCheck,
  ShieldAlert,
  Megaphone,
  Bell,
  UserX,
  Loader2,
  type LucideIcon,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminDashboard,
});

function Kpi({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: number | string;
  icon: LucideIcon;
  accent?: string;
}) {
  return (
    <Card className="bg-slate-900/60 border-white/10 text-white p-5">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-widest text-white/50">{label}</div>
        <Icon className={`size-5 ${accent ?? "text-white/60"}`} />
      </div>
      <div className="text-3xl font-display mt-2">{value}</div>
    </Card>
  );
}

function AdminDashboard() {
  const isAdmin = useIsAdmin();
  const qc = useQueryClient();
  const fn = useServerFn(getAdminStats);
  const listScoreReviews = useServerFn(listPendingAdminScoreReviews);
  const confirmScore = useServerFn(adminConfirmChallengeScore);
  const rejectScore = useServerFn(adminRejectChallengeScore);
  const correctScore = useServerFn(adminCorrectChallengeScore);
  const [corrections, setCorrections] = useState<
    Record<string, { challenger: string; challenged: string }>
  >({});
  const { data, isLoading } = useQuery({ queryKey: ["admin-stats"], queryFn: () => fn() });
  const scoreReviews = useQuery({
    queryKey: ["admin-score-reviews"],
    queryFn: () => listScoreReviews(),
    enabled: isAdmin,
  });
  const confirmScoreM = useMutation({
    mutationFn: confirmScore,
    onSuccess: () => {
      toast.success("Placar confirmado pelo ADM.");
      qc.invalidateQueries({ queryKey: ["admin-score-reviews"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const rejectScoreM = useMutation({
    mutationFn: rejectScore,
    onSuccess: () => {
      toast.success("Placar rejeitado pelo ADM e devolvido aos capitães.");
      qc.invalidateQueries({ queryKey: ["admin-score-reviews"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const correctScoreM = useMutation({
    mutationFn: correctScore,
    onSuccess: () => {
      toast.success("Placar corrigido e confirmado pelo ADM.");
      qc.invalidateQueries({ queryKey: ["admin-score-reviews"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="size-6 animate-spin text-white/60" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display">Dashboard</h1>
        <p className="text-sm text-white/60">Visão geral do BeachPlay Arena</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Kpi label="Jogadores" value={data.totals.players} icon={Users} accent="text-primary" />
        <Kpi
          label="Verificados"
          value={data.totals.verified}
          icon={BadgeCheck}
          accent="text-blue-400"
        />
        <Kpi label="Suspensos" value={data.totals.suspended} icon={UserX} accent="text-red-400" />
        <Kpi
          label="Banners ativos"
          value={data.totals.activeBanners}
          icon={Megaphone}
          accent="text-amber-400"
        />
        <Kpi
          label="Denúncias"
          value={data.totals.pendingReports}
          icon={ShieldAlert}
          accent="text-orange-400"
        />
        <Kpi
          label="Notificações"
          value={data.totals.notifications}
          icon={Bell}
          accent="text-emerald-400"
        />
      </div>

      {isAdmin && (
        <Card className="bg-slate-900/60 border-white/10 text-white p-5">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <div className="font-display text-lg">Placares aguardando ADM</div>
              <p className="text-xs text-white/50">
                Confirme somente depois de conferir o resultado.
              </p>
            </div>
            <span className="text-sm font-bold text-amber-400">
              {scoreReviews.data?.length ?? 0}
            </span>
          </div>
          {scoreReviews.isLoading ? (
            <Loader2 className="size-5 animate-spin text-white/60" />
          ) : scoreReviews.data?.length ? (
            <div className="space-y-3">
              {scoreReviews.data.map((review) => (
                <div
                  key={review.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-white/10 p-3"
                >
                  <div>
                    <p className="text-sm font-semibold">
                      {review.challenger?.name ?? "Desafiante"} {review.score_challenger} ×{" "}
                      {review.score_challenged} {review.challenged?.name ?? "Desafiado"}
                    </p>
                    <p className="text-xs text-white/50">Um capitão pediu a análise do ADM.</p>
                    <p className="text-xs text-white/50">
                      {review.arena?.name ?? "Arena"} · {review.court?.name ?? "Quadra"} ·{" "}
                      {review.scheduled_date} {review.scheduled_time.slice(0, 5)}
                    </p>
                    <p className="text-xs text-white/50">
                      Capitães: {review.challenger?.captain?.display_name ?? "—"} e{" "}
                      {review.challenged?.captain?.display_name ?? "—"}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 sm:min-w-64">
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="number"
                        min={0}
                        placeholder={String(review.score_challenger)}
                        value={corrections[review.id]?.challenger ?? ""}
                        onChange={(event) =>
                          setCorrections((current) => ({
                            ...current,
                            [review.id]: {
                              challenger: event.target.value,
                              challenged: current[review.id]?.challenged ?? "",
                            },
                          }))
                        }
                      />
                      <Input
                        type="number"
                        min={0}
                        placeholder={String(review.score_challenged)}
                        value={corrections[review.id]?.challenged ?? ""}
                        onChange={(event) =>
                          setCorrections((current) => ({
                            ...current,
                            [review.id]: {
                              challenger: current[review.id]?.challenger ?? "",
                              challenged: event.target.value,
                            },
                          }))
                        }
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        disabled={confirmScoreM.isPending || rejectScoreM.isPending}
                        onClick={() => confirmScoreM.mutate({ data: { challengeId: review.id } })}
                      >
                        Confirmar placar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={confirmScoreM.isPending || rejectScoreM.isPending}
                        onClick={() => rejectScoreM.mutate({ data: { challengeId: review.id } })}
                      >
                        Rejeitar
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={
                          !corrections[review.id]?.challenger ||
                          !corrections[review.id]?.challenged ||
                          correctScoreM.isPending
                        }
                        onClick={() =>
                          correctScoreM.mutate({
                            data: {
                              challengeId: review.id,
                              scoreChallenger: Number(corrections[review.id].challenger),
                              scoreChallenged: Number(corrections[review.id].challenged),
                            },
                          })
                        }
                      >
                        Corrigir
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-white/50">Nenhum placar aguardando análise.</p>
          )}
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="bg-slate-900/60 border-white/10 text-white p-5">
          <div className="font-display text-lg mb-3">Novos cadastros (30 dias)</div>
          <div className="h-64">
            <ResponsiveContainer>
              <LineChart data={data.signupsLast30}>
                <CartesianGrid stroke="#ffffff14" strokeDasharray="3 3" />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 10, fill: "#ffffff80" }}
                  tickFormatter={(d) => d.slice(5)}
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#ffffff80" }} />
                <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #ffffff20" }} />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#fbbf24"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="bg-slate-900/60 border-white/10 text-white p-5">
          <div className="font-display text-lg mb-3">Jogadores por cidade</div>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={data.cityBreakdown}>
                <CartesianGrid stroke="#ffffff14" strokeDasharray="3 3" />
                <XAxis dataKey="city" tick={{ fontSize: 10, fill: "#ffffff80" }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#ffffff80" }} />
                <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #ffffff20" }} />
                <Bar dataKey="count" fill="#22d3ee" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="bg-slate-900/60 border-white/10 text-white p-5">
        <div className="font-display text-lg mb-3">Últimas ações no painel</div>
        {data.recentAudit.length === 0 ? (
          <p className="text-sm text-white/50">Nenhuma ação registrada ainda.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {data.recentAudit.map((a) => (
              <li key={a.id} className="flex justify-between border-b border-white/5 pb-2">
                <span className="font-mono text-xs text-white/70">{a.id.slice(0, 8)}</span>
                <span className="text-xs text-white/50">{formatDateTimeBR(a.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
