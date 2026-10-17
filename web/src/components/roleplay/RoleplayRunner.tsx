"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Scenario } from "@/lib/scenarios";
import styles from "./Roleplay.module.css";

type Stage = "brief" | "prep" | "present" | "score" | "done";
const BANDS = ["Beginning", "Developing", "Solid", "Strong"] as const;
const EXTRA = ["Solution", "Communication", "One remarkable idea"];

function useCountdown(endsAt: number | null, onDone: () => void) {
  const [now, setNow] = useState(() => Date.now());
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  });
  useEffect(() => {
    if (!endsAt) return;
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= endsAt) {
        clearInterval(id);
        done.current(); // time is up: move on, like the conference does
      }
    }, 250);
    return () => clearInterval(id);
  }, [endsAt]);
  // Remaining time comes from a stored end timestamp, so it stays right even if the tab sleeps.
  return endsAt ? Math.max(0, Math.ceil((endsAt - now) / 1000)) : null;
}

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export default function RoleplayRunner({ scenario }: { scenario: Scenario }) {
  const [stage, setStage] = useState<Stage>("brief");
  const [timed, setTimed] = useState(true);
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [covered, setCovered] = useState<boolean[]>(() => scenario.indicators.map(() => false));
  const [scores, setScores] = useState<Record<string, number>>({});
  const [improve, setImprove] = useState("");
  const notesKey = `g2g-notes-${scenario.id}`;

  const saveNotes = (v: string) => {
    setNotes(v);
    try {
      localStorage.setItem(notesKey, v);
    } catch {}
  };

  const go = (s: Stage) => {
    setStage(s);
    if (s === "prep") {
      try {
        setNotes(localStorage.getItem(notesKey) ?? "");
      } catch {}
    }
    if (s === "prep") setEndsAt(Date.now() + scenario.prep * 60_000);
    else if (s === "present") setEndsAt(Date.now() + scenario.present * 60_000);
    else setEndsAt(null);
  };

  const left = useCountdown(timed ? endsAt : null, () => {
    if (stage === "prep") go("present");
    else if (stage === "present") go("score");
  });

  const rubric = [...scenario.indicators, ...EXTRA];

  return (
    <section className={styles.wrap}>
      <p className={styles.kicker}>
        {scenario.format} · {scenario.prep} min prep · {scenario.present} min presenting
      </p>

      {stage === "brief" && (
        <>
          <h1 className={styles.title}>Your brief</h1>
          <dl className={styles.facts}>
            <div><dt>You are</dt><dd>{scenario.you}</dd></div>
            <div><dt>Your judge</dt><dd>{scenario.judge}</dd></div>
            <div><dt>The business</dt><dd>{scenario.business}</dd></div>
          </dl>
          <h2 className={styles.h2}>Performance indicators</h2>
          <ol className={styles.list}>
            {scenario.indicators.map((i) => <li key={i}>{i}</li>)}
          </ol>
          <p className={styles.note}>
            The full situation stays hidden until you start prep, because reading time counts as prep at a conference.
          </p>
          <label className={styles.toggle}>
            <input type="checkbox" checked={!timed} onChange={(e) => setTimed(!e.target.checked)} />
            Practice without the timer
          </label>
          <div className={styles.actions}>
            <button className={styles.primary} onClick={() => go("prep")}>Start prep</button>
          </div>
        </>
      )}

      {stage === "prep" && (
        <>
          <div className={styles.timerRow}>
            <h1 className={styles.title}>Prep</h1>
            {timed && left !== null && <p className={styles.timer} data-low={left <= 60 || undefined}>{clock(left)}</p>}
          </div>
          <div className={styles.split}>
            <div>
              <h2 className={styles.h2}>The situation</h2>
              {scenario.situation.map((p) => <p key={p} className={styles.para}>{p}</p>)}
              <h2 className={styles.h2}>What the judge wants</h2>
              <ul className={styles.list}>{scenario.tasks.map((t) => <li key={t}>{t}</li>)}</ul>
            </div>
            <label className={styles.notes}>
              <span>Your notes (saved on this device)</span>
              <textarea value={notes} onChange={(e) => saveNotes(e.target.value)} rows={14} />
            </label>
          </div>
          <div className={styles.actions}>
            <button className={styles.primary} onClick={() => go("present")}>I&apos;m ready to present</button>
          </div>
        </>
      )}

      {stage === "present" && (
        <>
          <div className={styles.timerRow}>
            <h1 className={styles.title}>Present</h1>
            {timed && left !== null && <p className={styles.timer} data-low={left <= 60 || undefined}>{clock(left)}</p>}
          </div>
          <p className={styles.note}>Talk to your judge out loud. Tick each indicator as you cover it.</p>
          <ul className={styles.checks}>
            {scenario.indicators.map((ind, i) => (
              <li key={ind}>
                <label>
                  <input
                    type="checkbox"
                    checked={covered[i]}
                    onChange={() => setCovered((c) => c.map((v, j) => (j === i ? !v : v)))}
                  />
                  {ind}
                </label>
              </li>
            ))}
          </ul>
          <div className={styles.actions}>
            <button className={styles.primary} onClick={() => go("score")}>Finish and score</button>
          </div>
        </>
      )}

      {stage === "score" && (
        <>
          <h1 className={styles.title}>Score yourself</h1>
          <p className={styles.note}>Be honest. Practice scores only, not a prediction of a real judge.</p>
          <div className={styles.rubric}>
            {rubric.map((row) => (
              <fieldset key={row} className={styles.rubricRow}>
                <legend>{row}</legend>
                <div className={styles.bands}>
                  {BANDS.map((b, i) => (
                    <label key={b} data-on={scores[row] === i || undefined}>
                      <input
                        type="radio"
                        name={row}
                        checked={scores[row] === i}
                        onChange={() => setScores((s) => ({ ...s, [row]: i }))}
                      />
                      {b}
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
          </div>
          <p className={styles.purple}>
            <strong>One remarkable idea:</strong> judges hear a lot of safe answers. Did you give one specific idea they
            would remember, and could you say what it costs and how you would measure it?
          </p>
          <div className={styles.actions}>
            <button className={styles.primary} onClick={() => go("done")} disabled={Object.keys(scores).length < rubric.length}>
              See summary
            </button>
          </div>
        </>
      )}

      {stage === "done" && (
        <>
          <h1 className={styles.title}>Summary</h1>
          <ul className={styles.summary}>
            {rubric.map((row) => (
              <li key={row}>
                <span>{row}</span>
                <span data-band={scores[row]}>{BANDS[scores[row]]}</span>
              </li>
            ))}
          </ul>
          <label className={styles.notes}>
            <span>Your top three things to improve</span>
            <textarea value={improve} onChange={(e) => setImprove(e.target.value)} rows={5} />
          </label>
          <p className={styles.note}>
            Next up on Glass2Go: record yourself on camera, replay it, and get AI feedback against this same rubric.
          </p>
          <div className={styles.actions}>
            <button className={styles.primary} onClick={() => { setScores({}); setCovered(scenario.indicators.map(() => false)); go("brief"); }}>
              Run it again
            </button>
            <Link className={styles.secondary} href={`/${scenario.track}`}>Back to {scenario.track.toUpperCase()}</Link>
          </div>
        </>
      )}
    </section>
  );
}
