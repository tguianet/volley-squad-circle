import { supabase } from "@/integrations/supabase/client";

export type AvailableSunday = {
  match_date: string;
  free_slots_count: number;
};

export type AvailableTimeSlot = {
  start_time: string;
  end_time: string;
  available_courts_count: number;
};

export type AvailableCourt = {
  court_number: number;
  court_name: string;
};

export async function fetchAvailableSundays(arenaId: string): Promise<AvailableSunday[]> {
  const { data, error } = await supabase.rpc("get_available_sundays", {
    p_arena_id: arenaId,
  });
  if (error) throw error;
  return (data ?? []) as AvailableSunday[];
}

export async function fetchAvailableTimeSlots(
  matchDate: string,
  arenaId: string,
): Promise<AvailableTimeSlot[]> {
  const { data, error } = await supabase.rpc("get_available_time_slots", {
    p_match_date: matchDate,
    p_arena_id: arenaId,
  });
  if (error) throw error;
  return (data ?? []) as AvailableTimeSlot[];
}

export async function fetchAvailableCourts(
  matchDate: string,
  startTime: string,
  endTime: string,
  arenaId: string,
): Promise<AvailableCourt[]> {
  const { data, error } = await supabase.rpc("get_available_courts", {
    p_match_date: matchDate,
    p_start_time: startTime,
    p_end_time: endTime,
    p_arena_id: arenaId,
  });
  if (error) throw error;
  return (data ?? []) as AvailableCourt[];
}

export async function checkCourtAvailability(
  matchDate: string,
  startTime: string,
  endTime: string,
  arenaId: string,
  courtNumber: number,
): Promise<boolean> {
  const { data, error } = await supabase.rpc("check_court_availability", {
    p_match_date: matchDate,
    p_start_time: startTime,
    p_end_time: endTime,
    p_arena_id: arenaId,
    p_court_number: courtNumber,
  });
  if (error) throw error;
  return data === true;
}
