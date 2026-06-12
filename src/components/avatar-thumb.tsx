import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

/**
 * Resolves an avatar path stored in the private `avatars` bucket into a
 * signed URL. Accepts already-public absolute URLs as-is.
 */
export function useAvatarUrl(pathOrUrl: string | null | undefined) {
  return useQuery({
    queryKey: ["avatar-signed-url", pathOrUrl ?? ""],
    enabled: !!pathOrUrl,
    staleTime: 1000 * 60 * 30,
    queryFn: async () => {
      if (!pathOrUrl) return null;
      if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
      const { data } = await supabase.storage.from("avatars").createSignedUrl(pathOrUrl, 3600);
      return data?.signedUrl ?? null;
    },
  });
}

type Props = {
  src?: string | null;
  name?: string | null;
  className?: string;
};

export function AvatarThumb({ src, name, className }: Props) {
  const { data: url } = useAvatarUrl(src);
  const initial = (name ?? "?").trim().charAt(0).toUpperCase() || "?";
  return (
    <Avatar className={cn("size-8", className)}>
      {url ? <AvatarImage src={url} alt={name ?? ""} /> : null}
      <AvatarFallback>{initial}</AvatarFallback>
    </Avatar>
  );
}
