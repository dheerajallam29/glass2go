import { notFound } from "next/navigation";
import { Suspense } from "react";
import RoleplayRunner from "@/components/roleplay/RoleplayRunner";
import type { Track } from "@/lib/questions";
import { scenarioFor } from "@/lib/scenarios";
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
  return <RoleplayRunner scenario={scenarioFor(track as Track)} />;
}
