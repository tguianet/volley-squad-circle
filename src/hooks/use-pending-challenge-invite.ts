import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/use-auth";
import {
  fetchPendingChallengeInvite,
  type PendingChallengeInvite,
} from "@/lib/challenge-invite.queries";

const DISMISS_STORAGE_KEY = "playbeach_dismissed_challenge_invites";

function readDismissedIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = sessionStorage.getItem(DISMISS_STORAGE_KEY);
    return new Set(JSON.parse(raw ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

function writeDismissedIds(ids: Set<string>) {
  sessionStorage.setItem(DISMISS_STORAGE_KEY, JSON.stringify([...ids]));
}

export function usePendingChallengeInvite() {
  const { user } = useCurrentUser();
  const qc = useQueryClient();
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => readDismissedIds());
  const [manualOpen, setManualOpen] = useState(true);

  const inviteQ = useQuery({
    queryKey: ["pending-challenge-invite", user?.id],
    queryFn: () => fetchPendingChallengeInvite(user!.id),
    enabled: !!user,
    refetchInterval: 60_000,
  });

  const invite: PendingChallengeInvite | null = inviteQ.data ?? null;

  const isDismissed = invite ? dismissedIds.has(invite.id) : false;

  const shouldShow = !!invite && !isDismissed && manualOpen;

  const dismiss = useCallback(() => {
    if (!invite) return;
    setDismissedIds((prev) => {
      const next = new Set(prev);
      next.add(invite.id);
      writeDismissedIds(next);
      return next;
    });
    setManualOpen(false);
  }, [invite]);

  const refresh = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["pending-challenge-invite"] });
    qc.invalidateQueries({ queryKey: ["my-challenges"] });
    qc.invalidateQueries({ queryKey: ["scheduled-challenges"] });
  }, [qc]);

  useEffect(() => {
    if (invite && !dismissedIds.has(invite.id)) {
      setManualOpen(true);
    }
  }, [invite?.id, dismissedIds, invite]);

  const open = useMemo(() => shouldShow, [shouldShow]);

  return {
    invite,
    open,
    isLoading: inviteQ.isLoading,
    isCaptain: invite?.isCaptain ?? false,
    dismiss,
    refresh,
    setOpen: (value: boolean) => {
      if (!value) dismiss();
      else setManualOpen(true);
    },
  };
}
