import { notFound } from "next/navigation";
import { Suspense } from "react";
import Recordings from "@/components/roleplay/Recordings";
import styles from "../hub.module.css";

export default function RecordingsPage({ params }: { params: Promise<{ track: string }> }) {
  return (
    <Suspense fallback={<div className={styles.pageShell} />}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: { params: Promise<{ track: string }> }) {
  const { track } = await params;
  if (track !== "deca" && track !== "fbla") notFound();
  return (
    <Suspense fallback={<div className={styles.pageShell} />}>
      <Recordings track={track} />
    </Suspense>
  );
}
