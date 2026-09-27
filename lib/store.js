"use client";
import { supabase } from "./supabaseClient";

/* One JSON blob per user. Simple, and the whole app state fits comfortably. */
export async function loadRemote(userId) {
  const { data, error } = await supabase
    .from("lifeos_state").select("data").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return data?.data ?? null;
}

/* Just the blob's updatedAt, without pulling the whole thing down. */
export async function remoteStamp(userId) {
  const { data, error } = await supabase
    .from("lifeos_state").select("stamp:data->>updatedAt").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return data?.stamp ?? null;
}

/* `expected` is the updatedAt this tab last loaded or saved. If the server
   holds anything else, another device wrote in between: refuse, so a stale
   tab can never replace newer data. prevUpdatedAt lets the database check
   the same thing (supabase/guard.sql), which also stops tabs still running
   old code. Compared for equality, not order, so device clocks don't matter. */
export async function saveRemote(userId, state, expected) {
  if ((await remoteStamp(userId)) !== expected) return { conflict: true };
  const updatedAt = new Date().toISOString();
  const { error } = await supabase
    .from("lifeos_state")
    .upsert({ user_id: userId, data: { ...state, updatedAt, prevUpdatedAt: expected } }, { onConflict: "user_id" });
  if (error) {
    if (/stale/i.test(error.message || "")) return { conflict: true };
    throw error;
  }
  return { updatedAt };
}
