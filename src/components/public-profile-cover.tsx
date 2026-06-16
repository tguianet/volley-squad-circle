import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Waves } from "lucide-react";

function useBannerUrl(pathOrUrl: string | null | undefined) {
  return useQuery({
    queryKey: ["banner-signed-url", pathOrUrl ?? ""],
    enabled: !!pathOrUrl && !/^https?:\/\//i.test(pathOrUrl),
    staleTime: 1000 * 60 * 30,
    queryFn: async () => {
      if (!pathOrUrl) return null;
      const { data, error } = await supabase.storage
        .from("banners")
        .createSignedUrl(pathOrUrl, 3600);
      if (error) return null;
      return data?.signedUrl ?? null;
    },
  });
}

function resolveBannerSrc(
  bannerUrl: string | null | undefined,
  signedUrl: string | null | undefined,
): string | null {
  if (!bannerUrl) return null;
  if (/^https?:\/\//i.test(bannerUrl)) return bannerUrl;
  return signedUrl ?? null;
}

type PublicProfileCoverProps = {
  bannerUrl: string | null | undefined;
  className?: string;
};

export function PublicProfileCover({ bannerUrl, className }: PublicProfileCoverProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const { data: signedUrl, isLoading } = useBannerUrl(bannerUrl);
  const src = resolveBannerSrc(bannerUrl, signedUrl);
  const showImage = !!src && !imageFailed && !isLoading;

  return (
    <div className={cn("relative h-44 sm:h-52 md:h-56 w-full overflow-hidden", className)}>
      <div
        className="absolute inset-0 bg-gradient-to-br from-primary/35 via-accent/25 to-secondary/50"
        aria-hidden
      />
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.35)_0%,_transparent_55%)]"
        aria-hidden
      />
      <div className="absolute bottom-3 right-4 opacity-20 pointer-events-none" aria-hidden>
        <Waves className="size-16 text-primary" />
      </div>

      {showImage ? (
        <img
          src={src}
          alt=""
          className="absolute inset-0 size-full object-cover"
          onError={() => setImageFailed(true)}
        />
      ) : null}

      {isLoading && bannerUrl ? (
        <div className="absolute inset-0 animate-pulse bg-primary/10" aria-hidden />
      ) : null}
    </div>
  );
}
