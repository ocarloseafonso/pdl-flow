import { supabase } from "@/integrations/supabase/client";
import type { Holiday } from "./types";

let cache: Holiday[] | null = null;
export async function getHolidays(): Promise<Holiday[]> {
  if (cache) return cache;
  const { data } = await supabase.from("holidays_br").select("*").order("date");
  cache = (data as Holiday[]) ?? [];
  return cache;
}
