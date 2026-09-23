import {
  EvaluationBlueprint,
  EvaluationQuestionPackage,
  EvaluationReviewResult,
  EvaluationMaterialSource,
} from '../types/evaluationTypes';

export const SAMPLE_DOC_RAW_TEXT = `ASESMEN SUMATIF TENGAH SEMESTER GANJIL (STS 1)
LINGKUP MATERI KURIKULUM MERDEKA
TAHUN PELAJARAN 2025 - 2026
Mata Pelajaran: PENDIDIKAN AGAMA ISLAM
Kelas: II (Dua) A

Petunjuk :
1. Berdo’alah sebelum mengerjakan soal !
2. Tulislah namamu pada pojok kanan bagian atas !
3. Bacalah setiap soal dengan teliti !
4. Kerjakanlah terlebih dahulu soal yang kamu anggap mudah !
5. Periksa kembali hasil pekerjaanmu sebelum diserahkan kepada pengawas !

Bagian I. Berilah tanda silang ( X ) pada huruf a, b, atau c di depan jawaban yang paling tepat !
1. Surat Al-Ikhlas terdiri dari ...
   a. 4 ayat
   b. 5 ayat
   c. 6 ayat
2. Pesan pokok surah Al-Ikhlas adalah …
   a. Tiada Tuhan selain Allah swt
   b. Berlindung dari kejahatan
   c. Berbuat baik
3. Di dalam Surah Al-Ikhlas, kita diperintahkan untuk …
   a. Berdoa hanya kepada Allah swt
   b. Iri hati
   c. Sombong
4. Surah Al-Falaq terdiri dari ...
   a. 5 ayat
   b. 6 ayat
   c. 8 ayat
5. Lafal surah Al-Falaq ayat 1 adalah ...
   a. قُلْ اَعُوْذُ بِرَبِّ الْفَلَقِۙ
   b. وَمِنْ شَرِّ غَاسِقٍ اِذَا وَقَبَۙ
   c. وَمِنْ شَرِّ حَاسِدٍ اِذَا حَسَدَ
6. Lafal “ ...وَمِنْ شَرِّ غَاسِقٍ “ Lanjutan bacaan lafal tersebut adalah ...
   a. فِى الْعُقَدِۙ
   b. اِذَا وَقَبَۙ
   c. اِذَا حَسَدَ
7. اَللّٰهُ الصَّمَدُۚ Termasuk lafal surah Al-Ikhlas ayat …
   a. ke- 1
   b. Ke- 2
   c. Ke- 3
8. Asmaul Husna artinya …
   a. Nama-nama Allah swt yang esa
   b. Nama-nama Allah swt yang baik
   c. Nama-nama Allah swt yang banyak
9. Al-Hafiz artinya Maha …
   a. Pencipta
   b. Memelihara
   c. Agung
10. Menjaga ciptaan Allah swt termasuk mengamalkan sifat …
   a. Al–Wali
   b. Al–Hafiz
   c. Al–Khabir
11. Salah satu perilaku meneladani Al-Hafiz adalah …
   a. Tidak pernah marah
   b. Mencela orang lain
   c. Buang sampah pada tempatnya
12. Al-Waliy artinya Maha ...
   a. Penyayang
   b. Pengasih
   c. Melindungi
13. Setiap kejadian yang menimpa manusia ditentukan oleh ...
   a. Alam semesta
   b. Diri sendiri
   c. Allah swt
14. Restu memersiapkan buku dengan teliti. Perilaku Restu mengamalkan sifat …
   a. Al-Alim
   b. Al-Wali
   c. Al-Khabir
15. Hari ini ujian Pendidikan agama islam. Peserta didik kelas 2A belajar dengan giat. Peserta didik kelas 2A mengamalkan sifat …
   a. Al-Khabir
   b. Al-Wali
   c. Al-Alim
16. Sikap Bilal yang mengamalkan sifat Al-Hafiz adalah …
   a. Menonton tv
   b. Menjaga adiknya
   c. Bermain dengan teman
17. Berdoa dan berlindung kepada Allah swt adalah mengamalkan sifat …
   a. Al-Hafiz
   b. Al-Wali
   c. Al-Khabir
18. وَلَمْ يَكُنْ لَّهٗ كُفُوًا اَحَدٌ Lafal tersebut adalah surah Al-Ikhlas ayat ...
   a. Ke- 3
   b. Ke- 4
   c. Ke- 5
19. Jika teman kita mendapatkan nilai bagus, kita tidak boleh ...
   a. Ikhlas
   b. Dengki
   c. Bersyukur
20. Surah Al-Falaq diturunkan setelah surah ...
   a. An-Nas
   b. Al-Fil
   c. Al-Kausar

Bagian II. Isilah titik – titik dibawah ini dengan jawaban yang benar !
1. Jumlah surah Al-ikhlas ada ….................. ayat.
2. Al-Falaq artinya …............................................
3. Surah yang diturunkan setelah Nabi Muhammad saw hijrah adalah surah …............
4. Maha teliti adalah arti dari sifat ........................
5. Surah yang diturunkan sebelum Nabi Muhammad saw hijrah ke Madinah adalah surah .............................................................…

Bagian III. Menjodohkan !
Pasangkan kolom pernyataan sebelah kiri dengan jawaban di sebelah kanan:
1. Asmaul husna berjumlah ...
2. “Al–hafiz” artinya ...
3. “Al–wali” artinya ...
4. “Al–‘alim” artinya ...
5. “Al–khabir” artinya ...

Pilihan Jawaban:
A. Maha Mengetahui
B. Maha Teliti
C. 99
D. Maha Melindungi
E. Maha Memelihara`;

