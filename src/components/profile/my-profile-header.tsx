import { useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ProfileBanner, type ProfileBannerHandle } from "@/components/profile-banner";
import { ProfileAvatar, type ProfileAvatarHandle } from "@/components/profile-avatar";
import { ProfileStatsBar } from "@/components/profile/profile-stats-bar";
import {
  MyProfileEditDialog,
  type MyProfileFormData,
} from "@/components/profile/my-profile-edit-dialog";
import { Camera, ImageIcon, Pencil, Settings, Trash2 } from "lucide-react";
import { toast } from "sonner";

type MyProfileHeaderProps = {
  profile: MyProfileFormData;
  displayName: string;
  username: string;
  fallbackInitial: string;
  pontos: number;
  vitorias: number;
  derrotas: number;
};

export function MyProfileHeader({
  profile,
  displayName,
  username,
  fallbackInitial,
  pontos,
  vitorias,
  derrotas,
}: MyProfileHeaderProps) {
  const avatarRef = useRef<ProfileAvatarHandle>(null);
  const bannerRef = useRef<ProfileBannerHandle>(null);
  const [editOpen, setEditOpen] = useState(false);

  return (
    <Card className="overflow-hidden shadow-card border-border/60 p-0 gap-0">
      <div className="relative">
        <ProfileBanner ref={bannerRef} compact showActionButtons={false} />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              size="icon"
              variant="secondary"
              className="absolute top-3 right-3 z-20 size-10 rounded-full bg-card/95 backdrop-blur-md border border-border/50 shadow-md hover:bg-card"
              aria-label="Opções do perfil"
            >
              <Settings className="size-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={() => avatarRef.current?.pickPhoto()}>
              <Camera className="size-4 mr-2" />
              Alterar foto de perfil
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => bannerRef.current?.pickBanner()}>
              <ImageIcon className="size-4 mr-2" />
              Alterar capa
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setEditOpen(true)}>
              <Pencil className="size-4 mr-2" />
              Editar perfil
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => {
                if (!avatarRef.current?.hasPhoto) {
                  toast.message("Não há foto para remover");
                  return;
                }
                avatarRef.current.removePhoto();
              }}
            >
              <Trash2 className="size-4 mr-2" />
              Remover foto
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => {
                if (!bannerRef.current?.hasBanner) {
                  toast.message("Não há capa para remover");
                  return;
                }
                bannerRef.current.removeBanner();
              }}
            >
              <Trash2 className="size-4 mr-2" />
              Remover capa
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div
          className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-card via-card/80 to-transparent pointer-events-none"
          aria-hidden
        />
      </div>

      <div className="px-4 sm:px-6 pb-5 sm:pb-6 -mt-2 relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-5">
          <div className="relative shrink-0 -mt-14 sm:-mt-16">
            <ProfileAvatar
              ref={avatarRef}
              fallback={fallbackInitial}
              className="size-28 sm:size-32 ring-[5px] ring-card shadow-card"
              editable
              showActionButtons={false}
            />
          </div>

          <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="page-title text-3xl sm:text-4xl leading-none truncate">
                  {displayName}
                </h1>
                {profile.level ? (
                  <Badge className="gradient-beach text-white border-0 text-[10px] uppercase tracking-wider">
                    {profile.level}
                  </Badge>
                ) : null}
              </div>
              <p className="text-sm font-medium text-muted-foreground">
                @{username.replace(/^@/, "")}
              </p>
              {profile.posicao_principal ? (
                <p className="text-xs font-semibold text-primary uppercase tracking-wider">
                  {profile.posicao_principal}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <ProfileStatsBar pontos={pontos} vitorias={vitorias} derrotas={derrotas} className="mt-5" />

        {profile.bio ? (
          <p className="text-sm text-foreground/80 mt-4 leading-relaxed rounded-xl bg-secondary/40 border border-border/40 px-4 py-3">
            {profile.bio}
          </p>
        ) : null}
      </div>

      <MyProfileEditDialog
        profile={profile}
        displayName={displayName}
        fallbackInitial={fallbackInitial}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </Card>
  );
}
