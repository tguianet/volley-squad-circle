import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { Card } from "@/components/ui/card";
import { notifications } from "@/lib/mock-data";
import { Trophy, Users, Heart, Calendar, MessageCircle, Bell } from "lucide-react";

export const Route = createFileRoute("/notificacoes")({
  head: () => ({ meta: [{ title: "Notificações — BeachPlay Arena" }] }),
  component: NotifPage,
});

const iconMap: Record<string, any> = { trophy: Trophy, users: Users, heart: Heart, calendar: Calendar, message: MessageCircle };

function NotifPage() {
  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center gap-2 mb-1">
          <Bell className="size-6 text-primary"/>
          <h1 className="text-3xl">Notificações</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-6">Tudo que rolou na sua areia.</p>
        <Card className="shadow-card divide-y">
          {notifications.map(n => {
            const Icon = iconMap[n.icon] ?? Bell;
            return (
              <div key={n.id} className="p-4 flex items-center gap-3 hover:bg-secondary/50">
                <div className="size-10 rounded-full gradient-beach text-white flex items-center justify-center shrink-0">
                  <Icon className="size-4"/>
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">{n.title}</div>
                  <div className="text-xs text-muted-foreground">{n.time}</div>
                </div>
              </div>
            );
          })}
        </Card>
      </div>
    </AppLayout>
  );
}
