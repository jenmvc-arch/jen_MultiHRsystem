export type UserRole = 'employee' | 'hr-admin';

export type PageView =
  | 'login'
  | 'dashboard'
  | 'handbook'
  | 'quiz'
  | 'hr-admin'
  | 'documents'
  | 'settings';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl: string;
  department: string;
  joinDate: string;
}

export interface Subsection {
  title?: string;
  paragraphs: string[];
  bulletPoints?: string[];
  table?: {
    headers: string[];
    rows: string[][];
  };
}

export interface HandbookModule {
  id: number;
  title: string;
  subtitle: string;
  status: 'completed' | 'in-progress' | 'locked';
  videoPosterUrl?: string;
  videoDuration?: string;
  sectionsCount: number;
  completedSections: number;
  content: {
    sectionTitle: string;
    bodyParagraphs: string[];
    subsections?: Subsection[];
    keyTakeaway: string;
  };
}

export type QuestionType = 'single' | 'multiple' | 'sequencing' | 'boolean';

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctOptionIndex?: number;
  correctOptionIndices?: number[];
  category: string;
  questionType?: QuestionType;
  moduleRef?: string;
  explanation?: string;
  handbookSource?: string;
}

export interface EmployeeRecord {
  id: string;
  name: string;
  email: string;
  department: string;
  progressPercent: number;
  status: 'Completed' | 'In Progress' | 'Overdue';
  sectionsRead: string;
  quizScore: string;
  daysRemaining: number;
  avatarUrl: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}
