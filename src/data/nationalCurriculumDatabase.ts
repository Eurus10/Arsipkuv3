import { CurriculumReference } from '../types/evaluationTypes';

export interface CurriculumTopicRecommendation {
  subjectName: string;
  gradeLevels: string[]; // e.g. ["1", "2", "Fase A", "1A", "1B", "2A", "2B"]
  chapters: Array<{
    title: string;
    subTopics: string;
    description?: string;
  }>;
}

export const NATIONAL_CURRICULUM_DATABASE: CurriculumTopicRecommendation[] = [
  {
    subjectName: 'Pendidikan Agama Islam & BP',
    gradeLevels: ['1', '2', 'Fase A', '1A', '1B', '1C', '2A', '2B', '2C'],
    chapters: [
      {
        title: 'Bab 1: Surah Al-Ikhlas & Surah Al-Falaq',
        subTopics: 'Membaca, menghafal, arti ayat, pesan pokok keesaan Allah SWT & berlindung dari kejahatan',
        description: 'Materi pokok mengkaji lafal, urutan ayat, arti perkata, serta kandungan keimanan dan perlindungan diri kepada Allah SWT.',
      },
      {
        title: 'Bab 2: Mengenal & Meneladani 4 Asmaul Husna',
        subTopics: 'Al-Hafiz (Maha Memelihara), Al-Wali (Maha Melindungi), Al-Alim (Maha Mengetahui), Al-Khabir (Maha Teliti/Waspada)',
        description: 'Pengenalan makna 4 sifat mulia Allah SWT serta implementasi perilaku teliti, menjaga kebersihan, dan perlindungan dalam kehidupan sehari-hari.',
      },
      {
        title: 'Bab 3: Senang Membaca dan Menulis Al-Qur\'an',
        subTopics: 'Huruf hijaiyah bersambung, tanda baca (harakat), makharijul huruf dasar dan adab membaca Al-Qur\'an',
        description: 'Membiasakan peserta didik mengenali bentuk huruf hijaiyah tunggal dan sambung serta adab memuliakan mushaf.',
      },
      {
        title: 'Bab 4: Perilaku Terpuji & Akhlak Mulia (Kasih Sayang)',
        subTopics: 'Sikap santun kepada orang tua, guru, teman sebaya, serta menyayangi sesama makhluk hidup',
        description: 'Menanamkan akhlak karimah melalui keteladanan Nabi Muhammad SAW, sikap jujur, disiplin, dan tolong-menolong.',
      },
      {
        title: 'Bab 5: Tata Cara Shalat Fardhu & Thaharah (Bersuci)',
        subTopics: 'Rukun wudhu, doa setelah wudhu, gerakan shalat, bacaan rukun shalat, dan waktu shalat 5 waktu',
        description: 'Praktik thaharah dan pembiasaan tertib menjalankan ibadah shalat wajib sehari-hari.',
      },
      {
        title: 'Bab 6: Kisah Teladan Para Nabi & Rasul Ulul Azmi',
        subTopics: 'Kisah Nabi Adam AS, Nabi Nuh AS, Nabi Ibrahim AS, dan Nabi Muhammad SAW',
        description: 'Mengambil hikmah kesabaran, ketaatan, dan keteguhan iman dari para nabi dalam menghadapi cobaan.',
      },
    ],
  },
  {
    subjectName: 'Pendidikan Agama Islam & BP',
    gradeLevels: ['3', '4', 'Fase B', '3A', '3B', '3C', '4A', '4B', '4C'],
    chapters: [
      {
        title: 'Bab 1: Surah Al-Hujurat & Surah At-Tin',
        subTopics: 'Membaca tartil, hukum tajwid (nun mati/tanwin), menghargai keragaman suku & bangsa',
        description: 'Kandungan toleransi, persaudaraan, dan penciptaan manusia dalam bentuk sebaik-baiknya.',
      },
      {
        title: 'Bab 2: Beriman kepada Kitab-Kitab Allah & Rasul-Nya',
        subTopics: 'Taurat, Zabur, Injil, Al-Qur\'an, nama 25 nabi dan rasul, sifat wajib & mustahil bagi rasul',
        description: 'Memahami rukun iman, fungsi kitab suci sebagai pedoman hidup, dan meneladani sifat rasul.',
      },
      {
        title: 'Bab 3: Indahnya Saling Menghargai & Beradab',
        subTopics: 'Adab bertamu, adab berbicara, toleransi antarumat beragama, dan anti-perundungan (bullying)',
        description: 'Pengamalan nilai-nilai Islam rahmatan lil alamin dalam pergaulan bermasyarakat.',
      },
      {
        title: 'Bab 4: Menyambut Usia Baligh & Mandiri',
        subTopics: 'Tanda-tanda baligh secara biologi & fikih, kewajiban mandi wajib, dan tanggung jawab ibadah',
        description: 'Edukasi kebersihan diri, hukum taklif, dan kesiapan menunaikan syariat Islam secara penuh.',
      },
      {
        title: 'Bab 5: Zakat Fitrah, Infak, dan Sedekah',
        subTopics: 'Pengertian zakat fitrah, mustahiq zakat (8 golongan), nisab, serta keutamaan gemar bersedekah',
        description: 'Membangun kepedulian sosial, membersihkan jiwa dan harta melalui zakat dan sedekah.',
      },
    ],
  },
  {
    subjectName: 'Pendidikan Agama Islam & BP',
    gradeLevels: ['5', '6', 'Fase C', '5A', '5B', '5C', '6A', '6B', '6C'],
    chapters: [
      {
        title: 'Bab 1: Surah Al-Ma\'un & Surah Al-Kafirun',
        subTopics: 'Memahami peduli anak yatim, bahaya riya\', serta menjaga kemurnian akidah dalam toleransi',
        description: 'Pesan sosial mendalam tentang kedermawanan dan prinsip lakum diinukum waliyadiin.',
      },
      {
        title: 'Bab 2: Beriman kepada Hari Akhir (Kiamat) & Qadha Qadar',
        subTopics: 'Tanda-tanda kiamat sughra & kubra, alam barzakh, mahsyar, hisab, mizan, serta ikhtiar dan tawakal',
        description: 'Membentuk kesadaran moral bahwa setiap amal perbuatan akan dipertanggungjawabkan di akhirat.',
      },
      {
        title: 'Bab 3: Ibadah Haji dan Kurban',
        subTopics: 'Syarat, rukun, wajib haji, tata cara manasik, hikmah kurban Nabi Ibrahim AS & Nabi Ismail AS',
        description: 'Pengenalan rukun Islam kelima, pengorbanan, kebersamaan umat, dan kepedulian berbagi daging kurban.',
      },
      {
        title: 'Bab 4: Meneladani Perjuangan Khulafaur Rasyidin',
        subTopics: 'Kepemimpinan Abu Bakar As-Siddiq, Umar bin Khattab, Utsman bin Affan, dan Ali bin Abi Thalib',
        description: 'Keteladanan kepemimpinan yang adil, sederhana, bijaksana, dan mengutamakan kepentingan rakyat.',
      },
      {
        title: 'Bab 5: Akhlak Terhadap Lingkungan Hidup & Kelestarian Alam',
        subTopics: 'Larangan berbuat kerusakan di bumi, hemat air dan energi, menjaga kebersihan ekosistem',
        description: 'Prinsip khalifah fil ardh dalam merawat alam semesta sebagai amanah dari Allah SWT.',
      },
    ],
  },
  {
    subjectName: 'Pendidikan Pancasila (PPKn)',
    gradeLevels: ['1', '2', 'Fase A', '1A', '1B', '1C', '2A', '2B', '2C'],
    chapters: [
      {
        title: 'Bab 1: Aku Cinta Pancasila (Simbol & Sila Pancasila)',
        subTopics: 'Simbol 5 sila dalam Garuda Pancasila, bunyi sila ke-1 sampai ke-5, dan contoh perilaku pengamalan',
        description: 'Mengenal lambang negara, menghafal bunyi sila Pancasila dan menerapkannya dalam kegiatan sehari-hari di rumah dan sekolah.',
      },
      {
        title: 'Bab 2: Aku Anak yang Patuh pada Aturan',
        subTopics: 'Aturan di rumah, aturan di sekolah, hak dan kewajiban anak, manfaat disiplin menaati tata tertib',
        description: 'Membangun kebiasaan disiplin, mengenali hak mendapatkan kasih sayang dan kewajiban membantu orang tua serta belajar.',
      },
      {
        title: 'Bab 3: Kita Berbeda tetapi Tetap Satu (Kebinekaan)',
        subTopics: 'Keberagaman ciri fisik, hobi, agama, suku bangsa teman sekelas, dan sikap saling menghargai',
        description: 'Menumbuhkan rasa toleransi, tidak membeda-bedakan teman, dan menjaga kerukunan di kelas.',
      },
      {
        title: 'Bab 4: Aku Cinta Lingkungan Sekitarku (NKRI)',
        subTopics: 'Denah rumah dan sekolah, bagian-bagian ruangan, tetangga terdekat, dan menjaga kebersihan lingkungan bersama',
        description: 'Mengenal lingkungan tempat tinggal, sikap ramah kepada tetangga, dan gotong royong merawat fasilitas umum.',
      },
      {
        title: 'Bab 5: Musyawarah Sederhana & Kerjasama di Kelas',
        subTopics: 'Memilih ketua kelas secara mufakat, menghargai pendapat teman, dan pembagian tugas piket kelompok',
        description: 'Melatih demokrasi sejak dini melalui musyawarah sederhana dan kerjasama yang adil.',
      },
    ],
  },
  {
    subjectName: 'Pendidikan Pancasila (PPKn)',
    gradeLevels: ['3', '4', 'Fase B', '3A', '3B', '3C', '4A', '4B', '4C'],
    chapters: [
      {
        title: 'Bab 1: Makna dan Nilai-Nilai Sila Pancasila',
        subTopics: 'Penerapan sila 1-5 dalam kehidupan bermasyarakat, nilai ketuhanan, kemanusiaan, persatuan, kerakyatan, dan keadilan',
        description: 'Mengidentifikasi penerapan nilai-nilai luhur Pancasila dalam berbagai situasi sosial.',
      },
      {
        title: 'Bab 2: Norma, Hak, dan Kewajiban Warga Masyarakat',
        subTopics: 'Norma agama, kesusilaan, kesopanan, hukum, serta pelaksanaan hak dan kewajiban secara seimbang',
        description: 'Memahami jenis norma sosial dan konsekuensi pelanggaran norma di lingkungan masyarakat.',
      },
      {
        title: 'Bab 3: Menghargai Keragaman Budaya Nusantara',
        subTopics: 'Rumah adat, pakaian tradisional, tarian daerah, alat musik, dan semboyan Bhinneka Tunggal Ika',
        description: 'Menghargai warisan kebudayaan daerah di Indonesia dan melestarikan kearifan lokal.',
      },
      {
        title: 'Bab 4: Keutuhan Negara Kesatuan Republik Indonesia (NKRI)',
        subTopics: 'Batas wilayah desa/kelurahan, kecamatan, kabupaten, cinta tanah air, dan menjaga persatuan bangsa',
        description: 'Mengenal struktur kepemimpinan daerah dan peran warga dalam menjaga persatuan NKRI.',
      },
      {
        title: 'Bab 5: Gotong Royong sebagai Ciri Khas Bangsa Indonesia',
        subTopics: 'Bentuk gotong royong di pedesaan & perkotaan, nilai kekeluargaan, dan manfaat kerja sama',
        description: 'Praktik gotong royong dalam kerja bakti, perayaan hari besar nasional, dan peduli bencana.',
      },
    ],
  },
  {
    subjectName: 'Bahasa Indonesia',
    gradeLevels: ['1', '2', 'Fase A', '1A', '1B', '1C', '2A', '2B', '2C'],
    chapters: [
      {
        title: 'Bab 1: Mengenal Perasaan dan Emosi Diri',
        subTopics: 'Kosakata emosi (senang, sedih, marah, takut), cara menenangkan diri, dan menceritakan pengalaman pribadi',
        description: 'Membantu anak mengenali ragam perasaan, mengelola emosi, dan mengekspresikannya dengan kata-kata santun.',
      },
      {
        title: 'Bab 2: Menjaga Kesehatan & Kebersihan Tubuh',
        subTopics: 'Membaca teks petunjuk mencuci tangan, menyikat gigi, makanan bergizi, dan kalimat ajakan / larangan',
        description: 'Memahami teks petunjuk sederhana dan mempraktikkan gaya hidup sehat dan bersih.',
      },
      {
        title: 'Bab 3: Berhati-hati di Mana Saja (Keamanan & Keselamatan)',
        subTopics: 'Mengenal rambu lalu lintas, tanda bahaya, nomor darurat, serta kalimat imbauan dan peringatan',
        description: 'Melatih kewaspadaan di jalan raya, tempat umum, dan di lingkungan sekolah.',
      },
      {
        title: 'Bab 4: Keluargaku Unik (Hubungan & Silsilah Keluarga)',
        subTopics: 'Membaca bagan pohon keluarga, kosakata silsilah (kakek, nenek, paman, bibi, sepupu), dan kata tanya (apa, siapa, di mana)',
        description: 'Memahami hubungan kekeluargaan, peran masing-masing anggota keluarga, dan membuat kalimat tanya.',
      },
      {
        title: 'Bab 5: Berteman dalam Keragaman (Fabel & Cerita Bergambar)',
        subTopics: 'Membaca nyaring fabel, unsur cerita (tokoh, watak, amanat), dan menulis kalimat sederhana dengan huruf kapital & titik',
        description: 'Menemukan pesan moral dalam dongeng/fabel dan melatih ejaan tanda baca dasar.',
      },
      {
        title: 'Bab 6: Bijak Menggunakan Uang (Menabung & Kebutuhan vs Keinginan)',
        subTopics: 'Mengenal pecahan uang rupiah, kosakata hemat, menabung di celengan, membedakan kebutuhan primer dan keinginan',
        description: 'Mengenalkan literasi finansial dasar melalui teks cerita interaktif.',
      },
    ],
  },
  {
    subjectName: 'Matematika',
    gradeLevels: ['1', '2', 'Fase A', '1A', '1B', '1C', '2A', '2B', '2C'],
    chapters: [
      {
        title: 'Bab 1: Bilangan Cacah Sampai 100',
        subTopics: 'Membilang, menulis lambang & nama bilangan, nilai tempat (puluhan & satuan), membandingkan & mengurutkan bilangan',
        description: 'Fondasi pemahaman konsep nilai tempat dan perbandingan kuantitas objek.',
      },
      {
        title: 'Bab 2: Penjumlahan dan Pengurangan Bersusun',
        subTopics: 'Penjumlahan tanpa & dengan menyimpan, pengurangan tanpa & dengan meminjam, dan penyelesaian soal cerita',
        description: 'Keterampilan komputasi dasar dan penalaran pemecahan masalah cerita sehari-hari.',
      },
      {
        title: 'Bab 3: Bentuk Bangun Datar dan Bangun Ruang',
        subTopics: 'Segitiga, segiempat (persegi & persegi panjang), lingkaran, kubus, balok, tabung, sisi, sudut, dan titik sudut',
        description: 'Mengenali ciri-ciri bangun geometris pada benda-benda nyata di sekitar lingkungan.',
      },
      {
        title: 'Bab 4: Pengukuran Panjang, Berat, dan Waktu',
        subTopics: 'Satuan tidak baku (jengkal, depa, langkah), satuan baku (cm, m, gram, kg), dan membaca jam analog (tepat & setengah)',
        description: 'Praktik estimasi dan pengukuran benda nyata serta ketepatan membaca waktu jam dinding.',
      },
      {
        title: 'Bab 5: Diagram Gambar (Piktogram) dan Tabel Sederhana',
        subTopics: 'Mengumpulkan data sederhana, menyajikan data dalam turus, piktogram, dan membaca informasi grafik',
        description: 'Pengenalan literasi data dan visualisasi informasi dasar.',
      },
      {
        title: 'Bab 6: Pola Gambar dan Pola Bilangan',
        subTopics: 'Menemukan aturan pola bentuk, warna, pola bilangan loncat 2, loncat 5, dan loncat 10',
        description: 'Melatih kemampuan berpikir logis dan analisis pola deret berulang.',
      },
    ],
  },
  {
    subjectName: 'IPAS (Ilmu Pengetahuan Alam & Sosial)',
    gradeLevels: ['3', '4', 'Fase B', '3A', '3B', '3C', '4A', '4B', '4C'],
    chapters: [
      {
        title: 'Bab 1: Tumbuhan, Sumber Kehidupan di Bumi',
        subTopics: 'Bagian tubuh tumbuhan (akar, batang, daun, bunga, buah), proses fotosintesis, dan perkembangbiakan tumbuhan',
        description: 'Mempelajari fungsi organ tanaman, kebutuhan fotosintesis, dan peran tanaman bagi ekosistem.',
      },
      {
        title: 'Bab 2: Wujud Zat dan Perubahannya',
        subTopics: 'Zat padat, cair, gas, sifat-sifat benda, mencair, membeku, menguap, mengembun, dan menyublim',
        description: 'Eksperimen sederhana mengenali karakteristik partikel zat dan perubahan kalor suhu.',
      },
      {
        title: 'Bab 3: Gaya di Sekitar Kita',
        subTopics: 'Gaya otot, gaya gesek, gaya pegas, gaya magnet, gaya gravitasi, pengaruh gaya terhadap gerak & bentuk benda',
        description: 'Penerapan konsep fisika dasar gaya mekanik dan manfaatnya pada aktivitas keseharian.',
      },
      {
        title: 'Bab 4: Mengubah Bentuk Energi',
        subTopics: 'Energi kinetik, potensial, kimia, listrik, panas, cahaya, bunyi, serta hukum kekekalan & transformasi energi',
        description: 'Mengamati konversi energi pada peralatan elektronik di rumah dan sumber energi terbarukan.',
      },
      {
        title: 'Bab 5: Cerita Tentang Daerahku (Sejarah & Peta Lingkungan)',
        subTopics: 'Peta lokal, bentang alam daerah (gunung, sungai, pantai), peninggalan kerajaan masa lampau, dan tokoh sejarah lokal',
        description: 'Mengenal sejarah kearifan lokal daerah dan kenampakan alam sekitarnya.',
      },
      {
        title: 'Bab 6: Indonesiaku Kaya Budaya & Ragam Hayati',
        subTopics: 'Kearifan lokal, flora dan fauna khas Indonesia, pelestarian hutan, dan pemanfaatan sumber daya alam secara bijak',
        description: 'Menumbuhkan rasa bangga terhadap kekayaan hayati dan budaya nusantara.',
      },
    ],
  },
  {
    subjectName: 'Bahasa Inggris',
    gradeLevels: ['1', '2', 'Fase A', '1A', '1B', '1C', '2A', '2B', '2C'],
    chapters: [
      {
        title: 'Unit 1: Greetings & How Are You Today?',
        subTopics: 'Hello, Good Morning/Afternoon/Night, Goodbye, asking names (What is your name? I am...)',
        description: 'Daily basic expressions for greeting teachers and friends politely.',
      },
      {
        title: 'Unit 2: My Classroom Objects & School Supplies',
        subTopics: 'Book, pencil, eraser, ruler, sharpener, bag, desk, chair, blackboard, singular & plural nouns',
        description: 'Naming things in the classroom and following simple classroom commands (Open your book, please).',
      },
      {
        title: 'Unit 3: Colors and Shapes Around Us',
        subTopics: 'Red, blue, yellow, green, black, white, circle, square, triangle, rectangle, describing objects (A red apple)',
        description: 'Identifying and describing objects with colors and basic geometric shapes.',
      },
      {
        title: 'Unit 4: Numbers 1 to 20 and Counting Things',
        subTopics: 'Number words one to twenty, asking quantity (How many pencils are there? There are four...)',
        description: 'Counting objects and simple English addition words.',
      },
      {
        title: 'Unit 5: My Beloved Family Members',
        subTopics: 'Father, mother, brother, sister, grandfather, grandmother, baby, introducing family (This is my mother)',
        description: 'Describing family roles and simple personal pronouns (He is / She is).',
      },
      {
        title: 'Unit 6: My Favorite Fruits, Foods, and Drinks',
        subTopics: 'Apple, banana, milk, bread, rice, water, expressing likes/dislikes (I like orange / I do not like tea)',
        description: 'Talking about preferences in meals and healthy eating habits.',
      },
    ],
  },
  {
    subjectName: 'Bahasa Arab',
    gradeLevels: ['1', '2', 'Fase A', '1A', '1B', '1C', '2A', '2B', '2C'],
    chapters: [
      {
        title: 'Dars 1: At-Ta\'aruf (Perkenalan Diri & Sapaan)',
        subTopics: 'Ismi (Namaku), Man anta/anti (Siapa kamu), Kaifa haluk (Bagaimana kabarmu), Ahlan wa sahlan',
        description: 'Keterampilan muhadatsah dasar untuk saling mengenal dan menyapa teman baru.',
      },
      {
        title: 'Dars 2: Al-Adawatul Madrasiyyah (Peralatan Sekolah)',
        subTopics: 'Kitabun (buku), Qalamun (pulpen), Mimhatun (penghapus), Haibatun (tas), Sabbuuratun (papan tulis)',
        description: 'Mengenal kosakata mudzakkar dan muannats pada perlengkapan belajar.',
      },
      {
        title: 'Dars 3: Al-Alwan (Mengenal Warna-Warna)',
        subTopics: 'Ahmaru (merah), Abyadhu (putih), Aswadu (hitam), Akhdharu (hijau), Azraqu (biru), Asfaru (kuning)',
        description: 'Menyebutkan warna benda-benda di sekitar kelas dalam bahasa Arab.',
      },
      {
        title: 'Dars 4: Al-Arqam (Angka Bilangan 1 - 10)',
        subTopics: 'Wahidun (1), Itsnani (2), Tsalatsatun (3), Arba\'atun (4), Khamsatun (5), Sittatun (6), Sab\'atun (7), Tsamaniyatun (8), Tis\'atun (9), \'Asyaratun (10)',
        description: 'Menghafal angka dan melafalkan hitungan Arab secara fasih.',
      },
      {
        title: 'Dars 5: A\'dha-ul Jismi (Anggota Tubuh Manusia)',
        subTopics: 'Ra\'sun (kepala), \'Ainun (mata), Anfun (hidung), Famun (mulut), Udzunun (telinga), Yadun (tangan), Rijlun (kaki)',
        description: 'Mengenal nikmat anggota badan dan fungsinya dengan ungkapan bahasa Arab.',
      },
      {
        title: 'Dars 6: Al-Usrah (Anggota Keluarga Tercinta)',
        subTopics: 'Abun (ayah), Ummun (ibu), Akhun (saudara laki-laki), Ukhtun (saudara perempuan), Jaddun (kakek), Jaddatun (nenek)',
        description: 'Menyebutkan silsilah keluarga dan ungkapan rasa sayang kepada keluarga.',
      },
    ],
  },
  {
    subjectName: 'Pendidikan Jasmani (PJOK)',
    gradeLevels: ['1', '2', 'Fase A', '1A', '1B', '1C', '2A', '2B', '2C'],
    chapters: [
      {
        title: 'Bab 1: Gerak Dasar Lokomotor',
        subTopics: 'Berjalan lurus, berlari zig-zag, melompat satu kaki, meloncat, menirukan gerakan hewan',
        description: 'Penguasaan koordinasi gerak berpindah tempat dengan keseimbangan dan kelincahan.',
      },
      {
        title: 'Bab 2: Gerak Dasar Non-Lokomotor',
        subTopics: 'Memutar badan, membungkuk, mengayun lengan, menekuk lutut, peregangan statis dan dinamis',
        description: 'Melatih kelenturan tubuh tanpa berpindah tempat untuk mencegah cedera.',
      },
      {
        title: 'Bab 3: Gerak Dasar Manipulatif',
        subTopics: 'Melempar bola kasti, menangkap bola dengan dua tangan, menendang bola ke gawang, memantulkan bola',
        description: 'Koordinasi mata dan tangan/kaki dalam mengontrol benda atau bola.',
      },
      {
        title: 'Bab 4: Aktivitas Senam Lantai & Kebugaran Jasmani',
        subTopics: 'Sikap lilin sederhana, berguling ke depan di atas matras, melompat di atas peti rintangan',
        description: 'Membangun keberanian, kekuatan otot, dan kelenturan tubuh secara aman.',
      },
      {
        title: 'Bab 5: Pengenalan Aktivitas Air & Renang Dasar',
        subTopics: 'Pengenalan air di kolam dangkal, latihan pernapasan, meluncur, dan keselamatan di kolam renang',
        description: 'Edukasi keselamatan di air, percaya diri, dan teknik dasar mengapung.',
      },
      {
        title: 'Bab 6: Pola Hidup Sehat & Mengenal Bagian Tubuh Pribadi',
        subTopics: 'Makanan 4 sehat 5 sempurna, istirahat cukup, menjaga kebersihan pakaian, dan sentuhan boleh / tidak boleh',
        description: 'Pendidikan kesehatan reproduksi dini dan perlindungan diri dari bahaya sekitar.',
      },
    ],
  },
];

