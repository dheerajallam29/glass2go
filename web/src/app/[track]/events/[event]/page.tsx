import { notFound } from "next/navigation";
import { Suspense } from "react";
import EventPractice from "@/components/roleplay/EventPractice";
import RoleplayRunner from "@/components/roleplay/RoleplayRunner";
import { EVENT_SCENARIOS, eventScenarioFor } from "@/lib/event-scenarios";
import { EVENTS } from "@/lib/roleplays";
import styles from "../../hub.module.css";

export function generateStaticParams() {
  return [
    ...EVENT_SCENARIOS.filter((s) => s.track === "fbla").map((s) => ({ track: "fbla", event: s.slug })),
    ...EVENTS.map((e) => ({ track: "deca", event: e.slug })),
  ];
}

type Params = PageProps<"/[track]/events/[event]">["params"];

export default function EventPage({ params }: PageProps<"/[track]/events/[event]">) {
  return (
    <Suspense fallback={<div className={styles.pageShell} />}>
      <EventContent params={params} />
    </Suspense>
  );
}

async function EventContent({ params }: { params: Params }) {
  const { track, event } = await params;
  if (track === "deca") {
    if (!EVENTS.some((e) => e.slug === event)) notFound();
    return <EventPractice slug={event} />;
  }
  const scenario = eventScenarioFor(track, event);
  if (!scenario) notFound();
  return <RoleplayRunner scenario={scenario} />;
}
