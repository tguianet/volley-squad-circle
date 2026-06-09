# Painel Admin BeachPlay Arena

Vou ativar o **Lovable Cloud** (banco, auth e funções de servidor) e construir um painel admin completo, seguro e com várias funcionalidades extras.

## 1. Autenticação e roles (seguro)

- Login real por **e-mail/senha + Google** na tela `/auth` que já existe.
- Tabela separada `user_roles` com enum `app_role` (`admin`, `moderator`, `player`) — nunca no perfil, evita escalonamento de privilégio.
- Função `has_role(user_id, role)` security definer para usar em RLS sem recursão.
- Tabela `profiles` ligada a `auth.users` (nome, avatar, cidade, nível) criada via trigger no signup.
- Você me passa o e-mail depois e eu rodo um `INSERT` em `user_roles` pra te promover a admin.

## 2. Layout do painel

Nova área protegida em `/admin` (só acessível a `admin` ou `moderator`), com sidebar própria e as seções:

```text
/admin                    Dashboard (KPIs + gráficos)
/admin/usuarios           Jogadores: buscar, ver perfil, promover/rebaixar, banir/suspender
/admin/arenas             Arenas: criar, editar, remover, aprovar pendentes
/admin/torneios           Torneios: criar, editar chaves, lançar resultados, aprovar
/admin/partidas           Partidas: ver todas, cancelar, remover participantes
/admin/posts              Moderação do feed: remover post, ocultar, ver reports
/admin/reports            Fila de denúncias de usuários
/admin/banners            Banners/anúncios no topo do feed (ativar, agendar)
/admin/notificacoes       Disparar notificação em massa (todos / por cidade / por nível)
/admin/relatorios         Exportar CSV: jogadores, partidas, torneios, receita
/admin/auditoria          Log de todas as ações do admin (quem fez o quê e quando)
/admin/configuracoes      Categorias, níveis, cidades, regras do app
```

## 3. Dashboard (KPIs visuais)

Cards grandes e gráficos (Recharts) com:
- Jogadores ativos (dia/semana/mês)
- Novos cadastros (linha temporal 30 dias)
- Partidas criadas vs concluídas
- Torneios em andamento
- Top 5 arenas por uso
- Top 5 jogadores por ranking
- Posts publicados na semana + taxa de engajamento
- Denúncias pendentes (badge vermelho)

## 4. Moderação de conteúdo

- Botão "Denunciar" em posts, perfis e arenas → grava em `reports` com motivo.
- Fila `/admin/reports` agrupada por status (pendente/resolvido), com ação rápida: remover conteúdo, avisar usuário, ignorar.
- Soft delete em posts (`deleted_at`) pra histórico.

## 5. Gestão de usuários

- Lista paginada com busca por nome/e-mail/cidade.
- Ações: promover a moderador/admin, rebaixar, suspender por X dias, banir, resetar senha.
- Visualização do histórico do jogador (partidas, posts, denúncias recebidas).

## 6. Banners e anúncios

- Tabela `banners` (título, imagem, link, ativo, inicia_em, termina_em, público-alvo).
- Componente no topo do feed exibe banner ativo.
- Editor com preview ao vivo.

## 7. Notificações em massa

- Form para disparar push/in-app: título, corpo, link, segmento (todos, cidade, nível, role).
- Grava em `notifications` com `user_id` por destinatário.

## 8. Relatórios e exportação

- Botão "Exportar CSV" em cada listagem (jogadores, partidas, torneios, posts, denúncias).
- Server function gera o CSV no servidor e devolve como download.

## 9. Auditoria

- Tabela `audit_log` registra automaticamente ação, ator, alvo, payload e timestamp em toda mutação admin.
- Visualizador com filtros por admin, ação e período.

## 10. Extras que vou adicionar (você pediu "mais ainda")

- **Configurações do app**: gerenciar listas globais (níveis, categorias de torneio, cidades atendidas) sem precisar de código.
- **Aprovação de arenas**: arena criada por usuário comum entra como `pending` e só aparece no app após aprovação.
- **Aprovação de torneios**: idem para torneios criados pela comunidade.
- **Feature flags simples**: liga/desliga seções (ex.: H2H, ranking) por ambiente.
- **Modo manutenção**: chave global que mostra uma tela "voltamos já" pros usuários comuns.
- **Verificação de jogador/arena** (selo azul): admin marca perfis verificados, aparece um check no app.
- **Mensagens broadcast no feed**: post oficial fixado no topo (tipo "comunicado da liga").
- **Sandbox**: botão "popular dados de exemplo" e "limpar dados de teste" pra demonstração.
- **Atalhos rápidos**: Cmd+K abre busca global no admin (usuário, arena, torneio).
- **Tema escuro do admin**: visual mais sóbrio que o app público, focado em produtividade.

## 11. Segurança (regras não-negociáveis)

- Toda tabela com RLS habilitado.
- Policies que checam `has_role(auth.uid(), 'admin')` para mutações sensíveis.
- Nenhuma chave service-role no frontend; ações admin passam por **server functions** com middleware que valida a role antes de executar.
- Auditoria de toda ação admin.

## Detalhes técnicos

- **Stack**: TanStack Start + Supabase (via Lovable Cloud) + TanStack Query + Recharts.
- **Auth**: `requireSupabaseAuth` + checagem de role em server fns. Rotas `/admin/*` ficam sob `_authenticated/` com gate extra de role.
- **Migrations**: uma para schema (tabelas + enum + função `has_role` + policies + grants), seeds só pra dados de exemplo.
- **Mock data**: mantido como fallback inicial, mas o admin opera sobre o banco real.

## Ordem de execução

1. Ativar Lovable Cloud.
2. Migration: `profiles`, `user_roles`, enum, `has_role`, RLS, grants, trigger de signup.
3. Auth real na tela `/auth` (e-mail/senha + Google).
4. Layout `/admin` + gate de role.
5. Dashboard + listas (usuários, arenas, torneios, partidas, posts).
6. Moderação, banners, notificações, relatórios, auditoria.
7. Extras (configurações, aprovação, feature flags, manutenção, verificação, broadcast, Cmd+K).
8. Você me passa seu e-mail e eu te promovo a admin.

Confirma que posso seguir com **tudo isso**? Se quiser cortar algum item ou priorizar uma fase pra entregar primeiro, me diga.