"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LEVELS, clock, eventBySlug, levelFor, rubricFor, totalMax, usesAccurate, KINDS, type RubricRow } from "@/lib/roleplays";
import { deleteRecording, getRecording, listRecordings, updateRecording, type Recording } from "@/lib/recordings";
import styles from "./RoleplayHub.module.css";

const GROUPS = ["Performance indicators", "Solution", "Career competencies", "Overall impression"] as const;

export default function Recordings() {
  const id = useSearchParams().get("id");
  return id ? <Review id={id} /> : <List />;
}

const scoreOf = (r: Recording) => {
  const ev = eventBySlug(r.eventSlug);
  const sc = ev?.scenarios.find((s) => s.id === r.scenarioId);
  if (!ev || !sc) return null;
  const rows = rubricFor(ev.kind, sc.p, usesAccurate(ev));
  const got = rows.reduce((a, row) => a + (r.scores[row.key] ?? 0), 0);
  return Object.keys(r.scores).length ? { got, max: totalMax(rows) } : null;
};

function List() {
  const [items, setItems] = useState<Recording[] | null>(null);
  const router = useRouter();
  useEffect(() => {
    let off = false;
    listRecordings()
      .then((l) => !off && setItems(l))
      .catch(() => !off && setItems([]));
    return () => {
      off = true;
    };
  }, []);
  return (
    <section className={styles.page}>
      <Link href="/deca/roleplay" className={styles.back}>All events</Link>
      <h1 className={styles.title}>Your recordings</h1>
      <p className={styles.lede}>Saved in this browser only. Clearing your browser data removes them, so download any you want to keep.</p>
      {items === null ? null : items.length === 0 ? (
        <p className={styles.small}>Nothing here yet. Finish a role-play and your recording will appear.</p>
      ) : (
        <ul className={styles.recBig}>
          {items.map((r) => {
            const s = scoreOf(r);
            return (
              <li key={r.id}>
                <Link href={`/deca/recordings?id=${r.id}`} className={styles.recRow}>
                  <span className={styles.abbr}>{eventBySlug(r.eventSlug)?.abbr ?? "?"}</span>
                  <span className={styles.eventName}>{r.eventName}</span>
                  <span className={styles.eventMeta}>
                    {new Date(r.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })} · {clock(r.seconds)}
                  </span>
                  <span className={styles.recScore}>{s ? `${s.got}/${s.max}` : "Not scored"}</span>
                </Link>
                <button
                  className={styles.linkBtn}
                  onClick={async () => {
                    if (!confirm("Delete this recording?")) return;
                    await deleteRecording(r.id);
                    setItems((cur) => cur?.filter((x) => x.id !== r.id) ?? null);
                    router.refresh();
                  }}
                >
                  Delete
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function Review({ id }: { id: string }) {
  const router = useRouter();
  const [rec, setRec] = useState<Recording | null | undefined>(undefined);
  const [url, setUrl] = useState("");
  const [scores, setScores] = useState<Record<string, number>>({});
  const [reflection, setReflection] = useState("");
  const [marks, setMarks] = useState<{ t: number; label: string }[]>([]);
  const [markLabel, setMarkLabel] = useState("");
  const media = useRef<HTMLVideoElement & HTMLAudioElement>(null);
  const loaded = useRef(false);

  useEffect(() => {
    let off = false;
    let u = "";
    getRecording(id)
      .then((r) => {
        if (off) return;
        if (r) {
          setScores(r.scores);
          setReflection(r.reflection);
          setMarks(r.marks);
          if (r.blob.size) {
            u = URL.createObjectURL(r.blob);
            setUrl(u);
          }
        }
        setRec(r ?? null);
        window.setTimeout(() => (loaded.current = true), 0);
      })
      .catch(() => !off && setRec(null));
    return () => {
      off = true;
      if (u) URL.revokeObjectURL(u);
    };
  }, [id]);

  // save as you go
  useEffect(() => {
    if (!loaded.current) return;
    const t = window.setTimeout(() => void updateRecording(id, { scores, reflection, marks }), 500);
    return () => window.clearTimeout(t);
  }, [id, scores, reflection, marks]);

  const event = rec ? eventBySlug(rec.eventSlug) : undefined;
  const scenario = event?.scenarios.find((s) => s.id === rec?.scenarioId);
  const rows = useMemo(() => (event && scenario ? rubricFor(event.kind, scenario.p, usesAccurate(event)) : []), [event, scenario]);
  const max = totalMax(rows);
  const got = rows.reduce((a, r) => a + (scores[r.key] ?? 0), 0);
  const scoredAll = rows.length > 0 && rows.every((r) => scores[r.key] !== undefined);

  const flag = useCallback(() => {
    const t = media.current?.currentTime ?? 0;
    setMarks((m) => [...m, { t: Math.round(t), label: markLabel.trim() || "Revisit this" }].sort((a, b) => a.t - b.t));
    setMarkLabel("");
  }, [markLabel]);

  if (rec === undefined) return <section className={styles.page}><p className={styles.small}>Loading...</p></section>;
  if (!rec || !event || !scenario)
    return (
      <section className={styles.page}>
        <h1 className={styles.title}>Recording not found</h1>
        <p className={styles.lede}>It may have been deleted, or it was saved in a different browser.</p>
        <Link href="/deca/roleplay" className={styles.back}>Back to events</Link>
      </section>
    );

  const kind = KINDS[event.kind];

  return (
    <section className={styles.page}>
      <Link href="/deca/recordings" className={styles.back}>All recordings</Link>
      <p className={styles.kicker}>{kind.label} · {event.abbr} · {new Date(rec.createdAt).toLocaleString()}</p>
      <h1 className={styles.title}>{event.name}</h1>

      <div className={styles.reviewGrid}>
        <div>
          <div className={styles.player}>
            {url ? (
              rec.hasVideo ? (
                <video ref={media} src={url} controls playsInline className={styles.playerVideo} />
              ) : (
                <audio ref={media} src={url} controls className={styles.playerAudio} />
              )
            ) : (
              <p className={styles.small}>No recording was saved for this round, but you can still score it below.</p>
            )}
          </div>
          {url && (
            <div className={styles.tools}>
              <label className={styles.small}>
                Speed{" "}
                <select
                  defaultValue="1"
                  onChange={(e) => {
                    if (media.current) media.current.playbackRate = Number(e.target.value);
                  }}
                >
                  {["0.75", "1", "1.25", "1.5"].map((v) => (
                    <option key={v} value={v}>{v}x</option>
                  ))}
                </select>
              </label>
              <a className={styles.linkBtn} href={url} download={`${event.abbr}-${new Date(rec.createdAt).toISOString().slice(0, 10)}.${rec.mime.includes("mp4") ? "mp4" : "webm"}`}>
                Download
              </a>
            </div>
          )}
          {url && (
            <div className={styles.marks}>
              <h2 className={styles.h2}>Flag moments to improve</h2>
              <div className={styles.markAdd}>
                <input value={markLabel} onChange={(e) => setMarkLabel(e.target.value)} placeholder="What happened here? (optional)" onKeyDown={(e) => e.key === "Enter" && flag()} />
                <button className={styles.ghost} onClick={flag}>Flag this moment</button>
              </div>
              <ul className={styles.markList}>
                {marks.map((m, i) => (
                  <li key={`${m.t}-${i}`}>
                    <button className={styles.linkBtn} onClick={() => media.current && (media.current.currentTime = m.t)}>{clock(m.t)}</button>
                    <span>{m.label}</span>
                    <button className={styles.linkBtn} aria-label="Remove flag" onClick={() => setMarks((cur) => cur.filter((_, j) => j !== i))}>Remove</button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <details className={styles.details}>
            <summary>The prompt you were given</summary>
            <p className={styles.small}>{scenario.a} · you were the {scenario.r} for {scenario.c}, presenting to the {scenario.j}.</p>
            {scenario.s.map((p) => <p key={p} className={styles.para}>{p}</p>)}
            {scenario.f && <ul className={styles.list}>{scenario.f.map((f) => <li key={f}>{f}</li>)}</ul>}
            <h3 className={styles.h3}>Performance indicators</h3>
            <ul className={styles.list}>{scenario.p.map((p) => <li key={p}>{p}</li>)}</ul>
          </details>
          <details className={styles.details} open>
            <summary>What a strong answer includes</summary>
            <ul className={styles.list}>{scenario.n.map((p) => <li key={p}>{p}</li>)}</ul>
            <h3 className={styles.h3}>The judge asked</h3>
            <ul className={styles.list}>{scenario.q.map((p) => <li key={p}>{p}</li>)}</ul>
          </details>
          {rec.notes && (
            <details className={styles.details}>
              <summary>Your prep notes</summary>
              <p className={styles.notesBox}>{rec.notes}</p>
            </details>
          )}
        </div>

        <div>
          <h2 className={styles.h2}>Score it on the 2026-27 rubric</h2>
          <p className={styles.small}>Watch first, then score each row honestly. Practice scoring only, never a prediction of a real judge.</p>
          {GROUPS.map((g) => (
            <fieldset key={g} className={styles.group}>
              <legend>{g}</legend>
              {rows.filter((r) => r.group === g).map((r) => (
                <RubricRowInput key={r.key} row={r} value={scores[r.key]} onChange={(v) => setScores((s) => ({ ...s, [r.key]: v }))} />
              ))}
            </fieldset>
          ))}
          <div className={styles.total} data-done={scoredAll || undefined}>
            <span>Total</span>
            <strong>{got} / {max}</strong>
          </div>
          <label className={styles.reflect}>
            <span>What will you change next time?</span>
            <textarea value={reflection} onChange={(e) => setReflection(e.target.value)} rows={5} placeholder="One thing you did well. One thing to fix first." />
          </label>
          <div className={styles.actionsRow}>
            <Link className={styles.primary} href={`/deca/events/${event.slug}`}>Practise again</Link>
            <button
              className={styles.linkBtn}
              onClick={async () => {
                if (!confirm("Delete this recording and its scores?")) return;
                await deleteRecording(id);
                router.push("/deca/recordings");
              }}
            >
              Delete recording
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function RubricRowInput({ row, value, onChange }: { row: RubricRow; value: number | undefined; onChange: (v: number) => void }) {
  const lvl = value === undefined ? null : levelFor(value, row.max, row.overall);
  return (
    <div className={styles.rubricRow}>
      <div className={styles.rubricHead}>
        <span className={styles.rubricLabel}>{row.label}</span>
        <span className={styles.rubricVal} data-level={lvl ? LEVELS.indexOf(lvl) : undefined}>
          {value === undefined ? "Not scored" : `${value}/${row.max} · ${lvl}`}
        </span>
      </div>
      {row.hint && <p className={styles.small}>{row.hint}</p>}
      <input
        type="range"
        min={0}
        max={row.max}
        step={1}
        value={value ?? 0}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={`${row.label}, out of ${row.max}`}
        data-unset={value === undefined || undefined}
      />
    </div>
  );
}
