import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AdminLayout } from "@/components/admin-layout";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — BeachPlay Arena" }] }),
  component: () => (
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  ),
});
