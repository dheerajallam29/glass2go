import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import type { Track } from "@/lib/questions";
import { TRACKS } from "@/lib/tracks";
import ExamIcon from "@/components/site/ExamIcon";
import GlassTile from "@/components/site/GlassTile";
import TrophyHero from "@/components/site/TrophyHero";
import styles from "./hub.module.css";

export default function Hub({ params }: PageProps<"/[track]">) {
  return (
    <Suspense fallback={<div className={styles.pageShell} />}>
      <HubContent params={params} />
    </Suspense>
  );
}

async function HubContent({ params }: { params: PageProps<"/[track]">["params"] }) {
  const { track } = await params;
  const info = TRACKS[track as Track];
  if (!info) notFound();

  return (
    <>
      <section className={styles.intro}>
        <div className={styles.introText}>
          <p className={styles.eyebrow}>{info.id === "deca" ? "DECA practice" : "FBLA practice"}</p>
          <h1 className={styles.title}>{info.name}</h1>
          <p className={styles.tagline}>{info.tagline}</p>
          <a href="#exams" className={styles.primary}>Start practising</a>
        </div>
        <TrophyHero track={info.id === "fbla" ? "fbla" : "deca"} />
      </section>

      <section className={styles.block} aria-labelledby="exams">
        <div className={styles.blockHead}>
          <h2 id="exams" className={styles.h2}>Practice exams</h2>
          <p className={styles.note}>
            Practise by topic, review what you missed, or sit a timed mini-exam. Every answer comes with a reason.
          </p>
        </div>
        <div className={styles.tiles}>
          {info.exams.map((exam, i) => (
            <GlassTile
              key={exam.slug}
              index={i}
              href={`/${info.id}/practice/${exam.slug}`}
              icon={<ExamIcon slug={exam.slug} />}
              title={exam.name}
              sub={exam.events.join(" · ")}
            />
          ))}
        </div>
        <p className={styles.aside}>{info.noExam}</p>
      </section>

      {info.events && (
        <section className={styles.block} aria-labelledby="events">
          <div className={styles.blockHead}>
            <h2 id="events" className={styles.h2}>{info.id === "deca" ? "Roleplay events" : "Case study and presentation events"}</h2>
            <p className={styles.note}>
              Practise with a timed scenario, then score yourself on a rubric. Timings here are practice timings, so
              check your official event guidelines for the real ones.
            </p>
          </div>
          {(["roleplay", "case", "presentation"] as const).filter((kind) => info.events!.some((e) => e.kind === kind)).map((kind) => (
            <div key={kind}>
              <h3 className={styles.rowTitle}>{kind === "roleplay" ? "Practice roleplays" : kind === "case" ? "Case study events" : "Presentation events"}</h3>
              <div className={styles.tiles}>
                {info.events!.filter((e) => e.kind === kind).map((e, i) => (
                  <GlassTile
                    key={e.slug}
                    index={i}
                    href={`/${info.id}/events/${e.slug}`}
                    icon={<ExamIcon slug={kind === "roleplay" ? "bma" : kind === "case" ? "leadership" : "marketing"} />}
                    title={e.name + (e.isNew ? " (new)" : "")}
                  />
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      <section className={styles.block} aria-labelledby="roleplay">
        <div className={styles.blockHead}>
          <h2 id="roleplay" className={styles.h2}>{info.id === "deca" ? "Roleplays" : "Case studies"}</h2>
          <p className={styles.note}>Timed like the conference: prep, then present, then score yourself on the rubric.</p>
        </div>
        <table className={styles.formats}>
          <thead>
            <tr>
              <th scope="col">Format</th>
              <th scope="col">Prep</th>
              <th scope="col">Present</th>
              <th scope="col">Indicators</th>
            </tr>
          </thead>
          <tbody>
            {info.roleplay.map((r) => (
              <tr key={r.name}>
                <th scope="row">
                  {r.name}
                  <span className={styles.formatNote}>{r.note}</span>
                </th>
                <td>{r.prep} min</td>
                <td>{r.present} min</td>
                <td>{r.indicators ?? "Case-based"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <Link href={`/${info.id}/roleplay`} className={styles.primary}>
          Start a practice {info.id === "deca" ? "roleplay" : "case"}
        </Link>
      </section>

      <section className={styles.block} aria-labelledby="next">
        <h2 id="next" className={styles.h2}>Coming next</h2>
        <p className={styles.note}>
          Shared study notes with upvotes, AI feedback on your recorded roleplays, and weekly and monthly leaderboards.
        </p>
      </section>
    </>
  );
}
