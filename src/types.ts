export type DocumentType = 'administrasi' | 'soal' | 'sertifikat' | 'rapor';

export type NavTab = 'dashboard' | 'administrasi' | 'soal' | 'tracking_soal' | 'sertifikat' | 'rapor' | 'rapor_sts' | 'student_db' | 'academic_settings' | 'admin';

export interface DocumentItem {
  id: string;
  type: DocumentType;
  title: string;
  category: string; // e.g. "Administrasi Kelas", "Perangkat Pembelajaran", "Bank Soal", "Sertifikat Guru", "Rapor Semester Ganjil"
  classLevel: string; // "Semua Kelas", "Kelas 1".."Kelas 6", "Umum / Guru"
  subject?: string; // Optional: "Semua Mapel" or specific subject
  examType?: string; // "STS", "SAS", "SAT", "Ujian Sekolah", "Penilaian Harian", "Lainnya"
  recipient?: string; // e.g. "Guru & Tendik", "Peserta Didik", "Sekolah / Lembaga"
  certificateNumber?: string; // e.g. "042/SDIT-AF/SERTIF/2025"
  semester?: string; // "Semester 1 (Ganjil)", "Semester 2 (Genap)", "Semua Semester"
  schoolYear: string; // Dynamic school year, e.g. "2026/2027", "2025/2026", "2025-2026"
  driveUrl: string; // Google Drive link (folder induk/file/docs/sheets/pdf)
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SchoolTemplateItem {
  id: string;
  title: string;
  category: 'analisis_soal' | 'rapor' | 'folder_soal' | 'tracking_soal';
  description: string;
  fileFormat: string;
  driveUrl: string;
  updatedAt?: string;
}

export interface ExamQuestionRuleRow {
  id: string;
  label: string;
  pg: number;
  isian: number;
  essay: number;
}

export interface ExamProctorCodeItem {
  code: string; // e.g. "A", "B", "C", "D", "E", "F", ...
  name: string; // e.g. "Ust. Ahmad Fauzi, S.Pd"
  subjectOrRole?: string; // e.g. "Guru PAI", "Wali Kelas 1A", etc.
}

export interface ExamProctorAssignment {
  roomOrClass: string; // e.g. "1A", "1B", "2A", "2B", "3A", "3B", "4A", "4B", "5A", "5B", "6A", "6B"
  proctorName: string; // e.g. "Ust. Ahmad Fauzi, S.Pd"
  proctorCode?: string; // e.g. "A"
}

export interface ExamScheduleRow {
  id: string;
  day: string; // e.g. "Senin"
  date?: string; // e.g. "22 September 2025"
  session: string; // e.g. "07.30 – 09.00 (Sesi 1)"
  subject: string; // e.g. "Pendidikan Agama Islam (PAI)"
  classes?: string; // e.g. "Kelas 1 – 6"
  notes?: string;
  proctors?: string; // Quick note or summary of proctors
  proctorDetails?: ExamProctorAssignment[]; // Detailed assignment per class room
  roomCodes?: Record<string, string>; // e.g. { "1A": "A", "1B": "B", ... }
}

export interface ActiveExamSchedule {
  id: string;
  examHeaderTitle: string; // e.g. "JADWAL ASESMEN SUMATIF TENGAH SEMESTER (STS) GANJIL"
  schoolYear: string; // e.g. "TAHUN AJARAN 2025/2026"
  period: string; // e.g. "22 s.d. 26 September 2025"
  duration: string; // e.g. "90 Menit / Sesi Ujian"
  notes?: string;
  rooms?: string[]; // e.g. ['1A', '1B', '2A', '2B', '3A', '3B', '4A', '4B', '5A', '5B', '6A', '6B']
  proctorCodes?: ExamProctorCodeItem[]; // List of code -> teacher name
  rows: ExamScheduleRow[];
}

export interface ExamScheduleSet {
  id: string;
  examType: 'STS' | 'SAS' | 'US';
  title: string;
  period: string;
  duration: string;
  rows: ExamScheduleRow[];
}

export const DEFAULT_PROCTOR_CODES: ExamProctorCodeItem[] = [
  { code: 'A', name: 'Ust. Ahmad Fauzi, S.Pd', subjectOrRole: 'Guru PAI & Budi Pekerti' },
  { code: 'B', name: 'Usth. Siti Rahmawati, S.Pd.I', subjectOrRole: 'Guru Bahasa Arab & PAI' },
  { code: 'C', name: 'Ust. Muhammad Zaki, M.Pd', subjectOrRole: 'Guru Matematika' },
  { code: 'D', name: 'Usth. Nurul Hidayah, S.Pd', subjectOrRole: 'Guru Bahasa Indonesia' },
  { code: 'E', name: 'Ust. Ridwan Kamil, S.Pd', subjectOrRole: 'Guru IPAS' },
  { code: 'F', name: 'Usth. Sarah Amalia, S.Pd', subjectOrRole: 'Guru Pendidikan Pancasila' },
  { code: 'G', name: 'Ust. Wahyu Hidayat, S.Pd', subjectOrRole: 'Guru PJOK' },
  { code: 'H', name: 'Usth. Dewi Kartika, S.Pd', subjectOrRole: 'Guru Bahasa Inggris' },
  { code: 'I', name: 'Ust. Hasan Basri, S.Pd.I', subjectOrRole: 'Guru Tahfidz / BTQ' },
  { code: 'J', name: 'Usth. Fatimah Az-Zahra, S.Pd', subjectOrRole: 'Guru Seni Rupa & SBdP' },
  { code: 'K', name: 'Ust. Fajar Ramadhan, S.Pd', subjectOrRole: 'Guru Kelas 5' },
  { code: 'L', name: 'Usth. Rina Agustina, S.Pd', subjectOrRole: 'Guru Kelas 6' },
  { code: 'M', name: 'Ust. Ilham Pratama, S.Pd', subjectOrRole: 'Guru Kelas 4' },
  { code: 'N', name: 'Usth. Nabila Syifa, S.Pd', subjectOrRole: 'Guru Kelas 3' },
  { code: 'O', name: 'Usth. Aisyah Putri, S.Pd', subjectOrRole: 'Guru Kelas 2' },
  { code: 'P', name: 'Ust. Hendra Gunawan, S.Pd', subjectOrRole: 'Guru Kelas 1' },
];

export const DEFAULT_EXAM_ROOMS = [
  '1A', '1B', '2A', '2B', '3A', '3B',
  '4A', '4B', '5A', '5B', '6A', '6B'
];

export const DEFAULT_ACTIVE_EXAM_SCHEDULE: ActiveExamSchedule = {
  id: 'active-exam-schedule-default',
  examHeaderTitle: 'JADWAL ASESMEN SUMATIF TENGAH SEMESTER (STS) GANJIL',
  schoolYear: 'TAHUN AJARAN 2025/2026',
  period: 'Senin – Jumat, 22 – 26 September 2025',
  duration: '90 Menit / Sesi Ujian',
  notes: '1. Pengawas ruang hadir 15 menit sebelum asesmen dimulai.\n2. Siswa wajib membawa perlengkapan alat tulis sendiri.\n3. Pengawas mengisi dan menandatangani Berita Acara serta Daftar Hadir.',
  rooms: DEFAULT_EXAM_ROOMS,
  proctorCodes: DEFAULT_PROCTOR_CODES,
  rows: [
    {
      id: 'row-1',
      day: 'Senin',
      date: '22 September 2025',
      session: '07.30 – 09.00 (Sesi 1)',
      subject: 'Pendidikan Agama Islam & Budi Pekerti (PAI)',
      classes: 'Kelas 1–6',
      notes: 'Naskah Ujian Utama',
      roomCodes: {
        '1A': 'A', '1B': 'B', '2A': 'C', '2B': 'D',
        '3A': 'E', '3B': 'F', '4A': 'G', '4B': 'H',
        '5A': 'I', '5B': 'J', '6A': 'K', '6B': 'L',
      },
      proctorDetails: [
        { roomOrClass: '1A', proctorName: 'Ust. Ahmad Fauzi, S.Pd', proctorCode: 'A' },
        { roomOrClass: '1B', proctorName: 'Usth. Siti Rahmawati, S.Pd.I', proctorCode: 'B' },
        { roomOrClass: '2A', proctorName: 'Ust. Muhammad Zaki, M.Pd', proctorCode: 'C' },
        { roomOrClass: '2B', proctorName: 'Usth. Nurul Hidayah, S.Pd', proctorCode: 'D' },
        { roomOrClass: '3A', proctorName: 'Ust. Ridwan Kamil, S.Pd', proctorCode: 'E' },
        { roomOrClass: '3B', proctorName: 'Usth. Sarah Amalia, S.Pd', proctorCode: 'F' },
        { roomOrClass: '4A', proctorName: 'Ust. Wahyu Hidayat, S.Pd', proctorCode: 'G' },
        { roomOrClass: '4B', proctorName: 'Usth. Dewi Kartika, S.Pd', proctorCode: 'H' },
        { roomOrClass: '5A', proctorName: 'Ust. Hasan Basri, S.Pd.I', proctorCode: 'I' },
        { roomOrClass: '5B', proctorName: 'Usth. Fatimah Az-Zahra, S.Pd', proctorCode: 'J' },
        { roomOrClass: '6A', proctorName: 'Ust. Fajar Ramadhan, S.Pd', proctorCode: 'K' },
        { roomOrClass: '6B', proctorName: 'Usth. Rina Agustina, S.Pd', proctorCode: 'L' },
      ],
    },
    {
      id: 'row-2',
      day: 'Senin',
      date: '22 September 2025',
      session: '09.30 – 11.00 (Sesi 2)',
      subject: 'Bahasa Indonesia',
      classes: 'Kelas 1–6',
      notes: 'Membaca & Memahami Teks',
      roomCodes: {
        '1A': 'D', '1B': 'C', '2A': 'B', '2B': 'A',
        '3A': 'H', '3B': 'G', '4A': 'F', '4B': 'E',
        '5A': 'L', '5B': 'K', '6A': 'J', '6B': 'I',
      },
      proctorDetails: [
        { roomOrClass: '1A', proctorName: 'Usth. Nurul Hidayah, S.Pd', proctorCode: 'D' },
        { roomOrClass: '1B', proctorName: 'Ust. Muhammad Zaki, M.Pd', proctorCode: 'C' },
        { roomOrClass: '2A', proctorName: 'Usth. Siti Rahmawati, S.Pd.I', proctorCode: 'B' },
        { roomOrClass: '2B', proctorName: 'Ust. Ahmad Fauzi, S.Pd', proctorCode: 'A' },
        { roomOrClass: '3A', proctorName: 'Usth. Dewi Kartika, S.Pd', proctorCode: 'H' },
        { roomOrClass: '3B', proctorName: 'Ust. Wahyu Hidayat, S.Pd', proctorCode: 'G' },
        { roomOrClass: '4A', proctorName: 'Usth. Sarah Amalia, S.Pd', proctorCode: 'F' },
        { roomOrClass: '4B', proctorName: 'Ust. Ridwan Kamil, S.Pd', proctorCode: 'E' },
        { roomOrClass: '5A', proctorName: 'Usth. Rina Agustina, S.Pd', proctorCode: 'L' },
        { roomOrClass: '5B', proctorName: 'Ust. Fajar Ramadhan, S.Pd', proctorCode: 'K' },
        { roomOrClass: '6A', proctorName: 'Usth. Fatimah Az-Zahra, S.Pd', proctorCode: 'J' },
        { roomOrClass: '6B', proctorName: 'Ust. Hasan Basri, S.Pd.I', proctorCode: 'I' },
      ],
    },
    {
      id: 'row-3',
      day: 'Selasa',
      date: '23 September 2025',
      session: '07.30 – 09.00 (Sesi 1)',
      subject: 'Matematika',
      classes: 'Kelas 1–6',
      notes: 'Dilarang menggunakan kalkulator',
      roomCodes: {
        '1A': 'C', '1B': 'A', '2A': 'D', '2B': 'B',
        '3A': 'G', '3B': 'E', '4A': 'H', '4B': 'F',
        '5A': 'K', '5B': 'I', '6A': 'L', '6B': 'J',
      },
      proctorDetails: [
        { roomOrClass: '1A', proctorName: 'Ust. Muhammad Zaki, M.Pd', proctorCode: 'C' },
        { roomOrClass: '1B', proctorName: 'Ust. Ahmad Fauzi, S.Pd', proctorCode: 'A' },
        { roomOrClass: '2A', proctorName: 'Usth. Nurul Hidayah, S.Pd', proctorCode: 'D' },
        { roomOrClass: '2B', proctorName: 'Usth. Siti Rahmawati, S.Pd.I', proctorCode: 'B' },
        { roomOrClass: '3A', proctorName: 'Ust. Wahyu Hidayat, S.Pd', proctorCode: 'G' },
        { roomOrClass: '3B', proctorName: 'Ust. Ridwan Kamil, S.Pd', proctorCode: 'E' },
        { roomOrClass: '4A', proctorName: 'Usth. Dewi Kartika, S.Pd', proctorCode: 'H' },
        { roomOrClass: '4B', proctorName: 'Usth. Sarah Amalia, S.Pd', proctorCode: 'F' },
        { roomOrClass: '5A', proctorName: 'Ust. Fajar Ramadhan, S.Pd', proctorCode: 'K' },
        { roomOrClass: '5B', proctorName: 'Ust. Hasan Basri, S.Pd.I', proctorCode: 'I' },
        { roomOrClass: '6A', proctorName: 'Usth. Rina Agustina, S.Pd', proctorCode: 'L' },
        { roomOrClass: '6B', proctorName: 'Usth. Fatimah Az-Zahra, S.Pd', proctorCode: 'J' },
      ],
    },
    {
      id: 'row-4',
      day: 'Selasa',
      date: '23 September 2025',
      session: '09.30 – 11.00 (Sesi 2)',
      subject: 'Pendidikan Pancasila / PKn',
      classes: 'Kelas 1–6',
      notes: 'Naskah Ujian Utama',
      roomCodes: {
        '1A': 'F', '1B': 'E', '2A': 'H', '2B': 'G',
        '3A': 'A', '3B': 'B', '4A': 'C', '4B': 'D',
        '5A': 'I', '5B': 'J', '6A': 'K', '6B': 'L',
      },
      proctorDetails: [
        { roomOrClass: '1A', proctorName: 'Usth. Sarah Amalia, S.Pd', proctorCode: 'F' },
        { roomOrClass: '1B', proctorName: 'Ust. Ridwan Kamil, S.Pd', proctorCode: 'E' },
        { roomOrClass: '2A', proctorName: 'Usth. Dewi Kartika, S.Pd', proctorCode: 'H' },
        { roomOrClass: '2B', proctorName: 'Ust. Wahyu Hidayat, S.Pd', proctorCode: 'G' },
        { roomOrClass: '3A', proctorName: 'Ust. Ahmad Fauzi, S.Pd', proctorCode: 'A' },
        { roomOrClass: '3B', proctorName: 'Usth. Siti Rahmawati, S.Pd.I', proctorCode: 'B' },
        { roomOrClass: '4A', proctorName: 'Ust. Muhammad Zaki, M.Pd', proctorCode: 'C' },
        { roomOrClass: '4B', proctorName: 'Usth. Nurul Hidayah, S.Pd', proctorCode: 'D' },
        { roomOrClass: '5A', proctorName: 'Ust. Hasan Basri, S.Pd.I', proctorCode: 'I' },
        { roomOrClass: '5B', proctorName: 'Usth. Fatimah Az-Zahra, S.Pd', proctorCode: 'J' },
        { roomOrClass: '6A', proctorName: 'Ust. Fajar Ramadhan, S.Pd', proctorCode: 'K' },
        { roomOrClass: '6B', proctorName: 'Usth. Rina Agustina, S.Pd', proctorCode: 'L' },
      ],
    },
    {
      id: 'row-5',
      day: 'Rabu',
      date: '24 September 2025',
      session: '07.30 – 09.00 (Sesi 1)',
      subject: 'IPAS (Ilmu Pengetahuan Alam & Sosial)',
      classes: 'Kelas 3–6',
      notes: 'Kelas 1 & 2 Belajar Mandiri di Rumah',
      roomCodes: {
        '1A': '—', '1B': '—', '2A': '—', '2B': '—',
        '3A': 'E', '3B': 'F', '4A': 'G', '4B': 'H',
        '5A': 'I', '5B': 'J', '6A': 'K', '6B': 'L',
      },
      proctorDetails: [
        { roomOrClass: '3A', proctorName: 'Ust. Ridwan Kamil, S.Pd', proctorCode: 'E' },
        { roomOrClass: '3B', proctorName: 'Usth. Sarah Amalia, S.Pd', proctorCode: 'F' },
        { roomOrClass: '4A', proctorName: 'Ust. Wahyu Hidayat, S.Pd', proctorCode: 'G' },
        { roomOrClass: '4B', proctorName: 'Usth. Dewi Kartika, S.Pd', proctorCode: 'H' },
        { roomOrClass: '5A', proctorName: 'Ust. Hasan Basri, S.Pd.I', proctorCode: 'I' },
        { roomOrClass: '5B', proctorName: 'Usth. Fatimah Az-Zahra, S.Pd', proctorCode: 'J' },
        { roomOrClass: '6A', proctorName: 'Ust. Fajar Ramadhan, S.Pd', proctorCode: 'K' },
        { roomOrClass: '6B', proctorName: 'Usth. Rina Agustina, S.Pd', proctorCode: 'L' },
      ],
    },
    {
      id: 'row-6',
      day: 'Rabu',
      date: '24 September 2025',
      session: '09.30 – 11.00 (Sesi 2)',
      subject: 'Bahasa Inggris',
      classes: 'Kelas 1–6',
      notes: 'Listening & Written Test',
      roomCodes: {
        '1A': 'K', '1B': 'L', '2A': 'I', '2B': 'J',
        '3A': 'C', '3B': 'D', '4A': 'A', '4B': 'B',
        '5A': 'E', '5B': 'F', '6A': 'G', '6B': 'H',
      },
      proctorDetails: [
        { roomOrClass: '1A', proctorName: 'Ust. Fajar Ramadhan, S.Pd', proctorCode: 'K' },
        { roomOrClass: '1B', proctorName: 'Usth. Rina Agustina, S.Pd', proctorCode: 'L' },
        { roomOrClass: '2A', proctorName: 'Ust. Hasan Basri, S.Pd.I', proctorCode: 'I' },
        { roomOrClass: '2B', proctorName: 'Usth. Fatimah Az-Zahra, S.Pd', proctorCode: 'J' },
        { roomOrClass: '3A', proctorName: 'Ust. Muhammad Zaki, M.Pd', proctorCode: 'C' },
        { roomOrClass: '3B', proctorName: 'Usth. Nurul Hidayah, S.Pd', proctorCode: 'D' },
        { roomOrClass: '4A', proctorName: 'Ust. Ahmad Fauzi, S.Pd', proctorCode: 'A' },
        { roomOrClass: '4B', proctorName: 'Usth. Siti Rahmawati, S.Pd.I', proctorCode: 'B' },
        { roomOrClass: '5A', proctorName: 'Ust. Ridwan Kamil, S.Pd', proctorCode: 'E' },
        { roomOrClass: '5B', proctorName: 'Usth. Sarah Amalia, S.Pd', proctorCode: 'F' },
        { roomOrClass: '6A', proctorName: 'Ust. Wahyu Hidayat, S.Pd', proctorCode: 'G' },
        { roomOrClass: '6B', proctorName: 'Usth. Dewi Kartika, S.Pd', proctorCode: 'H' },
      ],
    },
    {
      id: 'row-7',
      day: 'Kamis',
      date: '25 September 2025',
      session: '07.30 – 09.00 (Sesi 1)',
      subject: 'Bahasa Arab',
      classes: 'Kelas 1–6',
      notes: 'Mufrodat & Tata Bahasa',
      roomCodes: {
        '1A': 'I', '1B': 'J', '2A': 'K', '2B': 'L',
        '3A': 'A', '3B': 'B', '4A': 'C', '4B': 'D',
        '5A': 'G', '5B': 'H', '6A': 'E', '6B': 'F',
      },
      proctorDetails: [
        { roomOrClass: '1A', proctorName: 'Ust. Hasan Basri, S.Pd.I', proctorCode: 'I' },
        { roomOrClass: '1B', proctorName: 'Usth. Fatimah Az-Zahra, S.Pd', proctorCode: 'J' },
        { roomOrClass: '2A', proctorName: 'Ust. Fajar Ramadhan, S.Pd', proctorCode: 'K' },
        { roomOrClass: '2B', proctorName: 'Usth. Rina Agustina, S.Pd', proctorCode: 'L' },
        { roomOrClass: '3A', proctorName: 'Ust. Ahmad Fauzi, S.Pd', proctorCode: 'A' },
        { roomOrClass: '3B', proctorName: 'Usth. Siti Rahmawati, S.Pd.I', proctorCode: 'B' },
        { roomOrClass: '4A', proctorName: 'Ust. Muhammad Zaki, M.Pd', proctorCode: 'C' },
        { roomOrClass: '4B', proctorName: 'Usth. Nurul Hidayah, S.Pd', proctorCode: 'D' },
        { roomOrClass: '5A', proctorName: 'Ust. Wahyu Hidayat, S.Pd', proctorCode: 'G' },
        { roomOrClass: '5B', proctorName: 'Usth. Dewi Kartika, S.Pd', proctorCode: 'H' },
        { roomOrClass: '6A', proctorName: 'Ust. Ridwan Kamil, S.Pd', proctorCode: 'E' },
        { roomOrClass: '6B', proctorName: 'Usth. Sarah Amalia, S.Pd', proctorCode: 'F' },
      ],
    },
    {
      id: 'row-8',
      day: 'Kamis',
      date: '25 September 2025',
      session: '09.30 – 11.00 (Sesi 2)',
      subject: 'Seni Budaya & Prakarya (SBdP)',
      classes: 'Kelas 1–6',
      notes: 'Teori & Pemahaman Seni',
      roomCodes: {
        '1A': 'H', '1B': 'G', '2A': 'F', '2B': 'E',
        '3A': 'L', '3B': 'K', '4A': 'J', '4B': 'I',
        '5A': 'A', '5B': 'B', '6A': 'C', '6B': 'D',
      },
      proctorDetails: [
        { roomOrClass: '1A', proctorName: 'Usth. Dewi Kartika, S.Pd', proctorCode: 'H' },
        { roomOrClass: '1B', proctorName: 'Ust. Wahyu Hidayat, S.Pd', proctorCode: 'G' },
        { roomOrClass: '2A', proctorName: 'Usth. Sarah Amalia, S.Pd', proctorCode: 'F' },
        { roomOrClass: '2B', proctorName: 'Ust. Ridwan Kamil, S.Pd', proctorCode: 'E' },
        { roomOrClass: '3A', proctorName: 'Usth. Rina Agustina, S.Pd', proctorCode: 'L' },
        { roomOrClass: '3B', proctorName: 'Ust. Fajar Ramadhan, S.Pd', proctorCode: 'K' },
        { roomOrClass: '4A', proctorName: 'Usth. Fatimah Az-Zahra, S.Pd', proctorCode: 'J' },
        { roomOrClass: '4B', proctorName: 'Ust. Hasan Basri, S.Pd.I', proctorCode: 'I' },
        { roomOrClass: '5A', proctorName: 'Ust. Ahmad Fauzi, S.Pd', proctorCode: 'A' },
        { roomOrClass: '5B', proctorName: 'Usth. Siti Rahmawati, S.Pd.I', proctorCode: 'B' },
        { roomOrClass: '6A', proctorName: 'Ust. Muhammad Zaki, M.Pd', proctorCode: 'C' },
        { roomOrClass: '6B', proctorName: 'Usth. Nurul Hidayah, S.Pd', proctorCode: 'D' },
      ],
    },
    {
      id: 'row-9',
      day: 'Jumat',
      date: '26 September 2025',
      session: '07.30 – 09.00 (Sesi 1)',
      subject: 'Pendidikan Jasmani, Olahraga & Kesehatan (PJOK)',
      classes: 'Kelas 1–6',
      notes: 'Teori Kebugaran & Olahraga',
      roomCodes: {
        '1A': 'G', '1B': 'E', '2A': 'A', '2B': 'C',
        '3A': 'I', '3B': 'K', '4A': 'B', '4B': 'D',
        '5A': 'F', '5B': 'H', '6A': 'J', '6B': 'L',
      },
      proctorDetails: [
        { roomOrClass: '1A', proctorName: 'Ust. Wahyu Hidayat, S.Pd', proctorCode: 'G' },
        { roomOrClass: '1B', proctorName: 'Ust. Ridwan Kamil, S.Pd', proctorCode: 'E' },
        { roomOrClass: '2A', proctorName: 'Ust. Ahmad Fauzi, S.Pd', proctorCode: 'A' },
        { roomOrClass: '2B', proctorName: 'Ust. Muhammad Zaki, M.Pd', proctorCode: 'C' },
        { roomOrClass: '3A', proctorName: 'Ust. Hasan Basri, S.Pd.I', proctorCode: 'I' },
        { roomOrClass: '3B', proctorName: 'Ust. Fajar Ramadhan, S.Pd', proctorCode: 'K' },
        { roomOrClass: '4A', proctorName: 'Usth. Siti Rahmawati, S.Pd.I', proctorCode: 'B' },
        { roomOrClass: '4B', proctorName: 'Usth. Nurul Hidayah, S.Pd', proctorCode: 'D' },
        { roomOrClass: '5A', proctorName: 'Usth. Sarah Amalia, S.Pd', proctorCode: 'F' },
        { roomOrClass: '5B', proctorName: 'Usth. Dewi Kartika, S.Pd', proctorCode: 'H' },
        { roomOrClass: '6A', proctorName: 'Usth. Fatimah Az-Zahra, S.Pd', proctorCode: 'J' },
        { roomOrClass: '6B', proctorName: 'Usth. Rina Agustina, S.Pd', proctorCode: 'L' },
      ],
    },
    {
      id: 'row-10',
      day: 'Jumat',
      date: '26 September 2025',
      session: '09.30 – 10.30 (Sesi 2)',
      subject: 'Tahfidz / Al-Qur\'an Hadits / BTQ',
      classes: 'Kelas 1–6',
      notes: 'Ujian Tulis & Tajwid',
      roomCodes: {
        '1A': 'B', '1B': 'I', '2A': 'J', '2B': 'A',
        '3A': 'D', '3B': 'C', '4A': 'H', '4B': 'G',
        '5A': 'F', '5B': 'E', '6A': 'L', '6B': 'K',
      },
      proctorDetails: [
        { roomOrClass: '1A', proctorName: 'Usth. Siti Rahmawati, S.Pd.I', proctorCode: 'B' },
        { roomOrClass: '1B', proctorName: 'Ust. Hasan Basri, S.Pd.I', proctorCode: 'I' },
        { roomOrClass: '2A', proctorName: 'Usth. Fatimah Az-Zahra, S.Pd', proctorCode: 'J' },
        { roomOrClass: '2B', proctorName: 'Ust. Ahmad Fauzi, S.Pd', proctorCode: 'A' },
        { roomOrClass: '3A', proctorName: 'Usth. Nurul Hidayah, S.Pd', proctorCode: 'D' },
        { roomOrClass: '3B', proctorName: 'Ust. Muhammad Zaki, M.Pd', proctorCode: 'C' },
        { roomOrClass: '4A', proctorName: 'Usth. Dewi Kartika, S.Pd', proctorCode: 'H' },
        { roomOrClass: '4B', proctorName: 'Ust. Wahyu Hidayat, S.Pd', proctorCode: 'G' },
        { roomOrClass: '5A', proctorName: 'Usth. Sarah Amalia, S.Pd', proctorCode: 'F' },
        { roomOrClass: '5B', proctorName: 'Ust. Ridwan Kamil, S.Pd', proctorCode: 'E' },
        { roomOrClass: '6A', proctorName: 'Usth. Rina Agustina, S.Pd', proctorCode: 'L' },
        { roomOrClass: '6B', proctorName: 'Ust. Fajar Ramadhan, S.Pd', proctorCode: 'K' },
      ],
    },
  ],
};

export const DEFAULT_EXAM_SCHEDULES: ExamScheduleSet[] = [
  {
    id: 'sched-sts',
    examType: 'STS',
    title: 'Jadwal STS (Sumatif Tengah Semester)',
    period: 'Semester Ganjil / Genap TP 2025/2026',
    duration: '90 Menit / Mata Pelajaran',
    rows: DEFAULT_ACTIVE_EXAM_SCHEDULE.rows,
  },
];

export interface ExamBreakdownItem {
  id: string;
  name: string;
  summary: string;
  details: {
    pg: string;
    isian: string;
    essay: string;
    total: string;
    time: string;
  };
  questionRules?: ExamQuestionRuleRow[];
}

export const DEFAULT_EXAM_BREAKDOWNS: ExamBreakdownItem[] = [
  {
    id: 'sts-ganjil',
    name: 'STS (Sumatif Tengah Semester)',
    summary: 'Ketentuan soal STS',
    details: {
      pg: '20 Soal Pilihan Ganda (Bobot 1)',
      isian: '0 Soal Isian Singkat',
      essay: '5 Soal Uraian / Essay (Bobot 4)',
      total: '25 Butir Soal',
      time: '90 Menit',
    },
    questionRules: [
      { id: 'sts-1-2', label: '1–2', pg: 20, isian: 10, essay: 5 },
      { id: 'sts-3', label: '3', pg: 25, isian: 10, essay: 5 },
      { id: 'sts-4-6', label: '4–6', pg: 30, isian: 5, essay: 5 },
      { id: 'sts-bahasa-arab', label: 'B. Arab', pg: 30, isian: 5, essay: 5 },
      { id: 'sts-bahasa-inggris', label: 'B. Inggris', pg: 30, isian: 5, essay: 5 },
      { id: 'sts-matematika', label: 'Matematika', pg: 30, isian: 5, essay: 5 },
    ],
  },
  {
    id: 'sas-ganjil',
    name: 'SAS / SAT (Sumatif Akhir Semester / Tahun)',
    summary: 'Ketentuan soal SAS',
    details: {
      pg: '30 Soal Pilihan Ganda (Bobot 1)',
      isian: '5 Soal Isian Singkat (Bobot 2)',
      essay: '5 Soal Uraian / Essay (Bobot 5)',
      total: '40 Butir Soal',
      time: '120 Menit',
    },
    questionRules: [
      { id: 'sas-1-2', label: '1–2', pg: 20, isian: 10, essay: 5 },
      { id: 'sas-3', label: '3', pg: 25, isian: 10, essay: 5 },
      { id: 'sas-4-6', label: '4–6', pg: 30, isian: 5, essay: 5 },
      { id: 'sas-bahasa-arab', label: 'B. Arab', pg: 30, isian: 5, essay: 5 },
      { id: 'sas-bahasa-inggris', label: 'B. Inggris', pg: 30, isian: 5, essay: 5 },
      { id: 'sas-matematika', label: 'Matematika', pg: 30, isian: 5, essay: 5 },
    ],
  },
  {
    id: 'ujian-sekolah',
    name: 'Ujian Sekolah (US Kelas 6)',
    summary: 'Ketentuan soal US',
    details: {
      pg: '40 Soal Pilihan Ganda',
      isian: '5 Soal Menjodohkan',
      essay: '5 Soal Uraian / Essay',
      total: '50 Butir Soal',
      time: '120 Menit',
    },
    questionRules: [
      { id: 'us-1-2', label: '1–2', pg: 20, isian: 10, essay: 5 },
      { id: 'us-3', label: '3', pg: 25, isian: 10, essay: 5 },
      { id: 'us-4-6', label: '4–6', pg: 30, isian: 5, essay: 5 },
      { id: 'us-bahasa-arab', label: 'B. Arab', pg: 30, isian: 5, essay: 5 },
      { id: 'us-bahasa-inggris', label: 'B. Inggris', pg: 30, isian: 5, essay: 5 },
      { id: 'us-matematika', label: 'Matematika', pg: 30, isian: 5, essay: 5 },
    ],
  },
];

export interface ExamUploadConfig {
  id?: string;
  driveFolderUrl: string; // Google Drive folder provided by admin
  title: string;
  description: string;
  activePeriod: string; // e.g. "STS Ganjil TP 2025/2026"
  deadline?: string; // e.g. "15 September 2025"
  instructions?: string;
  examBreakdowns?: ExamBreakdownItem[];
  examSchedules?: ExamScheduleSet[];
  activeExamSchedule?: ActiveExamSchedule;
  updatedAt?: string;
}

export type ExamSubmissionStatus = 'menunggu' | 'diterima' | 'revisi';

export interface ExamSubmissionItem {
  id: string;
  teacherName: string;
  teacherPhone?: string;
  subject: string;
  classLevel: string;
  examType: string;
  schoolYear: string;
  semester: string;
  driveUrl: string;
  fileName?: string;
  fileFormat?: string;
  hasAnswerKey: boolean;
  hasGridAnalysis: boolean;
  status: ExamSubmissionStatus;
  note?: string;
  adminFeedback?: string;
  submittedAt: string;
  reviewedAt?: string;
}

/**
 * Model Data untuk Monitoring & Tracking Naskah Soal Ujian (Pengumpulan & Print)
 */
export interface ExamTrackingItem {
  id: string;
  subject: string; // Mata Pelajaran: Matematika, Bahasa Indonesia, PAI, IPAS, dll.
  classLevel: string; // Kelas 1 .. Kelas 6 atau 1A..6B
  teacherName: string; // Guru Pengampu / Penyusun Naskah
  examType: string; // STS Ganjil, SAS Ganjil, STS Genap, SAT Genap, Ujian Sekolah, dll.
  schoolYear: string; // e.g. "2025/2026"
  semester?: string; // Semester 1 (Ganjil) / Semester 2 (Genap)
  isCollected: boolean; // Sudah Dikumpulkan (true / false)
  collectedAt?: string; // Timestamp ISO saat dicentang kumpul
  isPrinted: boolean; // Sudah Dicetak / Print (true / false)
  printedAt?: string; // Timestamp ISO saat dicentang print
  copiesCount?: number; // Jumlah Eksemplar / Siswa (e.g. 28)
  driveUrl?: string; // Tautan file Google Drive naskah soal (opsional)
  driveFileUrl?: string;
  note?: string; // Catatan spesifikasi soal (misal "25 PG + 5 Uraian + Kunci")
  createdAt: string;
  updatedAt: string;
}

/**
 * Konfigurasi fleksibel kelas dan mapel peserta per jenis ujian
 */
export interface ExamSessionConfig {
  id: string;
  name: string; // e.g. "STS Ganjil", "SAS Ganjil", "STS Genap", "SAT Genap", "Ujian Sekolah", "Ujian Khusus"
  schoolYear: string; // e.g. "2025/2026"
  activeClasses: Record<string, boolean>; // e.g. { '1A': true, '1B': true, ..., '6A': false, '6B': false }
  // Map classId -> Map subjectName / subjectId -> boolean
  activeSubjects: Record<string, Record<string, boolean>>; // e.g. { '1A': { 'PAI': true, 'AKIDAH AKHLAK': true, 'SENI RUPA': false } }
  // Optional custom added subjects per class
  customSubjects?: Record<string, Array<{ id: string; name: string; teacher?: string }>>;
  updatedAt?: string;
}

/**
 * Status checklist per soal per kelas untuk ujian tertentu
 */
export interface ExamTrackingRecord {
  id: string; // Unique key: `${examSessionId}__${classId}__${subjectId}`
  examSessionId: string;
  classId: string; // '1A', '1B', etc.
  subjectId: string;
  subjectName: string;
  teacherName?: string;
  isCollected: boolean;
  collectedAt?: string;
  isPrinted: boolean;
  printedAt?: string;
  note?: string;
  driveUrl?: string;
  driveFileUrl?: string;
  source?: 'drive' | 'manual';
  updatedAt?: string;
}

export const DEFAULT_EXAM_SESSIONS: ExamSessionConfig[] = [
  {
    id: 'sts-ganjil-2025-2026',
    name: 'STS Ganjil (Sumatif Tengah Semester 1)',
    schoolYear: '2025/2026',
    activeClasses: {
      '1A': true,
      '1B': true,
      '2A': true,
      '2B': true,
      '2C': true,
      '3A': true,
      '3B': true,
      '3C': true,
      '4A': true,
      '4B': true,
      '5A': true,
      '5B': true,
      '6A': true,
      '6B': true,
    },
    activeSubjects: {},
  },
  {
    id: 'sas-ganjil-2025-2026',
    name: 'SAS Ganjil (Sumatif Akhir Semester 1)',
    schoolYear: '2025/2026',
    activeClasses: {
      '1A': true,
      '1B': true,
      '2A': true,
      '2B': true,
      '2C': true,
      '3A': true,
      '3B': true,
      '3C': true,
      '4A': true,
      '4B': true,
      '5A': true,
      '5B': true,
      '6A': true,
      '6B': true,
    },
    activeSubjects: {},
  },
  {
    id: 'sts-genap-2025-2026',
    name: 'STS Genap (Sumatif Tengah Semester 2)',
    schoolYear: '2025/2026',
    activeClasses: {
      '1A': true,
      '1B': true,
      '2A': true,
      '2B': true,
      '2C': true,
      '3A': true,
      '3B': true,
      '3C': true,
      '4A': true,
      '4B': true,
      '5A': true,
      '5B': true,
      '6A': true,
      '6B': true,
    },
    activeSubjects: {},
  },
  {
    id: 'sat-genap-2025-2026',
    name: 'SAT / SAS 2 (Sumatif Akhir Tahun)',
    schoolYear: '2025/2026',
    activeClasses: {
      '1A': true,
      '1B': true,
      '2A': true,
      '2B': true,
      '2C': true,
      '3A': true,
      '3B': true,
      '3C': true,
      '4A': true,
      '4B': true,
      '5A': true,
      '5B': true,
      '6A': true,
      '6B': true,
    },
    activeSubjects: {},
  },
  {
    id: 'us-2025-2026',
    name: 'Ujian Sekolah (US Kelas 6)',
    schoolYear: '2025/2026',
    activeClasses: {
      '1A': false,
      '1B': false,
      '2A': false,
      '2B': false,
      '2C': false,
      '3A': false,
      '3B': false,
      '3C': false,
      '4A': false,
      '4B': false,
      '5A': false,
      '5B': false,
      '6A': true,
      '6B': true,
    },
    activeSubjects: {},
  },
];

export interface SchoolYearOption {
  id: string;
  year: string;
  isCurrent?: boolean;
}

export const CLASS_OPTIONS = [
  'Kelas 1',
  'Kelas 2',
  'Kelas 3',
  'Kelas 4',
  'Kelas 5',
  'Kelas 6',
];

export const SUBJECT_OPTIONS = [
  'Pendidikan Agama Islam (PAI)',
  'Bahasa Indonesia',
  'Matematika',
  'IPAS (Ilmu Pengetahuan Alam & Sosial)',
  'Pendidikan Pancasila',
  'Bahasa Inggris',
  'Pendidikan Jasmani & Olahraga (PJOK)',
  'Seni Budaya & Prakarya',
  'Bahasa Arab',
  'Tahfidz / Al-Qur\'an Hadits',
  'Kemuhammadiyahan / Keislaman',
  'Lainnya',
];

export const EXAM_TYPE_OPTIONS = [
  'STS 1 (Sumatif Tengah Semester 1)',
  'SAS 1 (Sumatif Akhir Semester 1)',
  'STS 2 (Sumatif Tengah Semester 2)',
  'SAT / SAS 2 (Sumatif Akhir Tahun)',
  'Ujian Sekolah (US / Kelulusan)',
  'Try Out / Uji Coba Asesmen',
  'Penilaian Harian (Formatif / PH)',
];

export const DEFAULT_SCHOOL_YEAR_OPTIONS: SchoolYearOption[] = [
  { id: 'sy-2025-2026', year: '2025/2026', isCurrent: true },
  { id: 'sy-2024-2025', year: '2024/2025', isCurrent: false },
  { id: 'sy-2023-2024', year: '2023/2024', isCurrent: false },
  { id: 'sy-2026-2027', year: '2026/2027', isCurrent: false },
];

export const DEFAULT_EXAM_CONFIG: ExamUploadConfig = {
  driveFolderUrl: 'https://drive.google.com/drive/folders/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms?usp=sharing',
  title: 'Folder Pengumpulan Soal',
  description: 'Folder Google Drive kosong untuk menerima naskah soal dari guru-guru SDIT AL FIKRI.',
  activePeriod: 'STS & SAS Semester Ganjil TP 2025/2026',
  deadline: 'Sesuai Jadwal Panitia Asesmen',
  instructions: 'Format penamaan file: [MataPelajaran]_[Kelas]_[NamaGuru]_[JenisUjian] (Contoh: Matematika_Kelas4_UstAhmad_STSGanjil.docx)',
  examBreakdowns: DEFAULT_EXAM_BREAKDOWNS,
  examSchedules: DEFAULT_EXAM_SCHEDULES,
  activeExamSchedule: DEFAULT_ACTIVE_EXAM_SCHEDULE,
};

export const DEFAULT_TEMPLATES: SchoolTemplateItem[] = [
  {
    id: 'template_analisis_soal',
    title: 'Analisis Soal & Kop Soal',
    category: 'analisis_soal',
    description: 'Format analisis butir soal, daya pembeda, tingkat kesukaran & kop naskah resmi ujian SDIT AL FIKRI.',
    fileFormat: 'Excel & Word',
    driveUrl: 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit?usp=sharing',
  },
  {
    id: 'template_rapor',
    title: 'Template Rapor',
    category: 'rapor',
    description: 'Format pengolahan nilai rapor, capaian TP, dan rekap leger Kurikulum Merdeka.',
    fileFormat: 'Excel (.xlsx)',
    driveUrl: 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit?usp=sharing',
  },
  {
    id: 'template_folder_soal',
    title: 'Folder Pengumpulan Soal',
    category: 'folder_soal',
    description: 'Folder Google Drive kosong untuk menerima naskah soal asesmen dari bapak/ibu guru.',
    fileFormat: 'Folder Drive',
    driveUrl: 'https://drive.google.com/drive/folders/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms?usp=sharing',
  },
  {
    id: 'template_tracking_soal',
    title: 'Tracking Pengumpulan Soal',
    category: 'tracking_soal',
    description: 'Monitoring real-time status pengumpulan & pencetakan naskah soal per kelas 1A - 6B.',
    fileFormat: 'Menu Pendataan',
    driveUrl: '#tracking',
  },
];

export const INITIAL_EXAM_TRACKINGS: ExamTrackingItem[] = [
  {
    id: 'trk-001',
    subject: 'Pendidikan Agama Islam (PAI)',
    classLevel: 'Kelas 1',
    teacherName: 'Usth. Siti Rahmawati, S.Pd.I',
    examType: 'STS Ganjil (Sumatif Tengah Semester 1)',
    schoolYear: '2025/2026',
    semester: 'Semester 1 (Ganjil)',
    isCollected: true,
    collectedAt: '2025-09-10T08:30:00.000Z',
    isPrinted: true,
    printedAt: '2025-09-11T10:00:00.000Z',
    copiesCount: 28,
    driveUrl: 'https://docs.google.com/document/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit?usp=sharing',
    note: '20 PG + 5 Isian Singkat + Kunci Jawaban Lengkap',
    createdAt: '2025-09-01T08:00:00.000Z',
    updatedAt: '2025-09-11T10:00:00.000Z',
  },
  {
    id: 'trk-002',
    subject: 'Bahasa Indonesia',
    classLevel: 'Kelas 1',
    teacherName: 'Usth. Nurul Hidayah, S.Pd',
    examType: 'STS Ganjil (Sumatif Tengah Semester 1)',
    schoolYear: '2025/2026',
    semester: 'Semester 1 (Ganjil)',
    isCollected: true,
    collectedAt: '2025-09-10T09:15:00.000Z',
    isPrinted: true,
    printedAt: '2025-09-11T10:30:00.000Z',
    copiesCount: 28,
    driveUrl: 'https://docs.google.com/document/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit?usp=sharing',
    note: 'Membaca & Memahami Kalimat Sederhana',
    createdAt: '2025-09-01T08:00:00.000Z',
    updatedAt: '2025-09-11T10:30:00.000Z',
  },
  {
    id: 'trk-003',
    subject: 'Matematika',
    classLevel: 'Kelas 1',
    teacherName: 'Ust. Ahmad Fauzi, S.Pd',
    examType: 'STS Ganjil (Sumatif Tengah Semester 1)',
    schoolYear: '2025/2026',
    semester: 'Semester 1 (Ganjil)',
    isCollected: true,
    collectedAt: '2025-09-11T13:00:00.000Z',
    isPrinted: false,
    copiesCount: 28,
    driveUrl: 'https://docs.google.com/document/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit?usp=sharing',
    note: 'Bilangan 1–20 & Pola Gambar',
    createdAt: '2025-09-01T08:00:00.000Z',
    updatedAt: '2025-09-11T13:00:00.000Z',
  },
  {
    id: 'trk-004',
    subject: 'Pendidikan Pancasila',
    classLevel: 'Kelas 1',
    teacherName: 'Usth. Dewi Kartika, S.Pd',
    examType: 'STS Ganjil (Sumatif Tengah Semester 1)',
    schoolYear: '2025/2026',
    semester: 'Semester 1 (Ganjil)',
    isCollected: false,
    isPrinted: false,
    copiesCount: 28,
    note: 'Simbol & Sila Pancasila',
    createdAt: '2025-09-01T08:00:00.000Z',
    updatedAt: '2025-09-01T08:00:00.000Z',
  },
  {
    id: 'trk-005',
    subject: 'Bahasa Indonesia',
    classLevel: 'Kelas 2',
    teacherName: 'Usth. Nurul Hidayah, S.Pd',
    examType: 'STS Ganjil (Sumatif Tengah Semester 1)',
    schoolYear: '2025/2026',
    semester: 'Semester 1 (Ganjil)',
    isCollected: true,
    collectedAt: '2025-09-12T08:00:00.000Z',
    isPrinted: true,
    printedAt: '2025-09-12T11:00:00.000Z',
    copiesCount: 30,
    note: 'Teks Narasi & Kosakata',
    createdAt: '2025-09-01T08:00:00.000Z',
    updatedAt: '2025-09-12T11:00:00.000Z',
  },
  {
    id: 'trk-006',
    subject: 'Matematika',
    classLevel: 'Kelas 2',
    teacherName: 'Ust. Ahmad Fauzi, S.Pd',
    examType: 'STS Ganjil (Sumatif Tengah Semester 1)',
    schoolYear: '2025/2026',
    semester: 'Semester 1 (Ganjil)',
    isCollected: true,
    collectedAt: '2025-09-12T09:30:00.000Z',
    isPrinted: false,
    copiesCount: 30,
    note: 'Penjumlahan & Pengurangan Ratusan',
    createdAt: '2025-09-01T08:00:00.000Z',
    updatedAt: '2025-09-12T09:30:00.000Z',
  },
  {
    id: 'trk-007',
    subject: 'Pendidikan Agama Islam (PAI)',
    classLevel: 'Kelas 2',
    teacherName: 'Usth. Siti Rahmawati, S.Pd.I',
    examType: 'STS Ganjil (Sumatif Tengah Semester 1)',
    schoolYear: '2025/2026',
    semester: 'Semester 1 (Ganjil)',
    isCollected: true,
    collectedAt: '2025-09-12T10:00:00.000Z',
    isPrinted: true,
    printedAt: '2025-09-12T14:00:00.000Z',
    copiesCount: 30,
    note: 'Surah Pendek & Asmaul Husna',
    createdAt: '2025-09-01T08:00:00.000Z',
    updatedAt: '2025-09-12T14:00:00.000Z',
  },
  {
    id: 'trk-008',
    subject: 'Bahasa Arab',
    classLevel: 'Kelas 2',
    teacherName: 'Ust. Muhammad Zaki, Lc',
    examType: 'STS Ganjil (Sumatif Tengah Semester 1)',
    schoolYear: '2025/2026',
    semester: 'Semester 1 (Ganjil)',
    isCollected: false,
    isPrinted: false,
    copiesCount: 30,
    note: 'Kosakata Peralatan Sekolah',
    createdAt: '2025-09-01T08:00:00.000Z',
    updatedAt: '2025-09-01T08:00:00.000Z',
  },
  {
    id: 'trk-009',
    subject: 'Matematika',
    classLevel: 'Kelas 3',
    teacherName: 'Ust. Bambang Kurniawan, S.Pd',
    examType: 'STS Ganjil (Sumatif Tengah Semester 1)',
    schoolYear: '2025/2026',
    semester: 'Semester 1 (Ganjil)',
    isCollected: true,
    collectedAt: '2025-09-11T11:00:00.000Z',
    isPrinted: true,
    printedAt: '2025-09-12T09:00:00.000Z',
    copiesCount: 29,
    note: 'Perkalian, Pembagian, & Pecahan Sederhana',
    createdAt: '2025-09-01T08:00:00.000Z',
    updatedAt: '2025-09-12T09:00:00.000Z',
  },
  {
    id: 'trk-010',
    subject: 'Bahasa Indonesia',
    classLevel: 'Kelas 3',
    teacherName: 'Usth. Nurul Hidayah, S.Pd',
    examType: 'STS Ganjil (Sumatif Tengah Semester 1)',
    schoolYear: '2025/2026',
    semester: 'Semester 1 (Ganjil)',
    isCollected: true,
    collectedAt: '2025-09-11T14:20:00.000Z',
    isPrinted: false,
    copiesCount: 29,
    note: 'Gagasan Pokok & Kalimat Efektif',
    createdAt: '2025-09-01T08:00:00.000Z',
    updatedAt: '2025-09-11T14:20:00.000Z',
  },
  {
    id: 'trk-011',
    subject: 'IPAS',
    classLevel: 'Kelas 3',
    teacherName: 'Ust. Bambang Kurniawan, S.Pd',
    examType: 'STS Ganjil (Sumatif Tengah Semester 1)',
    schoolYear: '2025/2026',
    semester: 'Semester 1 (Ganjil)',
    isCollected: false,
    isPrinted: false,
    copiesCount: 29,
    note: 'Ciri-Ciri Makhluk Hidup & Wujud Benda',
    createdAt: '2025-09-01T08:00:00.000Z',
    updatedAt: '2025-09-01T08:00:00.000Z',
  },
  {
    id: 'trk-012',
    subject: 'Matematika',
    classLevel: 'Kelas 4',
    teacherName: 'Ust. Ahmad Fauzi, S.Pd',
    examType: 'STS Ganjil (Sumatif Tengah Semester 1)',
    schoolYear: '2025/2026',
    semester: 'Semester 1 (Ganjil)',
    isCollected: true,
    collectedAt: '2025-09-10T15:00:00.000Z',
    isPrinted: true,
    printedAt: '2025-09-11T11:00:00.000Z',
    copiesCount: 32,
    driveUrl: 'https://docs.google.com/document/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit?usp=sharing',
    note: '25 PG + 5 Isian + 5 Uraian (Fase B)',
    createdAt: '2025-09-01T08:00:00.000Z',
    updatedAt: '2025-09-11T11:00:00.000Z',
  },
  {
    id: 'trk-013',
    subject: 'IPAS',
    classLevel: 'Kelas 4',
    teacherName: 'Ust. Bambang Kurniawan, S.Pd',
    examType: 'STS Ganjil (Sumatif Tengah Semester 1)',
    schoolYear: '2025/2026',
    semester: 'Semester 1 (Ganjil)',
    isCollected: true,
    collectedAt: '2025-09-11T16:00:00.000Z',
    isPrinted: true,
    printedAt: '2025-09-12T13:00:00.000Z',
    copiesCount: 32,
    note: 'Bagian Tubuh Tumbuhan & Fotosintesis',
    createdAt: '2025-09-01T08:00:00.000Z',
    updatedAt: '2025-09-12T13:00:00.000Z',
  },
  {
    id: 'trk-014',
    subject: 'Bahasa Indonesia',
    classLevel: 'Kelas 4',
    teacherName: 'Usth. Nurul Hidayah, S.Pd',
    examType: 'STS Ganjil (Sumatif Tengah Semester 1)',
    schoolYear: '2025/2026',
    semester: 'Semester 1 (Ganjil)',
    isCollected: true,
    collectedAt: '2025-09-12T10:00:00.000Z',
    isPrinted: false,
    copiesCount: 32,
    note: 'Teks Eksplanasi & Wawancara',
    createdAt: '2025-09-01T08:00:00.000Z',
    updatedAt: '2025-09-12T10:00:00.000Z',
  },
  {
    id: 'trk-015',
    subject: 'Bahasa Inggris',
    classLevel: 'Kelas 4',
    teacherName: 'Usth. Anisa Fitri, S.Pd',
    examType: 'STS Ganjil (Sumatif Tengah Semester 1)',
    schoolYear: '2025/2026',
    semester: 'Semester 1 (Ganjil)',
    isCollected: false,
    isPrinted: false,
    copiesCount: 32,
    note: 'Vocabulary & Daily Activities',
    createdAt: '2025-09-01T08:00:00.000Z',
    updatedAt: '2025-09-01T08:00:00.000Z',
  },
  {
    id: 'trk-016',
    subject: 'Pendidikan Agama Islam (PAI)',
    classLevel: 'Kelas 5',
    teacherName: 'Usth. Siti Rahmawati, S.Pd.I',
    examType: 'STS Ganjil (Sumatif Tengah Semester 1)',
    schoolYear: '2025/2026',
    semester: 'Semester 1 (Ganjil)',
    isCollected: true,
    collectedAt: '2025-09-10T10:00:00.000Z',
    isPrinted: true,
    printedAt: '2025-09-11T14:00:00.000Z',
    copiesCount: 31,
    driveUrl: 'https://docs.google.com/document/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit?usp=sharing',
    note: 'Surah Al-Maun & Asmaul Husna',
    createdAt: '2025-09-01T08:00:00.000Z',
    updatedAt: '2025-09-11T14:00:00.000Z',
  },
  {
    id: 'trk-017',
    subject: 'Matematika',
    classLevel: 'Kelas 5',
    teacherName: 'Ust. Ahmad Fauzi, S.Pd',
    examType: 'STS Ganjil (Sumatif Tengah Semester 1)',
    schoolYear: '2025/2026',
    semester: 'Semester 1 (Ganjil)',
    isCollected: true,
    collectedAt: '2025-09-11T09:00:00.000Z',
    isPrinted: true,
    printedAt: '2025-09-12T10:00:00.000Z',
    copiesCount: 31,
    note: 'Operasi Hitung Pecahan & Desimal',
    createdAt: '2025-09-01T08:00:00.000Z',
    updatedAt: '2025-09-12T10:00:00.000Z',
  },
  {
    id: 'trk-018',
    subject: 'IPAS',
    classLevel: 'Kelas 5',
    teacherName: 'Ust. Bambang Kurniawan, S.Pd',
    examType: 'STS Ganjil (Sumatif Tengah Semester 1)',
    schoolYear: '2025/2026',
    semester: 'Semester 1 (Ganjil)',
    isCollected: true,
    collectedAt: '2025-09-12T11:00:00.000Z',
    isPrinted: false,
    copiesCount: 31,
    note: 'Cahaya dan Sifat-sifatnya',
    createdAt: '2025-09-01T08:00:00.000Z',
    updatedAt: '2025-09-12T11:00:00.000Z',
  },
  {
    id: 'trk-019',
    subject: 'PJOK',
    classLevel: 'Kelas 5',
    teacherName: 'Ust. Hendra Saputra, S.Pd',
    examType: 'STS Ganjil (Sumatif Tengah Semester 1)',
    schoolYear: '2025/2026',
    semester: 'Semester 1 (Ganjil)',
    isCollected: false,
    isPrinted: false,
    copiesCount: 31,
    note: 'Permainan Bola Besar & Kebugaran',
    createdAt: '2025-09-01T08:00:00.000Z',
    updatedAt: '2025-09-01T08:00:00.000Z',
  },
  {
    id: 'trk-020',
    subject: 'Matematika',
    classLevel: 'Kelas 6',
    teacherName: 'Ust. Ahmad Fauzi, S.Pd',
    examType: 'STS Ganjil (Sumatif Tengah Semester 1)',
    schoolYear: '2025/2026',
    semester: 'Semester 1 (Ganjil)',
    isCollected: true,
    collectedAt: '2025-09-10T16:00:00.000Z',
    isPrinted: true,
    printedAt: '2025-09-11T15:00:00.000Z',
    copiesCount: 30,
    note: 'Bilangan Bulat Negatif & Lingkaran',
    createdAt: '2025-09-01T08:00:00.000Z',
    updatedAt: '2025-09-11T15:00:00.000Z',
  },
  {
    id: 'trk-021',
    subject: 'Bahasa Indonesia',
    classLevel: 'Kelas 6',
    teacherName: 'Usth. Nurul Hidayah, S.Pd',
    examType: 'STS Ganjil (Sumatif Tengah Semester 1)',
    schoolYear: '2025/2026',
    semester: 'Semester 1 (Ganjil)',
    isCollected: true,
    collectedAt: '2025-09-11T11:00:00.000Z',
    isPrinted: true,
    printedAt: '2025-09-12T11:30:00.000Z',
    copiesCount: 30,
    note: 'Teks Laporan Hasil Pengamatan',
    createdAt: '2025-09-01T08:00:00.000Z',
    updatedAt: '2025-09-12T11:30:00.000Z',
  },
  {
    id: 'trk-022',
    subject: 'IPAS',
    classLevel: 'Kelas 6',
    teacherName: 'Ust. Bambang Kurniawan, S.Pd',
    examType: 'STS Ganjil (Sumatif Tengah Semester 1)',
    schoolYear: '2025/2026',
    semester: 'Semester 1 (Ganjil)',
    isCollected: true,
    collectedAt: '2025-09-12T13:00:00.000Z',
    isPrinted: false,
    copiesCount: 30,
    note: 'Perkembangbiakan Hewan & Tumbuhan',
    createdAt: '2025-09-01T08:00:00.000Z',
    updatedAt: '2025-09-12T13:00:00.000Z',
  },
  {
    id: 'trk-023',
    subject: 'Al-Qur\'an & Hadits',
    classLevel: 'Kelas 6',
    teacherName: 'Ust. Muhammad Zaki, Lc',
    examType: 'STS Ganjil (Sumatif Tengah Semester 1)',
    schoolYear: '2025/2026',
    semester: 'Semester 1 (Ganjil)',
    isCollected: false,
    isPrinted: false,
    copiesCount: 30,
    note: 'Hukum Bacaan Mad & Hadits Keutamaan Belajar Al-Qur\'an',
    createdAt: '2025-09-01T08:00:00.000Z',
    updatedAt: '2025-09-01T08:00:00.000Z',
  },
];

export const INITIAL_EXAM_SUBMISSIONS: ExamSubmissionItem[] = [
  {
    id: 'sub-001',
    teacherName: 'Ust. Ahmad Fauzi, S.Pd',
    teacherPhone: '081234567890',
    subject: 'Matematika',
    classLevel: 'Kelas 4',
    examType: 'STS Ganjil (Sumatif Tengah Semester 1)',
    schoolYear: '2025/2026',
    semester: 'Semester 1 (Ganjil)',
    driveUrl: 'https://docs.google.com/document/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit?usp=sharing',
    fileName: 'Soal_Matematika_Kls4_UstAhmad_STS1.docx',
    fileFormat: 'Word (.docx)',
    hasAnswerKey: true,
    hasGridAnalysis: true,
    status: 'diterima',
    note: 'Naskah soal 25 butir (Pilihan Ganda, Isian, Uraian) + Kunci & Kisi-kisi lengkap.',
    adminFeedback: 'Naskah soal sudah diverifikasi, sesuai format kop soal resmi.',
    submittedAt: '2025-09-10T08:30:00.000Z',
    reviewedAt: '2025-09-10T11:00:00.000Z',
  },
  {
    id: 'sub-002',
    teacherName: 'Usth. Siti Rahmawati, S.Pd.I',
    teacherPhone: '081398765432',
    subject: 'Pendidikan Agama Islam (PAI)',
    classLevel: 'Kelas 5',
    examType: 'STS Ganjil (Sumatif Tengah Semester 1)',
    schoolYear: '2025/2026',
    semester: 'Semester 1 (Ganjil)',
    driveUrl: 'https://docs.google.com/document/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit?usp=sharing',
    fileName: 'Soal_PAI_Kls5_UsthSiti_STS1.docx',
    fileFormat: 'Word (.docx)',
    hasAnswerKey: true,
    hasGridAnalysis: true,
    status: 'diterima',
    note: 'Soal PAI & Budi Pekerti BAB 1 & 2 beserta rubrik penilaian tajwid.',
    adminFeedback: 'Siap dicetak untuk asesmen.',
    submittedAt: '2025-09-11T09:15:00.000Z',
    reviewedAt: '2025-09-11T13:45:00.000Z',
  },
];

export interface AdministrasiFilter {
  search: string;
  classLevel: string;
  schoolYear: string;
  category: string;
}

export interface SoalFilter {
  search: string;
  examType: string;
  schoolYear: string;
}

export interface SertifikatFilter {
  search: string;
  recipient: string;
  category: string;
  schoolYear: string;
}

export interface RaporFilter {
  search: string;
  classLevel: string;
  semester: string;
  category: string;
  schoolYear: string;
}

export const CATEGORIES_ADMINISTRASI = [
  'Semua Kategori',
  'Administrasi Kelas',
  'Perangkat Pembelajaran',
  'Modul Ajar Kurikulum Merdeka',
  'Program Tahunan & Semester (Prota/Promes)',
  'Dokumen Peserta Didik',
  'Dokumen Wali Kelas',
  'Lainnya',
] as const;

export const CATEGORIES_RAPOR = [
  'Semua Kategori Rapor',
  'Rapor Semester Ganjil (Sem. 1)',
  'Rapor Semester Genap (Sem. 2)',
  'Rapor Projek P5 Kurikulum Merdeka',
  'Leger Nilai & Rekapitulasi',
  'Rapor Tahfidz & Keislaman',
  'Buku Induk & Arsip Kelulusan',
  'Lainnya',
] as const;

export const SEMESTER_TYPES = [
  'Semua Semester',
  'Semester 1 (Ganjil)',
  'Semester 2 (Genap)',
] as const;

export const CATEGORIES_SERTIFIKAT = [
  'Semua Kategori',
  'Sertifikat Pelatihan Guru',
  'Piagam Prestasi Siswa',
  'Sertifikat Workshop & Seminar',
  'Ijazah & Dokumen Kelulusan',
  'Sertifikat Akreditasi & Kelembagaan',
  'Penghargaan & Juara Lomba',
  'Lainnya',
] as const;

export const RECIPIENT_TYPES = [
  'Semua Penerima',
  'Guru & Tendik',
  'Peserta Didik',
  'Sekolah / Kelembagaan',
] as const;

export const CLASS_LEVELS = [
  'Semua Kelas',
  'Kelas 1',
  'Kelas 2',
  'Kelas 3',
  'Kelas 4',
  'Kelas 5',
  'Kelas 6',
  'Umum / Guru',
] as const;

export const SUBJECTS_SOAL = [
  'Semua Mata Pelajaran',
  'Matematika',
  'Bahasa Indonesia',
  'IPAS',
  'Pendidikan Agama Islam (PAI)',
  'Bahasa Inggris',
  'Pendidikan Pancasila',
  'PJOK',
  'Seni Budaya',
  'Bahasa Arab',
  'Al-Qur\'an & Hadits',
  'Lainnya',
] as const;

export const EXAM_TYPES = [
  'Semua Jenis Ujian',
  'STS Ganjil (Sumatif Tengah Semester 1)',
  'SAS Ganjil (Sumatif Akhir Semester 1)',
  'STS Genap (Sumatif Tengah Semester 2)',
  'SAT Genap (Sumatif Akhir Tahun / Semester 2)',
  'Ujian Sekolah (US / Kelulusan)',
  'Penilaian Harian (Formatif / PH)',
  'Asesmen Diagnostik & ANBK',
  'Lainnya',
] as const;

export const DEFAULT_SCHOOL_YEARS = [
  '2026/2027',
  '2025/2026',
  '2024/2025',
  '2023/2024',
] as const;

export const SCHOOL_YEARS = [
  'Semua Tahun',
  '2026/2027',
  '2025/2026',
  '2024/2025',
  '2023/2024',
];

/**
 * Guru & Tenaga Pendidik Terdaftar (Whitelist Akses Folder Guru)
 */
export interface TeacherDeviceSession {
  deviceId: string;
  deviceName: string;
  browser: string;
  lastActiveAt: string;
  deviceType?: 'desktop' | 'mobile' | 'tablet';
}

export interface TeacherUser {
  id: string;
  /**
   * Nama guru resmi yang menjadi identitas utama di sistem.
   * Contoh: "SITI MAEMANAH, S.Pd.I"
   *
   * Login tidak bergantung pada field ini saja. Guru dapat masuk
   * menggunakan salah satu loginAliases yang terdaftar, sementara
   * session tetap menyimpan teacher.id sebagai identitas stabil.
   */
  name: string;

  /**
   * Nama hasil normalisasi dari nama resmi.
   * Field ini dipertahankan untuk kompatibilitas dengan data lama.
   * Jangan gunakan normalizedName sebagai identity/foreign key.
   */
  normalizedName: string;

  /**
   * Alias / nama panggilan yang boleh digunakan guru untuk login.
   *
   * Contoh:
   * loginAliases: ["Mae", "May", "Bu Mae", "Bu May"]
   *
   * Semua alias mengarah ke teacher.id yang sama.
   * Field bersifat optional agar data guru lama tetap kompatibel.
   */
  loginAliases?: string[];

  roleTitle?: string; // e.g. "Wali Kelas 1A", "Guru B. Inggris", "Guru PJOK"
  status: 'active' | 'blocked';
  maxDevices: number; // default 2
  activeSessions?: TeacherDeviceSession[];
  lastLoginAt?: string;
  createdAt: string;
  note?: string;
}