export const SAMPLE_PAI_BLUEPRINT: EvaluationBlueprint = {
  id: 'bp_sample_pai_sts1_kelas2',
  title: 'Kisi-Kisi Penulisan Soal STS 1 Pendidikan Agama Islam Kelas 2A',
  subjectName: 'Pendidikan Agama Islam & BP',
  className: '2A',
  semester: '1 (Ganjil)',
  schoolYear: '2025/2026',
  examType: 'STS 1 (Sumatif Tengah Semester)',
  teacherName: 'Guru PAI SDIT Al Fikri',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  materialContextSummary: 'Surah Al-Ikhlas, Surah Al-Falaq, dan Asmaul Husna (Al-Hafiz, Al-Wali, Al-Alim, Al-Khabir)',
  items: [
    {
      id: 'bp_1',
      number: 1,
      material: 'Surah Al-Ikhlas',
      curriculumGoal: 'Mengenal dan menghafal surah Al-Ikhlas dengan baik dan benar.',
      indicator: 'Peserta didik dapat menentukan jumlah ayat dalam surah Al-Ikhlas dengan benar.',
      cognitiveLevel: 'C1',
      questionForm: 'PG',
      questionNumber: '1',
    },
    {
      id: 'bp_2',
      number: 2,
      material: 'Surah Al-Ikhlas',
      curriculumGoal: 'Memahami pesan pokok keesaan Allah dalam surah Al-Ikhlas.',
      indicator: 'Peserta didik dapat mengidentifikasi pesan pokok kandungan surah Al-Ikhlas.',
      cognitiveLevel: 'C2',
      questionForm: 'PG',
      questionNumber: '2',
    },
    {
      id: 'bp_3',
      number: 3,
      material: 'Surah Al-Ikhlas',
      curriculumGoal: 'Menerapkan perilaku bertauhid dalam kehidupan sehari-hari.',
      indicator: 'Peserta didik dapat menyebutkan perintah utama dalam surah Al-Ikhlas yaitu hanya berdoa kepada Allah.',
      cognitiveLevel: 'C2',
      questionForm: 'PG',
      questionNumber: '3',
    },
    {
      id: 'bp_4',
      number: 4,
      material: 'Surah Al-Falaq',
      curriculumGoal: 'Mengenal dan melafalkan surah Al-Falaq.',
      indicator: 'Peserta didik dapat menyebutkan jumlah ayat surah Al-Falaq secara tepat.',
      cognitiveLevel: 'C1',
      questionForm: 'PG',
      questionNumber: '4',
    },
    {
      id: 'bp_5',
      number: 5,
      material: 'Surah Al-Falaq',
      curriculumGoal: 'Mengenal lafal dan bacaan surah Al-Falaq.',
      indicator: 'Disajikan pilihan lafal berbahasa Arab, peserta didik dapat menentukan lafal ayat ke-1 surah Al-Falaq.',
      cognitiveLevel: 'C1',
      questionForm: 'PG',
      questionNumber: '5',
    },
    {
      id: 'bp_6',
      number: 6,
      material: 'Surah Al-Falaq',
      curriculumGoal: 'Menyambung dan melengkapi potongan ayat surah Al-Falaq.',
      indicator: 'Disajikan penggalan ayat surah Al-Falaq, peserta didik dapat melanjutkan bacaan ayat tersebut dengan benar.',
      cognitiveLevel: 'C2',
      questionForm: 'PG',
      questionNumber: '6',
    },
    {
      id: 'bp_7',
      number: 7,
      material: 'Surah Al-Ikhlas',
      curriculumGoal: 'Menghafal urutan ayat surah Al-Ikhlas.',
      indicator: 'Disajikan lafal ayat "Allahu ash-shamad", peserta didik dapat menentukan nomor urutan ayat tersebut.',
      cognitiveLevel: 'C1',
      questionForm: 'PG',
      questionNumber: '7',
    },
    {
      id: 'bp_8',
      number: 8,
      material: 'Asmaul Husna',
      curriculumGoal: 'Memahami makna dasar Asmaul Husna bagi seorang muslim.',
      indicator: 'Peserta didik dapat menjelaskan arti istilah Asmaul Husna dengan tepat.',
      cognitiveLevel: 'C1',
      questionForm: 'PG',
      questionNumber: '8',
    },
    {
      id: 'bp_9',
      number: 9,
      material: 'Asmaul Husna (Al-Hafiz)',
      curriculumGoal: 'Mengetahui arti Asmaul Husna Al-Hafiz.',
      indicator: 'Peserta didik dapat mengartikan sifat Al-Hafiz yaitu Maha Memelihara.',
      cognitiveLevel: 'C1',
      questionForm: 'PG',
      questionNumber: '9',
    },
    {
      id: 'bp_10',
      number: 10,
      material: 'Asmaul Husna (Al-Hafiz)',
      curriculumGoal: 'Meneladani sifat Al-Hafiz dalam menjaga lingkungan.',
      indicator: 'Peserta didik dapat mengaitkan perilaku menjaga kelestarian alam dengan pengamalan sifat Al-Hafiz.',
      cognitiveLevel: 'C2',
      questionForm: 'PG',
      questionNumber: '10',
    },
    {
      id: 'bp_11',
      number: 11,
      material: 'Asmaul Husna (Al-Hafiz)',
      curriculumGoal: 'Menerapkan akhlak terpuji meneladani Al-Hafiz.',
      indicator: 'Peserta didik dapat memilih contoh perbuatan konkret meneladani sifat Al-Hafiz seperti membuang sampah pada tempatnya.',
      cognitiveLevel: 'C2',
      questionForm: 'PG',
      questionNumber: '11',
    },
    {
      id: 'bp_12',
      number: 12,
      material: 'Asmaul Husna (Al-Wali)',
      curriculumGoal: 'Mengetahui arti Asmaul Husna Al-Wali.',
      indicator: 'Peserta didik dapat mengartikan sifat Al-Wali yaitu Maha Melindungi.',
      cognitiveLevel: 'C1',
      questionForm: 'PG',
      questionNumber: '12',
    },
    {
      id: 'bp_13',
      number: 13,
      material: 'Kekuasaan Allah Swt',
      curriculumGoal: 'Mengimani ketetapan dan perlindungan Allah atas seluruh kejadian.',
      indicator: 'Peserta didik dapat meyakini bahwa segala kejadian yang menimpa manusia atas ketetapan Allah Swt.',
      cognitiveLevel: 'C2',
      questionForm: 'PG',
      questionNumber: '13',
    },
    {
      id: 'bp_14',
      number: 14,
      material: 'Asmaul Husna (Al-Khabir)',
      curriculumGoal: 'Meneladani sifat Al-Khabir melalui ketelitian belajar.',
      indicator: 'Disajikan studi kasus perilaku siswa yang teliti menyiapkan buku, peserta didik dapat menautkannya dengan sifat Al-Khabir.',
      cognitiveLevel: 'C3',
      questionForm: 'PG',
      questionNumber: '14',
    },
    {
      id: 'bp_15',
      number: 15,
      material: 'Asmaul Husna (Al-Alim)',
      curriculumGoal: 'Meneladani sifat Al-Alim melalui kesungguhan menuntut ilmu.',
      indicator: 'Disajikan narasi siswa yang belajar dengan giat, peserta didik dapat menentukan sifat Asmaul Husna yang diteladani (Al-Alim).',
      cognitiveLevel: 'C3',
      questionForm: 'PG',
      questionNumber: '15',
    },
    {
      id: 'bp_16',
      number: 16,
      material: 'Asmaul Husna (Al-Hafiz)',
      curriculumGoal: 'Menunjukkan sikap menjaga dan menyayangi anggota keluarga.',
      indicator: 'Disajikan contoh sikap sehari-hari menjaga adik di rumah, peserta didik dapat mengidentifikasi pengamalan sifat Al-Hafiz.',
      cognitiveLevel: 'C2',
      questionForm: 'PG',
      questionNumber: '16',
    },
    {
      id: 'bp_17',
      number: 17,
      material: 'Asmaul Husna (Al-Wali)',
      curriculumGoal: 'Memohon perlindungan hanya kepada Allah.',
      indicator: 'Peserta didik dapat memahami bahwa berdoa dan memohon perlindungan adalah wujud meneladani sifat Al-Wali.',
      cognitiveLevel: 'C2',
      questionForm: 'PG',
      questionNumber: '17',
    },
    {
      id: 'bp_18',
      number: 18,
      material: 'Surah Al-Ikhlas',
      curriculumGoal: 'Menghafal dan mengidentifikasi ayat ke-4 surah Al-Ikhlas.',
      indicator: 'Disajikan lafal arab "Walam yakun lahu kufuwan ahad", peserta didik dapat menentukan urutan nomor ayat surah Al-Ikhlas.',
      cognitiveLevel: 'C1',
      questionForm: 'PG',
      questionNumber: '18',
    },
    {
      id: 'bp_19',
      number: 19,
      material: 'Akhlak Terpuji (Menghindari Dengki)',
      curriculumGoal: 'Menjaga hati dari sifat dengki dan iri terhadap nikmat orang lain.',
      indicator: 'Peserta didik dapat menentukan sikap yang dilarang ketika teman berprestasi, yaitu sifat dengki.',
      cognitiveLevel: 'C2',
      questionForm: 'PG',
      questionNumber: '19',
    },
    {
      id: 'bp_20',
      number: 20,
      material: 'Surah Al-Falaq',
      curriculumGoal: 'Mengetahui sejarah dan urutan turunnya surah pendek.',
      indicator: 'Peserta didik dapat menyebutkan surah yang mendahului diturunkannya surah Al-Falaq (Surah Al-Fil).',
      cognitiveLevel: 'C1',
      questionForm: 'PG',
      questionNumber: '20',
    },
    {
      id: 'bp_21',
      number: 21,
      material: 'Surah Al-Ikhlas',
      curriculumGoal: 'Mengenal struktur surah Al-Ikhlas.',
      indicator: 'Peserta didik dapat menuliskan jumlah total ayat surah Al-Ikhlas secara tepat.',
      cognitiveLevel: 'C1',
      questionForm: 'ISIAN',
      questionNumber: '21 (Isian 1)',
    },
    {
      id: 'bp_22',
      number: 22,
      material: 'Surah Al-Falaq',
      curriculumGoal: 'Mengartikan nama surah Al-Falaq.',
      indicator: 'Peserta didik dapat menuliskan arti kata Al-Falaq (Waktu Subuh / Fajar).',
      cognitiveLevel: 'C1',
      questionForm: 'ISIAN',
      questionNumber: '22 (Isian 2)',
    },
    {
      id: 'bp_23',
      number: 23,
      material: 'Klasifikasi Surah',
      curriculumGoal: 'Membedakan surah Makkiyah dan Madaniyah.',
      indicator: 'Peserta didik dapat menyebutkan istilah surah yang diturunkan setelah peristiwa hijrah Nabi Muhammad saw (Madaniyah).',
      cognitiveLevel: 'C2',
      questionForm: 'ISIAN',
      questionNumber: '23 (Isian 3)',
    },
    {
      id: 'bp_24',
      number: 24,
      material: 'Asmaul Husna',
      curriculumGoal: 'Memahami arti sifat Al-Khabir.',
      indicator: 'Peserta didik dapat menuliskan nama Asmaul Husna yang berarti Maha Teliti (Al-Khabir).',
      cognitiveLevel: 'C1',
      questionForm: 'ISIAN',
      questionNumber: '24 (Isian 4)',
    },
    {
      id: 'bp_25',
      number: 25,
      material: 'Klasifikasi Surah',
      curriculumGoal: 'Membedakan surah Makkiyah dan Madaniyah.',
      indicator: 'Peserta didik dapat menyebutkan istilah surah yang diturunkan sebelum hijrah ke Madinah (Makkiyah).',
      cognitiveLevel: 'C2',
      questionForm: 'ISIAN',
      questionNumber: '25 (Isian 5)',
    },
    {
      id: 'bp_26',
      number: 26,
      material: 'Asmaul Husna (Menjodohkan)',
      curriculumGoal: 'Memasangkan nama-nama Asmaul Husna dengan artinya yang benar.',
      indicator: 'Disajikan 5 butir konsep Asmaul Husna pada Kolom A dan 5 arti/nilai pada Kolom B, peserta didik dapat menjodohkan pasangan dengan tepat.',
      cognitiveLevel: 'C2',
      questionForm: 'MENJODOHKAN',
      questionNumber: '26 (Bagian C)',
    },
  ],
};

