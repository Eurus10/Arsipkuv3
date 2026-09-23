export interface MasterSubject {
  id: string;
  name: string;
  teacher?: string;
  order: number;
}

export interface MasterClass {
  id: string; // '1A', '1B', '2A', etc.
  name: string;
  level: number; // 1, 2, 3, 4, 5, 6
  levelName: string; // 'Kelas 1', 'Kelas 2', etc.
  waliKelas: string;
  subjects: MasterSubject[];
}

/**
 * DATA MASTER KELAS, WALI KELAS, GURU, DAN MATA PELAJARAN
 * Sesuai data resmi SDIT AL FIKRI (Tidak boleh diganti data dummy)
 */
export const MASTER_CLASSES: MasterClass[] = [
  // ==================== KELAS 1 ====================
  {
    id: '1A',
    name: '1A',
    level: 1,
    levelName: 'Kelas 1',
    waliKelas: 'Bu Yeni',
    subjects: [
      { id: '1a-pai', name: 'PAI', order: 1 },
      { id: '1a-akidah', name: 'AKIDAH AKHLAK', order: 2 },
      { id: '1a-arab', name: 'B. ARAB', teacher: 'Bu Hj. Nedya', order: 3 },
      { id: '1a-inggris', name: 'B. INGGRIS', teacher: 'Ms. Wiwit', order: 4 },
      { id: '1a-pjok', name: 'PJOK', teacher: 'Pak Megi', order: 5 },
      { id: '1a-fiqih', name: 'FIQIH', order: 6 },
      { id: '1a-matematika', name: 'MATEMATIKA', order: 7 },
      { id: '1a-indonesia', name: 'B. INDONESIA', order: 8 },
      { id: '1a-senirupa', name: 'SENI RUPA', order: 9 },
      { id: '1a-pancasila', name: 'PEND. PANCASILA', order: 10 },
    ],
  },
  {
    id: '1B',
    name: '1B',
    level: 1,
    levelName: 'Kelas 1',
    waliKelas: 'Bu Okta',
    subjects: [
      { id: '1b-pai', name: 'PAI', order: 1 },
      { id: '1b-akidah', name: 'AKIDAH AKHLAK', order: 2 },
      { id: '1b-arab', name: 'B. ARAB', teacher: 'Bu Hj. Nedya', order: 3 },
      { id: '1b-inggris', name: 'B. INGGRIS', teacher: 'Ms. Wiwit', order: 4 },
      { id: '1b-pjok', name: 'PJOK', teacher: 'Pak Megi', order: 5 },
      { id: '1b-fiqih', name: 'FIQIH', order: 6 },
      { id: '1b-matematika', name: 'MATEMATIKA', order: 7 },
      { id: '1b-indonesia', name: 'B. INDONESIA', order: 8 },
      { id: '1b-senirupa', name: 'SENI RUPA', order: 9 },
      { id: '1b-pancasila', name: 'PEND. PANCASILA', order: 10 },
    ],
  },

  // ==================== KELAS 2 ====================
  {
    id: '2A',
    name: '2A',
    level: 2,
    levelName: 'Kelas 2',
    waliKelas: 'Bu Tati',
    subjects: [
      { id: '2a-pai', name: 'PAI', order: 1 },
      { id: '2a-akidah', name: 'AKIDAH AKHLAK', order: 2 },
      { id: '2a-arab', name: 'B. ARAB', teacher: 'Bu Hj. Nedya', order: 3 },
      { id: '2a-inggris', name: 'B. INGGRIS', teacher: 'Ms. Wiwit', order: 4 },
      { id: '2a-pjok', name: 'PJOK', teacher: 'Pak Megi', order: 5 },
      { id: '2a-fiqih', name: 'FIQIH', order: 6 },
      { id: '2a-matematika', name: 'MATEMATIKA', order: 7 },
      { id: '2a-indonesia', name: 'B. INDONESIA', order: 8 },
      { id: '2a-senirupa', name: 'SENI RUPA', order: 9 },
      { id: '2a-pancasila', name: 'PEND. PANCASILA', order: 10 },
    ],
  },
  {
    id: '2B',
    name: '2B',
    level: 2,
    levelName: 'Kelas 2',
    waliKelas: 'Bu Ana',
    subjects: [
      { id: '2b-pai', name: 'PAI', order: 1 },
      { id: '2b-akidah', name: 'AKIDAH AKHLAK', order: 2 },
      { id: '2b-arab', name: 'B. ARAB', teacher: 'Bu Hj. Nedya', order: 3 },
      { id: '2b-inggris', name: 'B. INGGRIS', teacher: 'Ms. Wiwit', order: 4 },
      { id: '2b-pjok', name: 'PJOK', teacher: 'Pak Megi', order: 5 },
      { id: '2b-fiqih', name: 'FIQIH', order: 6 },
      { id: '2b-matematika', name: 'MATEMATIKA', order: 7 },
      { id: '2b-indonesia', name: 'B. INDONESIA', order: 8 },
      { id: '2b-senirupa', name: 'SENI RUPA', order: 9 },
      { id: '2b-pancasila', name: 'PEND. PANCASILA', order: 10 },
    ],
  },
  {
    id: '2C',
    name: '2C',
    level: 2,
    levelName: 'Kelas 2',
    waliKelas: 'Bu Nesi',
    subjects: [
      { id: '2c-pai', name: 'PAI', order: 1 },
      { id: '2c-akidah', name: 'AKIDAH AKHLAK', order: 2 },
      { id: '2c-arab', name: 'B. ARAB', teacher: 'Bu Hj. Nedya', order: 3 },
      { id: '2c-inggris', name: 'B. INGGRIS', teacher: 'Ms. Wiwit', order: 4 },
      { id: '2c-pjok', name: 'PJOK', teacher: 'Pak Megi', order: 5 },
      { id: '2c-fiqih', name: 'FIQIH', order: 6 },
      { id: '2c-matematika', name: 'MATEMATIKA', order: 7 },
      { id: '2c-indonesia', name: 'B. INDONESIA', order: 8 },
      { id: '2c-senirupa', name: 'SENI RUPA', order: 9 },
      { id: '2c-pancasila', name: 'PEND. PANCASILA', order: 10 },
    ],
  },

  // ==================== KELAS 3 ====================
  {
    id: '3A',
    name: '3A',
    level: 3,
    levelName: 'Kelas 3',
    waliKelas: 'Bu Siti',
    subjects: [
      { id: '3a-pai', name: 'PAI', order: 1 },
      { id: '3a-akidah', name: 'AKIDAH AKHLAK', order: 2 },
      { id: '3a-arab', name: 'B. ARAB', teacher: 'Bu Hj. Nedya', order: 3 },
      { id: '3a-inggris', name: 'B. INGGRIS', teacher: 'Ms. Wiwit', order: 4 },
      { id: '3a-pjok', name: 'PJOK', teacher: 'Pak Megi', order: 5 },
      { id: '3a-fiqih', name: 'FIQIH', order: 6 },
      { id: '3a-matematika', name: 'MATEMATIKA', order: 7 },
      { id: '3a-indonesia', name: 'B. INDONESIA', order: 8 },
      { id: '3a-senirupa', name: 'SENI RUPA', order: 9 },
      { id: '3a-pancasila', name: 'PEND. PANCASILA', order: 10 },
      { id: '3a-ipas', name: 'IPAS', order: 11 },
      { id: '3a-informatika', name: 'INFORMATIKA', order: 12 },
    ],
  },
  {
    id: '3B',
    name: '3B',
    level: 3,
    levelName: 'Kelas 3',
    waliKelas: 'Bu Lia',
    subjects: [
      { id: '3b-pai', name: 'PAI', order: 1 },
      { id: '3b-akidah', name: 'AKIDAH AKHLAK', order: 2 },
      { id: '3b-arab', name: 'B. ARAB', teacher: 'Bu Hj. Nedya', order: 3 },
      { id: '3b-inggris', name: 'B. INGGRIS', teacher: 'Ms. Wiwit', order: 4 },
      { id: '3b-pjok', name: 'PJOK', teacher: 'Pak Megi', order: 5 },
      { id: '3b-fiqih', name: 'FIQIH', order: 6 },
      { id: '3b-matematika', name: 'MATEMATIKA', order: 7 },
      { id: '3b-indonesia', name: 'B. INDONESIA', order: 8 },
      { id: '3b-senirupa', name: 'SENI RUPA', order: 9 },
      { id: '3b-pancasila', name: 'PEND. PANCASILA', order: 10 },
      { id: '3b-ipas', name: 'IPAS', order: 11 },
      { id: '3b-informatika', name: 'INFORMATIKA', order: 12 },
    ],
  },
  {
    id: '3C',
    name: '3C',
    level: 3,
    levelName: 'Kelas 3',
    waliKelas: 'Bu Andin',
    subjects: [
      { id: '3c-pai', name: 'PAI', order: 1 },
      { id: '3c-akidah', name: 'AKIDAH AKHLAK', order: 2 },
      { id: '3c-arab', name: 'B. ARAB', teacher: 'Bu Hj. Nedya', order: 3 },
      { id: '3c-inggris', name: 'B. INGGRIS', teacher: 'Ms. Wiwit', order: 4 },
      { id: '3c-pjok', name: 'PJOK', teacher: 'Pak Megi', order: 5 },
      { id: '3c-fiqih', name: 'FIQIH', order: 6 },
      { id: '3c-matematika', name: 'MATEMATIKA', order: 7 },
      { id: '3c-indonesia', name: 'B. INDONESIA', order: 8 },
      { id: '3c-senirupa', name: 'SENI RUPA', order: 9 },
      { id: '3c-pancasila', name: 'PEND. PANCASILA', order: 10 },
      { id: '3c-ipas', name: 'IPAS', order: 11 },
      { id: '3c-informatika', name: 'INFORMATIKA', order: 12 },
    ],
  },

  // ==================== KELAS 4 ====================
  {
    id: '4A',
    name: '4A',
    level: 4,
    levelName: 'Kelas 4',
    waliKelas: 'Bu Teti',
    subjects: [
      { id: '4a-pai', name: 'PAI', order: 1 },
      { id: '4a-akidah', name: 'AKIDAH AKHLAK', order: 2 },
      { id: '4a-arab', name: 'B. ARAB', teacher: 'Pak Ikhlas', order: 3 },
      { id: '4a-inggris', name: 'B. INGGRIS', teacher: 'Ms. Wiwit', order: 4 },
      { id: '4a-pjok', name: 'PJOK', teacher: 'Pak Megi', order: 5 },
      { id: '4a-fiqih', name: 'FIQIH', order: 6 },
      { id: '4a-matematika', name: 'MATEMATIKA', order: 7 },
      { id: '4a-indonesia', name: 'B. INDONESIA', order: 8 },
      { id: '4a-senirupa', name: 'SENI RUPA', order: 9 },
      { id: '4a-pancasila', name: 'PEND. PANCASILA', order: 10 },
      { id: '4a-ipas', name: 'IPAS', order: 11 },
      { id: '4a-informatika', name: 'INFORMATIKA', order: 12 },
      { id: '4a-qurdist', name: 'QURDIST', order: 13 },
      { id: '4a-ski', name: 'SKI', teacher: 'Bu Hj. Nedya', order: 14 },
    ],
  },
  {
    id: '4B',
    name: '4B',
    level: 4,
    levelName: 'Kelas 4',
    waliKelas: 'Bu Ifah',
    subjects: [
      { id: '4b-pai', name: 'PAI', order: 1 },
      { id: '4b-akidah', name: 'AKIDAH AKHLAK', order: 2 },
      { id: '4b-arab', name: 'B. ARAB', teacher: 'Pak Ikhlas', order: 3 },
      { id: '4b-inggris', name: 'B. INGGRIS', teacher: 'Ms. Wiwit', order: 4 },
      { id: '4b-pjok', name: 'PJOK', teacher: 'Pak Megi', order: 5 },
      { id: '4b-fiqih', name: 'FIQIH', order: 6 },
      { id: '4b-matematika', name: 'MATEMATIKA', order: 7 },
      { id: '4b-indonesia', name: 'B. INDONESIA', order: 8 },
      { id: '4b-senirupa', name: 'SENI RUPA', order: 9 },
      { id: '4b-pancasila', name: 'PEND. PANCASILA', order: 10 },
      { id: '4b-ipas', name: 'IPAS', order: 11 },
      { id: '4b-informatika', name: 'INFORMATIKA', order: 12 },
      { id: '4b-qurdist', name: 'QURDIST', order: 13 },
      { id: '4b-ski', name: 'SKI', teacher: 'Bu Hj. Nedya', order: 14 },
    ],
  },

  // ==================== KELAS 5 ====================
  {
    id: '5A',
    name: '5A',
    level: 5,
    levelName: 'Kelas 5',
    waliKelas: 'Bu Itoh',
    subjects: [
      { id: '5a-pai', name: 'PAI', teacher: 'Bu May', order: 1 },
      { id: '5a-akidah', name: 'AKIDAH AKHLAK', order: 2 },
      { id: '5a-arab', name: 'B. ARAB', teacher: 'Pak Ikhlas', order: 3 },
      { id: '5a-inggris', name: 'B. INGGRIS', teacher: 'Ms. Wiwit', order: 4 },
      { id: '5a-pjok', name: 'PJOK', teacher: 'Pak Megi', order: 5 },
      { id: '5a-fiqih', name: 'FIQIH', order: 6 },
      { id: '5a-matematika', name: 'MATEMATIKA', order: 7 },
      { id: '5a-indonesia', name: 'B. INDONESIA', order: 8 },
      { id: '5a-senirupa', name: 'SENI RUPA', order: 9 },
      { id: '5a-pancasila', name: 'PEND. PANCASILA', order: 10 },
      { id: '5a-ipas', name: 'IPAS', order: 11 },
      { id: '5a-informatika', name: 'INFORMATIKA', order: 12 },
      { id: '5a-qurdist', name: 'QURDIST', order: 13 },
      { id: '5a-ski', name: 'SKI', teacher: 'Bu Hj. Nedya', order: 14 },
    ],
  },
  {
    id: '5B',
    name: '5B',
    level: 5,
    levelName: 'Kelas 5',
    waliKelas: 'Bu Nadiya',
    subjects: [
      { id: '5b-pai', name: 'PAI', order: 1 },
      { id: '5b-akidah', name: 'AKIDAH AKHLAK', order: 2 },
      { id: '5b-arab', name: 'B. ARAB', teacher: 'Pak Ikhlas', order: 3 },
      { id: '5b-inggris', name: 'B. INGGRIS', teacher: 'Ms. Wiwit', order: 4 },
      { id: '5b-pjok', name: 'PJOK', teacher: 'Pak Megi', order: 5 },
      { id: '5b-fiqih', name: 'FIQIH', order: 6 },
      { id: '5b-matematika', name: 'MATEMATIKA', order: 7 },
      { id: '5b-indonesia', name: 'B. INDONESIA', order: 8 },
      { id: '5b-senirupa', name: 'SENI RUPA', order: 9 },
      { id: '5b-pancasila', name: 'PEND. PANCASILA', order: 10 },
      { id: '5b-ipas', name: 'IPAS', order: 11 },
      { id: '5b-informatika', name: 'INFORMATIKA', order: 12 },
      { id: '5b-qurdist', name: 'QURDIST', order: 13 },
      { id: '5b-ski', name: 'SKI', teacher: 'Bu Hj. Nedya', order: 14 },
    ],
  },

  // ==================== KELAS 6 ====================
  {
    id: '6A',
    name: '6A',
    level: 6,
    levelName: 'Kelas 6',
    waliKelas: 'Bu Mae',
    subjects: [
      { id: '6a-pai', name: 'PAI', order: 1 },
      { id: '6a-akidah', name: 'AKIDAH AKHLAK', order: 2 },
      { id: '6a-arab', name: 'B. ARAB', teacher: 'Pak Ikhlas', order: 3 },
      { id: '6a-inggris', name: 'B. INGGRIS', teacher: 'Ms. Wiwit', order: 4 },
      { id: '6a-pjok', name: 'PJOK', teacher: 'Pak Megi', order: 5 },
      { id: '6a-fiqih', name: 'FIQIH', order: 6 },
      { id: '6a-matematika', name: 'MATEMATIKA', order: 7 },
      { id: '6a-indonesia', name: 'B. INDONESIA', order: 8 },
      { id: '6a-senirupa', name: 'SENI RUPA', order: 9 },
      { id: '6a-pancasila', name: 'PEND. PANCASILA', order: 10 },
      { id: '6a-ipas', name: 'IPAS', order: 11 },
      { id: '6a-informatika', name: 'INFORMATIKA', order: 12 },
      { id: '6a-qurdist', name: 'QURDIST', order: 13 },
      { id: '6a-ski', name: 'SKI', teacher: 'Bu Hj. Nedya', order: 14 },
    ],
  },
  {
    id: '6B',
    name: '6B',
    level: 6,
    levelName: 'Kelas 6',
    waliKelas: 'Bu Rini',
    subjects: [
      { id: '6b-pai', name: 'PAI', order: 1 },
      { id: '6b-akidah', name: 'AKIDAH AKHLAK', order: 2 },
      { id: '6b-arab', name: 'B. ARAB', teacher: 'Pak Ikhlas', order: 3 },
      { id: '6b-inggris', name: 'B. INGGRIS', teacher: 'Ms. Wiwit', order: 4 },
      { id: '6b-pjok', name: 'PJOK', teacher: 'Pak Megi', order: 5 },
      { id: '6b-fiqih', name: 'FIQIH', order: 6 },
      { id: '6b-matematika', name: 'MATEMATIKA', order: 7 },
      { id: '6b-indonesia', name: 'B. INDONESIA', order: 8 },
      { id: '6b-senirupa', name: 'SENI RUPA', order: 9 },
      { id: '6b-pancasila', name: 'PEND. PANCASILA', order: 10 },
      { id: '6b-ipas', name: 'IPAS', order: 11 },
      { id: '6b-informatika', name: 'INFORMATIKA', order: 12 },
      { id: '6b-qurdist', name: 'QURDIST', order: 13 },
      { id: '6b-ski', name: 'SKI', teacher: 'Bu Hj. Nedya', order: 14 },
    ],
  },
];

/**
 * Format nama mapel untuk tampilan:
 * Menampilkan nama guru pengampu langsung setelah nama mapel jika guru sudah ditentukan.
 * Contoh: "B. ARAB (Bu Hj. Nedya)" atau "PAI"
 */
export function formatSubjectDisplayName(subjectName: string, teacherName?: string): string {
  if (teacherName && teacherName.trim()) {
    return `${subjectName} (${teacherName.trim()})`;
  }
  return subjectName;
}
