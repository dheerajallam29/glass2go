import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import ClusterBrowser from "@/components/roleplay/ClusterBrowser";
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
  const fb = track === "fbla";
  return (
    <section className={hub.page}>
      <p className={hub.kicker}>{fb ? "FBLA role plays" : "DECA role-plays"}</p>
      <h1 className={hub.title}>Pick a career cluster</h1>
      <p className={hub.lede}>
        {fb
          ? "Open a career cluster to see its events. Every role play follows the 2026-27 national format: 20 minutes to prep, 7 minutes to present, and the judge plays the second party and can step in at any time. Your camera records it, and you can watch it back and score it on the national rating sheet."
          : "Open a cluster to see its events. Every role-play follows the 2026-27 format: you prep, then present to your camera, then answer the judge, and you can watch it back and score it on the official rubric."}
      </p>
      <div className={hub.actionsRow}>
        <Link className={hub.ghost} href={`/${track}/recordings`}>Your recordings</Link>
      </div>
      <div style={{ marginTop: 26 }}>
        <ClusterBrowser track={fb ? "fbla" : "deca"} />
      </div>
    </section>
  );
}
