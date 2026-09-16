/* app/api/food-photo/route.js — Claude vision estimates macros from a meal photo. */
export const runtime = "edge";

export async function POST(req) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return Response.json({ error: "No ANTHROPIC_API_KEY set on the server." }, { status: 501 });

  let body;
  try { body = await req.json(); } catch { return Response.json({ error: "Bad request" }, { status: 400 }); }
  if (!body?.image) return Response.json({ error: "Missing image" }, { status: 400 });

  const prompt = `Estimate the food in this photo. Respond with ONLY raw JSON, no markdown:
{"items":[{"name":"...","grams":120,"kcal":250,"protein":20,"carbs":10,"fat":12}]}
Use Australian portion norms. Round sensibly. If you can't identify food, return {"items":[]}.`;

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 800,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: body.mime || "image/jpeg", data: body.image } },
            { type: "text", text: prompt },
          ],
        }],
      }),
    });
    if (!r.ok) return Response.json({ error: `Anthropic returned ${r.status}` }, { status: 502 });
    const data = await r.json();
    const text = (data.content || []).filter((c) => c.type === "text").map((c) => c.text).join("")
      .replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(text);
    return Response.json({ items: Array.isArray(parsed.items) ? parsed.items : [] });
  } catch {
    return Response.json({ error: "Couldn't read the photo." }, { status: 502 });
  }
}
