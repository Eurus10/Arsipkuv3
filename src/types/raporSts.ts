export type SubjectCategory = 'agama' | 'umum' | 'mulok';

export interface LearningObjective {
  id: string;
  code: string; // e.g. "TP 1", "TP 2"
  desc: string; // e.g. "menjelaskan makna sila-sila Pancasila dalam kehidupan sehari-hari"
  isActive: boolean;
}

export interface RaporSubject {
  id: string;
  name: string;
  code: string;
  order: number;
  tpList: LearningObjective[];
  category?: SubjectCategory; // 'agama' | 'umum' | 'mulok'
  isCustom?: boolean;
}

export interface StudentScoreDetail {
  studentId: string;
  studentName: string;
  nisn?: string;
  nis?: string;
  tpScores: Record<string, number | null>; // { [tpId]: score (100 for achieved, 0 for not) }
  tpAchieved?: Record<string, boolean>; // { [tpId]: true = Tercapai/Lulus (L), false = Belum (TL) }
  stsScore: number | null; // Nilai Tes Sumatif Tengah Semester (Nilai Akhir STS)
  finalScore: number | null; // Nilai Akhir STS
  autoDescription: string;
  customDescription?: string;
  teacherNote?: string; // Catatan guru / wali kelas
}

export interface StudentSubjectRecord {
  subjectId: string;
  scores: Record<string, StudentScoreDetail>; // studentId -> StudentScoreDetail
}

export interface StudentExtracurricular {
  id: string;
  name: string; // e.g. "Pramuka", "Tahfidz", "Karate"
  predicate: 'Sangat Baik' | 'Baik' | 'Cukup' | 'Kurang';
  description: string;
}

export interface StudentAdditionalInfo {
  studentId: string;
  attendance: {
    sakit: number;
    izin: number;
    alpha: number;
  };
  extracurriculars: StudentExtracurricular[];
  teacherNotes: string;
  physicalData?: {
    height?: number;
    weight?: number;
    healthNotes?: string;
  };
}

export interface TeacherProfile {
  name: string;
  nip: string;
}

export interface RaporStsConfig {
  schoolName: string;
  npsn: string;
  schoolAddress: string;
  classLevel: string; // e.g. "4A", "1B"
  fase: 'Fase A' | 'Fase B' | 'Fase C';
  semester: '1' | '2';
  schoolYear: string; // e.g. "2024/2025"
  teacherName: string;
  teacherNip: string;
  headmasterName: string;
  headmasterNip: string;
  reportDatePlace: string; // e.g. "Depok, 20 Maret 2025"
  tpWeight: number; // e.g. 60
  stsWeight: number; // e.g. 40
  passingGrade: number; // KKM / KKTP default 75
  classTeachers?: Record<string, TeacherProfile>; // Walas per-rombel
}

export interface RaporStsClassData {
  id: string; // classKey: e.g. "4A_2024-2025_sem1"
  config: RaporStsConfig;
  subjects: RaporSubject[];
  subjectRecords: Record<string, StudentSubjectRecord>; // subjectId -> StudentSubjectRecord
  additionalInfo: Record<string, StudentAdditionalInfo>; // studentId -> StudentAdditionalInfo
  lastModified: string;
}

