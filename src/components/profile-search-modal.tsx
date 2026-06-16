import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { searchProfiles, followProfile } from "@/lib/ranking.functions";
import type { SearchProfileResult } from "@/lib/profile-follow.types";
import { Loader2, Search, UserPlus } from "lucide-react";
import { toast } from "sonner";

type ProfileSearchModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  followedIds: Set<string>;
  onFollowSuccess: () => void;
};

export function ProfileSearchModal({
  open,
  onOpenChange,
  followedIds,
  onFollowSuccess,
}: ProfileSearchModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<SearchProfileResult[]>([]);

  const searchProfilesFn = useServerFn(searchProfiles);
  const followProfileFn = useServerFn(followProfile);

  const searchMutation = useMutation({
    mutationFn: async (term: string) => {
      const results = await searchProfilesFn({ data: { searchTerm: term } });
      return results as SearchProfileResult[];
    },
    onSuccess: (data) => setSearchResults(data),
    onError: (e: Error) => toast.error(e.message ?? "Erro na busca"),
  });

  const followMutation = useMutation({
    mutationFn: async (profileId: string) => {
      await followProfileFn({ data: { profileId } });
    },
    onSuccess: () => {
      toast.success("Perfil seguido!");
      onFollowSuccess();
    },
    onError: (e: Error) => toast.error(e.message ?? "Erro ao seguir"),
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      searchMutation.mutate(searchTerm.trim());
    }
  };

  const handleClose = (value: boolean) => {
    if (!value) {
      setSearchTerm("");
      setSearchResults([]);
    }
    onOpenChange(value);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Encontrar perfis</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSearch} className="flex gap-2">
          <Input
            placeholder="Nome, username ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoFocus
          />
          <Button type="submit" disabled={searchMutation.isPending}>
            {searchMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Search className="size-4" />
            )}
          </Button>
        </form>

        {searchResults.length > 0 && (
          <div className="space-y-2 max-h-72 overflow-y-auto mt-2">
            {searchResults.map((profile) => {
              const isFollowing = followedIds.has(profile.id);
              const handle = profile.apelido ?? profile.username ?? "";
              const category = profile.level ?? profile.posicao_principal;

              return (
                <div
                  key={profile.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50 hover:bg-secondary/80 transition-colors"
                >
                  <Avatar className="size-11 ring-2 ring-background">
                    <AvatarImage src={profile.avatar_url ?? undefined} />
                    <AvatarFallback>{profile.display_name[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{profile.display_name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      @{handle.replace(/^@/, "")}
                      {profile.city ? ` · ${profile.city}` : ""}
                    </div>
                    {category && (
                      <Badge variant="outline" className="text-[10px] mt-1">
                        {category}
                      </Badge>
                    )}
                  </div>
                  {isFollowing ? (
                    <Badge variant="secondary" className="text-[10px] shrink-0">
                      Seguindo
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      className="gradient-beach text-white border-0 shrink-0 gap-1"
                      onClick={() => followMutation.mutate(profile.id)}
                      disabled={followMutation.isPending}
                    >
                      {followMutation.isPending ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <UserPlus className="size-3.5" />
                      )}
                      Seguir
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {searchResults.length === 0 &&
          searchTerm &&
          !searchMutation.isPending &&
          searchMutation.isSuccess && (
            <p className="text-center text-sm text-muted-foreground py-4">
              Nenhum perfil encontrado
            </p>
          )}
      </DialogContent>
    </Dialog>
  );
}
