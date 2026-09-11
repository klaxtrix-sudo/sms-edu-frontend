"use client";

import { useParams } from "next/navigation";
import { QuestionStudio } from "@/components/exams/question-studio";

export default function TeacherExamQuestionsPage() {
  const params = useParams();
  const examId = params.id as string;

  return (
    <div className="container mx-auto py-6 max-w-6xl">
      <QuestionStudio examId={examId} role="teacher" />
    </div>
  );
}
