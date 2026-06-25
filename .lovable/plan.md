## Decisão

Manter o projeto no **Lovable Cloud**, que já é Supabase por baixo (Postgres, Auth, Storage, RLS, Edge Functions, Realtime). Não há ganho técnico em migrar para uma conta Supabase externa, e o Cloud atual não pode ser desconectado deste projeto depois de adicionado — uma migração externa exigiria recriar tudo do zero em outra conta.

## O que você já tem disponível agora (sem mudar nada)

- **Banco Postgres completo** com as tabelas atuais (`profiles`, `teams`, `challenges`, `matches`, `tournaments`, etc.), RLS ativa e policies.
- **Auth** com Google e e-mail/senha.
- **Storage** com buckets `avatars`, `banners`, `gallery`.
- **Funções RPC** (`SECURITY DEFINER`) que já criamos para regras de negócio.
- **Edge Functions / Server Functions** via TanStack Start.
- **Secrets** (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `LOVABLE_API_KEY`, etc.) já configurados.

## O que posso fazer pelo chat (mesmo sem painel supabase.com)

- Criar/alterar tabelas, colunas, enums, índices via migrations.
- Criar/alterar RLS policies e GRANTs.
- Criar funções e triggers SQL.
- Ler dados com SELECT direto no banco.
- Exportar tabelas em CSV.
- Configurar Auth (providers, HIBP, anônimos).
- Criar buckets de Storage.
- Rodar o linter de segurança.
- Ver logs de edge functions.

## Quando faria sentido conectar Supabase externo

Apenas se você precisar de algo que o Cloud realmente não oferece, por exemplo:
- Acesso direto ao painel web do Supabase para sua equipe.
- Provedores OAuth não suportados nativamente (GitHub, Facebook, Discord).
- Dump SQL completo do banco (`pg_dump`) — Cloud só permite CSV por tabela.
- Configurações avançadas de projeto fora do que o Cloud expõe.

Nesse caso o caminho seria: criar projeto Supabase próprio → exportar CSVs daqui → recriar schema + RLS lá → reimportar → trocar variáveis de ambiente. É trabalho manual considerável e perderia integração nativa com Lovable AI Gateway.

## Próximo passo sugerido

Me diga **o que você queria fazer no Supabase** (ex.: "ver as tabelas", "rodar um SQL", "adicionar login GitHub", "exportar dados"). Resolvo aqui mesmo, sem migração.
