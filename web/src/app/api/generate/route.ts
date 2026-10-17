// Live question generation. Needs ANTHROPIC_API_KEY in web/.env.local (server only, never sent to the browser).
// There is no daily cap; a short burst limit per visitor only stops accidental loops and bots.
import type { Question } from "@/lib/questions";

const MODEL = process.env.G2G_GEN_MODEL ?? "claude-haiku-5-5";
const hits = new Map<string, number[]>();
const BURST = 8; // requests
const WINDOW = 60_000; // per minute

type Raw = { d?: number; q?: string; r?: [string, string]; w?: [string, string][] };

function tooMany(ip: string) {
  const now = Date.now();
  const list = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW);
  list.push(now);
  hits.set(ip, list);
  return list.length > BURST;
}

function valid(o: Raw) {
  if (!o.q || o.q.length < 15 || o.q.length > 330) return false;
  if (!o.r || o.r.length !== 2 || !o.r[0] || !o.r[1] || o.r[1].length < 12) return false;
  if (!o.w || o.w.length !== 3 || o.w.some((x) => !x || !x[0] || !x[1] || x[1].length < 12)) return false;
  const texts = [o.r[0], ...o.w.map((x) => x[0])];
  if (new Set(texts.map((t) => t.trim().toLowerCase())).size !== 4) return false;
  if (texts.some((t) => /\b(all|none) of the above\b/i.test(t))) return false;
  // the right answer must not stand out by being much longer than every wrong one
  const longestWrong = Math.max(...o.w.map((x) => x[0].length));
  return !(o.r[0].length > 1.5 * longestWrong && o.r[0].length > 30);
}

export async function POST(req: Request) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return Response.json({ error: "Live question generation is not set up yet." }, { status: 503 });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (tooMany(ip)) return Response.json({ error: "Slow down a little, then try again." }, { status: 429 });

  let body: { track?: string; exam?: string; topic?: string; topics?: string[]; count?: number };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Bad request." }, { status: 400 });
  }
  const track = body.track === "fbla" ? "FBLA" : "DECA";
  const exam = String(body.exam ?? "").slice(0, 80);
  const topic = String(body.topic ?? "").slice(0, 80);
  const topics = (body.topics ?? []).slice(0, 30).map((t) => String(t).slice(0, 60));
  const count = Math.min(Math.max(Number(body.count) || 5, 1), 10);

  const prompt = `Write ${count} original multiple-choice practice questions for the ${track} high-school "${exam}" exam${
    topic ? `, all on the topic "${topic}"` : `, spread across these topics: ${topics.join(", ")}`
  }.

Rules:
- Original questions only. Use fictional businesses and people. Never copy real exam items.
- Exactly one correct answer and three plausible wrong answers.
- All four options must be similar in length and style. The correct answer must NOT be the longest.
- Never use "all of the above" or "none of the above".
- Every option gets a one-sentence reason: why it is right, or why it is wrong.
- Difficulty d is 1 (recall), 2 (apply) or 3 (analyse).
- Mix recall and short scenario questions. Write capitals for NOT, EXCEPT or LEAST if a question is negative.

Reply with ONLY a JSON array, no prose, where each item is:
{"a":"topic","d":2,"q":"question","r":["correct option","why it is right"],"w":[["wrong option","why it is wrong"],["wrong option","why it is wrong"],["wrong option","why it is wrong"]]}`;

  let text = "";
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: MODEL, max_tokens: 4000, messages: [{ role: "user", content: prompt }] }),
    });
    if (!res.ok) return Response.json({ error: "The question writer is unavailable right now." }, { status: 502 });
    const data = (await res.json()) as { content?: { type: string; text?: string }[] };
    text = data.content?.find((c) => c.type === "text")?.text ?? "";
  } catch {
    return Response.json({ error: "Could not reach the question writer." }, { status: 502 });
  }

  let raw: (Raw & { a?: string })[] = [];
  try {
    raw = JSON.parse(text.slice(text.indexOf("["), text.lastIndexOf("]") + 1));
  } catch {
    return Response.json({ error: "The question writer sent something unreadable. Try again." }, { status: 502 });
  }

  const questions: Question[] = [];
  for (const o of raw) {
    if (!valid(o)) continue;
    const pos = Math.floor(Math.random() * 4);
    const wrong = o.w!.map(([t, why]) => ({ t, why }));
    const options = [...wrong];
    options.splice(pos, 0, { t: o.r![0], why: o.r![1] });
    questions.push({
      id: `gen-${Date.now().toString(36)}-${questions.length}`,
      track: body.track === "fbla" ? "fbla" : "deca",
      pool: "generated",
      area: topics.includes(o.a ?? "") ? o.a! : topic || topics[0] || "Mixed",
      diff: ([1, 2, 3].includes(o.d ?? 0) ? o.d : 2) as 1 | 2 | 3,
      q: o.q!,
      options,
      answer: pos,
      exams: [],
      gen: true,
    });
  }
  if (!questions.length) return Response.json({ error: "No usable questions came back. Try again." }, { status: 502 });
  return Response.json({ questions });
}
