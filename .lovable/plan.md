
## Visão geral

Substituir o sistema atual de desafios (dias da semana + horários genéricos, com mock data) por um sistema baseado em **domingos do mês**, com tabelas reais no banco, agendamento automático por interseção de disponibilidade, e penalidades aplicadas por job mensal.

---

## 1. Banco de dados (migração única)

### Novas tabelas

- **`arenas`** — nome, endereço, cidade. Cadastrada por admin; consumida em "arena preferida".
- **`teams`** — `id`, `name`, `category` (`dupla` | `quarteto`), `captain_id` (FK profiles), `preferred_arena_id` (FK arenas), `rank_position`, `points`, `current_streak`, `is_active`.
- **`team_members`** — `team_id`, `profile_id`. Unique(team_id, profile_id). Apenas leitura para membros; capitão gerencia.
- **`team_monthly_availability`** — `team_id`, `month` (date — primeiro dia do mês), `sunday_date` (date), `is_available` (bool), `time_start` (time), `time_end` (time), `arena_id`. Unique(team_id, sunday_date). Cadastrada SÓ pelo capitão.
- **`challenges`** — `id`, `challenger_team_id`, `challenged_team_id`, `scheduled_date` (date, sempre um domingo), `scheduled_time` (time), `arena_id`, `status` (`pending` | `scheduled` | `reschedule_requested` | `declined` | `completed` | `wo`), `created_by`, `responded_at`, `reschedule_reason`.
- **`monthly_penalties`** — registro idempotente de penalidades aplicadas (`team_id`, `month`, `reason`, `points`). Evita duplicar `-20` no mesmo mês.

### Funções/triggers no Postgres

- `public.get_sundays_of_month(date)` → tabela de domingos do mês.
- `public.is_team_captain(_user_id, _team_id)` → boolean (SECURITY DEFINER).
- `public.generate_current_month_availability()` → ao virar o mês, insere registros vazios (is_available=false) para todas as equipes ativas nos domingos do mês corrente. Chamada por cron mensal.
- `public.apply_monthly_penalties()` → para cada equipe ativa sem desafio `scheduled`/`completed` no mês anterior, aplicar `-20` em `teams.points` e registrar em `monthly_penalties`. Idempotente.
- Trigger `on challenges.status change`:
  - `declined` (recusa válida) → `-30` no time recusante.
  - `wo` → `-50` no time faltoso.
- Triggers `set_updated_at` em todas as tabelas mutáveis.

### RLS (padrão)

- `arenas`: SELECT autenticado; INSERT/UPDATE/DELETE só `has_role(admin)`.
- `teams`, `team_members`: SELECT autenticado; UPDATE só capitão ou admin.
- `team_monthly_availability`: SELECT autenticado; INSERT/UPDATE/DELETE só capitão da equipe (`is_team_captain`).
- `challenges`: SELECT autenticado; INSERT por capitão do desafiante; UPDATE de status pelo capitão do desafiado (ou admin).
- `monthly_penalties`: SELECT autenticado; INSERT só `service_role` (job).
- Cada CREATE TABLE no `public` virá com GRANTs explícitos.

---

## 2. Cron mensal

Endpoint `/api/public/hooks/monthly-rollover` (TanStack server route) chamado por `pg_cron` no **dia 1 às 00:05**:

1. `apply_monthly_penalties()` (mês anterior).
2. `generate_current_month_availability()` (mês corrente).

Protegido por `apikey` header (anon key). Pode também ser disparado manualmente por admin.

---

## 3. Server functions (`src/lib/`)

- `teams.functions.ts`: `listTeams`, `getMyTeams`, `getTeam(id)`.
- `availability.functions.ts`:
  - `getTeamAvailability(teamId, month)` — retorna 1 linha por domingo do mês.
  - `upsertSundayAvailability({teamId, sundayDate, isAvailable, timeStart, timeEnd, arenaId})` — exige capitão.
