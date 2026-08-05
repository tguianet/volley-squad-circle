# PlayBeach

Aplicativo de vôlei de praia / futevôlei: ranking de atletas e equipes, desafios quinzenais,
agenda de quadras, partidas amistosas, torneios internos e um feed social (posts, stories,
galeria, perfis vinculados). PWA instalável no Android e no iPhone.

## Stack

| Camada     | Tecnologia                                                         |
| ---------- | ------------------------------------------------------------------ |
| Framework  | TanStack Start v1 (React 19, SSR) + Vite 7                         |
| Roteamento | TanStack Router (rotas por arquivo em `src/routes`)                |
| Dados      | TanStack Query                                                     |
| Estilo     | Tailwind CSS v4 (`src/styles.css`) + shadcn/ui                     |
| Backend    | Postgres + Auth + Storage gerenciados (Supabase via Lovable Cloud) |
| Testes     | Vitest                                                             |

## Rodando localmente

O gerenciador de pacotes do projeto é **npm** (o `package-lock.json` é a única
fonte de verdade das versões instaladas).

```bash
npm install
npm run dev        # http://localhost:8080
```

Scripts disponíveis:

```bash
npm run test        # testes unitários em modo watch (Vitest)
npm run test:run    # testes unitários em execução única (usado no CI)
npm run typecheck   # TypeScript sem emitir
npm run lint        # ESLint
npm run format      # Prettier
npm run build       # build de produção
```


## Variáveis de ambiente

O arquivo `.env` local contém apenas chaves **publicáveis** (seguras no cliente):

| Variável                                    | Uso                                   |
| ------------------------------------------- | ------------------------------------- |
| `VITE_SUPABASE_URL`                         | URL do backend, lida no browser       |
| `VITE_SUPABASE_PUBLISHABLE_KEY`             | chave pública (anon), lida no browser |
| `VITE_SUPABASE_PROJECT_ID`                  | id do projeto                         |
| `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` | equivalentes lidos no servidor        |

Regras:

- No browser use sempre `import.meta.env.VITE_*`.
- No servidor use `process.env.*` **dentro** do handler (nunca no escopo do módulo).
- Segredos privados nunca entram no repositório: são cadastrados em
  Project Settings → Secrets e lidos apenas dentro de server functions.
- `SUPABASE_SERVICE_ROLE_KEY` não é usada por nenhum arquivo do app. Operações
  privilegiadas são feitas por funções SQL `SECURITY DEFINER`.

## Organização

```text
src/
  routes/                    rotas por arquivo
    __root.tsx               shell, head/meta, PWA, providers
    index.tsx                feed público / home
    _authenticated/          subárvore protegida (gate em route.tsx)
      admin/                 painel administrativo
    api/public/              endpoints HTTP chamados por serviços externos
  components/                UI por domínio (feed, profile, ranking, challenges, ...)
  components/ui/             shadcn/ui
  lib/                       regras puras, queries e server functions
  hooks/                     hooks de sessão e utilidades
  integrations/supabase/     clientes e tipos gerados (não editar)
supabase/migrations/         migrations SQL versionadas
scripts/                     utilitários de inspeção do backend
```

Convenções:

- **Regras puras** (elegibilidade de desafio, formatos de time, datas) ficam em
  `src/lib/*.ts` sem dependência de rede — são o alvo dos testes unitários.
- **Server functions** ficam em `src/lib/*.functions.ts`, criadas com
  `createServerFn` de `@tanstack/react-start`; o arquivo deve ser um wrapper fino.
- **Rotas protegidas** ficam sob `src/routes/_authenticated/`. Não criar guardas
  de auth próprias em rotas públicas.
- **Endpoints externos** (webhooks, cron) ficam em `src/routes/api/public/` e
  precisam validar o chamador dentro do handler.

## Banco de dados e migrations

Toda mudança de schema, policy de acesso, função ou trigger é feita por uma
migration SQL versionada em `supabase/migrations/`, nomeada
`YYYYMMDDHHMMSS_descricao.sql`. Regras obrigatórias para tabelas novas em `public`,
nesta ordem:

1. `CREATE TABLE`
2. `GRANT` para os papéis que as policies permitem (`authenticated`, `service_role`,
   e `anon` só quando houver leitura pública)
3. `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`
4. `CREATE POLICY`

Regras de negócio que precisam de privilégio (penalidades mensais, recomputar
ranking, confirmar placar) são funções `SECURITY DEFINER` chamadas via
`supabase.rpc(...)`.

## Testes

Vitest roda em ambiente Node e cobre as regras puras:

- `src/lib/challenge-rules.test.ts` — janela de desafio por posição, top 5, capitão, time completo
- `src/lib/challenge-fortnight.test.ts` — alternância desafiante/desafiado por quinzena
- `src/lib/team-format.test.ts` — as 6 combinações de categoria/gênero (sem sexteto)
- `src/lib/date-format.test.ts` — formatação pt-BR e tempo relativo
- `src/lib/court-schedule.test.ts` — próximos domingos e slots de quadra
- `src/lib/challenge-category.test.ts` — rótulo de categoria do desafio

## CI

`.github/workflows/ci.yml` roda em push para `main` e em pull requests:
`npm ci` → `npm run lint` → `npm run typecheck` → `npm run test:run` → `npm run build`. O build precisa dos secrets
`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` e `VITE_SUPABASE_PROJECT_ID`
configurados no repositório.

## Scripts utilitários

Todos leem as variáveis do `.env`, então rode com `node --env-file=.env`:

| Script                                 | Para que serve                                                  |
| -------------------------------------- | --------------------------------------------------------------- |
| `scripts/validate-lovable-backend.mjs` | smoke test das RPCs e colunas críticas do backend               |
| `scripts/list-rpcs.mjs`                | lista as RPCs expostas pela API (filtra ranking/quadra/desafio) |
| `scripts/probe-sql-api.mjs`            | verifica quais endpoints SQL a API expõe (diagnóstico)          |
| `scripts/apply-lovable-migration.mjs`  | auxiliar de aplicação de migration                              |

Exemplo:

```bash
node --env-file=.env scripts/validate-lovable-backend.mjs
```
