import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/partidas/")({
  beforeLoad: () => {
    throw redirect({ to: "/partidas/nova" });
  },
});
