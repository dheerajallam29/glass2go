"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { KINDS, eventBySlug, type Scenario } from "@/lib/roleplays";
import { listRecordings, type Recording } from "@/lib/recordings";
import Studio from "./Studio";
import styles from "./RoleplayHub.module.css";

export default function EventPractice({ slug }: { slug: string }) {
  const event = eventBySlug(slug)!;
  const kind = KINDS[event.kind];
  const [picked, setPicked] = useState<Scenario | null>(null);
  const [mine, setMine] = useState<Recording[]>([]);

  useEffect(() => {
    let off = false;
    listRecordings()
      .then((l) => !off && setMine(l.filter((r) => r.eventSlug === slug)))
      .catch(() => {});
    return () => {
      off = true;
    };
  }, [slug]);

  if (picked) return <Studio key={picked.id} event={event} scenario={picked} />;

  const random = () => setPicked(event.scenarios[Math.floor(Math.random() * event.scenarios.length)]);

  return (
    <section className={styles.page}>
      <Link href="/deca/roleplay" className={styles.back}>All events</Link>
      <p className={styles.kicker}>{kind.label} · {event.abbr}</p>
      <h1 className={styles.title}>{event.name}</h1>
      <p className={styles.lede}>
        {kind.who === "individual" ? "You present to a judge." : "You and a partner present to a judge."} {kind.prep} minutes to prep, {kind.speak} minutes to present and {kind.ask} for the
        judge&apos;s questions. Your camera records the presentation so you can watch it back and score yourself on the 2026-27 rubric.
      </p>

      <div className={styles.flow} aria-label="How a practice round works">
        {[
          [`${kind.prep} min`, "Prep", "Read the situation and plan with notes"],
          [`${kind.speak} min`, "Present", "Prompt hidden. Camera and mic are recording"],
          [`${kind.ask} min`, "Judge questions", "Two questions, answered out loud"],
          ["After", "Review", "Watch yourself, mark moments, score the rubric"],
        ].map(([t, h, p]) => (
          <div key={h} className={styles.step}>
            <span className={styles.stepTime}>{t}</span>
            <strong>{h}</strong>
            <span className={styles.small}>{p}</span>
          </div>
        ))}
      </div>

      <div className={styles.actionsRow}>
        <button className={styles.primary} onClick={random}>Surprise me</button>
        <span className={styles.small}>or pick a scenario</span>
      </div>

      <ol className={styles.scenarios}>
        {event.scenarios.map((s, i) => (
          <li key={s.id}>
            <button type="button" className={styles.scenario} onClick={() => setPicked(s)}>
              <span className={styles.num}>{i + 1}</span>
              <span className={styles.scenarioText}>
                <span className={styles.scenarioArea}>{s.a}</span>
                <span className={styles.scenarioRole}>{s.r}</span>
                <span className={styles.small}>{s.c}</span>
              </span>
              <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
                <path d="M3 8h9M8.5 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </li>
        ))}
      </ol>

      {mine.length > 0 && (
        <div className={styles.mine}>
          <h2 className={styles.h2}>Your recordings for this event</h2>
          <ul className={styles.recList}>
            {mine.slice(0, 5).map((r) => (
              <li key={r.id}>
                <Link href={`/deca/recordings?id=${r.id}`}>
                  {new Date(r.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })} · {Math.floor(r.seconds / 60)}:{String(r.seconds % 60).padStart(2, "0")}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
