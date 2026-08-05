import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/**
 * Escape hatch tipada para RPCs e tabelas que ainda não constam nos tipos
 * gerados em `src/integrations/supabase/types.ts`.
 *
 * Use apenas quando o objeto realmente existe no banco mas os tipos gerados
 * estão defasados. Ao regenerar os tipos, prefira remover a chamada a
 * `untyped()` e usar o cliente tipado direto.
 */
export function untyped(client: unknown = supabase): SupabaseClient {
  return client as SupabaseClient;
}