export const SAMPLE_PAI_QUESTION_PACKAGE: EvaluationQuestionPackage = {
  id: 'pkg_sample_pai_sts1_kelas2',
  blueprintId: 'bp_sample_pai_sts1_kelas2',
  title: 'Naskah Soal STS 1 Pendidikan Agama Islam Kelas 2A SDIT Al Fikri',
  subjectName: 'Pendidikan Agama Islam & BP',
  className: '2A',
  schoolYear: '2025/2026',
  examType: 'STS 1 (Sumatif Tengah Semester)',
  teacherName: 'Guru PAI SDIT Al Fikri',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  config: {
    pgCount: 20,
    pgOptions: 'A-C',
    isianCount: 5,
    partCType: 'Menjodohkan',
    partCCount: 1,
  },
  questions: [
    {
      id: 'q_1',
      number: 1,
      type: 'PG',
      material: 'Surah Al-Ikhlas',
      indicator: 'Peserta didik dapat menentukan jumlah ayat dalam surah Al-Ikhlas.',
      cognitiveLevel: 'C1',
      questionText: 'Surat Al-Ikhlas terdiri dari ...',
      optionsCount: 'A-C',
      options: [
        { key: 'A', text: '4 ayat' },
        { key: 'B', text: '5 ayat' },
        { key: 'C', text: '6 ayat' },
      ],
      answerKey: 'A',
      explanation: 'Surah Al-Ikhlas terdiri dari 4 ayat dan merupakan surah ke-112 dalam Al-Qur’an.',
    },
    {
      id: 'q_2',
      number: 2,
      type: 'PG',
      material: 'Surah Al-Ikhlas',
      indicator: 'Peserta didik dapat mengidentifikasi pesan pokok kandungan surah Al-Ikhlas.',
      cognitiveLevel: 'C2',
      questionText: 'Pesan pokok surah Al-Ikhlas adalah …',
      optionsCount: 'A-C',
      options: [
        { key: 'A', text: 'Tiada Tuhan selain Allah swt' },
        { key: 'B', text: 'Berlindung dari kejahatan' },
        { key: 'C', text: 'Berbuat baik' },
      ],
      answerKey: 'A',
      explanation: 'Surah Al-Ikhlas menegaskan pokok keesaan Allah Swt (Tauhid) bahwa tiada Tuhan selain Allah.',
    },
    {
      id: 'q_3',
      number: 3,
      type: 'PG',
      material: 'Surah Al-Ikhlas',
      indicator: 'Peserta didik dapat menyebutkan perintah utama dalam surah Al-Ikhlas.',
      cognitiveLevel: 'C2',
      questionText: 'Di dalam Surah Al-Ikhlas, kita diperintahkan untuk …',
      optionsCount: 'A-C',
      options: [
        { key: 'A', text: 'Berdoa hanya kepada Allah swt' },
        { key: 'B', text: 'Iri hati' },
        { key: 'C', text: 'Sombong' },
      ],
      answerKey: 'A',
      explanation: 'Umat Islam dilarang menyekutukan Allah dan hanya diperintahkan berdoa serta memohon kepada Allah Swt.',
    },
    {
      id: 'q_4',
      number: 4,
      type: 'PG',
      material: 'Surah Al-Falaq',
      indicator: 'Peserta didik dapat menyebutkan jumlah ayat surah Al-Falaq.',
      cognitiveLevel: 'C1',
      questionText: 'Surah Al-Falaq terdiri dari ...',
      optionsCount: 'A-C',
      options: [
        { key: 'A', text: '5 ayat' },
        { key: 'B', text: '6 ayat' },
        { key: 'C', text: '8 ayat' },
      ],
      answerKey: 'A',
      explanation: 'Surah Al-Falaq terdiri dari 5 ayat dan merupakan surah ke-113.',
    },
    {
      id: 'q_5',
      number: 5,
      type: 'PG',
      material: 'Surah Al-Falaq',
      indicator: 'Peserta didik dapat menentukan lafal ayat ke-1 surah Al-Falaq.',
      cognitiveLevel: 'C1',
      questionText: 'Lafal surah Al-Falaq ayat 1 adalah ...',
      optionsCount: 'A-C',
      options: [
        { key: 'A', text: 'قُلْ اَعُوْذُ بِرَبِّ الْفَلَقِۙ' },
        { key: 'B', text: 'وَمِنْ شَرِّ غَاسِقٍ اِذَا وَقَبَۙ' },
        { key: 'C', text: 'وَمِنْ شَرِّ حَاسِدٍ اِذَا حَسَدَ' },
      ],
      answerKey: 'A',
      explanation: 'Ayat pertama surah Al-Falaq berbunyi "Qul a\'uudzu birabbil falaq".',
    },
    {
      id: 'q_6',
      number: 6,
      type: 'PG',
      material: 'Surah Al-Falaq',
      indicator: 'Peserta didik dapat melanjutkan bacaan penggalan ayat surah Al-Falaq.',
      cognitiveLevel: 'C2',
      questionText: 'Lafal “ ...وَمِنْ شَرِّ غَاسِقٍ “ Lanjutan bacaan lafal tersebut adalah ...',
      optionsCount: 'A-C',
      options: [
        { key: 'A', text: 'فِى الْعُقَدِۙ' },
        { key: 'B', text: 'اِذَا وَقَبَۙ' },
        { key: 'C', text: 'اِذَا حَسَدَ' },
      ],
      answerKey: 'B',
      explanation: 'Lafal lengkap ayat ke-3 adalah "Wa min syarri ghaasiqin idzaa waqab".',
    },
    {
      id: 'q_7',
      number: 7,
      type: 'PG',
      material: 'Surah Al-Ikhlas',
      indicator: 'Peserta didik dapat menentukan nomor urutan ayat surah Al-Ikhlas.',
      cognitiveLevel: 'C1',
      questionText: 'اَللّٰهُ الصَّمَدُۚ Termasuk lafal surah Al-Ikhlas ayat …',
      optionsCount: 'A-C',
      options: [
        { key: 'A', text: 'ke- 1' },
        { key: 'B', text: 'Ke- 2' },
        { key: 'C', text: 'Ke- 3' },
      ],
      answerKey: 'B',
      explanation: 'Ayat ke-2 surah Al-Ikhlas adalah Allahush Shamad (Allah tempat meminta segala sesuatu).',
    },
    {
      id: 'q_8',
      number: 8,
      type: 'PG',
      material: 'Asmaul Husna',
      indicator: 'Peserta didik dapat menjelaskan arti istilah Asmaul Husna.',
      cognitiveLevel: 'C1',
      questionText: 'Asmaul Husna artinya …',
      optionsCount: 'A-C',
      options: [
        { key: 'A', text: 'Nama-nama Allah swt yang esa' },
        { key: 'B', text: 'Nama-nama Allah swt yang baik' },
        { key: 'C', text: 'Nama-nama Allah swt yang banyak' },
      ],
      answerKey: 'B',
      explanation: 'Asmaul Husna secara bahasa berarti nama-nama Allah Swt yang baik dan agung.',
    },
    {
      id: 'q_9',
      number: 9,
      type: 'PG',
      material: 'Asmaul Husna (Al-Hafiz)',
      indicator: 'Peserta didik dapat mengartikan sifat Al-Hafiz.',
      cognitiveLevel: 'C1',
      questionText: 'Al-Hafiz artinya Maha …',
      optionsCount: 'A-C',
      options: [
        { key: 'A', text: 'Pencipta' },
        { key: 'B', text: 'Memelihara' },
        { key: 'C', text: 'Agung' },
      ],
      answerKey: 'B',
      explanation: 'Al-Hafiz artinya Allah Maha Memelihara dan Menjaga seluruh ciptaan-Nya.',
    },
    {
      id: 'q_10',
      number: 10,
      type: 'PG',
      material: 'Asmaul Husna (Al-Hafiz)',
      indicator: 'Peserta didik dapat mengaitkan perilaku menjaga alam dengan sifat Al-Hafiz.',
      cognitiveLevel: 'C2',
      questionText: 'Menjaga ciptaan Allah swt termasuk mengamalkan sifat …',
      optionsCount: 'A-C',
      options: [
        { key: 'A', text: 'Al–Wali' },
        { key: 'B', text: 'Al–Hafiz' },
        { key: 'C', text: 'Al–Khabir' },
      ],
      answerKey: 'B',
      explanation: 'Menjaga dan merawat ciptaan Allah adalah pengamalan sifat Al-Hafiz (Maha Memelihara).',
    },
    {
      id: 'q_11',
      number: 11,
      type: 'PG',
      material: 'Asmaul Husna (Al-Hafiz)',
      indicator: 'Peserta didik dapat memilih contoh perilaku meneladani Al-Hafiz.',
      cognitiveLevel: 'C2',
      questionText: 'Salah satu perilaku meneladani Al-Hafiz adalah …',
      optionsCount: 'A-C',
      options: [
        { key: 'A', text: 'Tidak pernah marah' },
        { key: 'B', text: 'Mencela orang lain' },
        { key: 'C', text: 'Buang sampah pada tempatnya' },
      ],
      answerKey: 'C',
      explanation: 'Membuang sampah pada tempatnya wujud menjaga kebersihan dan memelihara lingkungan sekitar.',
    },
    {
      id: 'q_12',
      number: 12,
      type: 'PG',
      material: 'Asmaul Husna (Al-Wali)',
      indicator: 'Peserta didik dapat mengartikan sifat Al-Wali.',
      cognitiveLevel: 'C1',
      questionText: 'Al-Waliy artinya Maha ...',
      optionsCount: 'A-C',
      options: [
        { key: 'A', text: 'Penyayang' },
        { key: 'B', text: 'Pengasih' },
        { key: 'C', text: 'Melindungi' },
      ],
      answerKey: 'C',
      explanation: 'Al-Wali artinya Allah Maha Melindungi dan Mengayomi hamba-hamba-Nya.',
    },
    {
      id: 'q_13',
      number: 13,
      type: 'PG',
      material: 'Kekuasaan Allah Swt',
      indicator: 'Peserta didik meyakini bahwa segala kejadian ditentukan oleh Allah Swt.',
      cognitiveLevel: 'C2',
      questionText: 'Setiap kejadian yang menimpa manusia ditentukan oleh ...',
      optionsCount: 'A-C',
      options: [
        { key: 'A', text: 'Alam semesta' },
        { key: 'B', text: 'Diri sendiri' },
        { key: 'C', text: 'Allah swt' },
      ],
      answerKey: 'C',
      explanation: 'Seluruh takdir dan peristiwa di dunia berada di bawah kehendak dan ketetapan Allah Swt.',
    },
    {
      id: 'q_14',
      number: 14,
      type: 'PG',
      material: 'Asmaul Husna (Al-Khabir)',
      indicator: 'Peserta didik dapat mengidentifikasi pengamalan sifat Al-Khabir dari sikap teliti.',
      cognitiveLevel: 'C3',
      questionText: 'Restu memersiapkan buku dengan teliti. Perilaku Restu mengamalkan sifat  …',
      optionsCount: 'A-C',
      options: [
        { key: 'A', text: 'Al-Alim' },
        { key: 'B', text: 'Al-Wali' },
        { key: 'C', text: 'Al-Khabir' },
      ],
      answerKey: 'C',
      explanation: 'Al-Khabir artinya Maha Teliti. Sikap teliti dalam belajar adalah meneladani sifat Al-Khabir.',
    },
    {
      id: 'q_15',
      number: 15,
      type: 'PG',
      material: 'Asmaul Husna (Al-Alim)',
      indicator: 'Peserta didik dapat menautkan sikap belajar giat dengan sifat Al-Alim.',
      cognitiveLevel: 'C3',
      questionText: 'Hari ini ujian Pendidikan agama islam. Peserta didik kelas 2A belajar dengan giat. Peserta didik kelas 2A mengamalkan sifat …',
      optionsCount: 'A-C',
      options: [
        { key: 'A', text: 'Al-Khabir' },
        { key: 'B', text: 'Al-Wali' },
        { key: 'C', text: 'Al-Alim' },
      ],
      answerKey: 'C',
      explanation: 'Al-Alim artinya Maha Mengetahui. Giat menuntut ilmu merupakan bentuk meneladani sifat Al-Alim.',
    },
    {
      id: 'q_16',
      number: 16,
      type: 'PG',
      material: 'Asmaul Husna (Al-Hafiz)',
      indicator: 'Peserta didik dapat mengidentifikasi pengamalan sifat Al-Hafiz dalam keluarga.',
      cognitiveLevel: 'C2',
      questionText: 'Sikap Bilal yang mengamalkan sifat Al-Hafiz adalah …',
      optionsCount: 'A-C',
      options: [
        { key: 'A', text: 'Menonton tv' },
        { key: 'B', text: 'Menjaga adiknya' },
        { key: 'C', text: 'Bermain dengan teman' },
      ],
      answerKey: 'B',
      explanation: 'Menjaga adik dengan baik adalah wujud nyata meneladani sifat Al-Hafiz (Maha Menjaga/Memelihara).',
    },
    {
      id: 'q_17',
      number: 17,
      type: 'PG',
      material: 'Asmaul Husna (Al-Wali)',
      indicator: 'Peserta didik memahami bahwa memohon perlindungan adalah meneladani Al-Wali.',
      cognitiveLevel: 'C2',
      questionText: 'Berdoa dan berlindung kepada Allah swt adalah mengamalkan sifat …',
      optionsCount: 'A-C',
      options: [
        { key: 'A', text: 'Al-Hafiz' },
        { key: 'B', text: 'Al-Wali' },
        { key: 'C', text: 'Al-Khabir' },
      ],
      answerKey: 'B',
      explanation: 'Al-Wali adalah Maha Melindungi, sehingga tempat memohon perlindungan adalah kepada-Nya.',
    },
    {
      id: 'q_18',
      number: 18,
      type: 'PG',
      material: 'Surah Al-Ikhlas',
      indicator: 'Peserta didik dapat mengidentifikasi ayat ke-4 surah Al-Ikhlas.',
      cognitiveLevel: 'C1',
      questionText: 'وَلَمْ يَكُنْ لَّهٗ كُفُوًا اَحَدٌ Lafal tersebut adalah surah Al-Ikhlas ayat ...',
      optionsCount: 'A-C',
      options: [
        { key: 'A', text: 'Ke- 3' },
        { key: 'B', text: 'Ke- 4' },
        { key: 'C', text: 'Ke- 5' },
      ],
      answerKey: 'B',
      explanation: 'Ayat ke-4 merupakan ayat penutup dari surah Al-Ikhlas.',
    },
    {
      id: 'q_19',
      number: 19,
      type: 'PG',
      material: 'Akhlak Terpuji',
      indicator: 'Peserta didik menentukan larangan sifat dengki saat teman sukses.',
      cognitiveLevel: 'C2',
      questionText: 'Jika teman kita mendapatkan nilai bagus, kita tidak boleh ...',
      optionsCount: 'A-C',
      options: [
        { key: 'A', text: 'Ikhlas' },
        { key: 'B', text: 'Dengki' },
        { key: 'C', text: 'Bersyukur' },
      ],
      answerKey: 'B',
      explanation: 'Sifat dengki atau iri hati dilarang dalam ajaran Islam karena dapat merusak amal kebaikan.',
    },
    {
      id: 'q_20',
      number: 20,
      type: 'PG',
      material: 'Surah Al-Falaq',
      indicator: 'Peserta didik menyebutkan surah yang mendahului turunnya surah Al-Falaq.',
      cognitiveLevel: 'C1',
      questionText: 'Surah Al-Falaq diturunkan setelah surah ...',
      optionsCount: 'A-C',
      options: [
        { key: 'A', text: 'An-Nas' },
        { key: 'B', text: 'Al-Fil' },
        { key: 'C', text: 'Al-Kausar' },
      ],
      answerKey: 'B',
      explanation: 'Berdasarkan urutan pewahyuan (tartib nuzul), Surah Al-Falaq diturunkan setelah Surah Al-Fil.',
    },
    // Isian Singkat
    {
      id: 'q_21',
      number: 21,
      type: 'ISIAN',
      material: 'Surah Al-Ikhlas',
      indicator: 'Peserta didik menuliskan jumlah ayat surah Al-Ikhlas.',
      cognitiveLevel: 'C1',
      questionText: 'Jumlah surah Al-Ikhlas ada ….................. ayat.',
      answerKey: '4 (empat)',
      explanation: 'Surah Al-Ikhlas terdiri dari 4 ayat.',
    },
    {
      id: 'q_22',
      number: 22,
      type: 'ISIAN',
      material: 'Surah Al-Falaq',
      indicator: 'Peserta didik menuliskan arti kata Al-Falaq.',
      cognitiveLevel: 'C1',
      questionText: 'Al-Falaq artinya …............................................',
      answerKey: 'Waktu Subuh / Waktu Fajar',
      explanation: 'Al-Falaq bermakna waktu subuh atau fajar yang menyingsing.',
    },
    {
      id: 'q_23',
      number: 23,
      type: 'ISIAN',
      material: 'Klasifikasi Surah',
      indicator: 'Peserta didik menyebutkan istilah surah yang turun setelah hijrah.',
      cognitiveLevel: 'C2',
      questionText: 'Surah yang diturunkan setelah Nabi Muhammad saw hijrah adalah surah …............',
      answerKey: 'Madaniyah',
      explanation: 'Surah yang diturunkan setelah hijrah ke Madinah dinamakan surah Madaniyah.',
    },
    {
      id: 'q_24',
      number: 24,
      type: 'ISIAN',
      material: 'Asmaul Husna',
      indicator: 'Peserta didik menuliskan nama sifat Allah Maha Teliti.',
      cognitiveLevel: 'C1',
      questionText: 'Maha teliti adalah arti dari sifat ........................',
      answerKey: 'Al-Khabir',
      explanation: 'Al-Khabir bermakna Allah Maha Mengenal dan Maha Teliti terhadap segala urusan.',
    },
    {
      id: 'q_25',
      number: 25,
      type: 'ISIAN',
      material: 'Klasifikasi Surah',
      indicator: 'Peserta didik menyebutkan istilah surah yang turun sebelum hijrah.',
      cognitiveLevel: 'C2',
      questionText: 'Surah yang diturunkan sebelum Nabi Muhammad saw hijrah ke Madinah adalah surah .............................................................…',
      answerKey: 'Makkiyah',
      explanation: 'Surah yang diturunkan sebelum Nabi Muhammad saw hijrah disebut surah Makkiyah.',
    },
    // Bagian C: Menjodohkan
    {
      id: 'q_26',
      number: 26,
      type: 'MENJODOHKAN',
      material: 'Asmaul Husna (Menjodohkan)',
      indicator: 'Peserta didik memasangkan konsep Asmaul Husna dengan artinya secara tepat.',
      cognitiveLevel: 'C2',
      questionText: 'Pasangkanlah setiap butir pernyataan pada Kolom A dengan pilihan yang tepat pada Kolom B!',
      matchingData: {
        mode: 'text_to_text',
        left: [
          { id: '1', type: 'text', text: '1. Asmaul husna berjumlah ...' },
          { id: '2', type: 'text', text: '2. "Al-Hafiz" artinya ...' },
          { id: '3', type: 'text', text: '3. "Al-Wali" artinya ...' },
          { id: '4', type: 'text', text: '4. "Al-Alim" artinya ...' },
          { id: '5', type: 'text', text: '5. "Al-Khabir" artinya ...' },
        ],
        right: [
          { id: 'A', type: 'text', text: 'A. Maha Mengetahui' },
          { id: 'B', type: 'text', text: 'B. Maha Teliti' },
          { id: 'C', type: 'text', text: 'C. 99' },
          { id: 'D', type: 'text', text: 'D. Maha Melindungi' },
          { id: 'E', type: 'text', text: 'E. Maha Memelihara' },
        ],
        answerPair: {
          '1': 'C',
          '2': 'E',
          '3': 'D',
          '4': 'A',
          '5': 'B',
        },
      },
      answerKey: '1 → C (99), 2 → E (Maha Memelihara), 3 → D (Maha Melindungi), 4 → A (Maha Mengetahui), 5 → B (Maha Teliti)',
      explanation: 'Pasangan disusun berdasarkan arti dan jumlah Asmaul Husna yang benar.',
    },
  ],
};

