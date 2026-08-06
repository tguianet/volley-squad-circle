import { supabase } from "@/integrations/supabase/client";

export async function isAccountSuspended(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("is_suspended")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return data?.is_suspended === true;
}
