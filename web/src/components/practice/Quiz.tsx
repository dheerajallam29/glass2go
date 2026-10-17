"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Question, Track } from "@/lib/questions";
import { STATIC_SITE } from "@/lib/asset";
import { fx, fxAt } from "@/components/fx/fx";
import { isDue, masteryOf, recordAnswer, toggleFlag, useProgress, type Store } from "@/lib/progress";
import styles from "./Quiz.module.css";

const LETTERS = ["A", "B", "C", "D"];
const SECONDS_PER_Q: Record<Track, number> = { deca: 54, fbla: 30 };
const MINI = 20;

type Filter = "all" | "new" | "missed" | "flagged" | "due";
type Length = 10 | 20 | 0; // 0 = all remaining
type Phase = "setup" | "run" | "done";
type Result = { q: Question; picked: number | null; correct: boolean };

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All questions" },
  { id: "new", label: "New to me" },
  { id: "missed", label: "Missed" },
  { id: "due", label: "Due for review" },
  { id: "flagged", label: "Flagged" },
];

function matches(f: Filter, q: Question, p: Store) {
  const r = p.attempts[q.id];
  const seen = !!r && r.right + r.wrong > 0;
  if (f === "new") return !seen;
  if (f === "missed") return seen && !r.lastOk;
  if (f === "flagged") return !!r?.flag;
  if (f === "due") return isDue(r);
  return true;
}

const shuffle = <T,>(a: T[]) => {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
};

/** Unseen first, then missed, then due, then the ones answered longest ago. */
function ordered(qs: Question[], p: Store) {
  const rank = (q: Question) => {
    const r = p.attempts[q.id];
    if (!r || r.right + r.wrong === 0) return 0;
    if (!r.lastOk) return 1;
    return isDue(r) ? 2 : 3;
  };
  const groups: Question[][] = [[], [], [], []];
  for (const q of qs) groups[rank(q)].push(q);
  groups[3].sort((a, b) => (p.attempts[a.id]?.last ?? 0) - (p.attempts[b.id]?.last ?? 0));
  return [...shuffle(groups[0]), ...shuffle(groups[1]), ...shuffle(groups[2]), ...groups[3]];
}

