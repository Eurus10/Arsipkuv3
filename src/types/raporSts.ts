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
  characterRecords?: Record<string, StudentCharacterRecord>; // studentId -> StudentCharacterRecord
  customCharacterDescriptors?: CharacterDescriptor[];
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

// ============================================================
// CHARACTER ASSESSMENT & MASTERY TYPES
// ============================================================

export type CharacterPredicate = 'A' | 'B' | 'C' | 'D';
export type MasteryStatus = 'Sangat Baik' | 'Baik' | 'Cukup' | 'Perlu Bimbingan';

export interface CharacterDescriptor {
  id: string; // e.g. "char_1"
  code: string; // "1" .. "18"
  name: string; // e.g. "Religius"
  order: number;
  indicators: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
}

export interface StudentCharacterScore {
  predicate: CharacterPredicate | null;
  description: string;
  customized?: boolean;
}

export interface StudentCharacterRecord {
  studentId: string;
  characterScores: Record<string, StudentCharacterScore>; // charId -> StudentCharacterScore
  teacherNote?: string;
}

/**
 * Determine letter predicate (A/B/C/D) from numeric score
 */
export function getScorePredicate(
  score: number | null | undefined,
  passingGrade: number = 75,
  customThresholds?: { minA?: number; minB?: number; minC?: number }
): CharacterPredicate | '-' {
  if (typeof score !== 'number' || isNaN(score) || score === null) return '-';

  let minA = customThresholds?.minA;
  let minB = customThresholds?.minB;
  let minC = customThresholds?.minC ?? passingGrade;

  if (minA === undefined || minB === undefined) {
    try {
      const raw = localStorage.getItem('sdit_rapor_sts_grade_range_config_v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          minA = minA ?? parsed.minA;
          minB = minB ?? parsed.minB;
          minC = minC ?? parsed.minC ?? parsed.passingGrade;
        }
      }
    } catch {
      // fallback to standard
    }
  }

  minA = minA ?? 91;
  minB = minB ?? 81;
  minC = minC ?? passingGrade;

  if (score >= minA) return 'A';
  if (score >= minB) return 'B';
  if (score >= minC) return 'C';
  return 'D';
}

/**
 * Determine academic mastery status from predicate
 */
export function getMasteryStatusFromPredicate(
  predicate: CharacterPredicate | '-' | string
): MasteryStatus | '-' {
  try {
    const raw = localStorage.getItem('sdit_rapor_sts_grade_range_config_v1');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.labels && typeof parsed.labels === 'object') {
        const custom = parsed.labels[predicate];
        if (custom) return custom as MasteryStatus;
      }
    }
  } catch {
    // fallback to standard
  }

  switch (predicate) {
    case 'A':
      return 'Sangat Baik';
    case 'B':
      return 'Baik';
    case 'C':
      return 'Cukup';
    case 'D':
      return 'Perlu Bimbingan';
    default:
      return '-';
  }
}

/**
 * 18 Default Standard Character Descriptors (PPK & Nilai SDIT)
 */
