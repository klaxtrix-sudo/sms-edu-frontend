export type UserRole = 'admin' | 'teacher' | 'student' | 'parent';

export interface UserProfile {
  id: string;
  schoolId: string;
  fullName: string;
  role: UserRole;
  phone?: string;
  avatarUrl?: string;
}

// MongoDB-side types (from backend API)
export interface ExamQuestion {
  _id: string;
  examId: string;
  text: string;
  type: 'mcq' | 'essay';
  options?: string[];
  correctIndex?: number;
  marks: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  topic?: string;
}

export interface ExamAttempt {
  _id: string;
  examId: string;
  studentId: string;
  startedAt: string;
  submittedAt?: string;
  score?: number;
  totalMarks: number;
  answers: {
    questionId: string;
    selected: number;
    correct: boolean;
    timeSpentSecs?: number;
  }[];
  flags: {
    tabSwitches: number;
    fullscreenExits: number;
  };
}

export interface Exam {
  _id: string;
  title: string;
  subjectId: string;
  classId: string;
  schoolId: string;
  durationMins: number;
  startAt: string;
  endAt: string;
  totalMarks: number;
  questionCount: number;
  status: 'draft' | 'published' | 'ended';
}

export interface Notification {
  _id: string;
  userId: string;
  type: 'result' | 'exam' | 'payment' | 'announcement' | 'system';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}
