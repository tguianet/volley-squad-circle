## Regra especial de troca de pódio (Top 3)

Implementar a troca automática de `rank_position` apenas quando um desafio `completed` envolver o pódio (posições 1, 2 ou 3), respeitando as condições do pedido.

### Lógica (executada no trigger `handle_challenge_status_change` quando `status = 'completed'`)

Após atualizar `wins/losses/current_streak`, aplicar:

1. Obter `winner.rank_position` (Pw) e `loser.rank_position` (Pl), filtrando pela mesma `category` + `gender` (rankings são por categoria/gênero — confirmar com usuário).
2. Avaliar a regra de pódio:
   - **Caso A — vencedor fora do Top 3, perdedor dentro do Top 3 (Pl ∈ {1,2,3} e Pw > Pl):**
     vencedor assume a posição do perdedor; perdedor cai exatamente 1 posição (Pl+1). O time que estava em Pl+1 sobe para Pw (preenche o "buraco" deixado pelo vencedor). Isso cobre os 3 exemplos do pedido (2º→1º, 3º→2º, 4º→3º).
   - **Caso B — ambos dentro do Top 3 e vencedor abaixo do perdedor (Pw, Pl ∈ {1,2,3} e Pw > Pl):**
     troca direta entre vencedor e perdedor.
   - **Caso C — perdedor fora do Top 3 (Pl ≥ 4):** não faz troca. Apenas o ajuste de pontos (quando existir) reordena o ranking pela pontuação.
   - Se vencedor já está acima do perdedor (Pw < Pl), nenhuma troca.
3. Tudo dentro de uma transação no trigger (já é o caso) com `UPDATE teams SET rank_position = ... WHERE id IN (...)`.

### Reordenação geral por pontos (posições 4+)

Como `rank_position` é uma coluna persistida, criar função `public.recompute_ranks_below_podium(_category, _gender)` que:

- Mantém as posições 1–3 como estão.
- Recalcula 4..N por `points DESC, wins DESC, losses ASC, created_at ASC` dentro do mesmo `category/gender`.
- Chamada ao final do trigger `completed`, e também nos triggers de penalidade (`declined`, `wo`) e em `apply_monthly_penalties`.

### Inicialização

Migration de bootstrap: popular `rank_position` de todos os times ativos pela ordenação atual (por categoria/gênero) caso esteja nulo/zero, para que o Top 3 exista antes do primeiro desafio.

### Frontend (`src/routes/_authenticated/ranking.index.tsx`)

- Ordenar por `rank_position ASC NULLS LAST, points DESC, wins DESC, losses ASC, created_at ASC` (em vez de só por pontos), para refletir o pódio fixado pelas trocas.
- Manter os badges 🥇🥈🥉 nas 3 primeiras posições já existentes.
- Nenhuma mudança visual além da ordenação.

### Arquivos

- `supabase/migrations/<novo>.sql` — atualiza `handle_challenge_status_change`, cria `recompute_ranks_below_podium`, faz bootstrap de `rank_position`, e chama o recompute nos pontos de penalidade.
- `src/routes/_authenticated/ranking.index.tsx` — ajusta ordenação.

### Como testar

1. Forçar três times A, B, C com `rank_position` 1,2,3 e um D em 4º (mesma categoria/gênero).
2. Completar desafio com `winner = B, loser = A` → A vira 2º, B vira 1º.
3. Completar desafio com `winner = D, loser = C` → D vira 3º, C vira 4º, antigo 4º (era D) sai.
4. Completar desafio entre 8º e 6º → nenhuma posição do pódio muda; ordem dos demais segue pontos.
5. Aplicar penalidade `declined` em um time fora do pódio → recompute mantém Top 3 e reordena 4+.

### Pergunta de confirmação

O ranking deve ser **por categoria + gênero** (ex.: pódio separado para "dupla feminino", "quarteto misto" etc.) ou **um pódio global**? A página atual já mostra abas por categoria/gênero, então assumirei pódio por (category, gender) — confirme se preferir global.
