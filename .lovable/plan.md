# Auditoria técnica e plano de estabilização — PlayBeach

Nenhum arquivo foi alterado. Abaixo o diagnóstico verificado e o plano em fases.

## Diagnóstico (verificado nesta auditoria)

**Testes e CI**
- Não existe nenhum arquivo de teste no projeto e não há dependência de test runner (`package.json` só tem `dev`, `build`, `build:dev`, `preview`, `lint`, `format`).
- Não existe pasta `.github/workflows` — não há CI.

**Documentação**
- Não existe `README.md` na raiz. Há apenas `src/routes/README.md` e `.lovable/plan.md` (plano antigo sobre Supabase).
- Scripts soltos em `scripts/` (`probe-sql-api.mjs`, `list-rpcs.mjs`, `apply-lovable-migration.mjs`, `validate-lovable-backend.mjs`) sem documentação de uso; `validate-lovable-backend.mjs` chama `can_challenge_by_rank` com nomes de parâmetro (`_my_pos`, `_opponent_pos`) diferentes da assinatura real no banco (`my_position`, `opponent_position`) — esse check está falso-positivo/quebrado.

**Segurança de ambiente**
- `.env` local contém apenas chaves publicáveis (`VITE_SUPABASE_*` + `SUPABASE_URL/PUBLISHABLE_KEY`) — nenhum segredo real exposto no repositório.
- `src/integrations/supabase/client.server.ts` (service role) existe mas **nenhum arquivo do app o importa** — o esforço anterior de remover `supabaseAdmin` está consistente.
- Rota pública `src/routes/api/public/hooks/monthly-rollover.ts` precisa de revisão de autenticação do chamador (endpoint sob `/api/public/*` não passa por auth do site).

**Banco / RLS**
- O linter do banco reporta **73 avisos**, todos de segurança: 1 extensão no schema `public`, ~30 funções `SECURITY DEFINER` executáveis por usuários anônimos e ~42 executáveis por usuários autenticados. Isso é esperado em parte (RPCs públicas como `get_public_profile_by_username`), mas várias funções administrativas/mutadoras (`apply_monthly_penalties`, `generate_month_availability`, `recompute_*`) não deveriam ser chamáveis por `anon`/`authenticated`.

**Tipagem e qualidade**
- 22 usos de `as any` / `as unknown` em código de aplicação (concentrados em `src/lib/ranking.functions.ts`, `match-availability.queries.ts`, `ranking.queries.ts`, `feed.queries.ts`), consequência de RPCs ausentes nos tipos gerados.
- Validação Zod existe em `admin.functions.ts`, mas `ranking.functions.ts` (39 server functions, 1153 linhas) usa validadores fracos/casts.

**Páginas grandes**
- `src/routes/_authenticated/desafios.index.tsx` — 1109 linhas
- `src/routes/perfil.index.tsx` — 905 linhas
- `src/lib/ranking.functions.ts` — 1153 linhas (39 server functions num único módulo)
- `src/components/profile/my-profile-challenges-panel.tsx` — 445; `profile-completion-modal.tsx` — 437

## Plano em fases

### Fase 1 — Fundação segura (baixo risco)
1. Criar `README.md`: stack, como rodar, variáveis de ambiente, convenções de rotas/server functions, como aplicar migrations.
2. Criar `.github/workflows/ci.yml`: instalar deps, `lint`, typecheck, `build` em PR e push.
3. Adicionar Vitest + `bun run test` e escrever os primeiros testes de unidade nas regras puras: `src/lib/challenge-rules.ts`, `challenge-fortnight.ts`, `challenge-category.ts`, `court-schedule.ts`, `team-format.ts`, `date-format.ts`.
4. Corrigir/documentar `scripts/validate-lovable-backend.mjs` (nomes de parâmetro errados) ou removê-lo em favor dos testes.

