import type { ReactNode } from "react";
import { ChallengeInviteModal } from "@/components/challenges/challenge-invite-modal";
import { usePendingChallengeInvite } from "@/hooks/use-pending-challenge-invite";

export function ChallengeInviteHost({ children }: { children: ReactNode }) {
  const { invite, open, isCaptain, dismiss, refresh, setOpen } = usePendingChallengeInvite();

  return (
    <>
      {children}
      <ChallengeInviteModal
        invite={invite}
        open={open}
        isCaptain={isCaptain}
        onOpenChange={setOpen}
        onDismiss={dismiss}
        onResponded={refresh}
      />
    </>
  );
}