/**
 * Mencari daftar rekomendasi bab dari database kurikulum nasional
 * berdasarkan nama mata pelajaran dan kelas/fase.
 */
export function getCurriculumRecommendations(
  subjectName: string,
  className?: string
): Array<{ title: string; subTopics: string; description?: string }> {
  if (!subjectName) return [];

  const subLower = subjectName.toLowerCase();
  const classClean = (className || '').replace(/[^0-9A-Za-z]/g, '');

  // 1. Cari exact match atau partial match subject & grade
  const matchedSubjects = NATIONAL_CURRICULUM_DATABASE.filter((c) => {
    const dbSubLower = c.subjectName.toLowerCase();
    return dbSubLower.includes(subLower) || subLower.includes(dbSubLower);
  });

  if (matchedSubjects.length === 0) {
    // Fallback: Kembalikan bab umum pendidikan jika tidak ditemukan
    return [
      {
        title: 'Bab 1: Konsep Dasar & Pemahaman Esensial',
        subTopics: 'Mengenal istilah kunci, definisi, dan fakta mendasar materi',
        description: 'Membahas pemahaman konsep dasar dan contoh konkret.',
      },
      {
        title: 'Bab 2: Penerapan & Prosedur Praktis',
        subTopics: 'Langkah kerja, penerapan rumus/kaidah, dan studi kasus sederhana',
        description: 'Menguji kemampuan aplikatif dalam kehidupan sehari-hari.',
      },
      {
        title: 'Bab 3: Analisis & Penalaran Logis',
        subTopics: 'Membedakan konsep, mengurutkan peristiwa, dan pemecahan masalah',
        description: 'Melatih kemampuan berpikir tingkat tinggi (HOTS).',
      },
      {
        title: 'Bab 4: Karakter, Nilai, & Refleksi Kehidupan',
        subTopics: 'Penerapan sikap positif, akhlak karimah, dan evaluasi diri',
        description: 'Penanaman nilai-nilai luhur dan pembentukan karakter.',
      },
      {
        title: 'Bab 5: Pengayaan & Proyek Kolaboratif',
        subTopics: 'Eksperimen mini, kreasi karya, dan literasi kontekstual',
        description: 'Penguatan kompetensi holistik peserta didik.',
      },
    ];
  }

  // Saring berdasarkan gradeLevels jika cocok
  if (classClean) {
    const gradeMatched = matchedSubjects.find((c) =>
      c.gradeLevels.some((g) => {
        const gClean = g.replace(/[^0-9A-Za-z]/g, '');
        return classClean.includes(gClean) || gClean.includes(classClean.charAt(0));
      })
    );
    if (gradeMatched && gradeMatched.chapters.length >= 5) {
      return gradeMatched.chapters;
    }
  }

  // Default kembalikan chapters dari matched subject pertama
  return matchedSubjects[0].chapters;
}
