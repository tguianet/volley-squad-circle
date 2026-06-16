import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Megaphone } from "lucide-react";

const variantStyles: Record<string, string> = {
  info: "bg-blue-500/10 border-blue-300/40 text-blue-900 dark:text-blue-100",
  success: "bg-emerald-500/10 border-emerald-300/40 text-emerald-900 dark:text-emerald-100",
  warning: "bg-amber-500/10 border-amber-300/40 text-amber-900 dark:text-amber-100",
  promo: "bg-fuchsia-500/10 border-fuchsia-300/40 text-fuchsia-900 dark:text-fuchsia-100",
};

export function ActiveBanner() {
  const { data } = useQuery({
    queryKey: ["public-banners"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("banners")
        .select("id, title, body, link_url, variant")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(3);
      if (error) return [];
      return data ?? [];
    },
  });

  if (!data?.length) return null;
  return (
    <div className="space-y-2">
      {data.map((b) => {
        const inner = (
          <div
            className={`flex items-start gap-3 rounded-xl border p-3 ${variantStyles[b.variant] ?? variantStyles.info}`}
          >
            <Megaphone className="size-4 mt-0.5 shrink-0" />
            <div className="text-sm">
              <div className="font-semibold">{b.title}</div>
              {b.body && <div className="opacity-80">{b.body}</div>}
            </div>
          </div>
        );
        return b.link_url ? (
          <a key={b.id} href={b.link_url} target="_blank" rel="noreferrer">
            {inner}
          </a>
        ) : (
          <div key={b.id}>{inner}</div>
        );
      })}
    </div>
  );
}
