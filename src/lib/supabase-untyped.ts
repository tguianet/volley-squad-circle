import { supabase } from "@/integrations/supabase/client";

/**
 * Escape hatch para RPCs e tabelas que ainda não constam nos tipos
 * gerados em `src/integrations/supabase/types.ts`.
 *
 * Use apenas quando o objeto realmente existe no banco mas os tipos gerados
 * estão defasados. Ao regenerar os tipos, prefira remover a chamada a
 * `untyped()` e usar o cliente tipado direto.
 */
type UntypedClient = {
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
  from: (table: string) => any;
  storage: any;
  auth: any;
  channel: any;
};

export function untyped(client: unknown = supabase): UntypedClient {
  return client as unknown as UntypedClient;
}