export const SAMPLE_PAI_REVIEW_RESULT: EvaluationReviewResult = {
  id: 'rev_sample_pai_sts1_kelas2',
  title: 'Review Pedagogis Hasil STS 1 - Pendidikan Agama Islam (Kelas 2A)',
  subjectName: 'Pendidikan Agama Islam & BP',
  className: '2A',
  examType: 'STS 1 (Sumatif Tengah Semester)',
  analyzedAt: new Date().toISOString(),
  summary: {
    totalStudents: 28,
    averageScore: 84.6,
    highestScore: 100,
    lowestScore: 62,
    passPercentage: 89.3,
    generalConclusion: 'Tingkat penguasaan materi PAI Kelas 2A pada STS 1 berada pada predikat Sangat Baik (89.3% tuntas). Siswa menguasai hafalan surah Al-Ikhlas dan Al-Falaq dengan sangat kuat, namun membutuhkan penguatan pada klasifikasi surah Makkiyah/Madaniyah dan perbedaan makna Asmaul Husna Al-Khabir vs Al-Alim.',
  },
  attentionQuestions: [
    {
      questionNumber: 20,
      material: 'Surah Al-Falaq (Urutan Penurunan Surah)',
      indicator: 'Menyebutkan surah yang diturunkan sebelum Al-Falaq',
      successRate: 53.6,
      priority: 'HIGH',
      diagnosticNote: '46.4% siswa terkecoh memilih Surah An-Nas karena letaknya berdekatan dalam mushaf, bukan urutan pewahyuan (tartib nuzul).',
      recommendedAction: 'Jelaskan perbedaan antara urutan mushaf Usmani dengan urutan sejarah penurunan surah melalui timeline sederhana bergambar.',
    },
    {
      questionNumber: 14,
      material: 'Asmaul Husna (Al-Khabir)',
      indicator: 'Menghubungkan sikap teliti dengan sifat Al-Khabir',
      successRate: 64.3,
      priority: 'MEDIUM',
      diagnosticNote: 'Sebagian siswa masih tertukar antara sifat Al-Alim (Maha Mengetahui) dengan Al-Khabir (Maha Teliti/Mengenal hal detail).',
      recommendedAction: 'Gunakan kata kunci berima: "Alim = Ilmu/Tahu", "Khabir = Khobar/Teliti sampai hal kecil".',
    },
    {
      questionNumber: 23,
      material: 'Klasifikasi Surah (Madaniyah)',
      indicator: 'Menyebutkan istilah surah yang turun setelah hijrah',
      successRate: 67.8,
      priority: 'MEDIUM',
      diagnosticNote: 'Beberapa siswa menuliskan nama kota (Madinah) bukan istilah jenis surahnya (Madaniyah).',
      recommendedAction: 'Latih penulisan istilah dengan kartu kata: Makkiyah = Sebelum Hijrah, Madaniyah = Setelah Hijrah.',
    },
    {
      questionNumber: 1,
      questionType: 'PG',
      sectionLabel: 'PG No. 1',
      material: 'Surah Al-Ikhlas (Jumlah Ayat)',
      indicator: 'Menentukan jumlah ayat surah Al-Ikhlas',
      successRate: 100,
      priority: 'GOOD',
      diagnosticNote: 'Seluruh peserta didik menjawab dengan benar. Hafalan surah Al-Ikhlas sangat mantap.',
      recommendedAction: 'Pertahankan metode murojaah harian.',
    },
  ],
  nonPgSummary: [
    {
      type: 'Isian',
      sectionNumber: 21,
      sectionLabel: 'Isian No. 21',
      successRate: 85.7,
      incorrectCount: 4,
      totalStudents: 28,
      status: 'GOOD',
    },
    {
      type: 'Isian',
      sectionNumber: 22,
      sectionLabel: 'Isian No. 22',
      successRate: 78.6,
      incorrectCount: 6,
      totalStudents: 28,
      status: 'GOOD',
    },
    {
      type: 'Isian',
      sectionNumber: 23,
      sectionLabel: 'Isian No. 23',
      successRate: 67.8,
      incorrectCount: 9,
      totalStudents: 28,
      status: 'MEDIUM',
    },
    {
      type: 'Isian',
      sectionNumber: 24,
      sectionLabel: 'Isian No. 24',
      successRate: 53.6,
      incorrectCount: 13,
      totalStudents: 28,
      status: 'HIGH',
    },
    {
      type: 'Isian',
      sectionNumber: 25,
      sectionLabel: 'Isian No. 25',
      successRate: 82.1,
      incorrectCount: 5,
      totalStudents: 28,
      status: 'GOOD',
    },
  ],
  materialsNeedingReinforcement: [
    {
      material: 'Perbedaan Makkiyah vs Madaniyah',
      status: 'MEDIUM',
      observation: 'Konsep batasan peristiwa Hijrah sebagai pemisah kategori Makkiyah dan Madaniyah perlu visualisasi bagan waktu.',
      actionableAdvice: 'Berikan games interaktif kelompok mengelompokkan kartu surah pendek ke kotak Makkiyah atau Madaniyah.',
    },
    {
      material: 'Pembeda Makna 4 Sifat Asmaul Husna (Al-Hafiz, Al-Wali, Al-Alim, Al-Khabir)',
      status: 'HIGH',
      observation: 'Siswa mudah memahami Al-Hafiz (Memelihara) dan Al-Wali (Melindungi), tetapi kerap ragu membedakan Al-Alim dan Al-Khabir.',
      actionableAdvice: 'Buat tabel matrik contoh perilaku nyata: Belajar rajin -> Al-Alim; Memeriksa kembali isi tas sebelum berangkat -> Al-Khabir.',
    },
  ],
  indicatorsNeedingGuidance: [
    {
      indicator: 'Pemahaman Sejarah Penurunan Surah (Nuzulul Qur’an)',
      note: 'Daya serap siswa usia kelas 2 lebih mudah mengingat cerita visual daripada angka urutan teoretis.',
    },
    {
      indicator: 'Ketepatan Menuliskan Istilah Fikih/Akidah pada Soal Isian',
      note: 'Perlu latihan menuliskan ejaan istilah huruf serapan arab secara tepat dan rapi.',
    },
  ],
  keyFindings: [
    'Tingkat ketuntasan klasikal kelas 2A mencapai 89.3% dengan rata-rata nilai 84.6.',
    'Soal berbentuk Pilihan Ganda dan Menjodohkan memperoleh skor keberhasilan rata-rata di atas 88%.',
    'Soal yang memuat stimulus teks Arab (Al-Qur’an) dapat dibaca dan diidentifikasi dengan sangat baik oleh siswa.',
    'Terdapat 1 butir soal kritis dengan daya serap 53.6% terkait urutan nuzulul qur’an surah Al-Falaq.',
  ],
  followUpRecommendations: [
    'Laksanakan penguatan 15 menit pada awal tatap muka berikutnya untuk mereview soal nomor 14, 20, dan 23.',
    'Beri apresiasi bagi 25 siswa yang telah mencapai batas KKM/KKTP.',
    'Berikan lembar kerja pengayaan bertema "Meneladani 4 Asmaul Husna dalam Keseharian di SDIT Al Fikri".',
    'Simpan naskah soal dan kisi-kisi ini sebagai bank asesmen standar STS semester ganjil fase A.',
  ],
};
