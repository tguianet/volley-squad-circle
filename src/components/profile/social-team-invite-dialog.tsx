import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Send, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { untyped } from "@/lib/supabase-untyped";
import { getErrorMessage } from "@/lib/utils";
import { formatFromCategory, type TeamCategory, type TeamGender } from "@/lib/team-format";
import { getSocialTeamOptions, requiredConfirmedPlayers } from "@/lib/social-team";

type CaptainTeam = {
  id: string;
  name: string;
  category: TeamCategory;
  gender: TeamGender;
  confirmed_count: number;
  pending_invitee_ids: string[];
};

type SocialTeamInviteDialogProps = {
  currentUserId: string;
  currentUserGender: string | null;
  invitee: {
    id: string;
    displayName: string;
    gender: string | null;
  };
};

const CREATE_NEW = "create-new";

export function SocialTeamInviteDialog({
  currentUserId,
  currentUserGender,
  invitee,
}: SocialTeamInviteDialogProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [destination, setDestination] = useState(CREATE_NEW);
  const [teamName, setTeamName] = useState("");
  const options = useMemo(
    () => getSocialTeamOptions(currentUserGender, invitee.gender),
    [currentUserGender, invitee.gender],
  );
  const [formatLabel, setFormatLabel] = useState("");
  const selectedOption = options.find((option) => option.label === formatLabel) ?? options[0];

  const teamsQuery = useQuery<CaptainTeam[]>({
    queryKey: ["social-invite-captain-teams", currentUserId],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await untyped().rpc("list_my_incomplete_teams_for_invite");
      if (error) throw error;
      return (data ?? []) as CaptainTeam[];
    },
  });

  const compatibleTeams = (teamsQuery.data ?? []).filter((team) => {
    if (team.pending_invitee_ids.includes(invitee.id)) return false;
    if (
      team.confirmed_count + team.pending_invitee_ids.length >=
      requiredConfirmedPlayers(team.category)
    ) {
      return false;
    }
    return options.some(
      (option) => option.category === team.category && option.gender === team.gender,
    );
  });

  const inviteMutation = useMutation({
    mutationFn: async () => {
      if (destination === CREATE_NEW) {
        if (!selectedOption) throw new Error("Os gêneros dos perfis precisam estar preenchidos");
        if (teamName.trim().length < 2) throw new Error("Informe um nome para a equipe");
        const { error } = await untyped().rpc("create_team_from_social_profile", {
          p_name: teamName.trim(),
          p_category: selectedOption.category,
          p_gender: selectedOption.gender,
          p_invitee_id: invitee.id,
        });
        if (error) throw error;
        return;
      }

      const { error } = await untyped().rpc("invite_profile_to_team", {
        p_team_id: destination,
        p_invitee_id: invitee.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`Convite enviado para ${invitee.displayName}`);
      setOpen(false);
      setDestination(CREATE_NEW);
      setTeamName("");
      queryClient.invalidateQueries({ queryKey: ["social-invite-captain-teams"] });
      queryClient.invalidateQueries({ queryKey: ["my-captain-teams"] });
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error, "Falha ao enviar convite")),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5 shrink-0">
          <Users className="size-4" />
          Convidar para equipe
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Convidar {invitee.displayName}</DialogTitle>
          <DialogDescription>
            Escolha uma equipe incompleta ou comece uma nova. Você será o capitão.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Destino do convite</Label>
            <Select value={destination} onValueChange={setDestination}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={CREATE_NEW}>Criar uma nova equipe</SelectItem>
                {compatibleTeams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name} · {formatFromCategory(team.category, team.gender)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {destination === CREATE_NEW ? (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="social-team-name">Nome da equipe</Label>
                <Input
                  id="social-team-name"
                  value={teamName}
                  onChange={(event) => setTeamName(event.target.value)}
                  placeholder="Ex: Tubarões da Areia"
                  maxLength={60}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Formato</Label>
                <Select
                  value={selectedOption?.label ?? ""}
                  onValueChange={setFormatLabel}
                  disabled={options.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Preencha o gênero dos dois perfis" />
                  </SelectTrigger>
                  <SelectContent>
                    {options.map((option) => (
                      <SelectItem key={option.label} value={option.label}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          ) : null}

          <p className="text-xs text-muted-foreground">
            A equipe só será liberada para desafios quando todos os 2 ou 4 jogadores aceitarem.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => inviteMutation.mutate()}
            disabled={inviteMutation.isPending || teamsQuery.isLoading || !selectedOption}
          >
            {inviteMutation.isPending ? (
              <Loader2 className="size-4 mr-1 animate-spin" />
            ) : (
              <Send className="size-4 mr-1" />
            )}
            Enviar convite
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