### Fase 2 — Endurecimento do banco (risco médio)
5. Migration de `REVOKE EXECUTE ... FROM anon, authenticated` nas funções administrativas e de manutenção (`apply_monthly_penalties`, `apply_previous_month_penalties`, `generate_month_availability`, `generate_current_month_availability`, `recompute_ranks_below_podium`, `recompute_team_gender`), mantendo `service_role`.
6. Revisar o conjunto de RPCs realmente públicas e restringir as demais a `authenticated`.
7. Revisar policies das tabelas com leitura pública (`profiles`, `gallery_photos`, `stories`, `teams`, `challenges`) confirmando projeção de colunas seguras.
8. Re-rodar o linter e registrar no @security-memory o que é aceito por design.

### Fase 3 — Autenticação e regras no servidor (risco médio)
9. Padronizar leitura de sessão: `useCurrentUser` hoje é `useState`+`onAuthStateChange`; consolidar num único provider/contexto e usar o gate `_authenticated` como fonte de verdade (remover guardas ad-hoc como o `beforeLoad` em `perfil.index.tsx` se redundante).
10. Higiene de logout (cancelar queries, limpar cache, `replace: true`).
11. Mover validação de regras de negócio ainda feitas no cliente (elegibilidade de desafio por ranking, time completo, conflito de quadra/horário) para RPC `SECURITY DEFINER` ou server function com Zod, mantendo a checagem no cliente apenas como UX.
12. Proteger `src/routes/api/public/hooks/monthly-rollover.ts` com segredo compartilhado/assinatura verificada no handler.

### Fase 4 — Tipagem e refatoração (risco controlado, sem mudança visual)
13. Eliminar os `as any`: regenerar tipos após as migrations e criar tipos explícitos de retorno das RPCs em `src/lib/*.types.ts`.
14. Quebrar `src/lib/ranking.functions.ts` em módulos por domínio (`ranking`, `teams`, `challenges`, `profiles`) — cada arquivo de server functions deve ser um wrapper fino.
15. Dividir `desafios.index.tsx` (wizard) em componentes por etapa em `src/components/challenges/` e `perfil.index.tsx` em painéis já existentes em `src/components/profile/`.
16. Testes de componente/integração nos fluxos críticos: criar desafio, registrar/confirmar placar, publicar no feed.

## Riscos
- **Fase 2** é a de maior risco funcional: revogar `EXECUTE` de uma função ainda chamada pelo app quebra a tela correspondente. Mitigação: mapear cada chamada `supabase.rpc(...)` no código antes de revogar.
- **Fase 3 item 11**: mover regra para o servidor pode bloquear ações que hoje passavam indevidamente — é o objetivo, mas muda comportamento percebido.
- **Fase 4**: refatoração de arquivos grandes sem testes prévios é arriscada; por isso os testes (Fase 1/16) vêm antes/junto.
- Remover `client.server.ts` não é recomendado agora: é arquivo autogerado, apenas não deve ser importado.

## Arquivos afetados (por fase)
- **F1**: `README.md` (novo), `.github/workflows/ci.yml` (novo), `package.json`, `vitest.config.ts` (novo), `src/lib/*.test.ts` (novos), `scripts/validate-lovable-backend.mjs`.
- **F2**: nova migration em `supabase/migrations/`, security memory.
- **F3**: `src/hooks/use-auth.ts`, `src/routes/_authenticated/route.tsx`, `src/routes/perfil.index.tsx`, `src/routes/auth.tsx`, `src/routes/api/public/hooks/monthly-rollover.ts`, `src/lib/challenge-rules.ts`, nova migration.
- **F4**: `src/lib/ranking.functions.ts` (dividido), `src/lib/ranking.queries.ts`, `src/lib/match-availability.queries.ts`, `src/lib/feed.queries.ts`, `src/routes/_authenticated/desafios.index.tsx`, `src/routes/perfil.index.tsx`, `src/components/challenges/*`, `src/components/profile/*`, `src/integrations/supabase/types.ts` (regenerado).

## Sugestão de ordem
Fase 1 inteira primeiro (rede de segurança), depois Fase 2, e só então 3 e 4. Posso executar fase por fase, com validação de build e linter ao fim de cada uma.
