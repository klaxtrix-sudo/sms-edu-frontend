"use client";

import { useParams } from "next/navigation";
import { QuestionStudio } from "@/components/exams/question-studio";

export default function TeacherExamQuestionsPage() {
  const params = useParams();
  const examId = params.id as string;

  return (
    <div className="container mx-auto px-3 sm:px-6 py-4 sm:py-6 max-w-6xl">
      <QuestionStudio examId={examId} role="teacher" />
    </div>
  );
}
