"use client";
import { supabase } from "./supabaseClient";

/* One JSON blob per user. Simple, and the whole app state fits comfortably. */
export async function loadRemote(userId) {
  const { data, error } = await supabase
    .from("lifeos_state").select("data").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return data?.data ?? null;
}

export async function saveRemote(userId, state) {
  const { error } = await supabase
    .from("lifeos_state")
    .upsert({ user_id: userId, data: state }, { onConflict: "user_id" });
  if (error) throw error;
  return true;
}
