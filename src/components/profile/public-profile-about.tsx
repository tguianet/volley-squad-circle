import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import {
  MapPin,
  Ruler,
  Hand,
  Instagram,
  Trophy,
  Target,
  Phone,
  Info,
} from "lucide-react";

type AboutRowProps = {
  icon: typeof MapPin;
  label: string;
  children: ReactNode;
};

function AboutRow({ icon: Icon, label, children }: AboutRowProps) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-border/50 last:border-0">
      <Icon className="size-4 text-primary mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="text-sm font-medium mt-0.5">{children}</div>
      </div>
    </div>
  );
}

export type PublicProfileAboutData = {
  bio: string | null;
  city: string | null;
  state: string | null;
  altura: number | null;
  mao_dominante: string | null;
  posicao_principal: string | null;
  level: string | null;
  instagram: string | null;
  whatsapp: string | null;
};

type PublicProfileAboutProps = {
  profile: PublicProfileAboutData;
  compact?: boolean;
};

export function PublicProfileAbout({ profile, compact }: PublicProfileAboutProps) {
  const hasContent =
    profile.city ||
    profile.altura ||
    profile.mao_dominante ||
    profile.posicao_principal ||
    profile.level ||
    profile.instagram ||
    profile.whatsapp ||
    profile.bio;

  if (!hasContent) {
    return (
      <Card className={compact ? "p-4 shadow-card" : "p-5 shadow-card"}>
        <p className="text-sm text-muted-foreground text-center py-6">Nenhuma informação disponível.</p>
      </Card>
    );
  }

  return (
    <Card className={compact ? "p-4 shadow-card border-border/60" : "p-5 shadow-card border-border/60"}>
      {!compact ? (
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border/50">
          <Info className="size-5 text-primary" />
          <h2 className="font-display text-xl tracking-wide">Sobre</h2>
        </div>
      ) : (
        <h2 className="font-display text-lg tracking-wide mb-3 pb-2 border-b border-border/50">
          Informações
        </h2>
      )}

      {profile.bio && compact ? null : profile.bio ? (
        <p className="text-sm text-muted-foreground leading-relaxed mb-4 pb-4 border-b border-border/50">
          {profile.bio}
        </p>
      ) : null}

      <div className="divide-y divide-border/50">
        {profile.city ? (
          <AboutRow icon={MapPin} label="Cidade">
            {profile.city}
            {profile.state ? `, ${profile.state}` : ""}
          </AboutRow>
        ) : null}
        {profile.altura ? (
          <AboutRow icon={Ruler} label="Altura">
            {profile.altura} m
          </AboutRow>
        ) : null}
        {profile.mao_dominante ? (
          <AboutRow icon={Hand} label="Mão dominante">
            {profile.mao_dominante}
          </AboutRow>
        ) : null}
        {profile.posicao_principal ? (
          <AboutRow icon={Target} label="Posição">
            {profile.posicao_principal}
          </AboutRow>
        ) : null}
        {profile.level ? (
          <AboutRow icon={Trophy} label="Nível">
            {profile.level}
          </AboutRow>
        ) : null}
        {profile.instagram ? (
          <AboutRow icon={Instagram} label="Instagram">
            <a
              href={`https://instagram.com/${profile.instagram.replace("@", "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              @{profile.instagram.replace("@", "")}
            </a>
          </AboutRow>
        ) : null}
        {profile.whatsapp ? (
          <AboutRow icon={Phone} label="WhatsApp">
            <a
              href={`https://wa.me/${profile.whatsapp.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              {profile.whatsapp}
            </a>
          </AboutRow>
        ) : null}
      </div>
    </Card>
  );
}
