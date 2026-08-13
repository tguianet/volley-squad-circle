import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalPage, LegalSection } from "@/components/legal-page";

export const Route = createFileRoute("/termos")({
  head: () => ({
    meta: [
      { title: "Termos de Uso — PlayBeach" },
      { name: "description", content: "Termos de uso da plataforma PlayBeach." },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <LegalPage
      title="Termos de Uso"
      description="Regras para utilização responsável da comunidade esportiva PlayBeach."
    >
      <LegalSection title="1. Aceitação">
        <p>
          Ao criar uma conta ou utilizar o PlayBeach, você declara que leu e aceita estes termos e a{" "}
          <Link to="/privacidade" className="font-semibold text-primary underline">
            Política de Privacidade
          </Link>
          . Caso não concorde, não utilize a plataforma.
        </p>
      </LegalSection>

      <LegalSection title="2. Finalidade da plataforma">
        <p>
          O PlayBeach organiza a comunidade de vôlei de areia, incluindo perfis, equipes, ranking,
          desafios, partidas, quadras, torneios, publicações e notificações. A plataforma não
          substitui a organização presencial, a arbitragem nem as regras de segurança das arenas.
        </p>
      </LegalSection>

      <LegalSection title="3. Conta e segurança">
        <ul className="list-disc space-y-1 pl-5">
          <li>Forneça dados corretos e mantenha seu acesso protegido.</li>
          <li>Não compartilhe sua conta nem se passe por outra pessoa.</li>
          <li>Comunique à administração qualquer uso indevido identificado.</li>
          <li>Contas suspensas não podem contornar a restrição criando novos acessos.</li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Conduta na comunidade">
        <p>
          Não é permitido publicar conteúdo ilegal, discriminatório, ameaçador, fraudulento,
          invasivo ou que viole direitos de terceiros. Também são proibidas manipulação de
          resultados, automação abusiva, exploração de falhas e tentativa de acesso não autorizado.
        </p>
      </LegalSection>

      <LegalSection title="5. Partidas, desafios e ranking">
        <p>
          Capitães e jogadores são responsáveis pela veracidade de convites, disponibilidade,
          presença e placares. Resultados confirmados podem alterar automaticamente o ranking. A
          administração poderá revisar evidências, corrigir erros e aplicar as regras publicadas na
          página de{" "}
          <Link to="/regras" className="font-semibold text-primary underline">
            Regras do Ranking
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection title="6. Conteúdo publicado">
        <p>
          Você permanece responsável pelas fotos, vídeos, textos e demais materiais que publicar e
          declara possuir autorização para utilizá-los. Ao publicar, permite que o PlayBeach exiba o
          conteúdo dentro das funcionalidades da plataforma enquanto ele permanecer disponível.
        </p>
      </LegalSection>

      <LegalSection title="7. Disponibilidade e alterações">
        <p>
          O serviço pode passar por manutenção, correções e atualizações. Funcionalidades e regras
          podem mudar para melhorar segurança, desempenho ou operação, com comunicação adequada
          quando a alteração afetar de forma relevante os usuários.
        </p>
      </LegalSection>

      <LegalSection title="8. Suspensão e encerramento">
        <p>
          A administração poderá limitar ou suspender contas em caso de fraude, abuso, risco à
          comunidade ou violação destes termos, respeitando análise proporcional do caso. O usuário
          pode solicitar o encerramento da própria conta pelos canais oficiais da administração.
        </p>
      </LegalSection>

      <LegalSection title="9. Responsabilidade">
        <p>
          Cada participante assume os riscos normais da prática esportiva e deve respeitar suas
          condições físicas, as regras da arena e as orientações dos responsáveis pelo evento. O
          PlayBeach não garante disponibilidade de quadras, presença de jogadores ou ausência de
          lesões e conflitos presenciais.
        </p>
      </LegalSection>

      <LegalSection title="10. Contato">
        <p>
          Dúvidas, denúncias e solicitações devem ser encaminhadas pelos canais oficiais informados
          pela administração do PlayBeach.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
