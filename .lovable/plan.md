## Diagnóstico

A imagem **está sendo salva** com sucesso em `gallery_photos`, mas o feed inteiro mostra "Não foi possível carregar" porque a query falha antes de renderizar.

Causa: `fetchGlobalFeed` em `src/lib/feed.queries.ts` faz `Promise.all([fetchPosts, fetchShares])`. A função `fetchShares` consulta a tabela `post_shares`, **que não existe no banco**. Como uma das promises rejeita, o `useQuery` entra em estado de erro e nenhuma postagem aparece — nem as antigas, nem a nova.

## Correção

Em `src/lib/feed.queries.ts`, envolver a consulta de `fetchShares` em try/catch e retornar `[]` quando a tabela não existir (ou qualquer erro de leitura ocorrer). Mesma proteção em `fetchProfileFeed`. Assim:

- Posts (`gallery_photos`) carregam normalmente → a imagem postada aparece imediatamente no feed.
- O recurso de "compartilhar post" continua inerte até que a tabela `post_shares` seja criada, sem quebrar a tela.

Nada mais muda — composer, upload de imagem, invalidação de cache (`feedQueryKey`) já estão corretos.

## Opcional (não incluído neste plano)

Se quiser ativar o compartilhamento de posts de verdade, posso, em seguida, criar a tabela `public.post_shares` (com GRANT + RLS apontando para `auth.uid() = shared_by_user_id`) numa migração separada. Me avise depois se quer esse passo.
