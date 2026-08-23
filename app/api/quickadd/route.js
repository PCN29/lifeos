/* Server-side proxy so the Anthropic key never reaches the browser. */
export const runtime = "edge";

export async function POST(req) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return Response.json({ error: "No ANTHROPIC_API_KEY set on the server." }, { status: 501 });
  }
  let body;
  try { body = await req.json(); } catch { return Response.json({ error: "Bad request" }, { status: 400 }); }
  if (!body?.prompt) return Response.json({ error: "Missing prompt" }, { status: 400 });

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        messages: [{ role: "user", content: body.prompt }],
      }),
    });
    if (!r.ok) return Response.json({ error: `Anthropic returned ${r.status}` }, { status: 502 });
    const data = await r.json();
    const text = (data.content || []).filter((c) => c.type === "text").map((c) => c.text).join("");
    return Response.json({ text });
  } catch {
    return Response.json({ error: "Upstream request failed" }, { status: 502 });
  }
}
