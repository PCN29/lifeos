"use client";
import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import LifeOS from "../components/LifeOS";

export default function Page() {
  const [session, setSession] = useState(undefined);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn = async () => {
    if (!email.trim()) return;
    setBusy(true); setErr(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined },
    });
    setBusy(false);
    if (error) setErr(error.message); else setSent(true);
  };

  if (session === undefined) {
    return <div style={S.center}>Loading…</div>;
  }

  if (!session) {
    return (
      <div style={S.center}>
        <div style={S.card}>
          <div style={S.eyebrow}>LIFE OS</div>
          <h1 style={S.h1}>Sign in</h1>
          {sent ? (
            <p style={S.p}>
              Link sent to <strong style={{ color: "#E6E2D6" }}>{email}</strong>. Open it on this
              device to finish signing in. Check spam if it doesn't show up.
            </p>
          ) : (
            <>
              <p style={S.p}>No password. You'll get a one-time link by email.</p>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") signIn(); }}
                placeholder="you@example.com"
                type="email"
                autoComplete="email"
                style={S.input}
              />
              <button onClick={signIn} disabled={busy} style={S.btn}>
                {busy ? "Sending…" : "Send link"}
              </button>
              {err && <p style={{ ...S.p, color: "#FF6B35" }}>{err}</p>}
            </>
          )}
        </div>
      </div>
    );
  }

  return <LifeOS user={session.user} />;
}

const S = {
  center: {
    minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
    background: "#10131A", color: "#7C8698", padding: 20,
  },
  card: {
    background: "#191E28", border: "1px solid #2A3140", borderRadius: 12,
    padding: 26, maxWidth: 380, width: "100%",
  },
  eyebrow: {
    fontFamily: "ui-monospace, Menlo, monospace", fontSize: 10,
    letterSpacing: 2.5, color: "#FF6B35", marginBottom: 8,
  },
  h1: { fontSize: 24, margin: "0 0 10px", color: "#E6E2D6", fontWeight: 600 },
  p: { fontSize: 13.5, lineHeight: 1.6, color: "#7C8698", margin: "0 0 16px" },
  input: {
    width: "100%", background: "#141922", color: "#E6E2D6", border: "1px solid #2A3140",
    borderRadius: 8, padding: "11px 12px", fontSize: 15, marginBottom: 10,
  },
  btn: {
    width: "100%", background: "#FF6B35", color: "#10131A", border: "none",
    borderRadius: 8, padding: "11px 12px", fontSize: 15, fontWeight: 600, cursor: "pointer",
  },
};