export const DEFAULT_CHARACTER_DESCRIPTORS: CharacterDescriptor[] = [
  {
    id: 'char_religius',
    code: '1',
    name: 'Religius',
    order: 1,
    indicators: {
      A: 'Selalu istiqomah dalam ibadah, berdoa dengan khusyuk, dan menjadi teladan adab bagi teman.',
      B: 'Taat beribadah dan terbiasa berdoa dengan tertib sebelum serta sesudah belajar.',
      C: 'Menjalankan ibadah dan doa bersama, terkadang masih perlu diingatkan ketertibannya.',
      D: 'Memerlukan pendampingan dalam pembiasaan ibadah rutin dan adab berdoa.',
    },
  },
  {
    id: 'char_jujur',
    code: '2',
    name: 'Jujur',
    order: 2,
    indicators: {
      A: 'Selalu berkata benar, menjunjung tinggi kejujuran saat asesmen, dan berani mengakui kekeliruan.',
      B: 'Berperilaku jujur dalam perkataan maupun perbuatan saat belajar di kelas.',
      C: 'Mulai menunjukkan sikap jujur, sesekali masih perlu ditegaskan untuk berkata apa adanya.',
      D: 'Perlu bimbingan intensif untuk menumbuhkan sikap berani berkata dan berbuat jujur.',
    },
  },
  {
    id: 'char_toleransi',
    code: '3',
    name: 'Toleransi',
    order: 3,
    indicators: {
      A: 'Sangat menghargai perbedaan latar belakang teman dan proaktif merangkul semua teman tanpa membeda-bedakan.',
      B: 'Bersikap ramah, tidak membeda-bedakan teman, dan menghargai keragaman di kelas.',
      C: 'Mampu menerima perbedaan, sesekali masih perlu diingatkan untuk tidak membatasi pertemanan.',
      D: 'Perlu arahan untuk lebih terbuka menerima perbedaan dan menghormati hak teman lain.',
    },
  },
  {
    id: 'char_disiplin',
    code: '4',
    name: 'Disiplin',
    order: 4,
    indicators: {
      A: 'Selalu mematuhi aturan, hadir tepat waktu, dan menyelesaikan tugas sesuai ketentuan.',
      B: 'Umumnya mematuhi aturan dan menyelesaikan tugas dengan baik, dengan sedikit pengingat.',
      C: 'Mulai menunjukkan kedisiplinan, tetapi masih memerlukan beberapa kali pengingat.',
      D: 'Sering membutuhkan bimbingan dalam mematuhi aturan sekolah dan ketepatan tugas.',
    },
  },
  {
    id: 'char_kerja_keras',
    code: '5',
    name: 'Kerja Kas / Gigih',
    order: 5,
    indicators: {
      A: 'Memiliki daya juang tinggi, pantang menyerah saat menghadapi tantangan materi yang rumit.',
      B: 'Bersungguh-sungguh dan fokus dalam menuntaskan kegiatan pembelajaran hingga tuntas.',
      C: 'Menunjukkan usaha dalam belajar, terkadang cepat jenuh bila menghadapi tugas sulit.',
      D: 'Memerlukan motivasi berkelanjutan agar tidak mudah putus asa saat belajar.',
    },
  },
  {
    id: 'char_kreatif',
    code: '6',
    name: 'Kreatif',
    order: 6,
    indicators: {
      A: 'Sangat kaya ide baru, terampil menuangkan gagasan unik, dan inovatif dalam memecahkan masalah.',
      B: 'Mampu menghasilkan ide karya yang menarik dan variatif sesuai arahan guru.',
      C: 'Mampu mengerjakan karya sesuai instruksi contoh, inisiatif ide baru mulai tumbuh.',
      D: 'Memerlukan stimulasi dan bimbingan untuk berani mengeksplorasi ide-ide kreatif.',
    },
  },
  {
    id: 'char_mandiri',
    code: '7',
    name: 'Mandiri',
    order: 7,
    indicators: {
      A: 'Mampu mengatur kebutuhan dan perlengkapan belajarnya secara mandiri tanpa bergantung pada orang lain.',
      B: 'Terbiasa menyiapkan buku dan menuntaskan tugas belajar secara mandiri.',
      C: 'Mampu belajar mandiri, namun sesekali masih mencari bantuan orang lain untuk hal sepele.',
      D: 'Masih sering bergantung pada arahan guru atau bantuan teman dalam mengurus keperluannya.',
    },
  },
  {
    id: 'char_demokratis',
    code: '8',
    name: 'Demokratis',
    order: 8,
    indicators: {
      A: 'Sangat bijak mendengarkan pandangan teman dan aktif membangun kesepakatan bersama secara adil.',
      B: 'Terbuka menerima masukan teman dan menghormati keputusan musyawarah kelas.',
      C: 'Mau mendengarkan pendapat teman, sesekali masih bersikukuh pada keinginannya sendiri.',
      D: 'Perlu belajar menghargai pendapat kelompok dan menerima keputusan bersama dengan lapang dada.',
    },
  },
  {
    id: 'char_rasa_ingin_tahu',
    code: '9',
    name: 'Rasa Ingin Tahu',
    order: 9,
    indicators: {
      A: 'Sangat antusias bertanya hal-hal mendalam dan gemar mengeksplorasi pengetahuan baru.',
      B: 'Kerap mengajukan pertanyaan bermanfaat seputar materi pelajaran yang dibahas.',
      C: 'Menunjukkan minat belajar, namun belum terbiasa aktif mengajukan pertanyaan.',
      D: 'Masih pasif saat pembelajaran dan perlu didorong rasa penasarannya terhadap ilmu.',
    },
  },
  {
    id: 'char_semangat_kebangsaan',
    code: '10',
    name: 'Semangat Kebangsaan',
    order: 10,
    indicators: {
      A: 'Sangat khidmat saat kegiatan upacara dan bangga terhadap keragaman budaya Indonesia.',
      B: 'Tertib mengikuti upacara bendera dan menghormati simbol-simbol kehormatan negara.',
      C: 'Mengikuti kegiatan kebangsaan dengan cukup tertib meski sesekali kurang fokus.',
      D: 'Perlu penanaman sikap khidmat dan rasa hormat saat menyanyikan lagu kebangsaan/upacara.',
    },
  },
  {
    id: 'char_cinta_tanah_air',
    code: '11',
    name: 'Cinta Tanah Air',
    order: 11,
    indicators: {
      A: 'Menunjukkan kebanggaan tinggi terhadap produk, budaya, dan bahasa Indonesia dalam keseharian.',
      B: 'Menggunakan bahasa Indonesia dengan baik dan mencintai kekayaan alam nusantara.',
      C: 'Cukup mengenal identitas tanah air, wawasan cinta lingkungan nusantara mulai bertumbuh.',
      D: 'Perlu pengenalan lebih mendalam mengenai cinta dan kepedulian terhadap tanah air.',
    },
  },
  {
    id: 'char_menghargai_prestasi',
    code: '12',
    name: 'Menghargai Prestasi',
    order: 12,
    indicators: {
      A: 'Selalu tulus mengapresiasi keberhasilan orang lain dan termotivasi untuk terus berprestasi.',
      B: 'Menghargai capaian teman dan bersikap sportif dalam setiap perlombaan atau asesmen.',
      C: 'Mampu memberi ucapan selamat kepada teman, sikap sportif perlu terus dipupuk.',
      D: 'Perlu bimbingan agar tidak merasa rendah diri atau berkecil hati saat teman meraih prestasi.',
    },
  },
  {
    id: 'char_bersahabat',
    code: '13',
    name: 'Bersahabat / Komunikatif',
    order: 13,
    indicators: {
      A: 'Sangat luwes berkomunikasi, ramah, tutur kata santun, dan disenangi banyak teman.',
      B: 'Mampu berkomunikasi dengan baik, bersikap hangat, dan mudah bekerja sama.',
      C: 'Mampu bergaul dengan teman sebangku/kelompok, pembiasaan interaksi kelas terus berkembang.',
      D: 'Cenderung menarik diri atau pasif, perlu dorongan agar lebih percaya diri berbicara.',
    },
  },
  {
    id: 'char_cinta_damai',
    code: '14',
    name: 'Cinta Damai',
    order: 14,
    indicators: {
      A: 'Proaktif mencegah perselisihan kelas, pembawa ketenangan, dan cepat memaafkan teman.',
      B: 'Suka menciptakan suasana rukun, tidak suka mencari keributan, dan menjauhi konflik.',
      C: 'Mampu menjaga kerukunan, namun terkadang masih mudah terpancing emosi kecil dengan teman.',
      D: 'Perlu pendampingan mengelola emosi agar tidak mudah berselisih atau berselisih paham.',
    },
  },
  {
    id: 'char_gemar_membaca',
    code: '15',
    name: 'Gemar Membaca (Rajin)',
    order: 15,
    indicators: {
      A: 'Memiliki budaya literasi tinggi, selalu antusias membaca buku di perpustakaan atau pojok baca.',
      B: 'Rajin membaca buku pelajaran maupun cerita edukatif di waktu luang kelas.',
      C: 'Membaca buku saat diperintahkan guru, kebiasaan literasi mandiri mulai dirintis.',
      D: 'Minat baca masih rendah, perlu bimbingan memilih bahan bacaan yang menarik minatnya.',
    },
  },
  {
    id: 'char_peduli_lingkungan',
    code: '16',
    name: 'Peduli Lingkungan',
    order: 16,
    indicators: {
      A: 'Sangat tanggap memungut sampah, merawat tanaman sekolah, dan menjaga meja belajar selalu higienis.',
      B: 'Terbiasa membuang sampah pada tempatnya dan menjaga kebersihan laci serta meja kelas.',
      C: 'Menjaga kebersihan saat diperingatkan guru, kepedulian pada sampah mulai berkembang.',
      D: 'Masih sering meninggalkan sampah atau merapikan meja belajarnya sendiri tanpa diingatkan.',
    },
  },
  {
    id: 'char_peduli_sosial',
    code: '17',
    name: 'Peduli Sosial',
    order: 17,
    indicators: {
      A: 'Memiliki empati tinggi, proaktif membantu teman kesulitan, dan gemar berinfak serta berbagi.',
      B: 'Ringan tangan membantu teman dan tanggap menyisihkan rezeki untuk kegiatan sosial.',
      C: 'Mau berbagi dan menolong teman jika diminta bantuan oleh guru atau teman terkait.',
      D: 'Perlu dipupuk rasa kepekaan sosial dan kerelaan berbagi kepada teman yang membutuhkan.',
    },
  },
  {
    id: 'char_tanggung_jawab',
    code: '18',
    name: 'Tanggung Jawab',
    order: 18,
    indicators: {
      A: 'Selalu menuntaskan amanah piket dan tugas sekolah dengan kesadaran penuh tanpa perlu diawasi.',
      B: 'Menjalankan jadwal piket dan tugas belajar dengan baik dan penuh kesadaran.',
      C: 'Melaksanakan kewajiban bila diingatkan, rasa memiliki terhadap tugas mulai terbentuk.',
      D: 'Masih sering mengabaikan tugas piket atau tugas kelompok, perlu bimbingan bertanggung jawab.',
    },
  },
];

