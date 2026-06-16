import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { listPublicProfileGallery } from "@/lib/ranking.functions";
import type { PublicProfileGalleryPhoto } from "@/lib/profile-follow.types";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { ImageIcon, Loader2 } from "lucide-react";

function GalleryThumb({
  path,
  className,
  onClick,
}: {
  path: string;
  className?: string;
  onClick?: () => void;
}) {
  const { data: url, isLoading } = useQuery({
    queryKey: ["gallery-signed", path],
    queryFn: async () => {
      const { data, error } = await supabase.storage.from("gallery").createSignedUrl(path, 3600);
      if (error) return null;
      return data?.signedUrl ?? null;
    },
    staleTime: 50 * 60 * 1000,
  });

  if (isLoading) {
    return <div className={cn("bg-secondary animate-pulse", className)} />;
  }

  if (!url) {
    return (
      <div className={cn("bg-secondary/80 flex items-center justify-center", className)}>
        <ImageIcon className="size-6 text-muted-foreground/50" />
      </div>
    );
  }

  return (
    <button type="button" onClick={onClick} className={cn("overflow-hidden group", className)}>
      <img
        src={url}
        alt=""
        className="size-full object-cover transition group-hover:scale-105"
        onError={(e) => {
          e.currentTarget.style.display = "none";
        }}
      />
    </button>
  );
}

type PublicProfileGalleryProps = {
  profileId: string;
};

export function PublicProfileGallery({ profileId }: PublicProfileGalleryProps) {
  const fetchGallery = useServerFn(listPublicProfileGallery);
  const [viewer, setViewer] = useState<PublicProfileGalleryPhoto | null>(null);

  const { data: photos = [], isLoading } = useQuery({
    queryKey: ["public-profile-gallery", profileId],
    queryFn: async () => {
      const rows = await fetchGallery({ data: { profileId, limit: 9 } });
      return rows as PublicProfileGalleryPhoto[];
    },
  });

  const { data: viewerUrl } = useQuery({
    queryKey: ["gallery-viewer", viewer?.image_url ?? ""],
    enabled: !!viewer?.image_url,
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from("gallery")
        .createSignedUrl(viewer!.image_url, 3600);
      if (error) return null;
      return data?.signedUrl ?? null;
    },
  });

  return (
    <>
      <Card className="p-5 shadow-card">
        <div className="flex items-center gap-2 mb-4">
          <ImageIcon className="size-5 text-primary" />
          <h2 className="font-semibold text-base">Galeria</h2>
          {photos.length > 0 ? (
            <span className="text-xs text-muted-foreground ml-auto">{photos.length} fotos</span>
          ) : null}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : photos.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 rounded-xl bg-secondary/30 border border-dashed border-border/70 text-center">
            <ImageIcon className="size-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Nenhuma foto publicada ainda.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {photos.map((photo) => (
              <GalleryThumb
                key={photo.id}
                path={photo.image_url}
                className="aspect-square rounded-lg w-full"
                onClick={() => setViewer(photo)}
              />
            ))}
          </div>
        )}
      </Card>

      <Dialog open={!!viewer} onOpenChange={(open) => !open && setViewer(null)}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden">
          {viewer && viewerUrl ? (
            <div className="space-y-0">
              <img
                src={viewerUrl}
                alt=""
                className="w-full max-h-[70vh] object-contain bg-secondary/30"
              />
              {viewer.description ? (
                <p className="p-4 text-sm text-muted-foreground border-t">{viewer.description}</p>
              ) : null}
            </div>
          ) : viewer ? (
            <div className="flex justify-center py-16">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
