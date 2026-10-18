import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import ClusterBrowser from "@/components/roleplay/ClusterBrowser";
import RoleplayRunner from "@/components/roleplay/RoleplayRunner";
import type { Track } from "@/lib/questions";
import { scenarioFor } from "@/lib/scenarios";
import hub from "@/components/roleplay/RoleplayHub.module.css";
import styles from "../hub.module.css";

export default function Roleplay({ params }: PageProps<"/[track]/roleplay">) {
  return (
    <Suspense fallback={<div className={styles.pageShell} />}>
      <RoleplayContent params={params} />
    </Suspense>
  );
}

async function RoleplayContent({ params }: { params: PageProps<"/[track]/roleplay">["params"] }) {
  const { track } = await params;
  if (track !== "deca" && track !== "fbla") notFound();
  if (track === "fbla") return <RoleplayRunner scenario={scenarioFor(track as Track)} />;
  return (
    <section className={hub.page}>
      <p className={hub.kicker}>DECA role-plays</p>
      <h1 className={hub.title}>Pick a career cluster</h1>
      <p className={hub.lede}>
        Open a cluster to see its events. Every role-play follows the 2026-27 format: you prep, then present to your camera, then answer the judge, and you can watch it back and score it on the
        official rubric.
      </p>
      <div className={hub.actionsRow}>
        <Link className={hub.ghost} href="/deca/recordings">Your recordings</Link>
      </div>
      <div style={{ marginTop: 26 }}>
        <ClusterBrowser />
      </div>
    </section>
  );
}