- `challenges.functions.ts`:
  - `findCommonSundays({challengerTeamId, challengedTeamId, month})` → lista de `{sunday, overlapStart, overlapEnd, arena}`.
  - `createChallenge({challengerTeamId, challengedTeamId, date, time, arenaId})` — valida regra de posição (pode desafiar até N posições acima — N=2 para duplas, N=2 para quartetos, conforme regras existentes).
  - `respondToChallenge({challengeId, action: 'accept'|'decline'|'reschedule', reason?})`.
  - `listScheduledChallenges()` — para card "Próximos desafios agendados".
  - `markWalkover({challengeId})` — admin.
- `arenas.functions.ts`: CRUD admin + `listArenas`.

Todas usam `requireSupabaseAuth`. Penalidades automáticas vivem nos triggers/cron — server fns só registram o evento (status do desafio).

---

## 4. UI

### `src/routes/desafios.index.tsx` (reescrito)

Três abas:

1. **Minha disponibilidade** (visível só para capitães) — grid de domingos do mês:
   ```
   Domingo 07/09  [✓ Disponível]   [08:00] às [12:00]   Arena: [▾]
   Domingo 14/09  [✓ Disponível]   [14:00] às [18:00]   Arena: [▾]
   Domingo 21/09  [✗ Indisponível]
   Domingo 28/09  [✓ Disponível]   [08:00] às [12:00]   Arena: [▾]
   ```
2. **Desafiar uma equipe**:
   - Lista de equipes desafiáveis (regra de posição).
   - Ao escolher uma → chamada a `findCommonSundays` → mostra horários coincidentes em cards clicáveis.
   - Se vazio: "Nenhum domingo disponível em comum neste mês."
   - Clicar em horário → confirma → cria challenge `pending`.
3. **Meus desafios**: recebidos (com botões Aceitar / Recusar / Solicitar reagendamento) e enviados (com status).

### `src/routes/ranking.index.tsx`

Abaixo do ranking, adicionar seção **Próximos desafios agendados** consumindo `listScheduledChallenges`:

```
Domingo 14/09 — 08:00
Sol do Mar (#5) vs Mar Imbatível (#3)
```

### `src/routes/arenas.*` (admin)

CRUD simples de arenas (já existe rota; ligar ao novo banco).

### `src/routes/regras.index.tsx`

Atualizar texto para refletir as novas regras (-20/mês, -30 recusa, -50 W.O.). Esclarecer que **Ranking Individual** = soma de Duplas + Quartetos e **não sofre** essas penalidades.

---

## 5. Regras de movimentação (resumo aplicado)

| Evento | Efeito | Onde aplicado |
|---|---|---|
| Sem desafio aceito/realizado no mês | -20 pts | Cron mensal + `monthly_penalties` |
| Recusa de desafio válido | -30 pts | Trigger em `challenges.status='declined'` |
| W.O. | -50 pts | Trigger em `challenges.status='wo'` |
| Ranking individual | Soma de Duplas + Quartetos, **sem penalidades** | Visualização — não armazena pontos próprios |

---

## 6. Ordem de execução

1. Migração única com todas as tabelas, funções, triggers, RLS e GRANTs.
2. Cron `pg_cron` apontando para `/api/public/hooks/monthly-rollover` (via `supabase--insert` após migração).
3. Server functions + server route do cron.
4. Reescrita do `desafios.index.tsx`, atualização do `ranking.index.tsx`, CRUD admin de `arenas`, atualização de `regras.index.tsx`.
5. Seed mínimo: arenas de exemplo e geração do mês corrente para times existentes (manual via insert tool, se necessário).

---

## Observações importantes

- **Sem teams no banco hoje**: o ranking atual usa mock. Após a migração você precisará criar pelo menos algumas equipes para o sistema ter dados. Posso incluir um cadastro de equipe (capitão escolhe nome, categoria, membros) na mesma entrega ou em um passo seguinte — diga se quer já incluído.
- **Disponibilidade só pelo capitão**: jogadores comuns veem em modo leitura.
- **Penalidades automáticas**: rodam mesmo se ninguém abrir o app.
- **Ranking Individual** continua puramente calculado/exibido — sem alterações de estrutura.

Confirma o plano para eu começar pela migração?
