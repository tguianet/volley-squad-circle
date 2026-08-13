import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalPage, LegalSection } from "@/components/legal-page";

export const Route = createFileRoute("/privacidade")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade — PlayBeach" },
      { name: "description", content: "Como o PlayBeach trata e protege dados pessoais." },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <LegalPage
      title="Política de Privacidade"
      description="Como os dados pessoais são utilizados e protegidos no PlayBeach."
    >
      <LegalSection title="1. Dados tratados">
        <p>Conforme o uso da plataforma, podemos tratar:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>dados de conta, como nome, e-mail e identificador de autenticação;</li>
          <li>dados de perfil esportivo, cidade, categoria, equipe e estatísticas;</li>
          <li>publicações, comentários, fotos, vídeos e interações sociais;</li>
          <li>partidas, desafios, disponibilidade, placares e histórico do ranking;</li>
          <li>dados técnicos necessários à segurança, sessão e funcionamento do PWA.</li>
        </ul>
      </LegalSection>

      <LegalSection title="2. Finalidades">
        <p>
          Os dados são usados para autenticar usuários, exibir perfis, organizar equipes e partidas,
          calcular rankings, enviar notificações, moderar a comunidade, prevenir fraude, corrigir
          falhas e manter a segurança e o desempenho do serviço.
        </p>
      </LegalSection>

      <LegalSection title="3. Bases e transparência">
        <p>
          O tratamento observa a Lei Geral de Proteção de Dados. Dependendo da atividade, ele pode
          ser necessário para executar o serviço solicitado, cumprir obrigação legal, proteger a
          plataforma e seus usuários ou atender a consentimento quando aplicável.
        </p>
      </LegalSection>

      <LegalSection title="4. Visibilidade e compartilhamento">
        <p>
          Informações de perfil, ranking, equipes, partidas e publicações podem ficar visíveis para
          a comunidade conforme a função utilizada. Dados técnicos podem ser processados por
          fornecedores de infraestrutura, autenticação, banco de dados e armazenamento estritamente
          para operar o PlayBeach. Não vendemos dados pessoais.
        </p>
      </LegalSection>

      <LegalSection title="5. Armazenamento e segurança">
        <p>
          Aplicamos controles de acesso, autenticação, políticas no banco de dados, registro de
          operações administrativas e conexões protegidas. Nenhum sistema é infalível; incidentes
          relevantes serão tratados conforme a legislação e os procedimentos aplicáveis.
        </p>
      </LegalSection>

      <LegalSection title="6. Retenção e exclusão">
        <p>
          Os dados são mantidos enquanto a conta estiver ativa e pelo período necessário às
          finalidades informadas, à integridade do ranking, à prevenção de fraude e ao cumprimento
          de obrigações. Solicitações de exclusão serão avaliadas considerando deveres legais e
          dados que precisem ser anonimizados ou preservados.
        </p>
      </LegalSection>

      <LegalSection title="7. Direitos do titular">
        <p>
          Você pode solicitar confirmação e acesso, correção, informação sobre compartilhamento,
          portabilidade quando aplicável, revisão, anonimização, bloqueio ou eliminação de dados
          inadequados e revogação de consentimento. A identidade poderá ser confirmada antes do
          atendimento para proteger a conta.
        </p>
      </LegalSection>

      <LegalSection title="8. Cookies e armazenamento local">
        <p>
          O PlayBeach utiliza sessão, armazenamento local e recursos técnicos necessários para
          manter o login, instalar e atualizar o PWA, preservar preferências e proteger a navegação.
          Não usamos esses recursos para vender perfis de publicidade.
        </p>
      </LegalSection>

      <LegalSection title="9. Crianças e adolescentes">
        <p>
          Usuários menores de idade devem utilizar a plataforma com ciência e autorização de seus
          responsáveis. Dados não devem ser publicados quando colocarem o menor em situação de
          risco.
        </p>
      </LegalSection>

      <LegalSection title="10. Solicitações e alterações">
        <p>
          Solicitações de privacidade podem ser feitas pelos canais oficiais da administração. Esta
          política pode ser atualizada para refletir mudanças legais ou funcionais. Consulte também
          os{" "}
          <Link to="/termos" className="font-semibold text-primary underline">
            Termos de Uso
          </Link>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}
