import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { ImageIcon } from "lucide-react";

type SignedGalleryImageProps = {
  path: string | null | undefined;
  className?: string;
  alt?: string;
};

export function SignedGalleryImage({ path, className, alt = "" }: SignedGalleryImageProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["gallery-signed", path ?? ""],
    enabled: !!path,
    queryFn: async () => {
      const { data: signed, error } = await supabase.storage
        .from("gallery")
        .createSignedUrl(path!, 60 * 60);
      if (error) throw error;
      return signed.signedUrl;
    },
    staleTime: 50 * 60 * 1000,
    retry: false,
  });

  if (!path) return null;

  if (isLoading) {
    return <div className={cn("animate-pulse bg-secondary/80", className)} aria-hidden />;
  }

  if (isError || !data) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-secondary/60 text-muted-foreground",
          className,
        )}
      >
        <ImageIcon className="size-8 opacity-40" />
      </div>
    );
  }

  return (
    <img
      src={data}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={className}
      onError={(e) => {
        e.currentTarget.style.display = "none";
      }}
    />
  );
}
