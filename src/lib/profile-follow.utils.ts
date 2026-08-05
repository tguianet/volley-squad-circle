import type { FollowedProfile } from "@/lib/profile-follow.types";

export const FOLLOWED_PROFILES_PREVIEW_LIMIT = 6;

export function profileHandle(
  profile: Pick<FollowedProfile, "apelido" | "username" | "display_name">,
) {
  return profile.apelido ?? profile.username ?? profile.display_name;
}

export function profileRoute(
  profile: Pick<FollowedProfile, "username" | "apelido"> & {
    id?: string | null;
    profile_id?: string | null;
  },
): { to: "/perfil/$username"; params: { username: string } } | { to: "/perfil" } {
  const handle = profile.username ?? profile.apelido ?? profile.profile_id ?? profile.id;
  return handle
    ? { to: "/perfil/$username", params: { username: handle.replace(/^@/, "") } }
    : { to: "/perfil" };
}

export function formatMutualConnections(count: number | null | undefined): string | null {
  if (count == null || count <= 0) return null;
  return count === 1 ? "1 conexão em comum" : `${count} conexões em comum`;
}
