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

/* Last write still wins. `expected` is the updatedAt this tab last loaded or
   saved; if the server holds a different one, another device wrote in between
   and the caller gets conflict: true so it can warn. Compared for equality,
   not order, so clock differences between devices don't matter. */
export async function saveRemote(userId, state, expected) {
  const server = await remoteStamp(userId);
  const updatedAt = new Date().toISOString();
  const { error } = await supabase
    .from("lifeos_state")
    .upsert({ user_id: userId, data: { ...state, updatedAt } }, { onConflict: "user_id" });
  if (error) throw error;
  return { updatedAt, server, conflict: server !== expected };
}
