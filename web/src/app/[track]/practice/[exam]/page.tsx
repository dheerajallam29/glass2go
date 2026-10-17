import { notFound } from "next/navigation";
import { Suspense } from "react";
import Quiz from "@/components/practice/Quiz";
import { questionsForExam, type Track } from "@/lib/questions";
import { TRACKS } from "@/lib/tracks";
import styles from "../../hub.module.css";

export function generateStaticParams() {
  return (Object.keys(TRACKS) as Track[]).flatMap((track) =>
    TRACKS[track].exams.map((e) => ({ track, exam: e.slug })),
  );
}

type Params = PageProps<"/[track]/practice/[exam]">["params"];

export default function Practice({ params }: PageProps<"/[track]/practice/[exam]">) {
  return (
    <Suspense fallback={<div className={styles.pageShell} />}>
      <PracticeContent params={params} />
    </Suspense>
  );
}

async function PracticeContent({ params }: { params: Params }) {
  const { track, exam: slug } = await params;
  const info = TRACKS[track as Track];
  const exam = info?.exams.find((e) => e.slug === slug);
  if (!exam) notFound();

  return <Quiz track={info.id} examName={exam.name} questions={questionsForExam(info.id, exam.slug)} />;
}