export default function Quiz({
  track,
  examName,
  questions,
}: {
  track: Track;
  examName: string;
  questions: Question[];
}) {
  const progress = useProgress();
  const [phase, setPhase] = useState<Phase>("setup");
  const [filter, setFilter] = useState<Filter>("all");
  const [length, setLength] = useState<Length>(10);
  const [timed, setTimed] = useState(false);
  const [deck, setDeck] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const [left, setLeft] = useState(0);
  const [genTopic, setGenTopic] = useState("");
  const [genBusy, setGenBusy] = useState(false);
  const [genError, setGenError] = useState("");

  const topics = useMemo(() => Array.from(new Set(questions.map((q) => q.area))).sort(), [questions]);
  const topicKey = useCallback((area: string) => `${track}/${area}`, [track]);

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: questions.length, new: 0, missed: 0, flagged: 0, due: 0 };
    for (const q of questions) for (const f of ["new", "missed", "flagged", "due"] as const) if (matches(f, q, progress)) c[f]++;
    return c;
  }, [questions, progress]);

  const start = useCallback(
    (qs: Question[], isTimed: boolean) => {
      if (!qs.length) return;
      setDeck(qs);
      setIndex(0);
      setPicked(null);
      setChecked(false);
      setResults([]);
      setTimed(isTimed);
      setLeft(isTimed ? qs.length * SECONDS_PER_Q[track] : 0);
      setPhase("run");
    },
    [track],
  );

  const startPractice = () => {
    const pool = ordered(questions.filter((q) => matches(filter, q, progress)), progress);
    start(length ? pool.slice(0, length) : pool, false);
  };
  const startMini = () => start(shuffle(ordered(questions, progress).slice(0, MINI * 2)).slice(0, MINI), true);
  const startWeakest = (area: string) =>
    start(ordered(questions.filter((q) => q.area === area), progress).slice(0, 10), false);

  // when the clock runs out the exam ends; unanswered questions count as missed but are not recorded
  const expired = phase === "run" && timed && left <= 0;
  const view: Phase = expired ? "done" : phase;
  const shown = expired ? [...results, ...deck.slice(results.length).map((x) => ({ q: x, picked: null, correct: false }))] : results;
  const generate = async () => {
    setGenBusy(true);
    setGenError("");
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ track, exam: examName, topic: genTopic, topics, count: 5 }),
      });
      const data = await res.json();
      if (!res.ok) setGenError(data.error ?? "Something went wrong.");
      else start(data.questions as Question[], false);
    } catch {
      setGenError("Could not reach the server. Check your connection.");
    }
    setGenBusy(false);
  };

  const q = deck[index];

  const finish = useCallback(() => setPhase("done"), []);

  const check = useCallback(() => {
    if (picked === null || checked || !q) return;
    if (!q.gen) recordAnswer(q.id, picked === q.answer, topicKey(q.area));
    setResults((r) => [...r, { q, picked, correct: picked === q.answer }]);
    if (timed) {
      // mini-exam: no answer reveal, straight on
      if (index + 1 >= deck.length) setPhase("done");
      else {
        setIndex((i) => i + 1);
        setPicked(null);
      }
    } else setChecked(true);
  }, [picked, checked, q, topicKey, timed, index, deck.length]);

  const next = useCallback(() => {
    if (index + 1 >= deck.length) return finish();
    setIndex((i) => i + 1);
    setPicked(null);
    setChecked(false);
  }, [index, deck.length, finish]);

  // trailing run of right answers (practice sessions only; a mini-exam hides answers)
  const streak = useMemo(() => {
    let n = 0;
    for (let i = results.length - 1; i >= 0 && results[i].correct; i--) n++;
    return n;
  }, [results]);

  // feedback when an answer is revealed: ripple and sparkles for a right one, a shake for a wrong one
  useEffect(() => {
    if (!checked || timed) return;
    const last = results[results.length - 1];
    if (!last) return;
    const right = document.querySelector('[data-state="right"] button');
    if (last.correct) {
      fxAt("ripple", right, { hue: streak >= 5 ? 45 : 215 });
      fxAt("sparkle", right, { hue: streak >= 5 ? 45 : 205, power: 1 + Math.min(streak, 8) * 0.18 });
      if (streak === 3 || streak === 5 || streak === 10) fxAt("shatter", document.querySelector("[data-streak]"), { hue: 48, power: 0.6 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checked]);

  // the finish: glass shatters for a strong score, a few sparkles otherwise
  useEffect(() => {
    if (phase !== "done" || results.length === 0) return;
    const share = results.filter((r) => r.correct).length / results.length;
    const t = window.setTimeout(() => {
      if (share >= 0.8) {
        fx("shatter", innerWidth * 0.5, innerHeight * 0.28, { hue: 215, power: 1.2 });
        window.setTimeout(() => fx("shatter", innerWidth * 0.3, innerHeight * 0.3, { hue: 200 }), 220);
        window.setTimeout(() => fx("shatter", innerWidth * 0.7, innerHeight * 0.3, { hue: 230 }), 380);
      } else if (share >= 0.5) fx("sparkle", innerWidth * 0.5, innerHeight * 0.3, { power: 1.6 });
    }, 250);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // exam clock
  useEffect(() => {
    if (phase !== "run" || !timed) return;
    const id = setInterval(() => setLeft((l) => l - 1), 1000);
    return () => clearInterval(id);
  }, [phase, timed]);

  useEffect(() => {
    if (phase !== "run") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const n = Number(e.key);
      if (!checked && n >= 1 && n <= 4) setPicked(n - 1);
      else if (e.key === "Enter") {
        e.preventDefault();
        if (checked) next();
        else check();
      } else if ((e.key === "f" || e.key === "F") && q) toggleFlag(q.id);
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [phase, checked, check, next, q]);

  // ---------------- setup ----------------
  if (view === "setup") {
    const avail = counts[filter];
    return (
      <section className={styles.wrap}>
        <p className={styles.kicker}>{examName}</p>
        <h1 className={styles.setupTitle}>Choose how to practise</h1>
        <p className={styles.pct}>
          Every answer has a reason. AI-written, not yet owner-reviewed.
        </p>

        <h2 className={styles.h3}>Topics</h2>
        <ul className={styles.topics}>
          {topics.map((t) => {
            const m = masteryOf(progress.topics[topicKey(t)]);
            return (
              <li key={t} data-level={m.label.replace(" ", "")}>
                <span>{t}</span>
                <span className={styles.meter} aria-hidden="true">
                  <i style={{ width: `${m.pct}%` }} />
                </span>
                <span className={styles.level}>{m.label}</span>
              </li>
            );
          })}
        </ul>

        <h2 className={styles.h3}>Practice</h2>
        <div className={styles.group} role="radiogroup" aria-label="Questions to include">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              role="radio"
              aria-checked={filter === f.id}
              className={styles.chip}
              data-on={filter === f.id}
              onClick={() => setFilter(f.id)}
              disabled={counts[f.id] === 0 && f.id !== "all"}
            >
              {f.label} <b>{counts[f.id]}</b>
            </button>
          ))}
        </div>
        <div className={styles.group} role="radiogroup" aria-label="Session length">
          {([10, 20, 0] as Length[]).map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={length === n}
              className={styles.chip}
              data-on={length === n}
              onClick={() => setLength(n)}
            >
              {n === 0 ? "All remaining" : `${n} questions`}
            </button>
          ))}
        </div>
        <div className={styles.actions}>
          <button className={styles.primary} onClick={startPractice} disabled={avail === 0}>
            Start practice
          </button>
          <button className={styles.secondary} onClick={startMini} disabled={questions.length < MINI}>
            Timed mini-exam · {MINI} questions · {Math.round((MINI * SECONDS_PER_Q[track]) / 60)} min
          </button>
        </div>
        {!STATIC_SITE && (
          <>
            <h2 className={styles.h3}>Fresh questions</h2>
            <p className={styles.note}>
              Ask the AI to write 5 brand-new questions right now. They are unreviewed and do not count toward your rank.
            </p>
            <div className={styles.group}>
              <select className={styles.select} value={genTopic} onChange={(e) => setGenTopic(e.target.value)} aria-label="Topic for new questions">
                <option value="">Any topic</option>
                {topics.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <button className={styles.secondary} onClick={generate} disabled={genBusy}>
                {genBusy ? "Writing questions..." : "Generate 5 new questions"}
              </button>
            </div>
            {genError && <p className={styles.genError} role="alert">{genError}</p>}
          </>
        )}
        <p className={styles.note}>
          Order: new questions first, then ones you missed, then ones due for review (a right answer returns after
          1, 2, 4, 7 and 14 days). Full {track === "deca" ? "100" : "50"}-question exams unlock as the bank grows.
        </p>
        <Link className={styles.back} href={`/${track}`}>
          Back to {track.toUpperCase()}
        </Link>
      </section>
    );
  }

  // ---------------- results ----------------
  if (view === "done") {
    const score = shown.filter((r) => r.correct).length;
    const byTopic = topics
      .map((t) => {
        const rs = shown.filter((r) => r.q.area === t);
        return { t, n: rs.length, right: rs.filter((r) => r.correct).length };
      })
      .filter((x) => x.n > 0);
    const weakest = [...byTopic].sort((a, b) => a.right / a.n - b.right / b.n)[0];
    const missed = shown.filter((r) => !r.correct);
    return (
      <section className={styles.wrap} aria-live="polite">
        <p className={styles.kicker}>{examName}</p>
        <h1 className={styles.score}>
          {score} of {shown.length}
        </h1>
        <p className={styles.pct}>
          {Math.round((score / Math.max(shown.length, 1)) * 100)}% correct. Practice only, not a predicted score.
        </p>
        <ul className={styles.areas}>
          {byTopic.map((a) => (
            <li key={a.t}>
              <span>{a.t}</span>
              <span className={a.right === a.n ? styles.good : styles.soft}>
                {a.right}/{a.n}
              </span>
            </li>
          ))}
        </ul>
        <div className={styles.actions}>
          <button className={styles.primary} onClick={() => setPhase("setup")}>
            Practise again
          </button>
          {weakest && weakest.right < weakest.n && (
            <button className={styles.secondary} onClick={() => startWeakest(weakest.t)}>
              Practise weakest topic: {weakest.t}
            </button>
          )}
        </div>
        {timed && missed.length > 0 && (
          <>
            <h2 className={styles.h3}>Review what you missed</h2>
            {missed.map((r) => (
              <div key={r.q.id} className={styles.review}>
                <p className={styles.area}>{r.q.area}</p>
                <p className={styles.reviewQ}>{r.q.q}</p>
                <p>
                  <b className={styles.good}>Correct:</b> {r.q.options[r.q.answer].t}. {r.q.options[r.q.answer].why}
                </p>
                {r.picked !== null ? (
                  <p className={styles.soft}>
                    You chose: {r.q.options[r.picked].t}. {r.q.options[r.picked].why}
                  </p>
                ) : (
                  <p className={styles.soft}>Not answered before time ran out.</p>
                )}
              </div>
            ))}
          </>
        )}
        <Link className={styles.back} href={`/${track}`}>
          Back to {track.toUpperCase()}
        </Link>
      </section>
    );
  }

  // ---------------- running ----------------
  const flagged = !!progress.attempts[q.id]?.flag;
  const mm = String(Math.floor(Math.max(left, 0) / 60));
  const ss = String(Math.max(left, 0) % 60).padStart(2, "0");
  return (
    <section className={styles.wrap}>
      <div className={styles.top}>
        <p className={styles.kicker}>
          {examName}
          {timed ? " · mini-exam" : ""}
        </p>
        <p className={styles.count}>
          {timed && (
            <span className={styles.clock} data-low={left <= 60}>
              {mm}:{ss}
            </span>
          )}
          {!timed && streak >= 2 && (
            <span className={styles.streak} data-streak data-level={streak >= 10 ? 3 : streak >= 5 ? 2 : streak >= 3 ? 1 : 0}>
              {streak} in a row
            </span>
          )}
          Question {index + 1} of {deck.length}
        </p>
      </div>
      <div className={styles.bar} aria-hidden="true">
        <span style={{ transform: `scaleX(${index / deck.length})` }} />
      </div>

      <div className={styles.areaRow}>
        <p className={styles.area}>{q.area}{q.gen ? " · AI-generated, unreviewed" : ""}</p>
        <button
          type="button"
          className={styles.flag}
          aria-pressed={flagged}
          onClick={() => toggleFlag(q.id)}
          title="Flag for later (F)"
        >
          {flagged ? "Flagged" : "Flag"}
        </button>
      </div>
      <h1 className={styles.prompt}>{q.q}</h1>

      <div className={styles.options} role="radiogroup" aria-label="Answer choices">
        {q.options.map((o, i) => {
          const isAnswer = i === q.answer;
          const isPicked = i === picked;
          const state = !checked ? (isPicked ? "picked" : "") : isAnswer ? "right" : isPicked ? "wrong" : "other";
          return (
            <div key={i} className={styles.option} data-state={state}>
              <button
                type="button"
                role="radio"
                aria-checked={isPicked}
                disabled={checked}
                className={styles.choice}
                onClick={() => setPicked(i)}
              >
                <span className={styles.letter}>{LETTERS[i]}</span>
                <span>{o.t}</span>
                {checked && isAnswer && <span className={styles.tag}>Correct answer</span>}
                {checked && isPicked && !isAnswer && <span className={styles.tag}>Your answer</span>}
              </button>
              {checked && <p className={styles.why}>{o.why}</p>}
            </div>
          );
        })}
      </div>

      <div className={styles.actions}>
        {!checked ? (
          <button className={styles.primary} onClick={check} disabled={picked === null}>
            {timed ? (index + 1 === deck.length ? "Finish" : "Next") : "Check"}
          </button>
        ) : (
          <button className={styles.primary} onClick={next} autoFocus>
            {index + 1 === deck.length ? "See results" : "Next question"}
          </button>
        )}
        <button className={styles.quit} onClick={finish}>
          End session
        </button>
        <p className={styles.keys}>Keys: 1 to 4 choose, Enter confirm, F flag</p>
      </div>
    </section>
  );
}
