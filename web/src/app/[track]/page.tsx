import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import type { Track } from "@/lib/questions";
import { TRACKS } from "@/lib/tracks";
import ExamIcon from "@/components/site/ExamIcon";
import GlassTile from "@/components/site/GlassTile";
import TrophyHero from "@/components/site/TrophyHero";
import styles from "./hub.module.css";

type ExamLite = { slug: string; name: string; events: string[] };
const GROUPS: Record<"deca" | "fbla", { title: string; note: string; slugs: string[] }[]> = {
  deca: [
    { title: "Start here", note: "The shared foundation, and personal finance on its own.", slugs: ["core", "pfl"] },
    { title: "Career clusters", note: "Each cluster exam draws on the core plus its own instructional areas.", slugs: ["bma", "finance", "hospitality", "marketing", "entrepreneurship"] },
  ],
  fbla: [
    { title: "Business foundations", note: "Where most members begin.", slugs: ["intro-business", "accounting", "economics"] },
    { title: "Law and money", note: "Contracts, personal finance and investing.", slugs: ["business-law", "personal-finance", "securities"] },
    { title: "People and technology", note: "Leadership, health care and data.", slugs: ["leadership", "healthcare-administration", "data-science-ai"] },
  ],
};

function examGroups(track: Track, exams: ExamLite[]) {
  return GROUPS[track === "fbla" ? "fbla" : "deca"]
    .map((g) => ({ ...g, exams: g.slugs.map((slug) => exams.find((e) => e.slug === slug)).filter((e): e is ExamLite => !!e) }))
    .filter((g) => g.exams.length > 0);
}

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
        {examGroups(info.id, info.exams).map((g) => (
          <div key={g.title} className={styles.group}>
            <div className={styles.groupHead}>
              <h3 className={styles.groupTitle}>{g.title}</h3>
              <p className={styles.groupNote}>{g.note}</p>
            </div>
            <div className={styles.tiles}>
              {g.exams.map((exam, i) => (
                <GlassTile
                  key={exam.slug}
                  index={i}
                  href={`/${info.id}/practice/${exam.slug}`}
                  icon={<ExamIcon slug={exam.slug} size={32} />}
                  title={exam.name}
                  sub={exam.events.join(" · ")}
                />
              ))}
            </div>
          </div>
        ))}
        <p className={styles.aside}>{info.noExam}</p>
      </section>

      {info.events && info.id !== "deca" && (
        <section className={styles.block} aria-labelledby="events">
          <div className={styles.blockHead}>
            <h2 id="events" className={styles.h2}>Presentation events</h2>
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
          <h2 id="roleplay" className={styles.h2}>Role-plays</h2>
          <p className={styles.note}>
            {info.id === "deca"
              ? "Choose a career cluster, pick an event, prep, then present on camera and answer the judge. Watch yourself back and score the 2026-27 rubric."
              : "Choose a career cluster and a role play event. You get 20 minutes to prep and 7 minutes to present on camera while the judge plays the other side of the case. Watch yourself back and score the 2026-27 national rating sheet."}
          </p>
        </div>
        <div className={styles.tiles}>
          <GlassTile
            index={0}
            href={`/${info.id}/roleplay`}
            icon={<ExamIcon slug="bma" size={32} />}
            title={info.id === "deca" ? "Role-plays by career cluster" : "Role plays by career cluster"}
            sub={info.id === "deca" ? "Principles, Individual Series, Team Decision Making and Personal Financial Literacy" : "Banking, Business Management, Customer Service, Entrepreneurship, Marketing, Network Design and more"}
            cta="Browse"
          />
          <GlassTile index={1} href={`/${info.id}/recordings`} icon={<ExamIcon slug="marketing" size={32} />} title="Your recordings" sub="Watch your presentations, flag moments and see your scores" cta="Open" />
        </div>
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
