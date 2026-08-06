import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listUsers, setUserFlag, setUserRole } from "@/lib/admin.functions";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { BadgeCheck, Loader2, Search, ShieldCheck, ShieldX, UserCheck, UserX } from "lucide-react";
import { toast } from "sonner";
import { useCurrentUser, useIsAdmin } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/admin/usuarios")({
  component: UsersPage,
});

function UsersPage() {
  const isFullAdmin = useIsAdmin();
  const { user: currentUser } = useCurrentUser();
  const [search, setSearch] = useState("");
  const fn = useServerFn(listUsers);
  const qc = useQueryClient();
  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users", search],
    queryFn: () => fn({ data: { search: search || undefined } }),
  });

  const setRoleFn = useServerFn(setUserRole);
  const setFlagFn = useServerFn(setUserFlag);
  const roleMut = useMutation({
    mutationFn: setRoleFn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Permissões atualizadas");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const flagMut = useMutation({
    mutationFn: setFlagFn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Atualizado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-display">Usuários</h1>
          <p className="text-sm text-white/60">Gerencie jogadores, moderadores e admins.</p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="size-4 absolute left-3 top-3 text-white/40" />
          <Input
            placeholder="Buscar por nome, usuário, cidade…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-slate-900/60 border-white/10 text-white"
          />
        </div>
      </div>

      <Card className="bg-slate-900/60 border-white/10 text-white overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex items-center justify-center">
            <Loader2 className="size-5 animate-spin text-white/60" />
          </div>
        ) : (users?.length ?? 0) === 0 ? (
          <p className="p-6 text-sm text-white/50">Nenhum usuário ainda.</p>
        ) : (
          <ul className="divide-y divide-white/5">
            {users!.map((u) => {
              const isAdmin = u.roles.includes("admin");
              const isMod = u.roles.includes("moderator");
              const isStaff = isAdmin || isMod;
              const canChangeFlags = isFullAdmin || (!isStaff && u.id !== currentUser?.id);
              return (
                <li key={u.id} className="p-4 flex flex-wrap items-center gap-3">
                  <Avatar className="size-10">
                    <AvatarImage src={u.avatar_url ?? undefined} />
                    <AvatarFallback className="bg-white/10 text-white">
                      {(u.display_name || "?").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-[160px]">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold">{u.display_name || "(sem nome)"}</span>
                      {u.is_verified && <BadgeCheck className="size-4 text-blue-400" />}
                    </div>
                    <div className="text-xs text-white/50">
                      @{u.username} · {u.city ?? "—"} · {u.level}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {isAdmin && <Badge className="bg-amber-500 text-black">admin</Badge>}
                    {isMod && <Badge className="bg-blue-500">moderator</Badge>}
                    {u.is_suspended && <Badge variant="destructive">suspenso</Badge>}
                  </div>
                  <div className="flex flex-wrap gap-2 ml-auto">
                    {isFullAdmin && (
                      <Button
                        size="sm"
                        variant={isAdmin ? "secondary" : "outline"}
                        onClick={() =>
                          roleMut.mutate({ data: { userId: u.id, role: "admin", grant: !isAdmin } })
                        }
                      >
                        <ShieldCheck className="size-3.5 mr-1" />
                        {isAdmin ? "Remover admin" : "Tornar admin"}
                      </Button>
                    )}
                    {isFullAdmin && (
                      <Button
                        size="sm"
                        variant={isMod ? "secondary" : "outline"}
                        onClick={() =>
                          roleMut.mutate({
                            data: { userId: u.id, role: "moderator", grant: !isMod },
                          })
                        }
                      >
                        <ShieldX className="size-3.5 mr-1" />
                        {isMod ? "Remover mod" : "Tornar mod"}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        flagMut.mutate({
                          data: { userId: u.id, field: "is_verified", value: !u.is_verified },
                        })
                      }
                      disabled={!canChangeFlags}
                    >
                      <BadgeCheck className="size-3.5 mr-1" />
                      {u.is_verified ? "Tirar selo" : "Verificar"}
                    </Button>
                    <Button
                      size="sm"
                      variant={u.is_suspended ? "secondary" : "destructive"}
                      onClick={() =>
                        flagMut.mutate({
                          data: { userId: u.id, field: "is_suspended", value: !u.is_suspended },
                        })
                      }
                      disabled={!canChangeFlags}
                    >
                      {u.is_suspended ? (
                        <UserCheck className="size-3.5 mr-1" />
                      ) : (
                        <UserX className="size-3.5 mr-1" />
                      )}
                      {u.is_suspended ? "Reativar" : "Suspender"}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
