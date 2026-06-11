## Problema
Ao abrir "Nova equipe", o dropdown "Selecione um perfil existente" aparece vazio.

## Causa raiz
1. A tabela `public.profiles` **não tem GRANTs configurados** para o role `authenticated`. A política de RLS permite leitura (`profiles_authenticated_read USING true`), mas sem GRANT o PostgREST/Supabase retorna `permission denied for table profiles`. Resultado: a função `listProfiles` falha silenciosamente e a lista fica vazia.
2. Atualmente só existe **1 perfil cadastrado** no banco (o seu). Como filtramos o usuário atual da lista (`p.id !== myId`), mesmo após corrigir os GRANTs ainda não haverá outros perfis para selecionar até que outros usuários se cadastrem.

## Plano de correção

### 1. Migration: adicionar GRANTs em `profiles`
```sql
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
```
Sem `DELETE` (perfis não devem ser apagados pelo usuário) e sem `anon` (perfis são privados a usuários autenticados).

### 2. Melhorar feedback na UI
No `CreateTeamButton` de `src/routes/_authenticated/desafios.index.tsx`:
- Mostrar mensagem de erro se `profilesQ.error` ocorrer (em vez de só "Carregando…").
- Quando a lista de `others` estiver vazia (após filtrar o próprio usuário), mostrar dentro do dropdown a mensagem "Nenhum outro perfil cadastrado ainda" em vez de um dropdown vazio sem feedback.

### 3. Aviso ao usuário
Informar que a lista só terá nomes quando outros jogadores se cadastrarem na plataforma. Para testar agora, será necessário criar contas adicionais (ex.: via `/auth`).

## Arquivos afetados
- Nova migration SQL (GRANTs em `profiles`)
- `src/routes/_authenticated/desafios.index.tsx` (mensagens de estado vazio/erro)