// Preset Mata Pelajaran Standar SD Kurikulum Merdeka
export const DEFAULT_RAPOR_SUBJECTS: RaporSubject[] = [
  {
    id: 'pai',
    name: 'Pendidikan Agama Islam dan Budi Pekerti',
    code: 'PAIBP',
    category: 'agama',
    order: 1,
    tpList: [
      { id: 'tp_pai_1', code: 'TP 1', desc: 'membaca dan memahami pesan pokok Q.S. Al-Hujurat/49:13 dengan tartil', isActive: true },
      { id: 'tp_pai_2', code: 'TP 2', desc: 'menjelaskan asmaulhusna Al-Malik, Al-Aziz, Al-Quddus, As-Salam, dan Al-Mu’min', isActive: true },
      { id: 'tp_pai_3', code: 'TP 3', desc: 'menerapkan perilaku terpuji saling menghargai dan menghormati perbedaan', isActive: true },
      { id: 'tp_pai_4', code: 'TP 4', desc: 'mempraktikkan tata cara salat dan zikir setelah salat dengan tertib', isActive: true },
    ],
  },
  {
    id: 'pancasila',
    name: 'Pendidikan Pancasila',
    code: 'PP',
    category: 'umum',
    order: 2,
    tpList: [
      { id: 'tp_pp_1', code: 'TP 1', desc: 'menjelaskan makna sila-sila Pancasila dan penerapannya dalam kehidupan sehari-hari', isActive: true },
      { id: 'tp_pp_2', code: 'TP 2', desc: 'mengidentifikasi aturan dan norma yang berlaku di rumah dan di sekolah', isActive: true },
      { id: 'tp_pp_3', code: 'TP 3', desc: 'menunjukkan sikap gotong royong dan kerja sama dalam keberagaman', isActive: true },
      { id: 'tp_pp_4', code: 'TP 4', desc: 'menerapkan hak dan kewajiban sebagai anggota keluarga dan warga sekolah', isActive: true },
    ],
  },
  {
    id: 'bahasa_indonesia',
    name: 'Bahasa Indonesia',
    code: 'BIND',
    category: 'umum',
    order: 3,
    tpList: [
      { id: 'tp_bi_1', code: 'TP 1', desc: 'mengidentifikasi ide pokok dan ide pendukung dari teks narasi yang dibaca', isActive: true },
      { id: 'tp_bi_2', code: 'TP 2', desc: 'menulis teks deskripsi sederhana dengan kosakata yang tepat dan struktur runtut', isActive: true },
      { id: 'tp_bi_3', code: 'TP 3', desc: 'membedakan kalimat transitif dan intransitif dalam teks bacaan', isActive: true },
      { id: 'tp_bi_4', code: 'TP 4', desc: 'menyampaikan gagasan secara lisan dengan intonasi dan pelafalan yang jelas', isActive: true },
    ],
  },
  {
    id: 'matematika',
    name: 'Matematika',
    code: 'MTK',
    category: 'umum',
    order: 4,
    tpList: [
      { id: 'tp_mtk_1', code: 'TP 1', desc: 'membaca, menulis, dan menentukan nilai tempat bilangan cacah hingga 10.000', isActive: true },
      { id: 'tp_mtk_2', code: 'TP 2', desc: 'melakukan operasi penjumlahan dan pengurangan bilangan cacah dengan benar', isActive: true },
      { id: 'tp_mtk_3', code: 'TP 3', desc: 'menyelesaikan masalah perkalian dan pembagian dalam konteks kehidupan nyata', isActive: true },
      { id: 'tp_mtk_4', code: 'TP 4', desc: 'mengidentifikasi dan membandingkan pecahan senilai dengan representasi visual', isActive: true },
    ],
  },
  {
    id: 'ipas',
    name: 'Ilmu Pengetahuan Alam dan Sosial (IPAS)',
    code: 'IPAS',
    category: 'umum',
    order: 5,
    tpList: [
      { id: 'tp_ipas_1', code: 'TP 1', desc: 'mengidentifikasi bagian tubuh tumbuhan beserta fungsinya bagi kelangsungan hidup', isActive: true },
      { id: 'tp_ipas_2', code: 'TP 2', desc: 'menjelaskan proses fotosintesis dan pentingnya bagi makhluk hidup di bumi', isActive: true },
      { id: 'tp_ipas_3', code: 'TP 3', desc: 'menganalisis wujud zat dan perubahan bentuk energi dalam kehidupan sehari-hari', isActive: true },
      { id: 'tp_ipas_4', code: 'TP 4', desc: 'mengidentifikasi ragam bentang alam dan kenampakan alam di lingkungan setempat', isActive: true },
    ],
  },
  {
    id: 'seni_budaya',
    name: 'Seni Rupa / Seni Budaya',
    code: 'SBDP',
    category: 'umum',
    order: 6,
    tpList: [
      { id: 'tp_seni_1', code: 'TP 1', desc: 'mengenal dan mengeksplorasi unsur rupa garis, bentuk, dan warna dalam karya seni', isActive: true },
      { id: 'tp_seni_2', code: 'TP 2', desc: 'menciptakan karya seni rupa 2 dimensi dengan memanfaatkan tekstur dan pola', isActive: true },
      { id: 'tp_seni_3', code: 'TP 3', desc: 'mengapresiasi keindahan karya seni tradisional dan karya teman sebaya', isActive: true },
    ],
  },
  {
    id: 'pjok',
    name: 'Pendidikan Jasmani, Olahraga, dan Kesehatan',
    code: 'PJOK',
    category: 'umum',
    order: 7,
    tpList: [
      { id: 'tp_pjok_1', code: 'TP 1', desc: 'mempraktikkan variasi pola gerak dasar lokomotor dan non-lokomotor dengan teratur', isActive: true },
      { id: 'tp_pjok_2', code: 'TP 2', desc: 'mempraktikkan gerak manipulatif dalam berbagai permainan sederhana', isActive: true },
      { id: 'tp_pjok_3', code: 'TP 3', desc: 'menunjukkan perilaku menjaga kebersihan diri dan pola hidup sehat', isActive: true },
    ],
  },
  {
    id: 'bahasa_inggris',
    name: 'Bahasa Inggris',
    code: 'ENG',
    category: 'umum',
    order: 8,
    tpList: [
      { id: 'tp_eng_1', code: 'TP 1', desc: 'mengungkapkan aktivitas sehari-hari menggunakan simple present tense dengan tepat', isActive: true },
      { id: 'tp_eng_2', code: 'TP 2', desc: 'mengidentifikasi nama-nama ruangan dan benda di lingkungan sekolah dalam bahasa Inggris', isActive: true },
      { id: 'tp_eng_3', code: 'TP 3', desc: 'merespon instruksi lisan sederhana dalam interaksi belajar di kelas', isActive: true },
    ],
  },
  {
    id: 'bahasa_arab',
    name: 'Bahasa Arab / Mulok',
    code: 'ARB',
    category: 'mulok',
    order: 9,
    tpList: [
      { id: 'tp_arb_1', code: 'TP 1', desc: 'melafalkan mufrodat tentang peralatan sekolah dan anggota keluarga dengan fasih', isActive: true },
      { id: 'tp_arb_2', code: 'TP 2', desc: 'memahami teks bacaan sederhana berbahasa Arab dan menjawab pertanyaan terkait', isActive: true },
      { id: 'tp_arb_3', code: 'TP 3', desc: 'menulis huruf hijaiyah bersambung dengan kaidah yang rapi dan benar', isActive: true },
    ],
  },
];

