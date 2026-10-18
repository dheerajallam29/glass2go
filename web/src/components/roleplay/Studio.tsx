"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { KINDS, clock, type RoleplayEvent, type Scenario } from "@/lib/roleplays";
import { newId, pickMime, saveRecording } from "@/lib/recordings";
import styles from "./Studio.module.css";

type Stage = "setup" | "prep" | "present" | "ask" | "saving";
type Cam = "idle" | "asking" | "ready" | "audio" | "denied" | "none";

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
        done.current();
      }
    }, 200);
    return () => clearInterval(id);
  }, [endsAt]);
  return endsAt ? Math.max(0, Math.ceil((endsAt - now) / 1000)) : null;
}

/** The whole role-play: set up the camera, prep, present on camera, answer the judge, then review the recording. */
export default function Studio({ event, scenario }: { event: RoleplayEvent; scenario: Scenario }) {
  const router = useRouter();
  const kind = KINDS[event.kind];
  const [stage, setStage] = useState<Stage>("setup");
  const [cam, setCam] = useState<Cam>("idle");
  const [level, setLevel] = useState(0);
  const [notes, setNotes] = useState("");
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [timed, setTimed] = useState(true);
  const [question, setQuestion] = useState(0); // the question the presenter moved on to; the clock moves it on too
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState("");

  const streamRef = useRef<MediaStream | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const startedAt = useRef(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const stageRef = useRef<Stage>("setup");
  const notesRef = useRef("");
  const audioCtx = useRef<AudioContext | null>(null);
  const meterRaf = useRef(0);

  const attach = useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node;
    if (node && streamRef.current && node.srcObject !== streamRef.current) {
      node.srcObject = streamRef.current;
      void node.play().catch(() => {});
    }
  }, []);

  // ---- camera and microphone ----
  const startMeter = (stream: MediaStream) => {
    try {
      const ctx = new AudioContext();
      audioCtx.current = ctx;
      const src = ctx.createMediaStreamSource(stream);
      const an = ctx.createAnalyser();
      an.fftSize = 512;
      src.connect(an);
      const buf = new Uint8Array(an.frequencyBinCount);
      const tick = () => {
        an.getByteTimeDomainData(buf);
        let peak = 0;
        for (const v of buf) peak = Math.max(peak, Math.abs(v - 128));
        setLevel(Math.min(1, peak / 70));
        meterRaf.current = requestAnimationFrame(tick);
      };
      tick();
    } catch {}
  };

  const enableCamera = async () => {
    setCam("asking");
    setError("");
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("unsupported");
      let stream: MediaStream;
      let mode: Cam = "ready";
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" }, audio: { echoCancellation: true, noiseSuppression: true } });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mode = "audio";
      }
      streamRef.current = stream;
      setCam(mode);
      startMeter(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        void videoRef.current.play().catch(() => {});
      }
    } catch {
      setCam("denied");
      setError("The camera and microphone are blocked. Allow them in your browser's address bar and try again, or practise without recording.");
    }
  };

  const stopStream = useCallback(() => {
    cancelAnimationFrame(meterRaf.current);
    audioCtx.current?.close().catch(() => {});
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => () => stopStream(), [stopStream]);

  // ---- recording ----
  const startRecording = () => {
    const stream = streamRef.current;
    if (!stream || typeof MediaRecorder === "undefined") return;
    const hasVideo = stream.getVideoTracks().length > 0;
    const mime = pickMime(hasVideo);
    try {
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: 1_800_000 } : undefined);
      chunks.current = [];
      rec.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      rec.start(1000);
      recRef.current = rec;
      startedAt.current = Date.now();
      setRecording(true);
    } catch {
      setError("This browser could not start recording. You can still practise, but there will be nothing to watch back.");
    }
  };

  const finish = useCallback(async () => {
    if (stageRef.current === "saving") return;
    stageRef.current = "saving";
    setStage("saving");
    setEndsAt(null);
    const rec = recRef.current;
    const seconds = startedAt.current ? Math.round((Date.now() - startedAt.current) / 1000) : 0;
    const hasVideo = !!streamRef.current?.getVideoTracks().length;
    const blob: Blob = await new Promise((resolve) => {
      if (!rec || rec.state === "inactive") return resolve(new Blob(chunks.current, { type: rec?.mimeType ?? "" }));
      rec.onstop = () => resolve(new Blob(chunks.current, { type: rec.mimeType }));
      rec.stop();
    });
    stopStream();
    const id = newId();
    try {
      await saveRecording({ id, createdAt: Date.now(), eventSlug: event.slug, eventName: event.name, scenarioId: scenario.id, seconds, mime: blob.type, hasVideo, notes: notesRef.current, scores: {}, reflection: "", marks: [], blob });
    } catch {
      setError("The recording could not be saved on this device (storage may be full or blocked). Your scores can still be saved without it.");
    }
    router.push(`/deca/recordings?id=${id}`);
  }, [event.name, event.slug, router, scenario.id, stopStream]);

  // ---- stage changes ----
  const go = useCallback(
    (next: Stage) => {
      stageRef.current = next;
      setStage(next);
      if (next === "prep") setEndsAt(Date.now() + kind.prep * 60_000);
      else if (next === "present") {
        startRecording();
        setEndsAt(Date.now() + kind.speak * 60_000);
      } else if (next === "ask") {
        setQuestion(0);
        setEndsAt(Date.now() + kind.ask * 60_000);
      } else setEndsAt(null);
    },
    [kind.ask, kind.prep, kind.speak],
  );

  const left = useCountdown(timed ? endsAt : null, () => {
    if (stage === "prep") go("present");
    else if (stage === "present") go("ask");
    else if (stage === "ask") void finish();
  });

  // the second question comes up at the halfway point of the question time
  const shownQuestion = stage === "ask" && left !== null && left <= (kind.ask * 60) / 2 ? Math.max(question, 1) : question;

  const onNotes = (v: string) => {
    setNotes(v);
    notesRef.current = v;
  };

  const meta = (
    <p className={styles.kicker}>
      {kind.short} · {event.abbr} · {kind.prep} min prep · {kind.speak} min to present · {kind.ask} min for the judge
    </p>
  );

  if (stage === "saving")
    return (
      <section className={styles.wrap}>
        <h1 className={styles.title}>Saving your recording</h1>
        <p className={styles.note}>One moment. Everything stays on this device.</p>
        {error && <p className={styles.error} role="alert">{error}</p>}
      </section>
    );

  if (stage === "setup")
    return (
      <section className={styles.wrap}>
        {meta}
        <h1 className={styles.title}>Set up your camera</h1>
        <p className={styles.note}>
          You will prep with the prompt in front of you. When prep ends, the prompt and the indicators disappear, recording starts, and you present to the camera
          for {kind.speak} minutes. Then the judge&apos;s questions appear for {kind.ask}. Afterwards you can watch yourself back and score the rubric.
        </p>
        <div className={styles.setup}>
          <div className={styles.preview} data-state={cam}>
            {cam === "ready" || cam === "audio" ? (
              cam === "ready" ? <video ref={attach} className={styles.video} muted playsInline /> : <div className={styles.audioOnly}>Microphone only</div>
            ) : (
              <div className={styles.placeholder}>
                {cam === "asking" ? "Waiting for permission..." : "Your camera preview will appear here"}
              </div>
            )}
            {(cam === "ready" || cam === "audio") && (
              <div className={styles.meter} aria-label="Microphone level">
                <span style={{ transform: `scaleX(${level})` }} />
              </div>
            )}
          </div>
          <div className={styles.side}>
            <ul className={styles.checklist}>
              <li>Face a light, not a window behind you</li>
              <li>Frame yourself from the chest up</li>
              <li>Speak at your normal presenting volume and watch the level bar move</li>
              <li>Recordings are saved in this browser only and never uploaded</li>
            </ul>
            {cam === "idle" || cam === "denied" ? (
              <button className={styles.primary} onClick={enableCamera}>Turn on camera and microphone</button>
            ) : cam === "asking" ? (
              <button className={styles.primary} disabled>Waiting...</button>
            ) : (
              <button className={styles.primary} onClick={() => go("prep")}>Start prep ({kind.prep} min)</button>
            )}
            {error && <p className={styles.error} role="alert">{error}</p>}
            <button
              className={styles.ghost}
              onClick={() => {
                setCam("none");
                go("prep");
              }}
            >
              Practise without recording
            </button>
            <label className={styles.toggle}>
              <input type="checkbox" checked={!timed} onChange={(e) => setTimed(!e.target.checked)} />
              No timer (untimed practice)
            </label>
          </div>
        </div>
      </section>
    );

  if (stage === "prep")
    return (
      <section className={styles.wrap}>
        {meta}
        <div className={styles.timerRow}>
          <h1 className={styles.title}>Prep</h1>
          {timed && left !== null && <p className={styles.timer} data-low={left <= 60 || undefined}>{clock(left)}</p>}
        </div>
        <div className={styles.split}>
          <article className={styles.brief}>
            <p className={styles.crumbs}>
              {event.name} · {scenario.a}
            </p>
            <h2 className={styles.h2}>Event situation</h2>
            <p className={styles.para}>
              You are to assume the role of <strong>{scenario.r}</strong> for <strong>{scenario.c}</strong>.
              {event.kind === "team" ? " You and your partner" : ""}
            </p>
            {scenario.s.map((p) => (
              <p key={p} className={styles.para}>{p}</p>
            ))}
            {scenario.f && (
              <>
                <h3 className={styles.h3}>Case facts</h3>
                <ul className={styles.facts}>{scenario.f.map((f) => <li key={f}>{f}</li>)}</ul>
              </>
            )}
            <p className={styles.para}>
              You will {scenario.d} to the {scenario.j} (judge) in a role-play that takes place in {scenario.m}. The {scenario.j} (judge) will begin by greeting you and asking to hear your
              ideas. After you have presented and answered the {scenario.j}&apos;s (judge&apos;s) questions, the {scenario.j} (judge) will conclude the role-play by thanking you for your work.
            </p>
            <h3 className={styles.h3}>Performance indicators</h3>
            <ul className={styles.pis}>{scenario.p.map((p) => <li key={p}>{p}</li>)}</ul>
            <p className={styles.small}>
              You are also scored on your solution (Unique, Practical, Effective), the career competencies (Critical Thinking, Communication, Decision Making) and your overall impression.
            </p>
          </article>
          <aside className={styles.aside}>
            <label className={styles.notes}>
              <span>Your notes</span>
              <textarea value={notes} onChange={(e) => onNotes(e.target.value)} rows={12} placeholder="Plan your opening, each indicator, your solution and your close." />
            </label>
            {cam === "ready" && <video ref={attach} className={styles.mini} muted playsInline />}
            <p className={styles.small}>When prep ends, this page hides the prompt and starts recording. Notes are turned in, just like at a conference.</p>
            <button className={styles.primary} onClick={() => go("present")}>I&apos;m ready, start presenting</button>
          </aside>
        </div>
      </section>
    );

  if (stage === "present")
    return (
      <section className={styles.stageWrap}>
        <div className={styles.live} data-cam={cam}>
          {cam === "ready" ? <video ref={attach} className={styles.liveVideo} muted playsInline /> : <div className={styles.liveAudio}>{cam === "audio" ? "Recording audio" : "Presenting"}</div>}
          <div className={styles.hud}>
            <span className={styles.rec} data-on={recording ? "1" : undefined}>
              <i /> {recording ? "REC" : "NOT RECORDING"}
            </span>
            <span className={styles.liveTimer} data-low={(timed && left !== null && left <= 60) || undefined}>
              {timed && left !== null ? clock(left) : "Presenting"}
            </span>
          </div>
          <div className={styles.cue}>
            <p>Present to the {scenario.j}.</p>
            <p className={styles.cueSub}>The prompt is hidden now, just like in the room.</p>
          </div>
          {timed && left !== null && left <= 60 && <p className={styles.warn}>One minute left</p>}
          <div className={styles.liveActions}>
            <button className={styles.primary} onClick={() => go("ask")}>I&apos;m done presenting</button>
          </div>
        </div>
      </section>
    );

  // judge's questions
  return (
    <section className={styles.stageWrap}>
      <div className={styles.live} data-cam={cam}>
        {cam === "ready" ? <video ref={attach} className={styles.liveVideo} muted playsInline /> : <div className={styles.liveAudio}>{cam === "audio" ? "Recording audio" : "Questions"}</div>}
        <div className={styles.hud}>
          <span className={styles.rec} data-on={recording ? "1" : undefined}>
            <i /> {recording ? "REC" : "NOT RECORDING"}
          </span>
          <span className={styles.liveTimer} data-low={(timed && left !== null && left <= 30) || undefined}>
            {timed && left !== null ? clock(left) : "Questions"}
          </span>
        </div>
        <div className={styles.judge}>
          <p className={styles.judgeLabel}>The {scenario.j} (judge) asks</p>
          <p className={styles.judgeQ}>{scenario.q[shownQuestion]}</p>
          <p className={styles.small}>Question {shownQuestion + 1} of {scenario.q.length}. Answer out loud as you would in the room.</p>
        </div>
        <div className={styles.liveActions}>
          {shownQuestion < scenario.q.length - 1 && (
            <button className={styles.ghost} onClick={() => setQuestion(shownQuestion + 1)}>Next question</button>
          )}
          <button className={styles.primary} onClick={() => void finish()}>Finish and review</button>
        </div>
      </div>
    </section>
  );
}
