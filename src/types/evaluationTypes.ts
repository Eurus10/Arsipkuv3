export type CognitiveLevel = 'C1' | 'C2' | 'C3' | 'C4' | 'C5' | 'C6';
export type QuestionForm = 'PG' | 'ISIAN' | 'URAIAN' | 'ESSAY' | 'MENJODOHKAN';
export type MultipleChoiceOptionsCount = 'A-C' | 'A-D';
export type MatchingMode = 'text_to_text' | 'image_to_image' | 'image_to_text' | 'text_to_image';

export interface CurriculumReference {
  id: string;
  subjectName: string;
  gradeLevel?: string; // e.g. "Kelas 1", "Fase A", "Semua Kelas"
  classLevel?: string;
  semester?: string;
  schoolYear?: string; // e.g. "2025/2026"
  fileName?: string;
  fileSize?: string;
  uploadedAt: string;
  contentSummary?: string; // Teks CP/TP/Elemen yang terekstrak
}

export interface EvaluationTopicItem {
  id: string;
  title: string;
  subTopics?: string;
}

export interface EvaluationDistributionConfig {
  pgCount: number;
  pgOptions: MultipleChoiceOptionsCount;
  isianCount: number;
  menjodohkanCount: number;
  uraianCount: number;
  outputStyle?: 'concise' | 'detailed';
}

export interface EvaluationMaterialSource {
  textNotes: string;
  images: Array<{
    id: string;
    name: string;
    url: string; // base64 or blob URL
    size?: number;
  }>;
  files: Array<{
    id: string;
    name: string;
    type: string;
    size?: number;
    extractedText?: string;
    base64Data?: string;
  }>;
}

// Sub-Menu 1: Kisi-Kisi
export interface EvaluationBlueprintItem {
  id: string;
  number: number; // Nomor urut global di kisi-kisi (1, 2, 3...)
  section?: 'A' | 'B' | 'C' | 'D'; // Bagian A (PG), Bagian B (Isian), Bagian C (Menjodohkan/Uraian)
  sectionNumber?: number; // Nomor urut di lembar soal naskah (1..20 untuk PG, 1..5 untuk Isian, dst)
  sectionLabel?: string; // e.g. "Bagian A: Pilihan Ganda"
  material: string; // Materi Pokok / Bab
  curriculumGoal?: string; // CP / TP yang relevan
  indicator: string; // Indikator Soal
  cognitiveLevel: CognitiveLevel; // C1-C6
  questionForm: QuestionForm; // PG, Isian, dll
  questionNumber: string; // Tampilan nomor soal di naskah: "1", "2" untuk PG; "1 (Bagian B)" untuk Isian; "1 (Bagian C)" untuk Uraian/Menjodohkan
}

export interface EvaluationBlueprint {
  id: string;
  title: string;
  subjectName: string;
  className: string;
  semester: string;
  schoolYear: string;
  examType: string;
  teacherName: string;
  createdAt: string;
  updatedAt: string;
  items: EvaluationBlueprintItem[];
  materialContextSummary?: string;
  topics?: EvaluationTopicItem[];
  distributionConfig?: EvaluationDistributionConfig;
  outputStyle?: 'concise' | 'detailed';
}

// Sub-Menu 2: Soal
export interface MultipleChoiceOption {
  key: 'A' | 'B' | 'C' | 'D';
  text: string;
}

export interface MatchingItem {
  id: string;
  type: 'text' | 'image';
  text?: string;
  assetUrl?: string;
}

export interface EvaluationMatchingQuestion {
  mode: MatchingMode;
  left: MatchingItem[];
  right: MatchingItem[];
  answerPair: Record<string, string>; // e.g. { "1": "B", "2": "C" }
}

export interface EvaluationQuestion {
  id: string;
  number: number; // Nomor urut di lembar soal naskah (1..20 untuk PG, 1..5 untuk Isian, dst)
  globalNumber?: number; // Nomor urut global (1..30)
  section?: 'A' | 'B' | 'C' | 'D'; // Bagian A, B, C
  sectionTitle?: string; // e.g. "Bagian I. Pilihan Ganda", "Bagian II. Isian Singkat", "Bagian III. Menjodohkan"
  type: QuestionForm;
  material: string;
  indicator: string;
  cognitiveLevel: CognitiveLevel;
  questionText: string;
  questionImage?: string; // Optional stimulus visual
  // Pilihan Ganda
  optionsCount?: MultipleChoiceOptionsCount;
  options?: MultipleChoiceOption[];
  // Kunci & Pembahasan
  answerKey: string;
  explanation?: string;
  // Menjodohkan khusus
  matchingData?: EvaluationMatchingQuestion;
  // Visual AI recommendation flag
  aiVisualRecommendation?: {
    recommended: boolean;
    reason: string;
    suggestedMode: MatchingMode;
  };
}

export interface EvaluationQuestionPackage {
  id: string;
  blueprintId?: string;
  title: string;
  subjectName: string;
  className: string;
  schoolYear: string;
  examType: string;
  teacherName: string;
  createdAt: string;
  updatedAt: string;
  questions: EvaluationQuestion[];
  config: {
    pgCount: number;
    pgOptions: MultipleChoiceOptionsCount;
    isianCount: number;
    partCType: 'Essay' | 'Uraian' | 'Menjodohkan';
    partCCount: number;
  };
}

// Sub-Menu 3: Review Hasil Ujian
export interface EvaluationReviewPriorityItem {
  questionNumber: number;
  questionType?: string; // 'PG' | 'Isian' | 'Menjodohkan' | 'Uraian'
  sectionLabel?: string; // e.g. "PG No. 25" or "Isian No. 1"
  questionText?: string; // Kalimat teks soal asli harfiah
  material: string;
  indicator?: string;
  successRate?: number;
  priority: 'HIGH' | 'MEDIUM' | 'GOOD'; // 🔴 Prioritas Tinggi, 🟡 Perlu Penguatan, 🟢 Sudah Baik
  diagnosticNote: string;
  recommendedAction: string;
}

export interface NonPgSummaryItem {
  type: string; // 'Isian' | 'Menjodohkan' | 'Uraian'
  sectionNumber: number;
  sectionLabel: string;
  successRate: number;
  incorrectCount: number;
  totalStudents: number;
  status: 'HIGH' | 'MEDIUM' | 'GOOD';
}

export interface EvaluationReviewResult {
  id: string;
  title: string;
  subjectName: string;
  className: string;
  examType: string;
  analyzedAt: string;
  
  // 6 Struktur Utama Hasil Review
  summary: {
    totalStudents: number;
    averageScore: number;
    highestScore: number;
    lowestScore: number;
    passPercentage: number;
    generalConclusion: string;
  };
  attentionQuestions: EvaluationReviewPriorityItem[];
  nonPgSummary?: NonPgSummaryItem[];
  materialsNeedingReinforcement: Array<{
    material: string;
    status: 'HIGH' | 'MEDIUM' | 'GOOD';
    observation: string;
    actionableAdvice: string;
  }>;
  indicatorsNeedingGuidance: Array<{
    indicator: string;
    note: string;
  }>;
  keyFindings: string[];
  followUpRecommendations: string[];
}