export const DEFAULT_CLASS_TEACHERS: Record<string, TeacherProfile> = {
  '1A': { name: 'Siti Aminah, S.Pd.I.', nip: '198904122015032001' },
  '1B': { name: 'Nurul Hidayah, S.Pd.', nip: '199108252016042002' },
  '2A': { name: 'Dewi Lestari, S.Pd.', nip: '198703152012012003' },
  '2B': { name: 'Fitri Handayani, S.Pd.', nip: '199011082017052004' },
  '2C': { name: 'Eka Rahmawati, S.Pd.I.', nip: '199201192018022005' },
  '3A': { name: 'Bambang Supriyadi, S.Pd.', nip: '198507202010011006' },
  '3B': { name: 'Rina Maryana, S.Pd.', nip: '198812042014032007' },
  '3C': { name: 'Agus Setiawan, S.Pd.', nip: '198606112011021008' },
  '4A': { name: 'Ahmad Fauzi, S.Pd.', nip: '198805122014021003' },
  '4B': { name: 'Tri Wahyuni, S.Pd.', nip: '198909182015012009' },
  '5A': { name: 'Hendra Gunawan, M.Pd.', nip: '198302142009021010' },
  '5B': { name: 'Sri Mulyani, S.Pd.', nip: '198704222013042011' },
  '6A': { name: 'Dedi Kurniawan, S.Pd.', nip: '198401302008011012' },
  '6B': { name: 'Yuliana Safitri, M.Pd.', nip: '198610052010032013' },
};

export const DEFAULT_RAPOR_CONFIG: RaporStsConfig = {
  schoolName: 'SDIT AL FIKRI',
  npsn: '20271234',
  schoolAddress: 'Jl. H. Radin No. 1, Pekayon, Pasar Rebo, Jakarta Timur',
  classLevel: '4A',
  fase: 'Fase B',
  semester: '2',
  schoolYear: '2024/2025',
  teacherName: 'Ahmad Fauzi, S.Pd.',
  teacherNip: '198805122014021003',
  headmasterName: 'H. Muhammad Yusuf, M.Pd.',
  headmasterNip: '197509182000031002',
  reportDatePlace: 'Depok, 20 Maret 2025',
  tpWeight: 60,
  stsWeight: 40,
  passingGrade: 75,
  classTeachers: DEFAULT_CLASS_TEACHERS,
};
