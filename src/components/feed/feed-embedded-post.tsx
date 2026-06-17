import { Link } from "@tanstack/react-router";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAvatarUrl } from "@/components/avatar-thumb";
import { authorDisplayName, authorHandle } from "@/lib/feed.queries";
import { profileRoute } from "@/lib/profile-follow.utils";
import { formatRelativeTimeBR } from "@/lib/date-format";
import type { FeedPost } from "@/lib/feed.types";
import { SignedGalleryImage } from "@/components/feed/signed-gallery-image";

type FeedEmbeddedPostProps = {
  post: FeedPost;
};

export function FeedEmbeddedPost({ post }: FeedEmbeddedPostProps) {
  const name = authorDisplayName(post.author);
  const handle = authorHandle(post.author);
  const { data: avatarUrl } = useAvatarUrl(post.author?.avatar_url);
  const profileLink = post.author
    ? profileRoute({
        username: post.author.username,
        apelido: post.author.apelido,
      })
    : { to: "/perfil" as const };

  return (
    <div className="rounded-xl border border-border/70 bg-secondary/30 overflow-hidden">
      <div className="p-3 space-y-2.5">
        <div className="flex items-center gap-2.5">
          <Link {...profileLink} className="shrink-0">
            <Avatar className="size-8 ring-1 ring-border/60">
              {avatarUrl ? <AvatarImage src={avatarUrl} alt={name} /> : null}
              <AvatarFallback className="text-[10px]">{name.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
          </Link>
          <div className="min-w-0 flex-1">
            <Link {...profileLink} className="text-xs font-semibold hover:underline truncate block">
              {name}
            </Link>
            {handle ? (
              <Link
                {...profileLink}
                className="text-[10px] text-muted-foreground hover:underline truncate block"
              >
                @{handle}
              </Link>
            ) : null}
          </div>
          <span className="text-[10px] text-muted-foreground shrink-0">
            {formatRelativeTimeBR(post.created_at)}
          </span>
        </div>

        {post.description ? (
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
            {post.description}
          </p>
        ) : null}
      </div>

      {post.image_url ? (
        <SignedGalleryImage
          path={post.image_url}
          className="w-full max-h-80 object-cover bg-secondary"
        />
      ) : null}
    </div>
  );
}
