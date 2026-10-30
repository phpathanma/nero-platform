import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type ControlRole = "admin" | "door_staff";

export const getControlAccess = cache(async () => {
  const supabase = await createClient();
  if (!supabase) return { supabase: null, user: null, role: null as ControlRole | null };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, role: null as ControlRole | null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role = profile?.role === "admin" || profile?.role === "door_staff" ? profile.role : null;
  return { supabase, user, role };
});
