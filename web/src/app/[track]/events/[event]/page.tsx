import { notFound } from "next/navigation";
import { Suspense } from "react";
import RoleplayRunner from "@/components/roleplay/RoleplayRunner";
import { EVENT_SCENARIOS, eventScenarioFor } from "@/lib/event-scenarios";
import styles from "../../hub.module.css";

export function generateStaticParams() {
  return EVENT_SCENARIOS.map((s) => ({ track: s.track, event: s.slug }));
}

type Params = PageProps<"/[track]/events/[event]">["params"];

export default function EventPractice({ params }: PageProps<"/[track]/events/[event]">) {
  return (
    <Suspense fallback={<div className={styles.pageShell} />}>
      <EventContent params={params} />
    </Suspense>
  );
}

async function EventContent({ params }: { params: Params }) {
  const { track, event } = await params;
  const scenario = eventScenarioFor(track, event);
  if (!scenario) notFound();
  return <RoleplayRunner scenario={scenario} />;
}
