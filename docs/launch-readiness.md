# PlayBeach — operação de lançamento

## Monitoramento

- Conferir diariamente `Lovable → Cloud → Logs` durante a primeira semana.
- Filtrar por erros nos logs de servidor, autenticação, PostgreSQL e PostgREST.
- Erros não tratados do navegador e da raiz React são encaminhados ao coletor do Lovable.
- Investigar aumentos de erro antes de publicar novas funcionalidades.

## Backup e recuperação

O banco utiliza o backup gerenciado do Lovable Cloud. Antes de uma migration relevante:

1. abrir `Lovable → Cloud → Database → Backups`;
2. confirmar que existe um backup recente e restaurável;
3. executar a migration versionada do repositório;
4. rodar `scripts/validate-lovable-backend.mjs`;
5. para mudanças no placar, rodar `scripts/homologate-challenge-score.sql`;
6. em falha grave, interromper novas escritas e restaurar o backup anterior pelo painel.

Nunca testar recuperação sobrescrevendo produção. O ensaio deve usar um ambiente descartável ou uma
restauração isolada.

## Checklist de publicação

- `npm run lint`
- `npm run typecheck`
- `npm run test:run`
- `npm run build`
- revisar migrations e confirmar backup recente
- validar login, feed, perfil, ranking, desafios e notificações em produção
- conferir console do navegador e logs do Lovable
- confirmar que o commit publicado corresponde ao merge da `main`

## Resposta a incidentes

1. Registrar horário, rota, usuário afetado e mensagem de erro sem copiar senhas ou tokens.
2. Verificar o commit publicado e os logs do período.
3. Conter o problema desativando apenas o fluxo afetado quando possível.
4. Corrigir em branch separada, validar e publicar por Pull Request.
5. Usar restauração de backup somente quando a correção não preservar a integridade dos dados.
6. Confirmar o funcionamento e documentar a causa.
