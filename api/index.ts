import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { GoogleGenAI } from '@google/genai';
const nationalCurriculumSD = {
  "source": {
    "documentTitle": "KEPUTUSAN KEPALA BADAN STANDAR, KURIKULUM, DAN ASESMEN PENDIDIKAN KEMENTERIAN PENDIDIKAN DASAR DAN MENENGAH NOMOR 046/H/KR/2025 TENTANG CAPAIAN PEMBELAJARAN PADA PENDIDIKAN ANAK USIA DINI, JENJANG PENDIDIKAN DASAR, DAN JENJANG PENDIDIKAN MENENGAH",
    "documentNumber": "046/H/KR/2025",
    "sourceType": "Keputusan Kepala BSKAP",
    "educationLevel": "SD/MI / Program Paket A",
    "sourcePages": "7-12, 13-22, 23-31, 32-42, 43-52, 53-60, 67-92, 126-137, 184-189"
  },
  "subjects": [
    {
      "subjectName": "Pendidikan Agama Islam dan Budi Pekerti",
      "phases": [
        {
          "phase": "A",
          "grades": [
            "Kelas 1",
            "Kelas 2"
          ],
          "elements": [
            {
              "elementName": "Al-Qur’an Hadis",
              "elementDescription": "Pendidikan Agama Islam dan Budi Pekerti menekankan pemahaman Al-Qur’an dan hadis secara tekstual dan kontekstual yang teraktualisasikan sebagai nilai kehidupan.",
              "learningOutcomes": [
                {
                  "code": "1.1",
                  "title": "Al-Qur’an Hadis",
                  "text": "Memahami huruf hijaiah berharakat, huruf hijaiah bersambung, Surah al-Fātiḥah, beberapa surah pendek Al-Qur’an, dan hadis tentang kebersihan.",
                  "sourcePage": 11
                }
              ]
            },
            {
              "elementName": "Akidah",
              "elementDescription": "Akidah berkaitan dengan prinsip keyakinan yang akan mengantarkan murid dalam memahami iman kepada Allah, para malaikat, kitab-kitab Allah, nabi dan rasul, hari akhir serta qadā’ dan qadr. Keimanan ini menjadi landasan dalam melakukan amal saleh dan berakhlak mulia.",
              "learningOutcomes": [
                {
                  "code": "1.2",
                  "title": "Akidah",
                  "text": "Memahami rukun iman, iman kepada Allah Swt., beberapa asmaulhusna, dan iman kepada malaikat.",
                  "sourcePage": 11
                }
              ]
            },
            {
              "elementName": "Akhlak",
              "elementDescription": "Akhlak merupakan buah dari iman dan ilmu yang mewarnai keseluruhan elemen dalam Pendidikan Agama Islam dan Budi Pekerti. Akhlak juga menjadi ukuran kesempurnaan manusia dalam kehidupan pribadi dan sosial. Elemen akhlak dikelompokkan dalam perilaku baik (maḥmūdah) dan perilaku tercela (mażmūmah). Pemahaman ini dapat mendorong murid untuk berusaha memilih dan melatih diri (riyāḍah), disiplin (tahżīb), dan upaya sungguh-sungguh dalam mengendalikan diri (mujāhadah) supaya berperilaku baik terhadap Allah Swt., diri sendiri, sesama manusia, dan lingkungan alam.",
              "learningOutcomes": [
                {
                  "code": "1.3",
                  "title": "Akhlak",
                  "text": "Memahami akhlak terhadap Allah Swt. dengan menyucikan dan memuji-Nya dan akhlak terhadap diri sendiri.",
                  "sourcePage": 11
                }
              ]
            },
            {
              "elementName": "Fikih",
              "elementDescription": "Fikih merupakan interpretasi atas syariat yang memberikan pemahaman tentang hukum yang berkaitan dengan perbuatan mukalaf yang mencakup hubungan kepada Allah Swt. dan sesama manusia.",
              "learningOutcomes": [
                {
                  "code": "1.4",
                  "title": "Fikih",
                  "text": "Memahami rukun Islam, syahadatain, tata cara bersuci, salat fardu, azan, ikamah, zikir, dan berdoa setelah salat.",
                  "sourcePage": 11
                }
              ]
            },
            {
              "elementName": "Sejarah Peradaban Islam",
              "elementDescription": "Sejarah Peradaban Islam menekankan pada kemampuan memahami sejarah untuk menjadi ibrah, teladan, dan inspirasi generasi penerus bangsa dalam menyikapi dan menyelesaikan berbagai permasalahan dalam membangun peradaban.",
              "learningOutcomes": [
                {
                  "code": "1.5",
                  "title": "Sejarah Peradaban Islam",
                  "text": "Memahami kisah beberapa nabi dan rasul.",
                  "sourcePage": 11
                }
              ]
            }
          ]
        },
        {
          "phase": "B",
          "grades": [
            "Kelas 3",
            "Kelas 4"
          ],
          "elements": [
            {
              "elementName": "Al-Qur’an Hadis",
              "elementDescription": "Pendidikan Agama Islam dan Budi Pekerti menekankan pemahaman Al-Qur’an dan hadis secara tekstual dan kontekstual yang teraktualisasikan sebagai nilai kehidupan.",
              "learningOutcomes": [
                {
                  "code": "2.1",
                  "title": "Al-Qur’an Hadis",
                  "text": "Memahami beberapa surah pendek, ayat Al-Qur’an dan hadis tentang kewajiban salat dan menjaga hubungan baik dengan sesama.",
                  "sourcePage": 11
                }
              ]
            },
            {
              "elementName": "Akidah",
              "elementDescription": "Akidah berkaitan dengan prinsip keyakinan yang akan mengantarkan murid dalam memahami iman kepada Allah, para malaikat, kitab-kitab Allah, nabi dan rasul, hari akhir serta qadā’ dan qadr. Keimanan ini menjadi landasan dalam melakukan amal saleh dan berakhlak mulia.",
              "learningOutcomes": [
                {
                  "code": "2.2",
                  "title": "Akidah",
                  "text": "Memahami sifat-sifat Allah Swt., beberapa asmaulhusna, iman kepada kitab-kitab Allah Swt. dan rasul-rasul Allah Swt.",
                  "sourcePage": 11
                }
              ]
            },
            {
              "elementName": "Akhlak",
              "elementDescription": "Akhlak merupakan buah dari iman dan ilmu yang mewarnai keseluruhan elemen dalam Pendidikan Agama Islam dan Budi Pekerti. Akhlak juga menjadi ukuran kesempurnaan manusia dalam kehidupan pribadi dan sosial. Elemen akhlak dikelompokkan dalam perilaku baik (maḥmūdah) dan perilaku tercela (mażmūmah). Pemahaman ini dapat mendorong murid untuk berusaha memilih dan melatih diri (riyāḍah), disiplin (tahżīb), dan upaya sungguh-sungguh dalam mengendalikan diri (mujāhadah) supaya berperilaku baik terhadap Allah Swt., diri sendiri, sesama manusia, dan lingkungan alam.",
              "learningOutcomes": [
                {
                  "code": "2.3",
                  "title": "Akhlak",
                  "text": "Memahami akhlak terhadap Allah Swt. dengan berbaik sangka kepada-Nya, akhlak terhadap orang tua, keluarga, dan pendidik.",
                  "sourcePage": 11
                }
              ]
            },
            {
              "elementName": "Fikih",
              "elementDescription": "Fikih merupakan interpretasi atas syariat yang memberikan pemahaman tentang hukum yang berkaitan dengan perbuatan mukalaf yang mencakup hubungan kepada Allah Swt. dan sesama manusia.",
              "learningOutcomes": [
                {
                  "code": "2.4",
                  "title": "Fikih",
                  "text": "Memahami puasa, salat jumat dan salat sunah, balig dan tanggung jawab yang menyertainya (taklīf).",
                  "sourcePage": 12
                }
              ]
            },
            {
              "elementName": "Sejarah Peradaban Islam",
              "elementDescription": "Sejarah Peradaban Islam menekankan pada kemampuan memahami sejarah untuk menjadi ibrah, teladan, dan inspirasi generasi penerus bangsa dalam menyikapi dan menyelesaikan berbagai permasalahan dalam membangun peradaban.",
              "learningOutcomes": [
                {
                  "code": "2.5",
                  "title": "Sejarah Peradaban Islam",
                  "text": "Memahami kisah Nabi Muhammad saw. sebelum dan sesudah menjadi rasul periode Makkah.",
                  "sourcePage": 12
                }
              ]
            }
          ]
        },
        {
          "phase": "C",
          "grades": [
            "Kelas 5",
            "Kelas 6"
          ],
          "elements": [
            {
              "elementName": "Al-Qur’an Hadis",
              "elementDescription": "Pendidikan Agama Islam dan Budi Pekerti menekankan pemahaman Al-Qur’an dan hadis secara tekstual dan kontekstual yang teraktualisasikan sebagai nilai kehidupan.",
              "learningOutcomes": [
                {
                  "code": "3.1",
                  "title": "Al-Qur’an Hadis",
                  "text": "Memahami beberapa surah pendek dan ayat Al-Qur’an serta hadis tentang keragaman.",
                  "sourcePage": 12
                }
              ]
            },
            {
              "elementName": "Akidah",
              "elementDescription": "Akidah berkaitan dengan prinsip keyakinan yang akan mengantarkan murid dalam memahami iman kepada Allah, para malaikat, kitab-kitab Allah, nabi dan rasul, hari akhir serta qadā’ dan qadr. Keimanan ini menjadi landasan dalam melakukan amal saleh dan berakhlak mulia.",
              "learningOutcomes": [
                {
                  "code": "3.2",
                  "title": "Akidah",
                  "text": "Memahami beberapa asmaulhusna, iman kepada hari akhir, qadāʾ dan qadr.",
                  "sourcePage": 12
                }
              ]
            },
            {
              "elementName": "Akhlak",
              "elementDescription": "Akhlak merupakan buah dari iman dan ilmu yang mewarnai keseluruhan elemen dalam Pendidikan Agama Islam dan Budi Pekerti. Akhlak juga menjadi ukuran kesempurnaan manusia dalam kehidupan pribadi dan sosial. Elemen akhlak dikelompokkan dalam perilaku baik (maḥmūdah) dan perilaku tercela (mażmūmah). Pemahaman ini dapat mendorong murid untuk berusaha memilih dan melatih diri (riyāḍah), disiplin (tahżīb), dan upaya sungguh-sungguh dalam mengendalikan diri (mujāhadah) supaya berperilaku baik terhadap Allah Swt., diri sendiri, sesama manusia, dan lingkungan alam.",
              "learningOutcomes": [
                {
                  "code": "3.3",
                  "title": "Akhlak",
                  "text": "Memahami akhlak terhadap Allah Swt. dengan berdoa dan bertawakal kepada-Nya, akhlak terhadap teman, tetangga, non muslim, hewan, dan tumbuhan.",
                  "sourcePage": 12
                }
              ]
            },
            {
              "elementName": "Fikih",
              "elementDescription": "Fikih merupakan interpretasi atas syariat yang memberikan pemahaman tentang hukum yang berkaitan dengan perbuatan mukalaf yang mencakup hubungan kepada Allah Swt. dan sesama manusia.",
              "learningOutcomes": [
                {
                  "code": "3.4",
                  "title": "Fikih",
                  "text": "Memahami puasa sunah, zakat, infak, sedekah, hadiah, makanan dan minuman yang halal dan haram.",
                  "sourcePage": 12
                }
              ]
            },
            {
              "elementName": "Sejarah Peradaban Islam",
              "elementDescription": "Sejarah Peradaban Islam menekankan pada kemampuan memahami sejarah untuk menjadi ibrah, teladan, dan inspirasi generasi penerus bangsa dalam menyikapi dan menyelesaikan berbagai permasalahan dalam membangun peradaban.",
              "learningOutcomes": [
                {
                  "code": "3.5",
                  "title": "Sejarah Peradaban Islam",
                  "text": "Memahami kisah Nabi Muhammad saw. periode Madinah dan khulafaurasyidin.",
                  "sourcePage": 12
                }
              ]
            }
          ]
        }
      ]
    },
    {
      "subjectName": "Pendidikan Pancasila",
      "phases": [
        {
          "phase": "A",
          "grades": [
            "Kelas 1",
            "Kelas 2"
          ],
          "elements": [
            {
              "elementName": "Pancasila",
              "elementDescription": "Memahami sejarah kelahiran Pancasila dan perumus Pancasila, bendera negara, lagu kebangsaan, lambang negara Garuda Pancasila, dan simbol Pancasila beserta sila-sila Pancasila; memahami kedudukan Pancasila sebagai dasar negara, pandangan hidup bangsa, dan ideologi negara serta penerapannya dalam kehidupan sehari-hari; memahami makna keterkaitan Pancasila dengan Undang-Undang Dasar Negara Republik Indonesia Tahun 1945, Bhinneka Tunggal Ika, dan Negara Kesatuan Republik Indonesia; menguraikan makna nilai-nilai Pancasila sebagai dasar negara dan pandangan hidup bangsa; mendeskripsikan rumusan dan keterkaitan sila-sila dalam Pancasila; menghubungkan sila-sila dalam Pancasila sebagai suatu kesatuan yang utuh; menganalisis peluang dan tantangan penerapan nilai-nilai Pancasila dalam kehidupan global dalam konteks Pancasila sebagai ideologi negara, mengidentifikasi makna sila- sila Pancasila, dan penerapannya dalam kehidupan sehari-hari; dan menunjukkan sikap bangga menjadi anak Indonesia yang memiliki bahasa Indonesia sebagai bahasa persatuan di lingkungan sekitar.",
              "learningOutcomes": [
                {
                  "code": "1.1",
                  "title": "Pancasila",
                  "text": "Mengenal bendera negara, lagu kebangsaan, simbol dan sila-sila Pancasila dalam lambang negara Garuda Pancasila dan simbol Pancasila beserta sila-sila Pancasila; menerapkan nilai-nilai Pancasila di lingkungan keluarga.",
                  "sourcePage": 19
                }
              ]
            },
            {
              "elementName": "Undang-Undang Dasar Negara Republik Indonesia Tahun 1945",
              "elementDescription": "Memahami pembukaan, sejarah, kedudukan, dinamika pemberlakuan Undang-Undang Dasar 1945; menganalisis makna kesatuan Pancasila dengan Undang-Undang Dasar Negara Republik Indonesia Tahun 1945; memahami, mematuhi, dan menerapkan aturan, norma, hak, dan kewajiban dalam kedudukannya sebagai anggota sekolah, keluarga, tempat tinggal, dan sebagai warga negara; menggunakan hak dan menerapkan kewajiban sebagai warga negara; mempraktikkan musyawarah untuk membuat kesepakatan dan aturan bersama, serta menerapkannya dalam kehidupan sehari-hari di lingkungan keluarga dan sekolah; mempraktikkan kemerdekaan berpendapat sebagai warga negara dalam era keterbukaan informasi; menerapkan perilaku taat hukum berdasarkan peraturan yang berlaku, dan merumuskan solusi dari permasalahan sebagai upaya perlindungan hukum untuk mewujudkan harmoni dengan sesama manusia dan lingkungan.",
              "learningOutcomes": [
                {
                  "code": "1.2",
                  "title": "Undang-Undang Dasar Negara Republik Indonesia Tahun 1945",
                  "text": "Mengenal aturan di lingkungan keluarga; menunjukkan dan menceritakan sikap mematuhi aturan di lingkungan keluarga.",
                  "sourcePage": 20
                }
              ]
            },
            {
              "elementName": "Bhinneka Tunggal Ika",
              "elementDescription": "Mengenal Bhinneka Tunggal Ika; mengidentifikasi identitas diri, keluarga dan teman sesuai budaya, suku bangsa, bahasa, agama dan kepercayaan; menghargai keberagaman suku bangsa, agama dan kepercayaan, ras, dan antargolongan serta menerima keberagaman dalam kehidupan bermasyarakat; memahami pentingnya pelestarian tradisi, kearifan lokal, dan budaya daerah sebagai identitas nasional; menumbuhkan sikap tanggung jawab dan berperan aktif melestarikan praktik tradisi, kearifan lokal, dan budaya daerah; memahami prinsip gotong royong sebagai perwujudan sistem ekonomi Pancasila yang inklusif dan berkeadilan; menganalisis potensi konflik dan memberi solusi yang berkeadilan terhadap permasalahan keberagaman di masyarakat; dan merancang kegiatan bersama dengan prinsip gotong royong dalam praktik hidup sehari-hari.",
              "learningOutcomes": [
                {
                  "code": "1.3",
                  "title": "Bhinneka Tunggal Ika",
                  "text": "Mengenal semboyan Bhinneka Tunggal Ika; mengidentifikasi dan menghargai identitas dirinya sesuai dengan jenis kelamin, hobi, bahasa, serta agama dan kepercayaan di lingkungan sekitar.",
                  "sourcePage": 20
                }
              ]
            },
            {
              "elementName": "Negara Kesatuan Republik Indonesia",
              "elementDescription": "Memahami Proklamasi Kemerdekaan Republik Indonesia, mengenal dan mengidentifikasi karakteristik lingkungan sekolah, tempat tinggal, kabupaten/kota,dan provinsi sebagai wilayah Negara Kesatuan Republik Indonesia (NKRI); menunjukkan perilaku kerja sama dalam berbagai bentuk keberagaman suku bangsa, sosial, dan budaya di Indonesia; menunjukkan perilaku gotong royong untuk menjaga persatuan dan kesatuan di lingkungan sekolah dan sekitar sebagai wujud bela negara, berpartisipasi aktif untuk menjaga keutuhan wilayah NKRI; memahami peran dan kedudukannya sebagai warga negara Indonesia; memahami sistem pertahanan dan keamanan negara, menganalisis peran Indonesia dalam hubungan antarnegara; menganalisis dan merumuskan solusi terkait ancaman, tantangan, hambatan, dan gangguan (ATHG) yang dihadapi Indonesia; menganalisis sistem pemerintahan Indonesia, dan peran lembaga-lembaga negara dalam bidang politik, ekonomi, sosial, budaya, pertahanan dan keamanan; memahami nilai-nilai Pancasila dalam konteks pembangunan nasional; dan mendemonstrasikan praktik demokrasi berlandaskan Pancasila dalam kehidupan berbangsa dan bernegara.",
              "learningOutcomes": [
                {
                  "code": "1.4",
                  "title": "Negara Kesatuan Republik Indonesia",
                  "text": "Mengenal karakteristik lingkungan tempat tinggal dan sekolah, sebagai bagian dari wilayah Negara Kesatuan Republik Indonesia; menceritakan dan mempraktikkan bekerja sama menjaga lingkungan sekitar dalam keberagaman.",
                  "sourcePage": 20
                }
              ]
            }
          ]
        },
        {
          "phase": "B",
          "grades": [
            "Kelas 3",
            "Kelas 4"
          ],
          "elements": [
            {
              "elementName": "Pancasila",
              "elementDescription": "Memahami sejarah kelahiran Pancasila dan perumus Pancasila, bendera negara, lagu kebangsaan, lambang negara Garuda Pancasila, dan simbol Pancasila beserta sila-sila Pancasila; memahami kedudukan Pancasila sebagai dasar negara, pandangan hidup bangsa, dan ideologi negara serta penerapannya dalam kehidupan sehari-hari; memahami makna keterkaitan Pancasila dengan Undang-Undang Dasar Negara Republik Indonesia Tahun 1945, Bhinneka Tunggal Ika, dan Negara Kesatuan Republik Indonesia; menguraikan makna nilai-nilai Pancasila sebagai dasar negara dan pandangan hidup bangsa; mendeskripsikan rumusan dan keterkaitan sila-sila dalam Pancasila; menghubungkan sila-sila dalam Pancasila sebagai suatu kesatuan yang utuh; menganalisis peluang dan tantangan penerapan nilai-nilai Pancasila dalam kehidupan global dalam konteks Pancasila sebagai ideologi negara, mengidentifikasi makna sila- sila Pancasila, dan penerapannya dalam kehidupan sehari-hari; dan menunjukkan sikap bangga menjadi anak Indonesia yang memiliki bahasa Indonesia sebagai bahasa persatuan di lingkungan sekitar.",
              "learningOutcomes": [
                {
                  "code": "2.1",
                  "title": "Pancasila",
                  "text": "Mengidentifikasi makna sila-sila Pancasila, dan penerapannya dalam kehidupan sehari-hari; mengenal karakter para perumus Pancasila; menunjukkan sikap bangga menjadi anak Indonesia yang memiliki bahasa Indonesia sebagai bahasa persatuan di lingkungan sekitar.",
                  "sourcePage": 20
                }
              ]
            },
            {
              "elementName": "Undang-Undang Dasar Negara Republik Indonesia Tahun 1945",
              "elementDescription": "Memahami pembukaan, sejarah, kedudukan, dinamika pemberlakuan Undang-Undang Dasar 1945; menganalisis makna kesatuan Pancasila dengan Undang-Undang Dasar Negara Republik Indonesia Tahun 1945; memahami, mematuhi, dan menerapkan aturan, norma, hak, dan kewajiban dalam kedudukannya sebagai anggota sekolah, keluarga, tempat tinggal, dan sebagai warga negara; menggunakan hak dan menerapkan kewajiban sebagai warga negara; mempraktikkan musyawarah untuk membuat kesepakatan dan aturan bersama, serta menerapkannya dalam kehidupan sehari-hari di lingkungan keluarga dan sekolah; mempraktikkan kemerdekaan berpendapat sebagai warga negara dalam era keterbukaan informasi; menerapkan perilaku taat hukum berdasarkan peraturan yang berlaku, dan merumuskan solusi dari permasalahan sebagai upaya perlindungan hukum untuk mewujudkan harmoni dengan sesama manusia dan lingkungan.",
              "learningOutcomes": [
                {
                  "code": "2.2",
                  "title": "Undang-Undang Dasar Negara Republik Indonesia Tahun 1945",
                  "text": "Mengidentifikasi dan melaksanakan aturan di sekolah dan lingkungan tempat tinggal; mengidentifikasi dan menerapkan hak yang didapat dan kewajiban sebagai anggota keluarga dan sebagai warga sekolah.",
                  "sourcePage": 20
                }
              ]
            },
            {
              "elementName": "Bhinneka Tunggal Ika",
              "elementDescription": "Mengenal Bhinneka Tunggal Ika; mengidentifikasi identitas diri, keluarga dan teman sesuai budaya, suku bangsa, bahasa, agama dan kepercayaan; menghargai keberagaman suku bangsa, agama dan kepercayaan, ras, dan antargolongan serta menerima keberagaman dalam kehidupan bermasyarakat; memahami pentingnya pelestarian tradisi, kearifan lokal, dan budaya daerah sebagai identitas nasional; menumbuhkan sikap tanggung jawab dan berperan aktif melestarikan praktik tradisi, kearifan lokal, dan budaya daerah; memahami prinsip gotong royong sebagai perwujudan sistem ekonomi Pancasila yang inklusif dan berkeadilan; menganalisis potensi konflik dan memberi solusi yang berkeadilan terhadap permasalahan keberagaman di masyarakat; dan merancang kegiatan bersama dengan prinsip gotong royong dalam praktik hidup sehari-hari.",
              "learningOutcomes": [
                {
                  "code": "2.3",
                  "title": "Bhinneka Tunggal Ika",
                  "text": "Membedakan dan menghargai identitas, keluarga, dan teman-temannya sesuai budaya, suku bangsa, bahasa, agama dan kepercayaannya di lingkungan sekitar.",
                  "sourcePage": 21
                }
              ]
            },
            {
              "elementName": "Negara Kesatuan Republik Indonesia",
              "elementDescription": "Memahami Proklamasi Kemerdekaan Republik Indonesia, mengenal dan mengidentifikasi karakteristik lingkungan sekolah, tempat tinggal, kabupaten/kota,dan provinsi sebagai wilayah Negara Kesatuan Republik Indonesia (NKRI); menunjukkan perilaku kerja sama dalam berbagai bentuk keberagaman suku bangsa, sosial, dan budaya di Indonesia; menunjukkan perilaku gotong royong untuk menjaga persatuan dan kesatuan di lingkungan sekolah dan sekitar sebagai wujud bela negara, berpartisipasi aktif untuk menjaga keutuhan wilayah NKRI; memahami peran dan kedudukannya sebagai warga negara Indonesia; memahami sistem pertahanan dan keamanan negara, menganalisis peran Indonesia dalam hubungan antarnegara; menganalisis dan merumuskan solusi terkait ancaman, tantangan, hambatan, dan gangguan (ATHG) yang dihadapi Indonesia; menganalisis sistem pemerintahan Indonesia, dan peran lembaga-lembaga negara dalam bidang politik, ekonomi, sosial, budaya, pertahanan dan keamanan; memahami nilai-nilai Pancasila dalam konteks pembangunan nasional; dan mendemonstrasikan praktik demokrasi berlandaskan Pancasila dalam kehidupan berbangsa dan bernegara.",
              "learningOutcomes": [
                {
                  "code": "2.4",
                  "title": "Negara Kesatuan Republik Indonesia",
                  "text": "Mengidentifikasi lingkungan tempat tinggal (RT, RW, desa atau kelurahan, dan kecamatan) sebagai bagian dari wilayah Negara Kesatuan Republik Indonesia; menunjukkan perilaku bekerja sama dalam berbagai bentuk keberagaman suku bangsa, sosial, dan budaya di Indonesia yang terikat persatuan dan kesatuan di lingkungan sekitar.",
                  "sourcePage": 21
                }
              ]
            }
          ]
        },
        {
          "phase": "C",
          "grades": [
            "Kelas 5",
            "Kelas 6"
          ],
          "elements": [
            {
              "elementName": "Pancasila",
              "elementDescription": "Memahami sejarah kelahiran Pancasila dan perumus Pancasila, bendera negara, lagu kebangsaan, lambang negara Garuda Pancasila, dan simbol Pancasila beserta sila-sila Pancasila; memahami kedudukan Pancasila sebagai dasar negara, pandangan hidup bangsa, dan ideologi negara serta penerapannya dalam kehidupan sehari-hari; memahami makna keterkaitan Pancasila dengan Undang-Undang Dasar Negara Republik Indonesia Tahun 1945, Bhinneka Tunggal Ika, dan Negara Kesatuan Republik Indonesia; menguraikan makna nilai-nilai Pancasila sebagai dasar negara dan pandangan hidup bangsa; mendeskripsikan rumusan dan keterkaitan sila-sila dalam Pancasila; menghubungkan sila-sila dalam Pancasila sebagai suatu kesatuan yang utuh; menganalisis peluang dan tantangan penerapan nilai-nilai Pancasila dalam kehidupan global dalam konteks Pancasila sebagai ideologi negara, mengidentifikasi makna sila- sila Pancasila, dan penerapannya dalam kehidupan sehari-hari; dan menunjukkan sikap bangga menjadi anak Indonesia yang memiliki bahasa Indonesia sebagai bahasa persatuan di lingkungan sekitar.",
              "learningOutcomes": [
                {
                  "code": "3.1",
                  "title": "Pancasila",
                  "text": "Memahami kronologi sejarah kelahiran Pancasila; meneladani sikap para perumus Pancasila dan menerapkan di lingkungan masyarakat; menghubungkan sila-sila dalam Pancasila sebagai suatu kesatuan yang utuh; menguraikan makna nilai-nilai Pancasila sebagai dasar negara, dan pandangan hidup bangsa.",
                  "sourcePage": 21
                }
              ]
            },
            {
              "elementName": "Undang-Undang Dasar Negara Republik Indonesia Tahun 1945",
              "elementDescription": "Memahami pembukaan, sejarah, kedudukan, dinamika pemberlakuan Undang-Undang Dasar 1945; menganalisis makna kesatuan Pancasila dengan Undang-Undang Dasar Negara Republik Indonesia Tahun 1945; memahami, mematuhi, dan menerapkan aturan, norma, hak, dan kewajiban dalam kedudukannya sebagai anggota sekolah, keluarga, tempat tinggal, dan sebagai warga negara; menggunakan hak dan menerapkan kewajiban sebagai warga negara; mempraktikkan musyawarah untuk membuat kesepakatan dan aturan bersama, serta menerapkannya dalam kehidupan sehari-hari di lingkungan keluarga dan sekolah; mempraktikkan kemerdekaan berpendapat sebagai warga negara dalam era keterbukaan informasi; menerapkan perilaku taat hukum berdasarkan peraturan yang berlaku, dan merumuskan solusi dari permasalahan sebagai upaya perlindungan hukum untuk mewujudkan harmoni dengan sesama manusia dan lingkungan.",
              "learningOutcomes": [
                {
                  "code": "3.2",
                  "title": "Undang-Undang Dasar Negara Republik Indonesia Tahun 1945",
                  "text": "Mengimplementasikan bentuk-bentuk norma, hak, dan kewajiban dalam kedudukannya sebagai warga negara; mengenal Pembukaan Undang-Undang Dasar Negara Republik Indonesia tahun 1945; mempraktikkan musyawarah untuk membuat kesepakatan dan aturan bersama, serta menerapkannya dalam lingkungan keluarga dan sekolah.",
                  "sourcePage": 21
                }
              ]
            },
            {
              "elementName": "Bhinneka Tunggal Ika",
              "elementDescription": "Mengenal Bhinneka Tunggal Ika; mengidentifikasi identitas diri, keluarga dan teman sesuai budaya, suku bangsa, bahasa, agama dan kepercayaan; menghargai keberagaman suku bangsa, agama dan kepercayaan, ras, dan antargolongan serta menerima keberagaman dalam kehidupan bermasyarakat; memahami pentingnya pelestarian tradisi, kearifan lokal, dan budaya daerah sebagai identitas nasional; menumbuhkan sikap tanggung jawab dan berperan aktif melestarikan praktik tradisi, kearifan lokal, dan budaya daerah; memahami prinsip gotong royong sebagai perwujudan sistem ekonomi Pancasila yang inklusif dan berkeadilan; menganalisis potensi konflik dan memberi solusi yang berkeadilan terhadap permasalahan keberagaman di masyarakat; dan merancang kegiatan bersama dengan prinsip gotong royong dalam praktik hidup sehari-hari.",
              "learningOutcomes": [
                {
                  "code": "3.3",
                  "title": "Bhinneka Tunggal Ika",
                  "text": "Menyajikan hasil identifikasi sikap menghormati, menjaga, dan melestarikan keberagaman budaya sesuai semboyan dalam bingkai Bhinneka Tunggal Ika di lingkungan sekitar.",
                  "sourcePage": 22
                }
              ]
            },
            {
              "elementName": "Negara Kesatuan Republik Indonesia",
              "elementDescription": "Memahami Proklamasi Kemerdekaan Republik Indonesia, mengenal dan mengidentifikasi karakteristik lingkungan sekolah, tempat tinggal, kabupaten/kota,dan provinsi sebagai wilayah Negara Kesatuan Republik Indonesia (NKRI); menunjukkan perilaku kerja sama dalam berbagai bentuk keberagaman suku bangsa, sosial, dan budaya di Indonesia; menunjukkan perilaku gotong royong untuk menjaga persatuan dan kesatuan di lingkungan sekolah dan sekitar sebagai wujud bela negara, berpartisipasi aktif untuk menjaga keutuhan wilayah NKRI; memahami peran dan kedudukannya sebagai warga negara Indonesia; memahami sistem pertahanan dan keamanan negara, menganalisis peran Indonesia dalam hubungan antarnegara; menganalisis dan merumuskan solusi terkait ancaman, tantangan, hambatan, dan gangguan (ATHG) yang dihadapi Indonesia; menganalisis sistem pemerintahan Indonesia, dan peran lembaga-lembaga negara dalam bidang politik, ekonomi, sosial, budaya, pertahanan dan keamanan; memahami nilai-nilai Pancasila dalam konteks pembangunan nasional; dan mendemonstrasikan praktik demokrasi berlandaskan Pancasila dalam kehidupan berbangsa dan bernegara.",
              "learningOutcomes": [
                {
                  "code": "3.4",
                  "title": "Negara Kesatuan Republik Indonesia",
                  "text": "Mengenal wilayahnya dalam konteks kabupaten/kota, dan provinsi sebagai bagian dari wilayah Negara Kesatuan Republik Indonesia; menunjukkan perilaku gotong royong untuk menjaga persatuan di lingkungan sekolah dan sekitar sebagai wujud bela negara.",
                  "sourcePage": 22
                }
              ]
            }
          ]
        }
      ]
    },
    {
      "subjectName": "Bahasa Indonesia",
      "phases": [
        {
          "phase": "A",
          "grades": [
            "Kelas 1",
            "Kelas 2"
          ],
          "elements": [
            {
              "elementName": "Menyimak",
              "elementDescription": "Kemampuan murid dalam menerima, memahami informasi yang didengar, dan menyiapkan tanggapan secara relevan untuk memberikan apresiasi kepada mitra tutur. Proses yang terjadi dalam menyimak mencakup kegiatan seperti mendengarkan, mengidentifikasi, memahami, menginterpretasi tuturan bahasa, memaknai, dan/atau menyiapkan tanggapan terhadap mitra tutur. Komponen-komponen yang dapat dikembangkan dalam menyimak di antaranya kepekaan terhadap bunyi bahasa, sistem isyarat, kosakata, struktur bahasa (tata bahasa), makna, dan metakognisi.",
              "learningOutcomes": [
                {
                  "code": "1.1",
                  "title": "Menyimak",
                  "text": "Memahami informasi dari teks nonsastra berbentuk teks aural (teks yang dibacakan dan/atau didengarkan) berupa percakapan yang berkaitan dengan diri, keluarga, dan/atau lingkungan sekitar; dan memahami pesan teks sastra berbentuk teks aural.",
                  "sourcePage": 29
                }
              ]
            },
            {
              "elementName": "Membaca dan Memirsa",
              "elementDescription": "Membaca merupakan kemampuan murid untuk memahami, memaknai, menginterpretasi, dan merefleksi teks sesuai tujuan dan kepentingannya untuk mengembangkan pengetahuan, keterampilan, dan potensi. Memirsa merupakan kemampuan untuk memahami, memaknai, menginterpretasi, dan merefleksi sajian visual dan/atau audiovisual sesuai tujuan dan kepentingannya untuk mengembangkan pengetahuan, keterampilan, dan potensi murid. Komponen-komponen yang dapat dikembangkan dalam membaca dan memirsa di antaranya kepekaan terhadap fonem, huruf, sistem isyarat, kosakata, struktur bahasa (tata bahasa), makna, dan metakognisi.",
              "learningOutcomes": [
                {
                  "code": "1.2",
                  "title": "Membaca dan Memirsa",
                  "text": "Membaca kata-kata sederhana dengan fasih dari bacaan dan/atau tayangan yang dipirsa tentang diri, keluarga, kesehatan, dan/atau lingkungan sekitar; dan memahami isi bacaan dan/atau tayangan yang dipirsa tentang diri, keluarga, kesehatan, dan/atau lingkungan sekitar.",
                  "sourcePage": 29
                }
              ]
            },
            {
              "elementName": "Berbicara dan Mempresentasikan",
              "elementDescription": "Berbicara merupakan kemampuan menyampaikan gagasan, tanggapan, dan perasaan dalam bentuk lisan. Mempresentasikan merupakan kemampuan memaparkan gagasan atau tanggapan secara fasih, akurat, bertanggung jawab, dan/atau menyampaikan perasaan sesuai konteks dengan cara yang komunikatif melalui beragam media (visual, digital, audio, dan audiovisual). Komponen-komponen yang dapat dikembangkan dalam berbicara dan mempresentasikan di antaranya kepekaan terhadap bunyi bahasa, sistem isyarat, kosakata, struktur bahasa (tata bahasa), makna, dan metakognisi.",
              "learningOutcomes": [
                {
                  "code": "1.3",
                  "title": "Berbicara dan Mempresentasikan",
                  "text": "Merespons dengan bertanya tentang sesuatu, menjawab, dan menanggapi komentar orang lain (teman, pendidik, dan/atau orang dewasa) dengan baik dan santun dalam suatu percakapan tentang diri, keluarga, kesehatan, dan/atau lingkungan sekitar; mengungkapkan perasaan dan gagasan secara lisan dengan atau tanpa bantuan gambar; dan menceritakan kembali isi berbagai tipe teks yang dibaca, dipirsa, atau didengar tentang diri, keluarga, kesehatan, dan/atau lingkungan sekitar.",
                  "sourcePage": 29
                }
              ]
            },
            {
              "elementName": "Menulis",
              "elementDescription": "Kemampuan menyampaikan gagasan, tanggapan, dan perasaan dalam bentuk tulis secara fasih, akurat, bertanggung jawab, dan sesuai konteks. Komponen-komponen yang dapat dikembangkan dalam menulis di antaranya menerapkan penggunaan ejaan, kata, kalimat, dan paragraf, struktur bahasa (tata bahasa), makna, dan metakognisi dalam beragam tipe teks.",
              "learningOutcomes": [
                {
                  "code": "1.4",
                  "title": "Menulis",
                  "text": "Menulis permulaan dengan benar di atas kertas dan/atau melalui media digital; mengembangkan tulisan tangan yang semakin baik; dan menulis berbagai tipe teks sederhana tentang diri, keluarga, dan/atau lingkungan sekitar dengan beberapa kalimat sederhana.",
                  "sourcePage": 30
                }
              ]
            }
          ]
        },
        {
          "phase": "B",
          "grades": [
            "Kelas 3",
            "Kelas 4"
          ],
          "elements": [
            {
              "elementName": "Menyimak",
              "elementDescription": "Kemampuan murid dalam menerima, memahami informasi yang didengar, dan menyiapkan tanggapan secara relevan untuk memberikan apresiasi kepada mitra tutur. Proses yang terjadi dalam menyimak mencakup kegiatan seperti mendengarkan, mengidentifikasi, memahami, menginterpretasi tuturan bahasa, memaknai, dan/atau menyiapkan tanggapan terhadap mitra tutur. Komponen-komponen yang dapat dikembangkan dalam menyimak di antaranya kepekaan terhadap bunyi bahasa, sistem isyarat, kosakata, struktur bahasa (tata bahasa), makna, dan metakognisi.",
              "learningOutcomes": [
                {
                  "code": "2.1",
                  "title": "Menyimak",
                  "text": "Memahami ide pokok suatu informasi dari teks nonsastra berbentuk teks aural (teks yang dibacakan dan/atau didengarkan); dan memahami isi teks sastra berbentuk teks aural.",
                  "sourcePage": 30
                }
              ]
            },
            {
              "elementName": "Membaca dan Memirsa",
              "elementDescription": "Membaca merupakan kemampuan murid untuk memahami, memaknai, menginterpretasi, dan merefleksi teks sesuai tujuan dan kepentingannya untuk mengembangkan pengetahuan, keterampilan, dan potensi. Memirsa merupakan kemampuan untuk memahami, memaknai, menginterpretasi, dan merefleksi sajian visual dan/atau audiovisual sesuai tujuan dan kepentingannya untuk mengembangkan pengetahuan, keterampilan, dan potensi murid. Komponen-komponen yang dapat dikembangkan dalam membaca dan memirsa di antaranya kepekaan terhadap fonem, huruf, sistem isyarat, kosakata, struktur bahasa (tata bahasa), makna, dan metakognisi.",
              "learningOutcomes": [
                {
                  "code": "2.2",
                  "title": "Membaca dan Memirsa",
                  "text": "Membaca kata-kata baru dengan fasih dari bacaan dan/atau tayangan yang dipirsa; dan memahami ide pokok, ide pendukung, pesan, dan informasi dalam teks sastra dan nonsastra berbentuk cetak dan/atau elektronik.",
                  "sourcePage": 30
                }
              ]
            },
            {
              "elementName": "Berbicara dan Mempresentasikan",
              "elementDescription": "Berbicara merupakan kemampuan menyampaikan gagasan, tanggapan, dan perasaan dalam bentuk lisan. Mempresentasikan merupakan kemampuan memaparkan gagasan atau tanggapan secara fasih, akurat, bertanggung jawab, dan/atau menyampaikan perasaan sesuai konteks dengan cara yang komunikatif melalui beragam media (visual, digital, audio, dan audiovisual). Komponen-komponen yang dapat dikembangkan dalam berbicara dan mempresentasikan di antaranya kepekaan terhadap bunyi bahasa, sistem isyarat, kosakata, struktur bahasa (tata bahasa), makna, dan metakognisi.",
              "learningOutcomes": [
                {
                  "code": "2.3",
                  "title": "Berbicara dan Mempresentasikan",
                  "text": "Menyajikan pendapat dengan pilihan kata dan sikap tubuh/gestur yang sesuai, menggunakan volume dan intonasi yang tepat sesuai konteks; menanggapi diskusi sesuai tata cara; dan menceritakan kembali isi dan/atau informasi dari berbagai tipe teks yang dibaca, dipirsa, atau didengar.",
                  "sourcePage": 30
                }
              ]
            },
            {
              "elementName": "Menulis",
              "elementDescription": "Kemampuan menyampaikan gagasan, tanggapan, dan perasaan dalam bentuk tulis secara fasih, akurat, bertanggung jawab, dan sesuai konteks. Komponen-komponen yang dapat dikembangkan dalam menulis di antaranya menerapkan penggunaan ejaan, kata, kalimat, dan paragraf, struktur bahasa (tata bahasa), makna, dan metakognisi dalam beragam tipe teks.",
              "learningOutcomes": [
                {
                  "code": "2.4",
                  "title": "Menulis",
                  "text": "Menulis berbagai tipe teks sederhana dengan rangkaian kalimat yang beragam; dan menggunakan kaidah kebahasaan dan kosakata baru yang memiliki makna denotatif untuk menulis teks sesuai dengan konteks.",
                  "sourcePage": 30
                }
              ]
            }
          ]
        },
        {
          "phase": "C",
          "grades": [
            "Kelas 5",
            "Kelas 6"
          ],
          "elements": [
            {
              "elementName": "Menyimak",
              "elementDescription": "Kemampuan murid dalam menerima, memahami informasi yang didengar, dan menyiapkan tanggapan secara relevan untuk memberikan apresiasi kepada mitra tutur. Proses yang terjadi dalam menyimak mencakup kegiatan seperti mendengarkan, mengidentifikasi, memahami, menginterpretasi tuturan bahasa, memaknai, dan/atau menyiapkan tanggapan terhadap mitra tutur. Komponen-komponen yang dapat dikembangkan dalam menyimak di antaranya kepekaan terhadap bunyi bahasa, sistem isyarat, kosakata, struktur bahasa (tata bahasa), makna, dan metakognisi.",
              "learningOutcomes": [
                {
                  "code": "3.1",
                  "title": "Menyimak",
                  "text": "Menganalisis informasi dari teks nonsastra berbentuk teks aural (teks yang dibacakan dan/atau didengarkan; dan menganalisis isi teks sastra berbentuk teks aural.",
                  "sourcePage": 31
                }
              ]
            },
            {
              "elementName": "Membaca dan Memirsa",
              "elementDescription": "Membaca merupakan kemampuan murid untuk memahami, memaknai, menginterpretasi, dan merefleksi teks sesuai tujuan dan kepentingannya untuk mengembangkan pengetahuan, keterampilan, dan potensi. Memirsa merupakan kemampuan untuk memahami, memaknai, menginterpretasi, dan merefleksi sajian visual dan/atau audiovisual sesuai tujuan dan kepentingannya untuk mengembangkan pengetahuan, keterampilan, dan potensi murid. Komponen-komponen yang dapat dikembangkan dalam membaca dan memirsa di antaranya kepekaan terhadap fonem, huruf, sistem isyarat, kosakata, struktur bahasa (tata bahasa), makna, dan metakognisi.",
              "learningOutcomes": [
                {
                  "code": "3.2",
                  "title": "Membaca dan Memirsa",
                  "text": "Membaca kata-kata dengan berbagai pola kombinasi huruf dengan fasih dari bacaan dan/atau tayangan yang dipirsa; dan menganalisis informasi serta nilai-nilai dalam teks sastra dan nonsastra berwujud teks visual dan/atau audiovisual.",
                  "sourcePage": 31
                }
              ]
            },
            {
              "elementName": "Berbicara dan Mempresentasikan",
              "elementDescription": "Berbicara merupakan kemampuan menyampaikan gagasan, tanggapan, dan perasaan dalam bentuk lisan. Mempresentasikan merupakan kemampuan memaparkan gagasan atau tanggapan secara fasih, akurat, bertanggung jawab, dan/atau menyampaikan perasaan sesuai konteks dengan cara yang komunikatif melalui beragam media (visual, digital, audio, dan audiovisual). Komponen-komponen yang dapat dikembangkan dalam berbicara dan mempresentasikan di antaranya kepekaan terhadap bunyi bahasa, sistem isyarat, kosakata, struktur bahasa (tata bahasa), makna, dan metakognisi.",
              "learningOutcomes": [
                {
                  "code": "3.3",
                  "title": "Berbicara dan Mempresentasikan",
                  "text": "Mempresentasikan gagasan dari berbagai tipe teks dengan efektif dan santun; dan menyampaikan perasaan berdasarkan fakta, imajinasi (dari diri sendiri dan orang lain) secara indah dan menarik dalam bentuk teks sastra dengan penggunaan kosakata secara kreatif.",
                  "sourcePage": 31
                }
              ]
            },
            {
              "elementName": "Menulis",
              "elementDescription": "Kemampuan menyampaikan gagasan, tanggapan, dan perasaan dalam bentuk tulis secara fasih, akurat, bertanggung jawab, dan sesuai konteks. Komponen-komponen yang dapat dikembangkan dalam menulis di antaranya menerapkan penggunaan ejaan, kata, kalimat, dan paragraf, struktur bahasa (tata bahasa), makna, dan metakognisi dalam beragam tipe teks.",
              "learningOutcomes": [
                {
                  "code": "3.4",
                  "title": "Menulis",
                  "text": "Menulis berbagai tipe teks sederhana berdasarkan gagasan, hasil pengamatan, pengalaman, dan/atau imajinasi dengan rangkaian kalimat kompleks secara kreatif, menarik, dan/atau indah; dan menggunakan kaidah kebahasaan dan kosakata baru yang memiliki makna denotatif dan konotatif.",
                  "sourcePage": 31
                }
              ]
            }
          ]
        }
      ]
    },
    {
      "subjectName": "Matematika",
      "phases": [
        {
          "phase": "A",
          "grades": [
            "Kelas 1",
            "Kelas 2"
          ],
          "elements": [
            {
              "elementName": "Bilangan",
              "elementDescription": "Bidang kajian Bilangan membahas tentang angka sebagai simbol bilangan, konsep bilangan, operasi hitung bilangan, dan relasi antara berbagai operasi hitung bilangan dalam sub-elemen representasi visual, sifat urutan, dan operasi.",
              "learningOutcomes": [
                {
                  "code": "1.1",
                  "title": "Bilangan",
                  "text": "Menunjukkan pemahaman dan memiliki intuisi bilangan (number sense) pada bilangan cacah sampai 100; membaca, menulis, menentukan nilai tempat, membandingkan, mengurutkan, serta melakukan komposisi (menyusun) dan dekomposisi (mengurai) bilangan; melakukan operasi penjumlahan dan pengurangan menggunakan benda-benda konkret yang banyaknya sampai 20; dan menunjukkan pemahaman pecahan sebagai bagian dari keseluruhan melalui konteks membagi sebuah benda atau kumpulan benda sama banyak (pecahan yang diperkenalkan adalah setengah dan seperempat).",
                  "sourcePage": 37
                }
              ]
            },
            {
              "elementName": "Aljabar",
              "elementDescription": "Bidang kajian Aljabar membahas tentang aljabar non-formal dalam bentuk simbol gambar sampai dengan aljabar formal dalam bentuk simbol huruf yang mewakili bilangan tertentu dalam sub-elemen persamaan dan pertidaksamaan, relasi dan pola bilangan, serta rasio dan proporsi.",
              "learningOutcomes": [
                {
                  "code": "1.2",
                  "title": "Aljabar",
                  "text": "Menunjukan pemahaman makna simbol matematika \"=\" dalam suatu kalimat matematika yang terkait dengan penjumlahan dan pengurangan bilangan cacah sampai 20 menggunakan gambar. Contoh: Murid dapat mengenali, meniru, dan melanjutkan pola bukan bilangan (misalnya, gambar, warna, bunyi/suara).",
                  "sourcePage": 38
                }
              ]
            },
            {
              "elementName": "Pengukuran",
              "elementDescription": "Bidang kajian Pengukuran membahas tentang besaran-besaran pengukuran, cara mengukur besaran tertentu, dan membuktikan prinsip atau teorema terkait besaran tertentu dalam sub-elemen pengukuran besaran geometris dan non-geometris.",
              "learningOutcomes": [
                {
                  "code": "1.3",
                  "title": "Pengukuran",
                  "text": "Membandingkan panjang dan berat benda secara langsung, dan membandingkan durasi waktu; mengukur dan mengestimasi panjang dan berat benda menggunakan satuan tidak baku.",
                  "sourcePage": 38
                }
              ]
            },
            {
              "elementName": "Geometri",
              "elementDescription": "Bidang kajian Geometri membahas tentang berbagai bentuk bangun datar dan bangun ruang serta ciri-cirinya dalam sub-elemen geometri datar dan geometri ruang.",
              "learningOutcomes": [
                {
                  "code": "1.4",
                  "title": "Geometri",
                  "text": "Mengenal berbagai bangun datar (segitiga, segiempat, segi banyak, lingkaran) dan bangun ruang (balok, kubus, kerucut, dan bola); melakukan komposisi (penyusunan) dan dekomposisi (penguraian) suatu bangun datar (segitiga, segiempat, dan segi banyak); dan menentukan posisi benda terhadap benda lain (kanan, kiri, depan belakang, bawah, atas).",
                  "sourcePage": 38
                }
              ]
            },
            {
              "elementName": "Analisis Data dan Peluang",
              "elementDescription": "Bidang kajian Analisis Data dan Peluang membahas tentang pengertian data, jenis-jenis data, pengolahan data dalam berbagai bentuk representasi, dan analisis data kuantitatif terkait pemusatan dan penyebaran data serta peluang munculnya suatu data atau kejadian tertentu dalam sub-elemen data dan representasinya, serta ketidakpastian dan peluang.",
              "learningOutcomes": [
                {
                  "code": "1.5",
                  "title": "Analisis Data dan Peluang",
                  "text": "Mengurutkan, menyortir, mengelompokkan, membandingkan, dan menyajikan data dari banyak benda dengan menggunakan turus dan piktogram paling banyak 4 kategori.",
                  "sourcePage": 38
                }
              ]
            },
            {
              "elementName": "Penalaran dan Pembuktian Matematis",
              "elementDescription": "Penalaran terkait dengan proses penggunaan pola hubungan dalam menganalisis situasi untuk menyusun serta menyelidiki praduga. Pembuktian matematis terkait proses membuktikan kebenaran suatu prinsip, rumus, atau teorema tertentu.",
              "learningOutcomes": []
            },
            {
              "elementName": "Pemecahan Masalah Matematis",
              "elementDescription": "Pemecahan masalah matematis terkait dengan proses penyelesaian masalah matematis atau masalah sehari-hari dengan cara menerapkan dan mengadaptasi berbagai strategi yang efektif. Proses ini juga mencakup konstruksi dan rekonstruksi pemahaman matematika melalui pemecahan masalah.",
              "learningOutcomes": []
            },
            {
              "elementName": "Komunikasi",
              "elementDescription": "Komunikasi matematis terkait dengan pembentukan alur pemahaman materi pembelajaran matematika melalui cara mengomunikasikan pemikiran matematis menggunakan bahasa matematis yang tepat. Komunikasi matematis juga mencakup proses menganalisis dan mengevaluasi pemikiran matematis orang lain.",
              "learningOutcomes": []
            },
            {
              "elementName": "Representasi Matematis",
              "elementDescription": "Representasi matematis terkait dengan proses membuat dan menggunakan simbol, tabel, diagram, atau bentuk lain untuk mengomunikasikan gagasan dan pemodelan matematika. Proses ini juga mencakup fleksibilitas dalam mengubah dari satu bentuk representasi ke bentuk representasi lainnya, dan memilih representasi yang paling sesuai untuk memecahkan masalah.",
              "learningOutcomes": []
            },
            {
              "elementName": "Koneksi Matematis",
              "elementDescription": "Koneksi matematis terkait dengan proses mengaitkan antara materi pembelajaran matematika pada suatu bidang kajian, lintas bidang kajian, lintas bidang ilmu, dan dengan kehidupan.",
              "learningOutcomes": []
            }
          ]
        },
        {
          "phase": "B",
          "grades": [
            "Kelas 3",
            "Kelas 4"
          ],
          "elements": [
            {
              "elementName": "Bilangan",
              "elementDescription": "Bidang kajian Bilangan membahas tentang angka sebagai simbol bilangan, konsep bilangan, operasi hitung bilangan, dan relasi antara berbagai operasi hitung bilangan dalam sub-elemen representasi visual, sifat urutan, dan operasi.",
              "learningOutcomes": [
                {
                  "code": "2.1",
                  "title": "Bilangan",
                  "text": "Memiliki pemahaman dan intuisi bilangan (number sense) pada bilangan cacah sampai 10.000; membaca, menulis, membandingkan, dan mengurutkan bilangan; menentukan dan menggunakan nilai tempat; melakukan komposisi dan dekomposisi bilangan cacah sampai 10.000. Murid dapat melakukan dan menyelesaikan masalah operasi bilangan penjumlahan dan pengurangan bilangan cacah sampai 1.000; melakukan dan menyelesaikan masalah operasi perkalian dan pembagian bilangan cacah sampai 100 dengan bantuan benda konkret, gambar dan simbol; mengenal kelipatan dan faktor. Murid dapat melakukan perbandingan dan pengurutan pecahan dengan pembilang satu dan antar pecahan dengan penyebut yang sama; mengenal dan dapat menerapkan pecahan senilai, memiliki intuisi pecahan dan desimal, serta dapat menentukan pecahan sebagai desimal dan persen.",
                  "sourcePage": 38
                }
              ]
            },
            {
              "elementName": "Aljabar",
              "elementDescription": "Bidang kajian Aljabar membahas tentang aljabar non-formal dalam bentuk simbol gambar sampai dengan aljabar formal dalam bentuk simbol huruf yang mewakili bilangan tertentu dalam sub-elemen persamaan dan pertidaksamaan, relasi dan pola bilangan, serta rasio dan proporsi.",
              "learningOutcomes": [
                {
                  "code": "2.2",
                  "title": "Aljabar",
                  "text": "Menemukan nilai yang tidak diketahui dalam kalimat matematika yang melibatkan penjumlahan dan pengurangan pada bilangan cacah sampai 100, dengan menggunakan sifat-sifat bilangan dan operasinya. Murid dapat mengidentifikasi, meniru, dan mengembangkan pola gambar atau objek sederhana dan pola bilangan membesar dan mengecil yang dapat melibatkan penjumlahan dan pengurangan pada bilangan cacah sampai 100.",
                  "sourcePage": 39
                }
              ]
            },
            {
              "elementName": "Pengukuran",
              "elementDescription": "Bidang kajian Pengukuran membahas tentang besaran-besaran pengukuran, cara mengukur besaran tertentu, dan membuktikan prinsip atau teorema terkait besaran tertentu dalam sub-elemen pengukuran besaran geometris dan non-geometris.",
              "learningOutcomes": [
                {
                  "code": "2.3",
                  "title": "Pengukuran",
                  "text": "Mengukur panjang dan berat benda menggunakan satuan baku; menentukan hubungan antar-satuan baku panjang (cm, m) dan antar-satuan berat (g, kg); serta mengukur dan mengestimasi luas dan volume menggunakan satuan tidak baku dan satuan baku berupa bilangan cacah.",
                  "sourcePage": 39
                }
              ]
            },
            {
              "elementName": "Geometri",
              "elementDescription": "Bidang kajian Geometri membahas tentang berbagai bentuk bangun datar dan bangun ruang serta ciri-cirinya dalam sub-elemen geometri datar dan geometri ruang.",
              "learningOutcomes": [
                {
                  "code": "2.4",
                  "title": "Geometri",
                  "text": "Mendeskripsikan ciri berbagai bentuk bangun datar (segiempat, segitiga, segi banyak); menyusun (komposisi) dan mengurai (dekomposisi) berbagai bangun datar dengan lebih dari satu cara jika memungkinkan.",
                  "sourcePage": 40
                }
              ]
            },
            {
              "elementName": "Analisis Data dan Peluang",
              "elementDescription": "Bidang kajian Analisis Data dan Peluang membahas tentang pengertian data, jenis-jenis data, pengolahan data dalam berbagai bentuk representasi, dan analisis data kuantitatif terkait pemusatan dan penyebaran data serta peluang munculnya suatu data atau kejadian tertentu dalam sub-elemen data dan representasinya, serta ketidakpastian dan peluang.",
              "learningOutcomes": [
                {
                  "code": "2.5",
                  "title": "Analisis Data dan Peluang",
                  "text": "Mengurutkan, membandingkan, menyajikan, menganalisis dan menginterpretasi data dalam bentuk tabel, diagram gambar, piktogram, dan diagram batang (skala satu satuan).",
                  "sourcePage": 40
                }
              ]
            },
            {
              "elementName": "Penalaran dan Pembuktian Matematis",
              "elementDescription": "Penalaran terkait dengan proses penggunaan pola hubungan dalam menganalisis situasi untuk menyusun serta menyelidiki praduga. Pembuktian matematis terkait proses membuktikan kebenaran suatu prinsip, rumus, atau teorema tertentu.",
              "learningOutcomes": []
            },
            {
              "elementName": "Pemecahan Masalah Matematis",
              "elementDescription": "Pemecahan masalah matematis terkait dengan proses penyelesaian masalah matematis atau masalah sehari-hari dengan cara menerapkan dan mengadaptasi berbagai strategi yang efektif. Proses ini juga mencakup konstruksi dan rekonstruksi pemahaman matematika melalui pemecahan masalah.",
              "learningOutcomes": []
            },
            {
              "elementName": "Komunikasi",
              "elementDescription": "Komunikasi matematis terkait dengan pembentukan alur pemahaman materi pembelajaran matematika melalui cara mengomunikasikan pemikiran matematis menggunakan bahasa matematis yang tepat. Komunikasi matematis juga mencakup proses menganalisis dan mengevaluasi pemikiran matematis orang lain.",
              "learningOutcomes": []
            },
            {
              "elementName": "Representasi Matematis",
              "elementDescription": "Representasi matematis terkait dengan proses membuat dan menggunakan simbol, tabel, diagram, atau bentuk lain untuk mengomunikasikan gagasan dan pemodelan matematika. Proses ini juga mencakup fleksibilitas dalam mengubah dari satu bentuk representasi ke bentuk representasi lainnya, dan memilih representasi yang paling sesuai untuk memecahkan masalah.",
              "learningOutcomes": []
            },
            {
              "elementName": "Koneksi Matematis",
              "elementDescription": "Koneksi matematis terkait dengan proses mengaitkan antara materi pembelajaran matematika pada suatu bidang kajian, lintas bidang kajian, lintas bidang ilmu, dan dengan kehidupan.",
              "learningOutcomes": []
            }
          ]
        },
        {
          "phase": "C",
          "grades": [
            "Kelas 5",
            "Kelas 6"
          ],
          "elements": [
            {
              "elementName": "Bilangan",
              "elementDescription": "Bidang kajian Bilangan membahas tentang angka sebagai simbol bilangan, konsep bilangan, operasi hitung bilangan, dan relasi antara berbagai operasi hitung bilangan dalam sub-elemen representasi visual, sifat urutan, dan operasi.",
              "learningOutcomes": [
                {
                  "code": "3.1",
                  "title": "Bilangan",
                  "text": "Menunjukkan pemahaman dan intuisi bilangan (number sense) pada bilangan cacah sampai 1.000.000; membaca, menulis, menentukan nilai tempat, membandingkan, mengurutkan, melakukan komposisi dan dekomposisi bilangan; menyelesaikan masalah yang berkaitan dengan uang; melakukan operasi penjumlahan, pengurangan, perkalian, dan pembagian bilangan cacah sampai 100.000; serta menyelesaikan masalah yang berkaitan dengan KPK dan FPB. Murid dapat membandingkan dan mengurutkan berbagai pecahan termasuk pecahan campuran, melakukan operasi penjumlahan dan pengurangan pecahan, serta melakukan operasi perkalian dan pembagian pecahan dengan bilangan asli; mengubah pecahan menjadi berbagai bentuk pecahan lain, serta membandingkan dan mengurutkan bilangan desimal (satu angka di belakang koma).",
                  "sourcePage": 40
                }
              ]
            },
            {
              "elementName": "Aljabar",
              "elementDescription": "Bidang kajian Aljabar membahas tentang aljabar non-formal dalam bentuk simbol gambar sampai dengan aljabar formal dalam bentuk simbol huruf yang mewakili bilangan tertentu dalam sub-elemen persamaan dan pertidaksamaan, relasi dan pola bilangan, serta rasio dan proporsi.",
              "learningOutcomes": [
                {
                  "code": "3.2",
                  "title": "Aljabar",
                  "text": "Menemukan nilai yang belum diketahui dalam kalimat matematika yang melibatkan penjumlahan, pengurangan, perkalian, dan pembagian pada bilangan cacah sampai 1000 dengan menggunakan sifat-sifat bilangan dan operasinya. Murid dapat mengidentifikasi, meniru, dan mengembangkan pola bilangan membesar dan mengecil yang melibatkan perkalian dan pembagian; bernalar secara proporsional untuk menyelesaikan masalah sehari-hari dengan rasio satuan; menggunakan operasi perkalian dan pembagian dalam menyelesaikan masalah sehari-hari yang terkait dengan proporsi.",
                  "sourcePage": 41
                }
              ]
            },
            {
              "elementName": "Pengukuran",
              "elementDescription": "Bidang kajian Pengukuran membahas tentang besaran-besaran pengukuran, cara mengukur besaran tertentu, dan membuktikan prinsip atau teorema terkait besaran tertentu dalam sub-elemen pengukuran besaran geometris dan non-geometris.",
              "learningOutcomes": [
                {
                  "code": "3.3",
                  "title": "Pengukuran",
                  "text": "Menentukan keliling dan luas berbagai bentuk bangun datar (segitiga, segiempat, dan segi banyak) serta gabungannya; menghitung durasi waktu dan mengukur besar sudut pada bangun datar atau yang dibentuk dari dua garis berpotongan.",
                  "sourcePage": 41
                }
              ]
            },
            {
              "elementName": "Geometri",
              "elementDescription": "Bidang kajian Geometri membahas tentang berbagai bentuk bangun datar dan bangun ruang serta ciri-cirinya dalam sub-elemen geometri datar dan geometri ruang.",
              "learningOutcomes": [
                {
                  "code": "3.4",
                  "title": "Geometri",
                  "text": "Mengkonstruksi dan mengurai bangun ruang (kubus, balok, dan gabungannya) dan mengenali visualisasi spasial (bagian depan, atas, dan samping); membandingkan karakteristik antar bangun datar dan antar bangun ruang; serta menentukan lokasi pada peta yang menggunakan sistem berpetak.",
                  "sourcePage": 41
                }
              ]
            },
            {
              "elementName": "Analisis Data dan Peluang",
              "elementDescription": "Bidang kajian Analisis Data dan Peluang membahas tentang pengertian data, jenis-jenis data, pengolahan data dalam berbagai bentuk representasi, dan analisis data kuantitatif terkait pemusatan dan penyebaran data serta peluang munculnya suatu data atau kejadian tertentu dalam sub-elemen data dan representasinya, serta ketidakpastian dan peluang.",
              "learningOutcomes": [
                {
                  "code": "3.5",
                  "title": "Analisis Data dan Peluang",
                  "text": "Mengurutkan, membandingkan, menyajikan, dan menganalisis data banyak benda dan data hasil pengukuran dalam bentuk gambar, piktogram, diagram batang, dan tabel frekuensi untuk mendapatkan informasi; menentukan kejadian dengan kemungkinan yang lebih besar atau lebih kecil dalam suatu percobaan acak.",
                  "sourcePage": 42
                }
              ]
            },
            {
              "elementName": "Penalaran dan Pembuktian Matematis",
              "elementDescription": "Penalaran terkait dengan proses penggunaan pola hubungan dalam menganalisis situasi untuk menyusun serta menyelidiki praduga. Pembuktian matematis terkait proses membuktikan kebenaran suatu prinsip, rumus, atau teorema tertentu.",
              "learningOutcomes": []
            },
            {
              "elementName": "Pemecahan Masalah Matematis",
              "elementDescription": "Pemecahan masalah matematis terkait dengan proses penyelesaian masalah matematis atau masalah sehari-hari dengan cara menerapkan dan mengadaptasi berbagai strategi yang efektif. Proses ini juga mencakup konstruksi dan rekonstruksi pemahaman matematika melalui pemecahan masalah.",
              "learningOutcomes": []
            },
            {
              "elementName": "Komunikasi",
              "elementDescription": "Komunikasi matematis terkait dengan pembentukan alur pemahaman materi pembelajaran matematika melalui cara mengomunikasikan pemikiran matematis menggunakan bahasa matematis yang tepat. Komunikasi matematis juga mencakup proses menganalisis dan mengevaluasi pemikiran matematis orang lain.",
              "learningOutcomes": []
            },
            {
              "elementName": "Representasi Matematis",
              "elementDescription": "Representasi matematis terkait dengan proses membuat dan menggunakan simbol, tabel, diagram, atau bentuk lain untuk mengomunikasikan gagasan dan pemodelan matematika. Proses ini juga mencakup fleksibilitas dalam mengubah dari satu bentuk representasi ke bentuk representasi lainnya, dan memilih representasi yang paling sesuai untuk memecahkan masalah.",
              "learningOutcomes": []
            },
            {
              "elementName": "Koneksi Matematis",
              "elementDescription": "Koneksi matematis terkait dengan proses mengaitkan antara materi pembelajaran matematika pada suatu bidang kajian, lintas bidang kajian, lintas bidang ilmu, dan dengan kehidupan.",
              "learningOutcomes": []
            }
          ]
        }
      ]
    },
    {
      "subjectName": "IPAS",
      "phases": [
        {
          "phase": "A",
          "grades": [
            "Kelas 1",
            "Kelas 2"
          ],
          "elements": [],
          "status": "Tidak ditetapkan dalam dokumen"
        },
        {
          "phase": "B",
          "grades": [
            "Kelas 3",
            "Kelas 4"
          ],
          "elements": [
            {
              "elementName": "Pemahaman IPAS",
              "elementDescription": "Pemahaman terhadap fakta, konsep, prinsip, hukum, teori, dan model pada materi makhluk hidup dan lingkungannya; zat dan perubahannya; energi dan perubahannya; bumi dan alam semesta; konektivitas antarruang dan waktu; interaksi, komunikasi, dan sosialisasi; institusi sosial; perilaku ekonomi dan kesejahteraan; serta perubahan dan keberlanjutan yang sesuai untuk menjelaskan serta memprediksi suatu fenomena atau fakta dan menerapkannya pada situasi baru.",
              "learningOutcomes": [
                {
                  "code": "1.1",
                  "title": "Pemahaman IPAS",
                  "text": "Menjelaskan bentuk dan fungsi pancaindra; menganalisis siklus hidup makhluk hidup dan upaya pelestariannya; menghasilkan solusi untuk masalah yang berkaitan dengan pelestarian sumber daya alam sebagai upaya mitigasi perubahan iklim; menyimpulkan proses perubahan wujud zat; menjelaskan sumber dan bentuk energi, serta proses perubahan bentuk energi dalam kehidupan sehari-hari; membedakan jenis gaya dan pengaruhnya terhadap arah, gerak, dan bentuk benda; menjelaskan peran, tugas, dan tanggung jawab serta interaksi sosial yang terjadi di sekitar tempat tinggal dan sekolah; mengenali letak kabupaten/kota dan provinsi tempat tinggalnya dengan menggunakan peta konvensional/digital; mengklasifikasikan ragam bentang alam dan keterkaitannya dengan profesi masyarakat, ragam budaya serta upaya untuk melestarikannya; menganalisis sejarah masyarakat di lingkungan tempat tinggal; menjelaskan nilai mata uang dan fungsinya, serta cara mengelola keuangan secara bijak.",
                  "sourcePage": 57
                }
              ]
            },
            {
              "elementName": "Keterampilan Proses",
              "elementDescription": "Keterampilan ilmiah yang digunakan untuk membelajarkan elemen pemahaman IPAS. Keterampilan tersebut mencakup mengamati; mempertanyakan dan memprediksi; merencanakan dan melakukan penyelidikan; memproses, menganalisis data dan informasi; mengevaluasi dan refleksi; serta mengomunikasikan hasil. Keterampilan proses tidak selalu merupakan urutan langkah, melainkan suatu siklus yang dinamis yang dapat disesuaikan berdasarkan perkembangan dan kemampuan murid.",
              "learningOutcomes": [
                {
                  "code": "1.2",
                  "title": "Keterampilan Proses",
                  "text": "Mampu menerapkan keterampilan proses yang meliputi: Mengamati; Murid mengamati fenomena dan peristiwa secara sederhana dan dapat mencatat hasil pengamatannya. Mempertanyakan dan Memprediksi; Secara mandiri, murid mengajukan pertanyaan tentang hal-hal yang ingin diketahui saat melakukan pengamatan dan membuat prediksi berdasarkan pengetahuan yang dimiliki sebelumnya. Merencanakan dan Melakukan Penyelidikan; Dengan panduan pendidik, murid membuat rencana dan melakukan langkah-langkah operasional untuk menjawab pertanyaan yang diajukan. Murid melakukan observasi menggunakan alat bantu pengukuran sederhana. Memproses, Menganalisis Data dan Informasi; Dengan panduan pendidik, murid mengorganisasikan data dalam bentuk turus dan diagram gambar untuk menyajikan dan mengidentifikasi pola. Murid membandingkan antara hasil pengamatan dengan prediksi dan memberikan penjelasan. Mengevaluasi dan Refleksi; Murid melakukan refleksi terhadap penyelidikan yang sudah dilakukan. Mengomunikasikan Hasil; Murid mengomunikasikan hasil penyelidikan secara lisan dan tertulis dalam berbagai media.",
                  "sourcePage": 57
                }
              ]
            }
          ]
        },
        {
          "phase": "C",
          "grades": [
            "Kelas 5",
            "Kelas 6"
          ],
          "elements": [
            {
              "elementName": "Pemahaman IPAS",
              "elementDescription": "Pemahaman terhadap fakta, konsep, prinsip, hukum, teori, dan model pada materi makhluk hidup dan lingkungannya; zat dan perubahannya; energi dan perubahannya; bumi dan alam semesta; konektivitas antarruang dan waktu; interaksi, komunikasi, dan sosialisasi; institusi sosial; perilaku ekonomi dan kesejahteraan; serta perubahan dan keberlanjutan yang sesuai untuk menjelaskan serta memprediksi suatu fenomena atau fakta dan menerapkannya pada situasi baru.",
              "learningOutcomes": [
                {
                  "code": "2.1",
                  "title": "Pemahaman IPAS",
                  "text": "Merefleksikan sistem organ tubuh manusia yang dikaitkan dengan cara menjaga kesehatan tubuhnya; menganalisis hubungan antar komponen biotik dan abiotik, serta pengaruhnya terhadap ekosistem; menjelaskan fenomena gelombang bunyi dan cahaya dalam kehidupan sehari-hari; menghasilkan upaya penghematan energi, serta pemanfaatan sumber energi alternatif dari sumber daya yang ada di sekitarnya sebagai upaya mitigasi perubahan iklim; menjelaskan sistem tata surya, serta kaitannya dengan rotasi dan revolusi bumi; menjelaskan letak dan kondisi geografis negara Indonesia dengan menggunakan peta konvensional/digital; meninjau sejarah perjuangan para pahlawan di lingkungan sekitar tempat tinggalnya; menemukan keragaman budaya nasional dalam konteks kebhinekaan berdasarkan pemahaman terhadap nilai-nilai kearifan lokal yang berlaku di wilayah tempat tinggal; serta menerapkan kegiatan ekonomi masyarakat di lingkungan sekitar.",
                  "sourcePage": 58
                }
              ]
            },
            {
              "elementName": "Keterampilan Proses",
              "elementDescription": "Keterampilan ilmiah yang digunakan untuk membelajarkan elemen pemahaman IPAS. Keterampilan tersebut mencakup mengamati; mempertanyakan dan memprediksi; merencanakan dan melakukan penyelidikan; memproses, menganalisis data dan informasi; mengevaluasi dan refleksi; serta mengomunikasikan hasil. Keterampilan proses tidak selalu merupakan urutan langkah, melainkan suatu siklus yang dinamis yang dapat disesuaikan berdasarkan perkembangan dan kemampuan murid.",
              "learningOutcomes": [
                {
                  "code": "2.2",
                  "title": "Keterampilan Proses",
                  "text": "Mampu menerapkan keterampilan proses yang meliputi: Mengamati; Murid mengamati fenomena dan peristiwa secara sederhana, mencatat hasil pengamatannya, serta mencari persamaan dan perbedaannya. Mempertanyakan dan Memprediksi; Dengan panduan pendidik, murid mengidentifikasi pertanyaan yang dapat diselidiki secara ilmiah dan membuat prediksinya. Merencanakan dan Melakukan Penyelidikan; Secara mandiri, murid merencanakan dan melakukan langkah-langkah operasional untuk menjawab pertanyaan yang diajukan. Murid melakukan observasi menggunakan alat bantu pengukuran sederhana. Memproses serta Menganalisis Data dan Informasi; Murid mengolah data dalam bentuk tabel dan grafik, serta menjelaskan hasil pengamatan dan pola atau hubungan pada data. Murid membandingkan data dengan prediksi dan memberikan alasan berdasarkan bukti. Mengevaluasi dan Refleksi; Melakukan refleksi dan memberikan saran perbaikan terhadap penyelidikan yang sudah dilakukan. Mengomunikasikan Hasil; Murid mengomunikasikan hasil penyelidikan secara utuh yang ditunjang dengan argumen dalam berbagai media.",
                  "sourcePage": 59
                }
              ]
            }
          ]
        }
      ]
    },
    {
      "subjectName": "Pendidikan Jasmani, Olahraga, dan Kesehatan",
      "phases": [
        {
          "phase": "A",
          "grades": [
            "Kelas 1",
            "Kelas 2"
          ],
          "elements": [
            {
              "elementName": "Terampil Bergerak",
              "elementDescription": "Elemen ini merujuk pada pembelajaran yang membantu mengembangkan kompetensi keterampilan gerak (fundamental dan spesifik) yang esensial untuk dapat terlibat dalam aktivitas jasmani dan gaya hidup sehat. Murid juga menerapkan konsep dan strategi gerak untuk meningkatkan penampilan dan kompetensi gerak serta kepercayaan diri. Konten dan aktivitas pembelajaran ini beragam jenis sesuai dengan minat murid, kebutuhan dan konteks di mana mereka tinggal. Beberapa contohnya termasuk permainan tradisional, olahraga individu maupun tim, bela diri, permainan kooperatif, latihan kebugaran, aktivitas luar ruang dan kepetualangan. Terampil bergerak bertujuan untuk membangun fondasi dasar keterampilan motorik dan literasi jasmani, memperoleh dan menghaluskan berbagai keterampilan aktivitas jasmani, dan pada akhirnya menjadi mumpuni dalam aktivitas jasmani yang menjadi minat dan kegemaran masing-masing. Pengalaman pembelajaran dalam elemen ini harus memaksimalkan waktu belajar untuk menerapkan dan mempraktikkan gerak.",
              "learningOutcomes": [
                {
                  "code": "1.1",
                  "title": "Terampil Bergerak",
                  "text": "Mempraktikkan keterampilan gerak fundamental dan menerapkannya dalam berbagai situasi gerak yang berbeda; mengeksplorasi berbagai strategi gerak; dan mengeksplorasi berbagai konsep gerak serta menyimpulkan efektivitasnya.",
                  "sourcePage": 134
                }
              ]
            },
            {
              "elementName": "Belajar melalui Gerak",
              "elementDescription": "Area pembelajaran dalam elemen ini memfokuskan pada keterampilan personal dan sosial yang dikembangkan melalui partisipasi dalam gerak dan aktivitas jasmani. Keunikan PJOK dalam memfasilitasi keterampilan ini adalah melalui pembelajaran yang menekankan fair play dan kerja tim dengan pendekatan eksperiensial. Potensi yang dapat dicapai adalah keterampilan komunikasi, kerjasama, pengambilan keputusan, pemecahan masalah, berpikir kritis dan kreatif, kolaborasi, dan kepemimpinan. Aktivitasnya meliputi pembelajaran secara mandiri maupun berkelompok untuk menampilkan gerak atau memecahkan masalah gerak. Pengalaman belajar murid juga dapat dikembangkan melalui pembelajaran pengambilan berbagai peran dalam konteks olahraga dan aktivitas jasmani.",
              "learningOutcomes": [
                {
                  "code": "1.2",
                  "title": "Belajar Melalui Gerak",
                  "text": "Menaati peraturan untuk menumbuhkan fair play di dalam berbagai aktivitas jasmani; menerapkan strategi kolaborasi ketika berpartisipasi dalam aktivitas jasmani.",
                  "sourcePage": 135
                }
              ]
            },
            {
              "elementName": "Bergaya Hidup Aktif",
              "elementDescription": "Elemen ini menitikberatkan pada pembelajaran dalam mengembangkan kapasitas murid untuk merancang, menerapkan, dan mengevaluasi kebugaran mereka sendiri serta kompetensi untuk mempromosi gaya hidup aktif. Tujuannya adalah untuk memfasilitasi pengembangan pengetahuan, keterampilan, dan sikap yang dibutuhkan untuk mengambil keputusan yang tepat tentang pilihan aktivitas jasmani dan memprioritaskan keseluruhan kesehatan dan well-being. Materi dalam elemen ini mencakup manfaat hidup aktif dan partisipasi dalam aktivitas jasmani untuk kebugaran. Murid juga belajar tentang aspek-aspek perilaku yang terkait dengan aktivitas fisik yang teratur dan mengembangkan disposisi yang akan mendorong mereka menjadi individu yang aktif.",
              "learningOutcomes": [
                {
                  "code": "1.3",
                  "title": "Bergaya Hidup Aktif",
                  "text": "Berpartisipasi di dalam berbagai aktivitas jasmani dan mengidentifikasi manfaatnya.",
                  "sourcePage": 135
                }
              ]
            },
            {
              "elementName": "Memilih Hidup yang Menyehatkan",
              "elementDescription": "Elemen ini menekankan pentingnya menentukan pilihan positif yang terkait dengan kesehatan. Kompetensi ini dimungkinkan ketika murid memiliki kapasitas literasi kesehatan, yakni mendapatkan, memahami, dan menerapkan informasi dan layanan kesehatan dalam rangka mempromosikan dan menjaga kesehatan. Area materi yang dapat dicakup dalam elemen ini meliputi nutrisi dan pola makan sehat, kebugaran dan aktivitas fisik, lingkungan dan masyarakat yang sehat, keselamatan dan pencegahan cedera.",
              "learningOutcomes": [
                {
                  "code": "1.4",
                  "title": "Memilih Hidup yang Menyehatkan",
                  "text": "Mengenali gaya hidup aktif dan sehat; mengenali manfaat komponen makanan bergizi seimbang; serta mengenali situasi dan potensi yang berisiko terhadap kesehatan dan keselamatan serta strategi mencari bantuan kepada orang dewasa terpercaya.",
                  "sourcePage": 135
                }
              ]
            }
          ]
        },
        {
          "phase": "B",
          "grades": [
            "Kelas 3",
            "Kelas 4"
          ],
          "elements": [
            {
              "elementName": "Terampil Bergerak",
              "elementDescription": "Elemen ini merujuk pada pembelajaran yang membantu mengembangkan kompetensi keterampilan gerak (fundamental dan spesifik) yang esensial untuk dapat terlibat dalam aktivitas jasmani dan gaya hidup sehat. Murid juga menerapkan konsep dan strategi gerak untuk meningkatkan penampilan dan kompetensi gerak serta kepercayaan diri. Konten dan aktivitas pembelajaran ini beragam jenis sesuai dengan minat murid, kebutuhan dan konteks di mana mereka tinggal. Beberapa contohnya termasuk permainan tradisional, olahraga individu maupun tim, bela diri, permainan kooperatif, latihan kebugaran, aktivitas luar ruang dan kepetualangan. Terampil bergerak bertujuan untuk membangun fondasi dasar keterampilan motorik dan literasi jasmani, memperoleh dan menghaluskan berbagai keterampilan aktivitas jasmani, dan pada akhirnya menjadi mumpuni dalam aktivitas jasmani yang menjadi minat dan kegemaran masing-masing. Pengalaman pembelajaran dalam elemen ini harus memaksimalkan waktu belajar untuk menerapkan dan mempraktikkan gerak.",
              "learningOutcomes": [
                {
                  "code": "2.1",
                  "title": "Terampil Bergerak",
                  "text": "Menghaluskan keterampilan gerak fundamental dan menerapkannya dalam situasi gerak yang baru; menyesuaikan strategi gerak untuk mendapatkan capaian keterampilan gerak; dan memperagakan berbagai konsep gerak yang dapat diterapkan dalam rangkaian gerak.",
                  "sourcePage": 135
                }
              ]
            },
            {
              "elementName": "Belajar melalui Gerak",
              "elementDescription": "Area pembelajaran dalam elemen ini memfokuskan pada keterampilan personal dan sosial yang dikembangkan melalui partisipasi dalam gerak dan aktivitas jasmani. Keunikan PJOK dalam memfasilitasi keterampilan ini adalah melalui pembelajaran yang menekankan fair play dan kerja tim dengan pendekatan eksperiensial. Potensi yang dapat dicapai adalah keterampilan komunikasi, kerjasama, pengambilan keputusan, pemecahan masalah, berpikir kritis dan kreatif, kolaborasi, dan kepemimpinan. Aktivitasnya meliputi pembelajaran secara mandiri maupun berkelompok untuk menampilkan gerak atau memecahkan masalah gerak. Pengalaman belajar murid juga dapat dikembangkan melalui pembelajaran pengambilan berbagai peran dalam konteks olahraga dan aktivitas jasmani.",
              "learningOutcomes": [
                {
                  "code": "2.2",
                  "title": "Belajar Melalui Gerak",
                  "text": "Menerapkan strategi gerak sederhana dan memecahkan masalah gerak; menerapkan peraturan untuk menumbuhkan fair play di dalam berbagai aktivitas jasmani; dan berpartisipasi secara positif dalam kelompok atau tim di dalam berbagai aktivitas jasmani.",
                  "sourcePage": 135
                }
              ]
            },
            {
              "elementName": "Bergaya Hidup Aktif",
              "elementDescription": "Elemen ini menitikberatkan pada pembelajaran dalam mengembangkan kapasitas murid untuk merancang, menerapkan, dan mengevaluasi kebugaran mereka sendiri serta kompetensi untuk mempromosi gaya hidup aktif. Tujuannya adalah untuk memfasilitasi pengembangan pengetahuan, keterampilan, dan sikap yang dibutuhkan untuk mengambil keputusan yang tepat tentang pilihan aktivitas jasmani dan memprioritaskan keseluruhan kesehatan dan well-being. Materi dalam elemen ini mencakup manfaat hidup aktif dan partisipasi dalam aktivitas jasmani untuk kebugaran. Murid juga belajar tentang aspek-aspek perilaku yang terkait dengan aktivitas fisik yang teratur dan mengembangkan disposisi yang akan mendorong mereka menjadi individu yang aktif.",
              "learningOutcomes": [
                {
                  "code": "2.3",
                  "title": "Bergaya Hidup Aktif",
                  "text": "Berpartisipasi di dalam berbagai aktivitas jasmani dan menjelaskan pengaruh aktivitas jasmani yang teratur terhadap kesehatan; mengidentifikasi rekomendasi aktivitas jasmani serta pencegahan perilaku sedenter.",
                  "sourcePage": 136
                }
              ]
            },
            {
              "elementName": "Memilih Hidup yang Menyehatkan",
              "elementDescription": "Elemen ini menekankan pentingnya menentukan pilihan positif yang terkait dengan kesehatan. Kompetensi ini dimungkinkan ketika murid memiliki kapasitas literasi kesehatan, yakni mendapatkan, memahami, dan menerapkan informasi dan layanan kesehatan dalam rangka mempromosikan dan menjaga kesehatan. Area materi yang dapat dicakup dalam elemen ini meliputi nutrisi dan pola makan sehat, kebugaran dan aktivitas fisik, lingkungan dan masyarakat yang sehat, keselamatan dan pencegahan cedera.",
              "learningOutcomes": [
                {
                  "code": "2.4",
                  "title": "Memilih Hidup yang Menyehatkan",
                  "text": "Mengidentifikasi pola makan sehat dan bergizi seimbang sesuai rekomendasi kesehatan untuk menunjang aktivitas sehari-hari; dan mempraktikkan penanganan cedera ringan sesuai pemahaman tentang prinsip pertolongan pertama.",
                  "sourcePage": 136
                }
              ]
            }
          ]
        },
        {
          "phase": "C",
          "grades": [
            "Kelas 5",
            "Kelas 6"
          ],
          "elements": [
            {
              "elementName": "Terampil Bergerak",
              "elementDescription": "Elemen ini merujuk pada pembelajaran yang membantu mengembangkan kompetensi keterampilan gerak (fundamental dan spesifik) yang esensial untuk dapat terlibat dalam aktivitas jasmani dan gaya hidup sehat. Murid juga menerapkan konsep dan strategi gerak untuk meningkatkan penampilan dan kompetensi gerak serta kepercayaan diri. Konten dan aktivitas pembelajaran ini beragam jenis sesuai dengan minat murid, kebutuhan dan konteks di mana mereka tinggal. Beberapa contohnya termasuk permainan tradisional, olahraga individu maupun tim, bela diri, permainan kooperatif, latihan kebugaran, aktivitas luar ruang dan kepetualangan. Terampil bergerak bertujuan untuk membangun fondasi dasar keterampilan motorik dan literasi jasmani, memperoleh dan menghaluskan berbagai keterampilan aktivitas jasmani, dan pada akhirnya menjadi mumpuni dalam aktivitas jasmani yang menjadi minat dan kegemaran masing-masing. Pengalaman pembelajaran dalam elemen ini harus memaksimalkan waktu belajar untuk menerapkan dan mempraktikkan gerak.",
              "learningOutcomes": [
                {
                  "code": "3.1",
                  "title": "Terampil Bergerak",
                  "text": "Menyesuaikan keterampilan gerak melintasi berbagai situasi gerak; mentransfer strategi gerak yang sudah dikuasai ke dalam berbagai situasi gerak yang berbeda; dan menginvestigasi berbagai konsep gerak yang dapat diterapkan untuk meningkatkan capaian keterampilan gerak.",
                  "sourcePage": 136
                }
              ]
            },
            {
              "elementName": "Belajar melalui Gerak",
              "elementDescription": "Area pembelajaran dalam elemen ini memfokuskan pada keterampilan personal dan sosial yang dikembangkan melalui partisipasi dalam gerak dan aktivitas jasmani. Keunikan PJOK dalam memfasilitasi keterampilan ini adalah melalui pembelajaran yang menekankan fair play dan kerja tim dengan pendekatan eksperiensial. Potensi yang dapat dicapai adalah keterampilan komunikasi, kerjasama, pengambilan keputusan, pemecahan masalah, berpikir kritis dan kreatif, kolaborasi, dan kepemimpinan. Aktivitasnya meliputi pembelajaran secara mandiri maupun berkelompok untuk menampilkan gerak atau memecahkan masalah gerak. Pengalaman belajar murid juga dapat dikembangkan melalui pembelajaran pengambilan berbagai peran dalam konteks olahraga dan aktivitas jasmani.",
              "learningOutcomes": [
                {
                  "code": "3.2",
                  "title": "Belajar Melalui Gerak",
                  "text": "Menguji efektivitas penerapan strategi gerak dalam berbagai situasi gerak; merancang peraturan alternatif dan modifikasi permainan untuk mendukung fair play dan partisipasi inklusif; dan menjalankan berbagai peran untuk mencapai keberhasilan kelompok atau tim di dalam berbagai aktivitas jasmani.",
                  "sourcePage": 136
                }
              ]
            },
            {
              "elementName": "Bergaya Hidup Aktif",
              "elementDescription": "Elemen ini menitikberatkan pada pembelajaran dalam mengembangkan kapasitas murid untuk merancang, menerapkan, dan mengevaluasi kebugaran mereka sendiri serta kompetensi untuk mempromosi gaya hidup aktif. Tujuannya adalah untuk memfasilitasi pengembangan pengetahuan, keterampilan, dan sikap yang dibutuhkan untuk mengambil keputusan yang tepat tentang pilihan aktivitas jasmani dan memprioritaskan keseluruhan kesehatan dan well-being. Materi dalam elemen ini mencakup manfaat hidup aktif dan partisipasi dalam aktivitas jasmani untuk kebugaran. Murid juga belajar tentang aspek-aspek perilaku yang terkait dengan aktivitas fisik yang teratur dan mengembangkan disposisi yang akan mendorong mereka menjadi individu yang aktif.",
              "learningOutcomes": [
                {
                  "code": "3.3",
                  "title": "Bergaya Hidup Aktif",
                  "text": "Berpartisipasi dalam aktivitas jasmani dan menjelaskan pengaruh aktivitas jasmani yang teratur terhadap kesehatan; mengidentifikasi rekomendasi aktivitas jasmani serta pencegahan perilaku sedenter.",
                  "sourcePage": 136
                }
              ]
            },
            {
              "elementName": "Memilih Hidup yang Menyehatkan",
              "elementDescription": "Elemen ini menekankan pentingnya menentukan pilihan positif yang terkait dengan kesehatan. Kompetensi ini dimungkinkan ketika murid memiliki kapasitas literasi kesehatan, yakni mendapatkan, memahami, dan menerapkan informasi dan layanan kesehatan dalam rangka mempromosikan dan menjaga kesehatan. Area materi yang dapat dicakup dalam elemen ini meliputi nutrisi dan pola makan sehat, kebugaran dan aktivitas fisik, lingkungan dan masyarakat yang sehat, keselamatan dan pencegahan cedera.",
              "learningOutcomes": [
                {
                  "code": "3.4",
                  "title": "Memilih Hidup yang Menyehatkan",
                  "text": "Mengidentifikasi dan menghubungkan antara gaya hidup, risiko kesehatan, dan aktivitas pencegahannya sesuai rekomendasi otoritas kesehatan; menjelaskan pola makan sehat untuk menunjang aktivitas jasmani berdasarkan informasi kandungan gizi pada makanan; dan mempraktikkan penanganan cedera sedang sesuai pemahaman tentang prinsip pertolongan pertama.",
                  "sourcePage": 137
                }
              ]
            }
          ]
        }
      ]
    },
    {
      "subjectName": "Seni Musik",
      "phases": [
        {
          "phase": "A",
          "grades": [
            "Kelas 1",
            "Kelas 2"
          ],
          "elements": [],
          "status": "Tidak ditetapkan dalam dokumen"
        },
        {
          "phase": "B",
          "grades": [
            "Kelas 3",
            "Kelas 4"
          ],
          "elements": [],
          "status": "Tidak ditetapkan dalam dokumen"
        },
        {
          "phase": "C",
          "grades": [
            "Kelas 5",
            "Kelas 6"
          ],
          "elements": [],
          "status": "Tidak ditetapkan dalam dokumen"
        }
      ]
    },
    {
      "subjectName": "Seni Rupa",
      "phases": [
        {
          "phase": "A",
          "grades": [
            "Kelas 1",
            "Kelas 2"
          ],
          "elements": [
            {
              "elementName": "Mengalami (Experiencing)",
              "elementDescription": "Mengidentifikasi, mendefinisikan, dan mendeskripsikan unsur rupa, prinsip desain, dan/atau gaya seni rupa pada objek visual di kehidupan sehari-hari.",
              "learningOutcomes": [
                {
                  "code": "1.1",
                  "title": "Mengalami (Experiencing)",
                  "text": "Mengenali dan menyebutkan unsur-unsur rupa dalam benda-benda di sekitar/karya seni rupa.",
                  "sourcePage": 70
                }
              ]
            },
            {
              "elementName": "Merefleksikan (Reflecting)",
              "elementDescription": "Menceritakan, mendiskusikan, memberi dan menerima umpan balik secara kritis mengenai suatu karya dan penciptaan karya seni rupa secara runtut dan terperinci dengan menggunakan kosa kata yang tepat.",
              "learningOutcomes": [
                {
                  "code": "1.2",
                  "title": "Merefleksikan (Reflecting)",
                  "text": "Merefleksikan dan mengapresiasi karya diri sendiri.",
                  "sourcePage": 71
                }
              ]
            },
            {
              "elementName": "Berpikir dan Bekerja Artistik (Thinking and Working Artistically)",
              "elementDescription": "Membuat konsep dan rencana untuk menciptakan karya seni rupa. Menganalisis karakteristik alat dan bahan yang sesuai dan tersedia di lingkungan sekitar untuk keperluannya berkarya.",
              "learningOutcomes": [
                {
                  "code": "1.3",
                  "title": "Berpikir dan Bekerja Artistik (Thinking and Working Artistically)",
                  "text": "Mengenali dan menguji coba alat dan/atau bahan yang dimiliki.",
                  "sourcePage": 71
                }
              ]
            },
            {
              "elementName": "Menciptakan (Making/Creating)",
              "elementDescription": "Mengaplikasikan unsur rupa, prinsip desain, teknik dan/atau gaya seni rupa yang telah dipelajari untuk menghasilkan karya seni rupa berdasarkan gagasannya sendiri atau mengambil inspirasi dari luar dirinya.",
              "learningOutcomes": [
                {
                  "code": "1.4",
                  "title": "Menciptakan (Making/Creating)",
                  "text": "Membuat karya seni rupa berdasarkan pengalaman dan hasil pengamatan terhadap lingkungan sekitar.",
                  "sourcePage": 71
                }
              ]
            },
            {
              "elementName": "Berdampak (Impacting)",
              "elementDescription": "Menghubungkan berbagai peristiwa di lingkungan dan meresponnya dengan sebuah karya seni rupa yang memberi dampak positif.",
              "learningOutcomes": [
                {
                  "code": "1.5",
                  "title": "Berdampak (Impacting)",
                  "text": "Menghasilkan karya seni rupa yang berdampak pada perasaan dirinya.",
                  "sourcePage": 71
                }
              ]
            }
          ]
        },
        {
          "phase": "B",
          "grades": [
            "Kelas 3",
            "Kelas 4"
          ],
          "elements": [
            {
              "elementName": "Mengalami (Experiencing)",
              "elementDescription": "Mengidentifikasi, mendefinisikan, dan mendeskripsikan unsur rupa, prinsip desain, dan/atau gaya seni rupa pada objek visual di kehidupan sehari-hari.",
              "learningOutcomes": [
                {
                  "code": "2.1",
                  "title": "Mengalami (Experiencing)",
                  "text": "Mengidentifikasi unsur rupa dan prinsip desain dalam benda-benda di sekitar/karya seni rupa.",
                  "sourcePage": 71
                }
              ]
            },
            {
              "elementName": "Merefleksikan (Reflecting)",
              "elementDescription": "Menceritakan, mendiskusikan, memberi dan menerima umpan balik secara kritis mengenai suatu karya dan penciptaan karya seni rupa secara runtut dan terperinci dengan menggunakan kosa kata yang tepat.",
              "learningOutcomes": [
                {
                  "code": "2.2",
                  "title": "Merefleksikan (Reflecting)",
                  "text": "Merefleksikan dan mengapresiasi karya diri sendiri dan teman sekelas menggunakan kosa kata seni rupa yang sesuai.",
                  "sourcePage": 71
                }
              ]
            },
            {
              "elementName": "Berpikir dan Bekerja Artistik (Thinking and Working Artistically)",
              "elementDescription": "Membuat konsep dan rencana untuk menciptakan karya seni rupa. Menganalisis karakteristik alat dan bahan yang sesuai dan tersedia di lingkungan sekitar untuk keperluannya berkarya.",
              "learningOutcomes": [
                {
                  "code": "2.3",
                  "title": "Berpikir dan Bekerja Artistik (Thinking and Working Artistically)",
                  "text": "Mengenali dan menguji coba alat dan/atau bahan yang dimiliki serta prosedur penggunaannya.",
                  "sourcePage": 71
                }
              ]
            },
            {
              "elementName": "Menciptakan (Making/Creating)",
              "elementDescription": "Mengaplikasikan unsur rupa, prinsip desain, teknik dan/atau gaya seni rupa yang telah dipelajari untuk menghasilkan karya seni rupa berdasarkan gagasannya sendiri atau mengambil inspirasi dari luar dirinya.",
              "learningOutcomes": [
                {
                  "code": "2.4",
                  "title": "Menciptakan (Making/Creating)",
                  "text": "Membuat karya seni rupa berdasarkan pengalaman dan hasil pengamatan terhadap lingkungan sekitar.",
                  "sourcePage": 71
                }
              ]
            },
            {
              "elementName": "Berdampak (Impacting)",
              "elementDescription": "Menghubungkan berbagai peristiwa di lingkungan dan meresponnya dengan sebuah karya seni rupa yang memberi dampak positif.",
              "learningOutcomes": [
                {
                  "code": "2.5",
                  "title": "Berdampak (Impacting)",
                  "text": "Menghasilkan karya seni rupa yang berdampak pada perasaan atau mewakili harapannya.",
                  "sourcePage": 71
                }
              ]
            }
          ]
        },
        {
          "phase": "C",
          "grades": [
            "Kelas 5",
            "Kelas 6"
          ],
          "elements": [
            {
              "elementName": "Mengalami (Experiencing)",
              "elementDescription": "Mengidentifikasi, mendefinisikan, dan mendeskripsikan unsur rupa, prinsip desain, dan/atau gaya seni rupa pada objek visual di kehidupan sehari-hari.",
              "learningOutcomes": [
                {
                  "code": "3.1",
                  "title": "Mengalami (Experiencing)",
                  "text": "Menjelaskan unsur rupa dan prinsip desain dalam benda-benda di sekitar/karya seni rupa.",
                  "sourcePage": 72
                }
              ]
            },
            {
              "elementName": "Merefleksikan (Reflecting)",
              "elementDescription": "Menceritakan, mendiskusikan, memberi dan menerima umpan balik secara kritis mengenai suatu karya dan penciptaan karya seni rupa secara runtut dan terperinci dengan menggunakan kosa kata yang tepat.",
              "learningOutcomes": [
                {
                  "code": "3.2",
                  "title": "Merefleksikan (Reflecting)",
                  "text": "Merefleksikan dan mengapresiasi karya diri sendiri dan teman sekelas menggunakan kosa kata seni rupa yang sesuai.",
                  "sourcePage": 72
                }
              ]
            },
            {
              "elementName": "Berpikir dan Bekerja Artistik (Thinking and Working Artistically)",
              "elementDescription": "Membuat konsep dan rencana untuk menciptakan karya seni rupa. Menganalisis karakteristik alat dan bahan yang sesuai dan tersedia di lingkungan sekitar untuk keperluannya berkarya.",
              "learningOutcomes": [
                {
                  "code": "3.3",
                  "title": "Berpikir dan Bekerja Artistik (Thinking and Working Artistically)",
                  "text": "Mengenali dan menguji coba variasi teknik penggunaan alat dan/atau bahan.",
                  "sourcePage": 72
                }
              ]
            },
            {
              "elementName": "Menciptakan (Making/Creating)",
              "elementDescription": "Mengaplikasikan unsur rupa, prinsip desain, teknik dan/atau gaya seni rupa yang telah dipelajari untuk menghasilkan karya seni rupa berdasarkan gagasannya sendiri atau mengambil inspirasi dari luar dirinya.",
              "learningOutcomes": [
                {
                  "code": "3.4",
                  "title": "Menciptakan (Making/Creating)",
                  "text": "Membuat karya seni rupa berdasarkan pengalaman dan/atau hasil pengamatan terhadap lingkungan sekitar melalui pengembangan imajinasi.",
                  "sourcePage": 72
                }
              ]
            },
            {
              "elementName": "Berdampak (Impacting)",
              "elementDescription": "Menghubungkan berbagai peristiwa di lingkungan dan meresponnya dengan sebuah karya seni rupa yang memberi dampak positif.",
              "learningOutcomes": [
                {
                  "code": "3.5",
                  "title": "Berdampak (Impacting)",
                  "text": "Menghasilkan karya seni rupa yang mewakili minatnya.",
                  "sourcePage": 72
                }
              ]
            }
          ]
        }
      ]
    },
    {
      "subjectName": "Seni Tari",
      "phases": [
        {
          "phase": "A",
          "grades": [
            "Kelas 1",
            "Kelas 2"
          ],
          "elements": [
            {
              "elementName": "Mengalami (Experiencing)",
              "elementDescription": "Proses keterlibatan diri secara fisik, emosional, dan sensorik dalam gerak dan ekspresi tubuh. Memahami seni pertunjukan tari dari berbagai sumber pertunjukan langsung, koreografi, dan rekaman dalam aktivitas mengenal, mengamati, menginterpretasi dan mengelaborasi berbagai pertunjukan tari dalam konteks sejarah dan budaya. Mengembangkan kepercayaan diri melalui gerak koordinasi tubuh, keseimbangan, dan kekuatan, serta keluwesan.",
              "learningOutcomes": [
                {
                  "code": "1.1",
                  "title": "Mengalami (Experiencing)",
                  "text": "Mengenal bentuk tari sebagai media komunikasi serta mengembangkan kesadaran diri dalam bereksplorasi unsur utama tari meliputi gerak, ruang, tenaga, waktu, gerak di tempat dan gerak berpindah.",
                  "sourcePage": 80
                }
              ]
            },
            {
              "elementName": "Merefleksikan (Reflecting)",
              "elementDescription": "Proses merenungkan pengalaman menari dan memahami makna dari setiap gerak yang dilakukan sehingga mengembangkan kesadaran tentang proses kreatif, estetika gerak, serta nilai budaya dan emosional dari tari. Hal ini dilakukan dengan tahapanan mengidentifikasi, mengelompokkan, membandingkan dan mengevaluasi unsur utama tari, gerak di tempat, dan berpindah, level, perubahan arah, desain lantai, unsur pendukung tari, makna, simbol dan nilai estetis tari tradisi dan kreasi. Menilai kekuatan dan kelemahan untuk mendukung dan mengembangkan kemampuan diri atau pribadinya.",
              "learningOutcomes": [
                {
                  "code": "1.2",
                  "title": "Merefleksikan (Reflecting)",
                  "text": "Mengidentifikasi unsur utama tari meliputi gerak, ruang, tenaga, waktu, gerak di tempat dan gerak berpindah, serta mengemukakan pencapaian diri secara lisan, tulisan, dan kinestetik.",
                  "sourcePage": 80
                }
              ]
            },
            {
              "elementName": "Berpikir dan Bekerja Artistik (Thinking and Working Artistically)",
              "elementDescription": "Proses pengembangan ide, interpretasi gerak, eksplorasi konsep, serta pemecahan masalah artistik. Dilakukan melalui tahapan meragakan, merancang, serta menunjukkan ide tari, baik secara individual maupun kelompok yang diperoleh dari hasil apresiasi. Mengembangkan ide dengan memperhatikan unsur utama dan unsur pendukung tari seperti musik, properti, tata rias, tata busana, panggung, dan juga merancang manajemen pertunjukannya.",
              "learningOutcomes": [
                {
                  "code": "1.3",
                  "title": "Berpikir dan Bekerja Artistik (Thinking and Working Artistically)",
                  "text": "Meragakan hasil gerak berdasarkan etika sebagai penampil dan penonton dengan keyakinan dan percaya diri saat mengekspresikan ide, perasaan kepada penonton atau lingkungan sekitar.",
                  "sourcePage": 80
                }
              ]
            },
            {
              "elementName": "Menciptakan (Creating)",
              "elementDescription": "Menekankan pada proses penciptaan karya tari, baik secara individu maupun kelompok. Ini merupakan bentuk ekspresi diri, penciptaan estetika, dan penyusunan narasi gerak yang autentik. Dilakukan melalui tahapan meniru, mengembangkan, merangkai, membuat, menata dan mengomposisikan dengan menerapkan prinsip dan prosedur penciptaan tari untuk memotivasi kreativitas dalam bentuk gerak tari yang inovatif. Menunjukkan kreativitas dalam mengekspresikan diri melalui gerak yang diciptakan berdasarkan gagasan sendiri atau kelompok.",
              "learningOutcomes": [
                {
                  "code": "1.4",
                  "title": "Menciptakan (Creating)",
                  "text": "Mengembangkan unsur utama tari (gerak, ruang, waktu, dan tenaga), gerak di tempat, dan gerak berpindah untuk membuat gerak sederhana yang memiliki kesatuan gerak yang indah.",
                  "sourcePage": 81
                }
              ]
            },
            {
              "elementName": "Berdampak (Impacting)",
              "elementDescription": "Proses merespons dirinya dan lingkungan sekitar untuk menerima, menanggapi, menghargai, dan mengaktualisasi diri dalam berkarya yang dikomunikasikan dalam bentuk karya tari sehingga dapat memengaruhi diri sendiri dan orang lain serta lingkungan sekitar. Memilah, memilih, menganalisa, dan menghasilkan karya tari untuk mengembangkan kepribadian dalam membentuk karakter bagi diri sendiri, sesama, lingkungan sekitar dan bangsa.",
              "learningOutcomes": [
                {
                  "code": "1.5",
                  "title": "Berdampak (Impacting)",
                  "text": "Menerima proses pembelajaran sehingga tumbuh rasa ingin tahu dan dapat menunjukkan antusiasme yang berdampak pada kemampuan diri dalam menyelesaikan aktivitas pembelajaran tari.",
                  "sourcePage": 81
                }
              ]
            }
          ]
        },
        {
          "phase": "B",
          "grades": [
            "Kelas 3",
            "Kelas 4"
          ],
          "elements": [
            {
              "elementName": "Mengalami (Experiencing)",
              "elementDescription": "Proses keterlibatan diri secara fisik, emosional, dan sensorik dalam gerak dan ekspresi tubuh. Memahami seni pertunjukan tari dari berbagai sumber pertunjukan langsung, koreografi, dan rekaman dalam aktivitas mengenal, mengamati, menginterpretasi dan mengelaborasi berbagai pertunjukan tari dalam konteks sejarah dan budaya. Mengembangkan kepercayaan diri melalui gerak koordinasi tubuh, keseimbangan, dan kekuatan, serta keluwesan.",
              "learningOutcomes": [
                {
                  "code": "2.1",
                  "title": "Mengalami (Experiencing)",
                  "text": "Mengamati bentuk penyajian tari berdasarkan latar belakang serta mengeksplorasi unsur utama tari sesuai level gerak, dan perubahan arah hadap.",
                  "sourcePage": 81
                }
              ]
            },
            {
              "elementName": "Merefleksikan (Reflecting)",
              "elementDescription": "Proses merenungkan pengalaman menari dan memahami makna dari setiap gerak yang dilakukan sehingga mengembangkan kesadaran tentang proses kreatif, estetika gerak, serta nilai budaya dan emosional dari tari. Hal ini dilakukan dengan tahapanan mengidentifikasi, mengelompokkan, membandingkan dan mengevaluasi unsur utama tari, gerak di tempat, dan berpindah, level, perubahan arah, desain lantai, unsur pendukung tari, makna, simbol dan nilai estetis tari tradisi dan kreasi. Menilai kekuatan dan kelemahan untuk mendukung dan mengembangkan kemampuan diri atau pribadinya.",
              "learningOutcomes": [
                {
                  "code": "2.2",
                  "title": "Merefleksikan (Reflecting)",
                  "text": "Mengidentifikasi unsur utama tari sesuai level gerak, dan perubahan arah hadap, serta menilai pencapaian diri saat melakukan aktivitas pembelajaran tari.",
                  "sourcePage": 81
                }
              ]
            },
            {
              "elementName": "Berpikir dan Bekerja Artistik (Thinking and Working Artistically)",
              "elementDescription": "Proses pengembangan ide, interpretasi gerak, eksplorasi konsep, serta pemecahan masalah artistik. Dilakukan melalui tahapan meragakan, merancang, serta menunjukkan ide tari, baik secara individual maupun kelompok yang diperoleh dari hasil apresiasi. Mengembangkan ide dengan memperhatikan unsur utama dan unsur pendukung tari seperti musik, properti, tata rias, tata busana, panggung, dan juga merancang manajemen pertunjukannya.",
              "learningOutcomes": [
                {
                  "code": "2.3",
                  "title": "Berpikir dan Bekerja Artistik (Thinking and Working Artistically)",
                  "text": "Meragakan hasil tari dengan bekerja secara kooperatif untuk mengembangkan kemampuan bekerja sama dan saling menghargai demi tercapainya tujuan bersama.",
                  "sourcePage": 81
                }
              ]
            },
            {
              "elementName": "Menciptakan (Creating)",
              "elementDescription": "Menekankan pada proses penciptaan karya tari, baik secara individu maupun kelompok. Ini merupakan bentuk ekspresi diri, penciptaan estetika, dan penyusunan narasi gerak yang autentik. Dilakukan melalui tahapan meniru, mengembangkan, merangkai, membuat, menata dan mengomposisikan dengan menerapkan prinsip dan prosedur penciptaan tari untuk memotivasi kreativitas dalam bentuk gerak tari yang inovatif. Menunjukkan kreativitas dalam mengekspresikan diri melalui gerak yang diciptakan berdasarkan gagasan sendiri atau kelompok.",
              "learningOutcomes": [
                {
                  "code": "2.4",
                  "title": "Menciptakan (Creating)",
                  "text": "Mengembangkan gerak dengan unsur utama tari, level, dan perubahan arah hadap.",
                  "sourcePage": 81
                }
              ]
            },
            {
              "elementName": "Berdampak (Impacting)",
              "elementDescription": "Proses merespons dirinya dan lingkungan sekitar untuk menerima, menanggapi, menghargai, dan mengaktualisasi diri dalam berkarya yang dikomunikasikan dalam bentuk karya tari sehingga dapat memengaruhi diri sendiri dan orang lain serta lingkungan sekitar. Memilah, memilih, menganalisa, dan menghasilkan karya tari untuk mengembangkan kepribadian dalam membentuk karakter bagi diri sendiri, sesama, lingkungan sekitar dan bangsa.",
              "learningOutcomes": [
                {
                  "code": "2.5",
                  "title": "Berdampak (Impacting)",
                  "text": "Menerima proses pembelajaran sehingga tumbuh rasa ingin tahu dan dapat menunjukkan usaha yang berdampak pada kemampuan diri dalam menyelesaikan aktivitas pembelajaran tari.",
                  "sourcePage": 81
                }
              ]
            }
          ]
        },
        {
          "phase": "C",
          "grades": [
            "Kelas 5",
            "Kelas 6"
          ],
          "elements": [
            {
              "elementName": "Mengalami (Experiencing)",
              "elementDescription": "Proses keterlibatan diri secara fisik, emosional, dan sensorik dalam gerak dan ekspresi tubuh. Memahami seni pertunjukan tari dari berbagai sumber pertunjukan langsung, koreografi, dan rekaman dalam aktivitas mengenal, mengamati, menginterpretasi dan mengelaborasi berbagai pertunjukan tari dalam konteks sejarah dan budaya. Mengembangkan kepercayaan diri melalui gerak koordinasi tubuh, keseimbangan, dan kekuatan, serta keluwesan.",
              "learningOutcomes": [
                {
                  "code": "3.1",
                  "title": "Mengalami (Experiencing)",
                  "text": "Mengamati berbagai bentuk tari tradisi yang dapat digunakan untuk mengekspresikan diri melalui unsur pendukung tari.",
                  "sourcePage": 82
                }
              ]
            },
            {
              "elementName": "Merefleksikan (Reflecting)",
              "elementDescription": "Proses merenungkan pengalaman menari dan memahami makna dari setiap gerak yang dilakukan sehingga mengembangkan kesadaran tentang proses kreatif, estetika gerak, serta nilai budaya dan emosional dari tari. Hal ini dilakukan dengan tahapanan mengidentifikasi, mengelompokkan, membandingkan dan mengevaluasi unsur utama tari, gerak di tempat, dan berpindah, level, perubahan arah, desain lantai, unsur pendukung tari, makna, simbol dan nilai estetis tari tradisi dan kreasi. Menilai kekuatan dan kelemahan untuk mendukung dan mengembangkan kemampuan diri atau pribadinya.",
              "learningOutcomes": [
                {
                  "code": "3.2",
                  "title": "Merefleksikan (Reflecting)",
                  "text": "Mengidentifikasi unsur pendukung tari dalam tari tradisi serta menghargai hasil pencapaian diri dengan mempertimbangkan pendapat orang lain.",
                  "sourcePage": 82
                }
              ]
            },
            {
              "elementName": "Berpikir dan Bekerja Artistik (Thinking and Working Artistically)",
              "elementDescription": "Proses pengembangan ide, interpretasi gerak, eksplorasi konsep, serta pemecahan masalah artistik. Dilakukan melalui tahapan meragakan, merancang, serta menunjukkan ide tari, baik secara individual maupun kelompok yang diperoleh dari hasil apresiasi. Mengembangkan ide dengan memperhatikan unsur utama dan unsur pendukung tari seperti musik, properti, tata rias, tata busana, panggung, dan juga merancang manajemen pertunjukannya.",
              "learningOutcomes": [
                {
                  "code": "3.3",
                  "title": "Berpikir dan Bekerja Artistik (Thinking and Working Artistically)",
                  "text": "Meragakan hasil rangkaian gerak tari menggunakan unsur pendukung tari dengan menunjukan kerja sama dan berperan aktif dalam kelompok.",
                  "sourcePage": 82
                }
              ]
            },
            {
              "elementName": "Menciptakan (Creating)",
              "elementDescription": "Menekankan pada proses penciptaan karya tari, baik secara individu maupun kelompok. Ini merupakan bentuk ekspresi diri, penciptaan estetika, dan penyusunan narasi gerak yang autentik. Dilakukan melalui tahapan meniru, mengembangkan, merangkai, membuat, menata dan mengomposisikan dengan menerapkan prinsip dan prosedur penciptaan tari untuk memotivasi kreativitas dalam bentuk gerak tari yang inovatif. Menunjukkan kreativitas dalam mengekspresikan diri melalui gerak yang diciptakan berdasarkan gagasan sendiri atau kelompok.",
              "learningOutcomes": [
                {
                  "code": "3.4",
                  "title": "Menciptakan (Creating)",
                  "text": "Merangkai gerak tari yang berpijak pada tradisi/kreasi dengan menerapkan desain kelompok.",
                  "sourcePage": 82
                }
              ]
            },
            {
              "elementName": "Berdampak (Impacting)",
              "elementDescription": "Proses merespons dirinya dan lingkungan sekitar untuk menerima, menanggapi, menghargai, dan mengaktualisasi diri dalam berkarya yang dikomunikasikan dalam bentuk karya tari sehingga dapat memengaruhi diri sendiri dan orang lain serta lingkungan sekitar. Memilah, memilih, menganalisa, dan menghasilkan karya tari untuk mengembangkan kepribadian dalam membentuk karakter bagi diri sendiri, sesama, lingkungan sekitar dan bangsa.",
              "learningOutcomes": [
                {
                  "code": "3.5",
                  "title": "Berdampak (Impacting)",
                  "text": "Menanggapi kejadian-kejadian di lingkungan sekitar melalui tari yang disajikan kepada penonton atau masyarakat sekitar.",
                  "sourcePage": 82
                }
              ]
            }
          ]
        }
      ]
    },
    {
      "subjectName": "Seni Teater",
      "phases": [
        {
          "phase": "A",
          "grades": [
            "Kelas 1",
            "Kelas 2"
          ],
          "elements": [
            {
              "elementName": "Mengalami (Experiencing)",
              "elementDescription": "Memahami, mengalami, merasakan, merespons, dan bereksperimen dengan ragam pengetahuan, gaya dan bentuk seni teater. Murid melakukan olah rasa, tubuh, suara, eksplorasi alat, media, atau mengumpulkan informasi melalui observasi dan interaksi dengan seniman untuk memperkaya wawasan dalam berteater.",
              "learningOutcomes": [
                {
                  "code": "1.1",
                  "title": "Mengalami (Experiencing)",
                  "text": "Mengamati, merespons, meniru gerak tubuh dan suara sebagai media untuk mengomunikasikan emosi.",
                  "sourcePage": 88
                }
              ]
            },
            {
              "elementName": "Merefleksikan (Reflection)",
              "elementDescription": "Menggali pengalaman dan ingatan emosi melalui hasil pengamatan, membaca, apresiasi, dan interaksi sosial individu dan kelompok, selama atau sesudah mengalami proses berseni teater. Mengapresiasi, memberikan, dan menerima umpan balik atas karya diri sendiri atau orang lain; mengomunikasikan secara runtut dan terperinci menggunakan kosakata seni teater yang tepat.",
              "learningOutcomes": [
                {
                  "code": "1.2",
                  "title": "Merefleksikan (Reflection)",
                  "text": "Mengenali pengalaman dan emosi selama proses berseni teater serta menceritakan sebuah karya dengan kosakata sehari-hari.",
                  "sourcePage": 88
                }
              ]
            },
            {
              "elementName": "Berpikir dan Bekerja Artistik (Thinking and working artistically)",
              "elementDescription": "Mengelaborasi elemen tata artistik panggung (tata panggung, cahaya, kostum, rias, suara), dan keaktoran (gerak, ekspresi, dan suara); Mengomunikasikan proses penyatuan semua elemen tata artistik tersebut ke dalam wujud karya pertunjukan.",
              "learningOutcomes": [
                {
                  "code": "1.3",
                  "title": "Berpikir dan Bekerja Artistik (Thinking and Working Artistically)",
                  "text": "Mengenal jenis-jenis properti/alat bantu yang dapat mendukung cerita/permainan peran.",
                  "sourcePage": 88
                }
              ]
            },
            {
              "elementName": "Menciptakan (Making/Creating)",
              "elementDescription": "Menggali pengalaman untuk menuangkan, meniru, membuat ulang, mengkreasi, menemukan, dan merangkai ide-ide kreatif tata artistik seni teater untuk kemudian diwujudkan ke sebuah karya pertunjukan; mengekspresikan dirinya melalui penggalian karakter/ tokoh dan menampilkannya dalam wujud sebuah karya pertunjukan.",
              "learningOutcomes": [
                {
                  "code": "1.4",
                  "title": "Menciptakan (Creating)",
                  "text": "Mengeksplorasi beragam peran mengenai tokoh di sekitar atau rekaan, dan memainkan sebuah lakon pertunjukan.",
                  "sourcePage": 88
                }
              ]
            },
            {
              "elementName": "Berdampak (Impacting)",
              "elementDescription": "Memaknai cara berpikir dan perubahan perilaku serta kepribadian, untuk membentuk karakter yang mencerminkan profil lulusan murid bagi diri sendiri, sesama, lingkungan sekitar, dan bangsa.",
              "learningOutcomes": [
                {
                  "code": "1.5",
                  "title": "Berdampak (Impacting)",
                  "text": "Memainkan gerak dan lagu sesuai arahan dari pendidik.",
                  "sourcePage": 88
                }
              ]
            }
          ]
        },
        {
          "phase": "B",
          "grades": [
            "Kelas 3",
            "Kelas 4"
          ],
          "elements": [
            {
              "elementName": "Mengalami (Experiencing)",
              "elementDescription": "Memahami, mengalami, merasakan, merespons, dan bereksperimen dengan ragam pengetahuan, gaya dan bentuk seni teater. Murid melakukan olah rasa, tubuh, suara, eksplorasi alat, media, atau mengumpulkan informasi melalui observasi dan interaksi dengan seniman untuk memperkaya wawasan dalam berteater.",
              "learningOutcomes": [
                {
                  "code": "2.1",
                  "title": "Mengalami (Experiencing)",
                  "text": "Mengenal teknik dasar akting (pemeranan) melalui proses meniru (mimesis), mengenal gerak tubuh, suara/vokal sesuai tokoh/peran atau perilaku objek sekitar.",
                  "sourcePage": 89
                }
              ]
            },
            {
              "elementName": "Merefleksikan (Reflection)",
              "elementDescription": "Menggali pengalaman dan ingatan emosi melalui hasil pengamatan, membaca, apresiasi, dan interaksi sosial individu dan kelompok, selama atau sesudah mengalami proses berseni teater. Mengapresiasi, memberikan, dan menerima umpan balik atas karya diri sendiri atau orang lain; mengomunikasikan secara runtut dan terperinci menggunakan kosakata seni teater yang tepat.",
              "learningOutcomes": [
                {
                  "code": "2.2",
                  "title": "Merefleksikan (Reflection)",
                  "text": "Mengenali lingkungan sekitarnya dan pengalaman dalam bermain teater.",
                  "sourcePage": 89
                }
              ]
            },
            {
              "elementName": "Berpikir dan Bekerja Artistik (Thinking and working artistically)",
              "elementDescription": "Mengelaborasi elemen tata artistik panggung (tata panggung, cahaya, kostum, rias, suara), dan keaktoran (gerak, ekspresi, dan suara); Mengomunikasikan proses penyatuan semua elemen tata artistik tersebut ke dalam wujud karya pertunjukan.",
              "learningOutcomes": [
                {
                  "code": "2.3",
                  "title": "Bekerja Secara Artistik (Thinking and Working Artistically)",
                  "text": "Menggunakan properti yang sesuai dengan tokoh yang diperankan.",
                  "sourcePage": 89
                }
              ]
            },
            {
              "elementName": "Menciptakan (Making/Creating)",
              "elementDescription": "Menggali pengalaman untuk menuangkan, meniru, membuat ulang, mengkreasi, menemukan, dan merangkai ide-ide kreatif tata artistik seni teater untuk kemudian diwujudkan ke sebuah karya pertunjukan; mengekspresikan dirinya melalui penggalian karakter/ tokoh dan menampilkannya dalam wujud sebuah karya pertunjukan.",
              "learningOutcomes": [
                {
                  "code": "2.4",
                  "title": "Menciptakan (Creating)",
                  "text": "Mengamati berbagai peran, mengenal tokoh di sekitar, dan memainkan sebuah lakon dalam cerita.",
                  "sourcePage": 89
                }
              ]
            },
            {
              "elementName": "Berdampak (Impacting)",
              "elementDescription": "Memaknai cara berpikir dan perubahan perilaku serta kepribadian, untuk membentuk karakter yang mencerminkan profil lulusan murid bagi diri sendiri, sesama, lingkungan sekitar, dan bangsa.",
              "learningOutcomes": [
                {
                  "code": "2.5",
                  "title": "Berdampak (Impacting)",
                  "text": "Mengenal bentuk lakon dalam bermain teater.",
                  "sourcePage": 89
                }
              ]
            }
          ]
        },
        {
          "phase": "C",
          "grades": [
            "Kelas 5",
            "Kelas 6"
          ],
          "elements": [
            {
              "elementName": "Mengalami (Experiencing)",
              "elementDescription": "Memahami, mengalami, merasakan, merespons, dan bereksperimen dengan ragam pengetahuan, gaya dan bentuk seni teater. Murid melakukan olah rasa, tubuh, suara, eksplorasi alat, media, atau mengumpulkan informasi melalui observasi dan interaksi dengan seniman untuk memperkaya wawasan dalam berteater.",
              "learningOutcomes": [
                {
                  "code": "3.1",
                  "title": "Mengalami (Experiencing)",
                  "text": "Melakukan permainan peran berkelompok, seperti improvisasi untuk melatih aksi dan reaksi dalam mengelaborasi cerita atau tokoh dan melakukan pengenalan karakter melalui pengamatan kebiasaan tokoh yang diperankan.",
                  "sourcePage": 89
                }
              ]
            },
            {
              "elementName": "Merefleksikan (Reflection)",
              "elementDescription": "Menggali pengalaman dan ingatan emosi melalui hasil pengamatan, membaca, apresiasi, dan interaksi sosial individu dan kelompok, selama atau sesudah mengalami proses berseni teater. Mengapresiasi, memberikan, dan menerima umpan balik atas karya diri sendiri atau orang lain; mengomunikasikan secara runtut dan terperinci menggunakan kosakata seni teater yang tepat.",
              "learningOutcomes": [
                {
                  "code": "3.2",
                  "title": "Merefleksikan (Reflection)",
                  "text": "Menceritakan pendapatnya tentang sebuah cerita sederhana (penokohan, perwatakan).",
                  "sourcePage": 89
                }
              ]
            },
            {
              "elementName": "Berpikir dan Bekerja Artistik (Thinking and working artistically)",
              "elementDescription": "Mengelaborasi elemen tata artistik panggung (tata panggung, cahaya, kostum, rias, suara), dan keaktoran (gerak, ekspresi, dan suara); Mengomunikasikan proses penyatuan semua elemen tata artistik tersebut ke dalam wujud karya pertunjukan.",
              "learningOutcomes": [
                {
                  "code": "3.3",
                  "title": "Berpikir dan Bekerja Artistik (Thinking and Working Artistically)",
                  "text": "Mengidentifikasi properti sederhana berdasarkan cerita yang akan dimainkan.",
                  "sourcePage": 89
                }
              ]
            },
            {
              "elementName": "Menciptakan (Making/Creating)",
              "elementDescription": "Menggali pengalaman untuk menuangkan, meniru, membuat ulang, mengkreasi, menemukan, dan merangkai ide-ide kreatif tata artistik seni teater untuk kemudian diwujudkan ke sebuah karya pertunjukan; mengekspresikan dirinya melalui penggalian karakter/ tokoh dan menampilkannya dalam wujud sebuah karya pertunjukan.",
              "learningOutcomes": [
                {
                  "code": "3.4",
                  "title": "Menciptakan (Creating)",
                  "text": "Mengenal dan memainkan ragam peran dari cerita sederhana berdasarkan hasil pengamatan.",
                  "sourcePage": 89
                }
              ]
            },
            {
              "elementName": "Berdampak (Impacting)",
              "elementDescription": "Memaknai cara berpikir dan perubahan perilaku serta kepribadian, untuk membentuk karakter yang mencerminkan profil lulusan murid bagi diri sendiri, sesama, lingkungan sekitar, dan bangsa.",
              "learningOutcomes": [
                {
                  "code": "3.5",
                  "title": "Berdampak (Impacting)",
                  "text": "Memerankan lakon secara individu maupun berkelompok berdasarkan minat, pengamatan, dan pengalaman.",
                  "sourcePage": 90
                }
              ]
            }
          ]
        }
      ]
    },
    {
      "subjectName": "Bahasa Inggris",
      "phases": [
        {
          "phase": "A",
          "grades": [
            "Kelas 1",
            "Kelas 2"
          ],
          "elements": [],
          "status": "Tidak ditetapkan dalam dokumen"
        },
        {
          "phase": "B",
          "grades": [
            "Kelas 3",
            "Kelas 4"
          ],
          "elements": [
            {
              "elementName": "Menyimak-Berbicara (Listening-Speaking)",
              "elementDescription": "Kemampuan menangkap pesan yang disampaikan secara lisan, mengapresiasi lawan bicara, dan kemampuan berinteraksi dengan lancar, spontan, teratur dan tanpa ada hambatan untuk berkomunikasi secara lisan, relevan, dan kontekstual. Kemampuan menyimak memengaruhi komunikasi lisan murid dalam menyampaikan gagasan, pikiran, serta perasaan secara lisan dalam interaksi sosial.",
              "learningOutcomes": [
                {
                  "code": "1.1",
                  "title": "Menyimak - Berbicara (Listening - Speaking)",
                  "text": "Memahami dan merespon teks lisan atau teks multimodal sederhana tentang kehidupan sehari-hari baik secara verbal atau non-verbal sesuai konteks. (understand and respond to simple oral or multimodal texts about everyday life verbally or non-verbally in line with its context)",
                  "sourcePage": 50
                }
              ]
            },
            {
              "elementName": "Membaca-Memirsa (Reading-Viewing)",
              "elementDescription": "Kemampuan menangkap pesan yang disajikan dalam berbagai jenis teks tulis, visual atau multimodal, menggunakan dan merefleksi berbagai jenis teks (genre) sesuai tujuan/fungsi sosialnya sehingga murid dapat berpartisipasi dalam masyarakat melalui pengetahuan dan kemampuan membaca/memirsanya.",
              "learningOutcomes": [
                {
                  "code": "1.2",
                  "title": "Membaca - Memirsa (Reading - Viewing)",
                  "text": "Memahami teks tulis pendek sederhana atau teks multimodal tentang kehidupan sehari-hari dan meresponsnya secara verbal atau non-verbal sesuai konteks. (Understand simple short texts or multimodal texts about everyday life and respond to them verbally or non-verbally in line with its context)",
                  "sourcePage": 51
                }
              ]
            },
            {
              "elementName": "Menulis-Mempresentasikan (Writing-Presenting)",
              "elementDescription": "Kemampuan mengomunikasikan gagasan dan pengalaman, mengekspresikan kreativitas, dan mencipta dalam berbagai jenis teks (genre) dengan efektif, yakni dengan struktur teks dan unsur kebahasaan yang tepat, sehingga teks itu dapat dipahami dengan mudah serta diminati oleh pembaca/pemirsa.",
              "learningOutcomes": [
                {
                  "code": "1.3",
                  "title": "Menulis - Mempresentasikan (Writing - Presenting)",
                  "text": "Mengomunikasikan gagasan tentang topik sehari-hari dalam teks tulis pendek atau teks multimodal sesuai konteks. (Communicate their ideas on everyday life topics in simple written or multimodal texts in line with its context)",
                  "sourcePage": 51
                }
              ]
            }
          ]
        },
        {
          "phase": "C",
          "grades": [
            "Kelas 5",
            "Kelas 6"
          ],
          "elements": [
            {
              "elementName": "Menyimak-Berbicara (Listening-Speaking)",
              "elementDescription": "Kemampuan menangkap pesan yang disampaikan secara lisan, mengapresiasi lawan bicara, dan kemampuan berinteraksi dengan lancar, spontan, teratur dan tanpa ada hambatan untuk berkomunikasi secara lisan, relevan, dan kontekstual. Kemampuan menyimak memengaruhi komunikasi lisan murid dalam menyampaikan gagasan, pikiran, serta perasaan secara lisan dalam interaksi sosial.",
              "learningOutcomes": [
                {
                  "code": "2.1",
                  "title": "Menyimak - Berbicara (Listening - Writing)",
                  "text": "Memahami alur informasi teks secara keseluruhan dan merespon teks lisan atau teks multimodal sederhana tentang topik sehari-hari secara lisan dengan kalimat pendek dan sederhana sesuai konteks. (Understand the entire flow of information and respond to simple oral or multimodal texts about everyday topics using short and simple sentences verbally in line with its context)",
                  "sourcePage": 51
                }
              ]
            },
            {
              "elementName": "Membaca-Memirsa (Reading-Viewing)",
              "elementDescription": "Kemampuan menangkap pesan yang disajikan dalam berbagai jenis teks tulis, visual atau multimodal, menggunakan dan merefleksi berbagai jenis teks (genre) sesuai tujuan/fungsi sosialnya sehingga murid dapat berpartisipasi dalam masyarakat melalui pengetahuan dan kemampuan membaca/memirsanya.",
              "learningOutcomes": [
                {
                  "code": "2.2",
                  "title": "Membaca - Memirsa (Reading - Viewing)",
                  "text": "Memahami alur informasi secara keseluruhan, gagasan utama dan informasi rinci dari beragam teks pendek atau teks multimodal tentang topik sehari-hari dan meresponnya sesuai konteks. (Understand the entire flow of information, main ideas and details from a variety of short texts or multimodal texts about everyday topics and respond in line with its context)",
                  "sourcePage": 51
                }
              ]
            },
            {
              "elementName": "Menulis-Mempresentasikan (Writing-Presenting)",
              "elementDescription": "Kemampuan mengomunikasikan gagasan dan pengalaman, mengekspresikan kreativitas, dan mencipta dalam berbagai jenis teks (genre) dengan efektif, yakni dengan struktur teks dan unsur kebahasaan yang tepat, sehingga teks itu dapat dipahami dengan mudah serta diminati oleh pembaca/pemirsa.",
              "learningOutcomes": [
                {
                  "code": "2.3",
                  "title": "Menulis - Mempresentasikan (Writing - Presenting)",
                  "text": "Mengomunikasikan ide dan pengalamannya melalui berbagai jenis teks tulis sederhana atau teks multimodal tentang topik sehari-hari sesuai konteks. (Communicate their ideas and experiences through various types of simple written texts or multimodal texts about everyday topics in line with its context)",
                  "sourcePage": 52
                }
              ]
            }
          ]
        }
      ]
    },
    {
      "subjectName": "Koding dan Kecerdasan Artifisial",
      "phases": [
        {
          "phase": "A",
          "grades": [
            "Kelas 1",
            "Kelas 2"
          ],
          "elements": [],
          "status": "Tidak ditetapkan dalam dokumen"
        },
        {
          "phase": "B",
          "grades": [
            "Kelas 3",
            "Kelas 4"
          ],
          "elements": [],
          "status": "Tidak ditetapkan dalam dokumen"
        },
        {
          "phase": "C",
          "grades": [
            "Kelas 5",
            "Kelas 6"
          ],
          "elements": [],
          "status": "Tidak ditetapkan dalam dokumen"
        }
      ]
    },
    {
      "subjectName": "Bahasa Arab",
      "subjectType": "Muatan Lokal Sekolah",
      "phases": [
        {
          "phase": "A",
          "grades": [
            "Kelas 1",
            "Kelas 2"
          ],
          "elements": [
            {
              "elementName": "Istima’",
              "elementDescription": "Memahami ungkapan Arab sederhana yang didengar.",
              "learningOutcomes": [
                {
                  "code": "BA-A1",
                  "title": "Istima’",
                  "text": "Memahami salam, sapaan, perkenalan, dan kosakata sederhana."
                }
              ],
              "recommendedMaterials": "Salam; sapaan; perkenalan; angka; benda kelas."
            },
            {
              "elementName": "Kalam",
              "elementDescription": "Menggunakan kosakata dan ungkapan sederhana dalam percakapan.",
              "learningOutcomes": [
                {
                  "code": "BA-A2",
                  "title": "Kalam",
                  "text": "Mengungkapkan identitas diri dan menyebut benda/anggota keluarga."
                }
              ],
              "recommendedMaterials": "Nama diri; keluarga; warna; angka; benda sekitar."
            },
            {
              "elementName": "Qira’ah",
              "elementDescription": "Mengenali dan membaca kosakata Arab sederhana.",
              "learningOutcomes": [
                {
                  "code": "BA-A3",
                  "title": "Qira’ah",
                  "text": "Membaca huruf dan kosakata sederhana dengan bantuan."
                }
              ],
              "recommendedMaterials": "Huruf; kata sederhana; kosakata keluarga dan sekolah."
            },
            {
              "elementName": "Kitabah",
              "elementDescription": "Menyalin dan menulis huruf serta kosakata Arab sederhana.",
              "learningOutcomes": [
                {
                  "code": "BA-A4",
                  "title": "Kitabah",
                  "text": "Menulis huruf dan kosakata Arab sederhana."
                }
              ],
              "recommendedMaterials": "Huruf Arab; kata sederhana; menyalin kosakata."
            }
          ]
        },
        {
          "phase": "B",
          "grades": [
            "Kelas 3",
            "Kelas 4"
          ],
          "elements": [
            {
              "elementName": "Istima’",
              "elementDescription": "Memahami informasi sederhana tentang kehidupan sehari-hari.",
              "learningOutcomes": [
                {
                  "code": "BA-B1",
                  "title": "Istima’",
                  "text": "Memahami informasi pokok dari percakapan pendek."
                }
              ],
              "recommendedMaterials": "Keluarga; sekolah; rumah; aktivitas harian."
            },
            {
              "elementName": "Kalam",
              "elementDescription": "Melakukan hiwar sederhana dengan kosakata yang sesuai.",
              "learningOutcomes": [
                {
                  "code": "BA-B2",
                  "title": "Kalam",
                  "text": "Melakukan percakapan sederhana dengan pola yang dipelajari."
                }
              ],
              "recommendedMaterials": "Hiwar; mufradat; perkenalan; kegiatan harian."
            },
            {
              "elementName": "Qira’ah",
              "elementDescription": "Membaca dan memahami teks pendek berbahasa Arab.",
              "learningOutcomes": [
                {
                  "code": "BA-B3",
                  "title": "Qira’ah",
                  "text": "Menemukan informasi sederhana dari teks pendek."
                }
              ],
              "recommendedMaterials": "Teks pendek; kosakata; kalimat sederhana."
            },
            {
              "elementName": "Kitabah",
              "elementDescription": "Menulis kata dan kalimat sederhana dengan pola yang tepat.",
              "learningOutcomes": [
                {
                  "code": "BA-B4",
                  "title": "Kitabah",
                  "text": "Menyusun kalimat sederhana sesuai konteks."
                }
              ],
              "recommendedMaterials": "Kosakata; kalimat nominal/verbal sederhana."
            }
          ]
        },
        {
          "phase": "C",
          "grades": [
            "Kelas 5",
            "Kelas 6"
          ],
          "elements": [
            {
              "elementName": "Istima’",
              "elementDescription": "Memahami informasi pokok dari teks lisan sederhana.",
              "learningOutcomes": [
                {
                  "code": "BA-C1",
                  "title": "Istima’",
                  "text": "Menangkap informasi utama tentang kehidupan sehari-hari."
                }
              ],
              "recommendedMaterials": "Kehidupan sehari-hari; lingkungan; sekolah."
            },
            {
              "elementName": "Kalam",
              "elementDescription": "Mengomunikasikan informasi sederhana secara lisan.",
              "learningOutcomes": [
                {
                  "code": "BA-C2",
                  "title": "Kalam",
                  "text": "Menyampaikan informasi dan pengalaman sederhana."
                }
              ],
              "recommendedMaterials": "Hiwar; ungkapan sehari-hari; deskripsi sederhana."
            },
            {
              "elementName": "Qira’ah",
              "elementDescription": "Memahami isi teks Arab sederhana tentang topik dekat dengan murid.",
              "learningOutcomes": [
                {
                  "code": "BA-C3",
                  "title": "Qira’ah",
                  "text": "Menentukan informasi pokok dan makna kosakata."
                }
              ],
              "recommendedMaterials": "Teks pendek; ide pokok; kosakata."
            },
            {
              "elementName": "Kitabah",
              "elementDescription": "Menyusun teks pendek sederhana dalam bahasa Arab.",
              "learningOutcomes": [
                {
                  "code": "BA-C4",
                  "title": "Kitabah",
                  "text": "Menulis kalimat dan paragraf pendek sesuai konteks."
                }
              ],
              "recommendedMaterials": "Kalimat; paragraf pendek; deskripsi sederhana."
            }
          ]
        }
      ],
      "sources": [
        "KSP SDIT AL FIKRI TP 2026–2027",
        "ATP Seluruh Mapel Per Fase SDIT AL FIKRI",
        "KMA Nomor 1503 Tahun 2025 sebagai rujukan penguatan kurikulum madrasah Bahasa Arab"
      ]
    },
    {
      "subjectName": "Fiqih",
      "subjectType": "Pengembangan Kurikulum Keagamaan Sekolah",
      "phases": [
        {
          "phase": "A",
          "grades": [
            "Kelas 1",
            "Kelas 2"
          ],
          "elements": [
            {
              "elementName": "Ibadah Dasar",
              "elementDescription": "Memahami dan mempraktikkan dasar ibadah sehari-hari.",
              "learningOutcomes": [
                {
                  "code": "FI-A1",
                  "title": "Ibadah Dasar",
                  "text": "Mengenal rukun Islam, syahadat, bersuci, wudu, dan salat."
                }
              ],
              "recommendedMaterials": "Rukun Islam; syahadat; bersuci; wudu; salat; azan; ikamah."
            },
            {
              "elementName": "Adab Ibadah",
              "elementDescription": "Membiasakan adab sebelum, saat, dan sesudah ibadah.",
              "learningOutcomes": [
                {
                  "code": "FI-A2",
                  "title": "Adab Ibadah",
                  "text": "Menerapkan niat, kebersihan, doa, dan ketertiban dalam ibadah."
                }
              ],
              "recommendedMaterials": "Niat; kebersihan; doa; tertib salat."
            }
          ]
        },
        {
          "phase": "B",
          "grades": [
            "Kelas 3",
            "Kelas 4"
          ],
          "elements": [
            {
              "elementName": "Ibadah",
              "elementDescription": "Memahami ketentuan ibadah yang berkembang pada usia sekolah.",
              "learningOutcomes": [
                {
                  "code": "FI-B1",
                  "title": "Ibadah",
                  "text": "Menjelaskan puasa, salat Jumat, salat sunah, dan balig."
                }
              ],
              "recommendedMaterials": "Puasa; salat Jumat; salat sunah; balig; taklif."
            },
            {
              "elementName": "Praktik Ibadah",
              "elementDescription": "Mempraktikkan ibadah sesuai ketentuan dasar.",
              "learningOutcomes": [
                {
                  "code": "FI-B2",
                  "title": "Praktik Ibadah",
                  "text": "Mempraktikkan ibadah dan adab di masjid."
                }
              ],
              "recommendedMaterials": "Tata cara puasa; salat sunah; adab masjid."
            }
          ]
        },
        {
          "phase": "C",
          "grades": [
            "Kelas 5",
            "Kelas 6"
          ],
          "elements": [
            {
              "elementName": "Muamalah dan Ibadah",
              "elementDescription": "Memahami ketentuan ibadah dan muamalah sederhana.",
              "learningOutcomes": [
                {
                  "code": "FI-C1",
                  "title": "Muamalah dan Ibadah",
                  "text": "Menjelaskan puasa sunah, zakat, infak, sedekah, hadiah, dan halal-haram."
                }
              ],
              "recommendedMaterials": "Puasa sunah; zakat; infak; sedekah; hadiah; halal-haram."
            },
            {
              "elementName": "Praktik Keagamaan",
              "elementDescription": "Menerapkan ketentuan fikih dalam kehidupan sehari-hari.",
              "learningOutcomes": [
                {
                  "code": "FI-C2",
                  "title": "Praktik Keagamaan",
                  "text": "Menerapkan perilaku berbagi dan memilih makanan/minuman halal."
                }
              ],
              "recommendedMaterials": "Makanan halal; kepedulian sosial; berbagi."
            }
          ]
        }
      ],
      "sources": [
        "CP PAI dan Budi Pekerti dalam Keputusan Kepala BSKAP Nomor 046/H/KR/2025",
        "Keputusan Kepala BKPDM Nomor 020 Tahun 2026 untuk pembaruan CP Agama dan Budi Pekerti",
        "KSP SDIT AL FIKRI TP 2026–2027"
      ]
    },
    {
      "subjectName": "Aqidah Akhlak",
      "subjectType": "Pengembangan Kurikulum Keagamaan Sekolah",
      "phases": [
        {
          "phase": "A",
          "grades": [
            "Kelas 1",
            "Kelas 2"
          ],
          "elements": [
            {
              "elementName": "Aqidah",
              "elementDescription": "Memahami dasar keimanan dan mengenal Allah Swt.",
              "learningOutcomes": [
                {
                  "code": "AQ-A1",
                  "title": "Aqidah",
                  "text": "Mengenal rukun iman, Allah Swt., asmaulhusna, dan malaikat."
                }
              ],
              "recommendedMaterials": "Rukun iman; iman kepada Allah; asmaulhusna; malaikat."
            },
            {
              "elementName": "Akhlak",
              "elementDescription": "Membiasakan akhlak baik terhadap Allah dan diri sendiri.",
              "learningOutcomes": [
                {
                  "code": "AQ-A2",
                  "title": "Akhlak",
                  "text": "Menerapkan syukur, jujur, bersih, dan disiplin."
                }
              ],
              "recommendedMaterials": "Syukur; pujian kepada Allah; jujur; bersih; disiplin."
            }
          ]
        },
        {
          "phase": "B",
          "grades": [
            "Kelas 3",
            "Kelas 4"
          ],
          "elements": [
            {
              "elementName": "Aqidah",
              "elementDescription": "Memahami sifat Allah, kitab Allah, dan rasul.",
              "learningOutcomes": [
                {
                  "code": "AQ-B1",
                  "title": "Aqidah",
                  "text": "Mengenal sifat Allah, asmaulhusna, kitab, dan rasul Allah."
                }
              ],
              "recommendedMaterials": "Sifat Allah; asmaulhusna; kitab Allah; rasul Allah."
            },
            {
              "elementName": "Akhlak",
              "elementDescription": "Menerapkan akhlak kepada orang tua, keluarga, dan guru.",
              "learningOutcomes": [
                {
                  "code": "AQ-B2",
                  "title": "Akhlak",
                  "text": "Menunjukkan hormat, taat, santun, dan berbaik sangka."
                }
              ],
              "recommendedMaterials": "Hormat; taat; berbaik sangka; santun."
            }
          ]
        },
        {
          "phase": "C",
          "grades": [
            "Kelas 5",
            "Kelas 6"
          ],
          "elements": [
            {
              "elementName": "Aqidah",
              "elementDescription": "Memahami iman kepada hari akhir serta qada dan qadar.",
              "learningOutcomes": [
                {
                  "code": "AQ-C1",
                  "title": "Aqidah",
                  "text": "Menjelaskan hari akhir, qada, qadar, dan tawakal."
                }
              ],
              "recommendedMaterials": "Hari akhir; qada; qadar; tawakal."
            },
            {
              "elementName": "Akhlak",
              "elementDescription": "Menerapkan akhlak terhadap sesama dan lingkungan.",
              "learningOutcomes": [
                {
                  "code": "AQ-C2",
                  "title": "Akhlak",
                  "text": "Menerapkan akhlak baik kepada teman, tetangga, nonmuslim, hewan, dan tumbuhan."
                }
              ],
              "recommendedMaterials": "Teman; tetangga; nonmuslim; hewan; tumbuhan; tanggung jawab."
            }
          ]
        }
      ],
      "sources": [
        "CP PAI dan Budi Pekerti dalam Keputusan Kepala BSKAP Nomor 046/H/KR/2025",
        "Keputusan Kepala BKPDM Nomor 020 Tahun 2026 untuk pembaruan CP Agama dan Budi Pekerti",
        "KSP SDIT AL FIKRI TP 2026–2027"
      ]
    },
    {
      "subjectName": "Sejarah Kebudayaan Islam",
      "subjectType": "Pengembangan Kurikulum Keagamaan Sekolah",
      "phases": [
        {
          "phase": "A",
          "grades": [
            "Kelas 1",
            "Kelas 2"
          ],
          "elements": [
            {
              "elementName": "Kisah Nabi dan Rasul",
              "elementDescription": "Mengenal kisah teladan nabi dan rasul.",
              "learningOutcomes": [
                {
                  "code": "SKI-A1",
                  "title": "Kisah Nabi dan Rasul",
                  "text": "Menceritakan kisah sederhana dan mengambil teladan."
                }
              ],
              "recommendedMaterials": "Kisah nabi; keteladanan; akhlak."
            }
          ]
        },
        {
          "phase": "B",
          "grades": [
            "Kelas 3",
            "Kelas 4"
          ],
          "elements": [
            {
              "elementName": "Sejarah Nabi Muhammad",
              "elementDescription": "Memahami kehidupan Nabi Muhammad saw. periode Makkah.",
              "learningOutcomes": [
                {
                  "code": "SKI-B1",
                  "title": "Sejarah Nabi Muhammad",
                  "text": "Menceritakan peristiwa penting dan keteladanan Nabi Muhammad saw."
                }
              ],
              "recommendedMaterials": "Kelahiran; masa muda; awal dakwah; Makkah; keteladanan."
            }
          ]
        },
        {
          "phase": "C",
          "grades": [
            "Kelas 5",
            "Kelas 6"
          ],
          "elements": [
            {
              "elementName": "Sejarah Islam",
              "elementDescription": "Memahami dakwah Nabi Muhammad saw. periode Madinah dan khulafaurasyidin.",
              "learningOutcomes": [
                {
                  "code": "SKI-C1",
                  "title": "Sejarah Islam",
                  "text": "Menjelaskan peristiwa penting dan mengambil nilai keteladanan."
                }
              ],
              "recommendedMaterials": "Hijrah; Madinah; Piagam Madinah; Khulafaurasyidin; keteladanan."
            }
          ]
        }
      ],
      "sources": [
        "CP PAI dan Budi Pekerti dalam Keputusan Kepala BSKAP Nomor 046/H/KR/2025",
        "Keputusan Kepala BKPDM Nomor 020 Tahun 2026 untuk pembaruan CP Agama dan Budi Pekerti",
        "KSP SDIT AL FIKRI TP 2026–2027"
      ]
    },
    {
      "subjectName": "Tahfidz Al-Qur’an",
      "subjectType": "Muatan Lokal / Program Unggulan Sekolah",
      "phases": [
        {
          "phase": "A",
          "grades": [
            "Kelas 1",
            "Kelas 2"
          ],
          "elements": [
            {
              "elementName": "Tahsin",
              "elementDescription": "Meningkatkan kesiapan membaca Al-Qur’an sebelum hafalan.",
              "learningOutcomes": [
                {
                  "code": "TH-A1",
                  "title": "Tahsin",
                  "text": "Mengenal huruf, harakat, makhraj, dan membaca ayat pendek."
                }
              ],
              "recommendedMaterials": "Huruf hijaiyah; harakat; makhraj dasar; ayat pendek."
            },
            {
              "elementName": "Tahfidz",
              "elementDescription": "Menghafal ayat/surah secara bertahap sesuai kesiapan.",
              "learningOutcomes": [
                {
                  "code": "TH-A2",
                  "title": "Tahfidz",
                  "text": "Menghafal secara bertahap melalui talqin, tikrar, dan setoran."
                }
              ],
              "recommendedMaterials": "Hafalan bertahap; talqin; tikrar; setoran."
            },
            {
              "elementName": "Murajaah dan Adab",
              "elementDescription": "Menjaga hafalan dan membiasakan adab terhadap Al-Qur’an.",
              "learningOutcomes": [
                {
                  "code": "TH-A3",
                  "title": "Murajaah dan Adab",
                  "text": "Melakukan murajaah rutin dan menjaga adab belajar Al-Qur’an."
                }
              ],
              "recommendedMaterials": "Murajaah; adab; kebersihan; disiplin."
            }
          ]
        },
        {
          "phase": "B",
          "grades": [
            "Kelas 3",
            "Kelas 4"
          ],
          "elements": [
            {
              "elementName": "Tahsin",
              "elementDescription": "Membaca Al-Qur’an lebih lancar dan tartil serta memperkuat tajwid dasar.",
              "learningOutcomes": [
                {
                  "code": "TH-B1",
                  "title": "Tahsin",
                  "text": "Memperbaiki makhraj, kelancaran, dan tajwid dasar."
                }
              ],
              "recommendedMaterials": "Tajwid dasar; makhraj; tartil; kelancaran."
            },
            {
              "elementName": "Tahfidz",
              "elementDescription": "Menambah hafalan sesuai target sekolah dengan ketepatan ayat.",
              "learningOutcomes": [
                {
                  "code": "TH-B2",
                  "title": "Tahfidz",
                  "text": "Menghafal dan menyetorkan hafalan dengan tepat."
                }
              ],
              "recommendedMaterials": "Hafalan baru; talqin; tikrar; setoran."
            },
            {
              "elementName": "Murajaah",
              "elementDescription": "Menjaga hafalan lama secara rutin.",
              "learningOutcomes": [
                {
                  "code": "TH-B3",
                  "title": "Murajaah",
                  "text": "Melakukan murajaah dan simakan secara teratur."
                }
              ],
              "recommendedMaterials": "Murajaah; simakan; evaluasi hafalan."
            }
          ]
        },
        {
          "phase": "C",
          "grades": [
            "Kelas 5",
            "Kelas 6"
          ],
          "elements": [
            {
              "elementName": "Tahsin",
              "elementDescription": "Meningkatkan kualitas bacaan dan penerapan tajwid.",
              "learningOutcomes": [
                {
                  "code": "TH-C1",
                  "title": "Tahsin",
                  "text": "Membaca dengan tajwid dan makhraj yang lebih baik."
                }
              ],
              "recommendedMaterials": "Tajwid; makhraj; mad; kelancaran."
            },
            {
              "elementName": "Tahfidz",
              "elementDescription": "Meningkatkan dan menjaga hafalan secara konsisten.",
              "learningOutcomes": [
                {
                  "code": "TH-C2",
                  "title": "Tahfidz",
                  "text": "Menambah dan menyetorkan hafalan sesuai target sekolah."
                }
              ],
              "recommendedMaterials": "Hafalan baru; setoran; simakan."
            },
            {
              "elementName": "Murajaah",
              "elementDescription": "Menjaga stabilitas hafalan dan kemandirian belajar.",
              "learningOutcomes": [
                {
                  "code": "TH-C3",
                  "title": "Murajaah",
                  "text": "Menyusun kebiasaan murajaah dan menjaga hafalan lama."
                }
              ],
              "recommendedMaterials": "Murajaah terjadwal; simakan; evaluasi."
            }
          ]
        }
      ],
      "sources": [
        "Buku Panduan Program Kurikulum & Unggulan Tahfidz SDIT AL FIKRI TP 2026–2027",
        "ATP Seluruh Mapel Per Fase SDIT AL FIKRI",
        "KSP SDIT AL FIKRI TP 2026–2027"
      ],
      "schoolNote": "Target surah per kelas tidak ditetapkan dalam sumber sekolah yang tersedia; jangan mengunci nama surah/juz tanpa dokumen target hafalan resmi sekolah."
    },
    {
      "subjectName": "Baca Tulis Al-Qur’an (BTQ)",
      "subjectType": "Muatan Lokal / Program Unggulan Sekolah",
      "phases": [
        {
          "phase": "A",
          "grades": [
            "Kelas 1",
            "Kelas 2"
          ],
          "elements": [
            {
              "elementName": "Membaca",
              "elementDescription": "Mengenal huruf hijaiyah, harakat, dan membaca kata/ayat pendek.",
              "learningOutcomes": [
                {
                  "code": "BTQ-A1",
                  "title": "Membaca",
                  "text": "Membaca huruf, kata, dan ayat pendek secara bertahap."
                }
              ],
              "recommendedMaterials": "Huruf hijaiyah; harakat; sambung; kata; ayat pendek."
            },
            {
              "elementName": "Menulis",
              "elementDescription": "Menulis huruf dan kata Arab sederhana dengan benar.",
              "learningOutcomes": [
                {
                  "code": "BTQ-A2",
                  "title": "Menulis",
                  "text": "Menyalin huruf, kata, dan ayat pendek dengan rapi."
                }
              ],
              "recommendedMaterials": "Menyalin huruf; kata; ayat pendek."
            },
            {
              "elementName": "Tahsin Dasar",
              "elementDescription": "Memperbaiki makhraj dan kelancaran bacaan dasar.",
              "learningOutcomes": [
                {
                  "code": "BTQ-A3",
                  "title": "Tahsin Dasar",
                  "text": "Memperbaiki pengucapan dan panjang-pendek bacaan."
                }
              ],
              "recommendedMaterials": "Makhraj dasar; panjang-pendek; latihan membaca."
            }
          ]
        },
        {
          "phase": "B",
          "grades": [
            "Kelas 3",
            "Kelas 4"
          ],
          "elements": [
            {
              "elementName": "Tahsin",
              "elementDescription": "Meningkatkan kelancaran membaca Al-Qur’an secara tartil.",
              "learningOutcomes": [
                {
                  "code": "BTQ-B1",
                  "title": "Tahsin",
                  "text": "Menerapkan tajwid dasar dan membaca lebih lancar."
                }
              ],
              "recommendedMaterials": "Tajwid dasar; makhraj; mad; waqaf sederhana."
            },
            {
              "elementName": "Tulis Al-Qur’an",
              "elementDescription": "Menulis kata dan ayat Al-Qur’an dengan lebih rapi dan tepat.",
              "learningOutcomes": [
                {
                  "code": "BTQ-B2",
                  "title": "Tulis Al-Qur’an",
                  "text": "Menyalin ayat dengan bentuk huruf dan tanda baca yang tepat."
                }
              ],
              "recommendedMaterials": "Menyalin ayat; tanda baca; kerapian tulisan."
            }
          ]
        },
        {
          "phase": "C",
          "grades": [
            "Kelas 5",
            "Kelas 6"
          ],
          "elements": [
            {
              "elementName": "Tahsin",
              "elementDescription": "Membaca Al-Qur’an dengan tajwid dan kualitas bacaan yang lebih baik.",
              "learningOutcomes": [
                {
                  "code": "BTQ-C1",
                  "title": "Tahsin",
                  "text": "Menerapkan tajwid, makhraj, mad, serta waqaf/ibtida sederhana."
                }
              ],
              "recommendedMaterials": "Tajwid; makhraj; mad; waqaf/ibtida."
            },
            {
              "elementName": "Tulis Al-Qur’an",
              "elementDescription": "Menulis ayat Al-Qur’an secara lebih tepat dan rapi.",
              "learningOutcomes": [
                {
                  "code": "BTQ-C2",
                  "title": "Tulis Al-Qur’an",
                  "text": "Menulis dan menyalin ayat dengan ketepatan lebih baik."
                }
              ],
              "recommendedMaterials": "Menyalin ayat; kaidah penulisan; latihan."
            }
          ]
        }
      ],
      "sources": [
        "ATP Seluruh Mapel Per Fase SDIT AL FIKRI",
        "Buku Panduan Program Kurikulum & Unggulan Tahfidz SDIT AL FIKRI TP 2026–2027",
        "KSP SDIT AL FIKRI TP 2026–2027"
      ]
    }
  ],
  "schoolYear": "2026/2027",
  "school": "SDIT AL FIKRI",
  "curriculumPolicy": {
    "nationalReference": [
      "Keputusan Kepala BSKAP Nomor 046/H/KR/2025",
      "Keputusan Kepala BKPDM Nomor 020 Tahun 2026 (perubahan CP Agama dan Budi Pekerti)"
    ],
    "schoolReference": [
      "KSP SDIT AL FIKRI TP 2026–2027",
      "ATP Seluruh Mapel Per Fase SDIT AL FIKRI",
      "Buku Panduan Program Kurikulum & Unggulan Tahfidz SDIT AL FIKRI TP 2026–2027"
    ],
    "contentGuideline": "Materi dan submateri dibuat ringkas sebagai rekomendasi untuk penyusunan kisi-kisi/soal; bukan pengganti CP/ATP resmi.",
    "importantNote": "Fiqih, Aqidah Akhlak, Sejarah Kebudayaan Islam, Bahasa Arab, BTQ, dan Tahfidz dicatat sebagai pengembangan/muatan kurikulum sekolah SDIT AL FIKRI. Untuk SD umum, mapel tersebut bukan seluruhnya mata pelajaran nasional yang berdiri sendiri."
  }
} as const;

const app = express();

const CURRICULUM_JSON_PATH = path.join(
  process.cwd(),
  'src',
  'data',
  'nationalCurriculumSD.json'
);

// Helper to get curriculum data safely (via bundled JSON import or fallback filesystem read)
function getCurriculumDatabase(): any {
  if (
    nationalCurriculumSD &&
    Array.isArray((nationalCurriculumSD as any).subjects) &&
    (nationalCurriculumSD as any).subjects.length > 0
  ) {
    return nationalCurriculumSD;
  }
  if (fs.existsSync(CURRICULUM_JSON_PATH)) {
    try {
      const raw = fs.readFileSync(CURRICULUM_JSON_PATH, 'utf-8');
      return JSON.parse(raw);
    } catch {
      // ignore
    }
  }
  return nationalCurriculumSD || { subjects: [] };
}

// Middlewares
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Helper Gemini AI lazy client
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface GenerateWithFallbackOptions {
  contents: any;
  config?: any;
  models?: string[];
  maxRetriesPerModel?: number;
}

/**
 * Robust Gemini caller with exponential backoff, jitter & multi-model fallback for 503/429 spikes in demand
 */
async function generateContentWithRetry(
  ai: GoogleGenAI,
  options: GenerateWithFallbackOptions
) {
  // Recommended, highly available models with fallback priority
  const modelList = options.models || [
    'gemini-3.8-flash',
    'gemini-3.1-flash-lite',
    'gemini-flash-latest',
  ];
  const maxRetries = options.maxRetriesPerModel ?? 2;

  let lastError: any = null;

  for (const model of modelList) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: options.contents,
          config: options.config,
        });
        return response;
      } catch (err: any) {
        lastError = err;
        const errMsg = String(err?.message || err || '');
        const errStatus = String(err?.status || '');
        const errCode = Number(err?.code || err?.error?.code || 0);

        const isDemandOrRateLimit =
          errCode === 503 ||
          errCode === 429 ||
          errStatus === 'UNAVAILABLE' ||
          errStatus === 'RESOURCE_EXHAUSTED' ||
          errMsg.includes('high demand') ||
          errMsg.includes('spikes in demand') ||
          errMsg.includes('quota') ||
          errMsg.includes('rate limit') ||
          errMsg.includes('overloaded') ||
          errMsg.includes('503');

        if (isDemandOrRateLimit) {
          if (attempt < maxRetries) {
            const backoffTime = Math.pow(2, attempt - 1) * 800 + Math.floor(Math.random() * 400);
            await sleep(backoffTime);
            continue;
          }
        } else {
          break;
        }
      }
    }
  }

  throw lastError;
}

/**
 * Resilient JSON extractor that parses responses from LLMs even if surrounded by markdown,
 * commentary text before/after JSON, unescaped newlines, or trailing commas.
 */
function safeExtractJson<T = any>(rawText: string): T {
  if (!rawText || typeof rawText !== 'string') {
    throw new Error('Teks respons dari AI kosong atau tidak valid');
  }

  const trimmed = rawText.trim();

  // 1. Direct attempt
  try {
    return JSON.parse(trimmed);
  } catch {
    // Continue
  }

  // 2. Strip markdown fences: ```json ... ``` or ``` ... ```
  let clean = trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    return JSON.parse(clean);
  } catch {
    // Continue
  }

  // 3. Locate outer JSON bounds { ... } or [ ... ]
  const firstBrace = clean.indexOf('{');
  const firstBracket = clean.indexOf('[');

  let startIdx = -1;
  let endIdx = -1;

  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    startIdx = firstBrace;
    endIdx = clean.lastIndexOf('}');
  } else if (firstBracket !== -1) {
    startIdx = firstBracket;
    endIdx = clean.lastIndexOf(']');
  }

  if (startIdx !== -1 && endIdx > startIdx) {
    const candidate = clean.substring(startIdx, endIdx + 1).trim();
    try {
      return JSON.parse(candidate);
    } catch {
      // 4. Remove trailing commas e.g. , } or , ]
      try {
        const withoutTrailingCommas = candidate.replace(/,\s*([}\]])/g, '$1');
        return JSON.parse(withoutTrailingCommas);
      } catch {
        // Continue
      }
    }
  }

  // 5. Balanced brace parser for objects with trailing notes
  if (startIdx !== -1) {
    let depth = 0;
    let inString = false;
    let escape = false;
    let foundEnd = -1;

    for (let i = startIdx; i < clean.length; i++) {
      const char = clean[i];
      if (escape) {
        escape = false;
        continue;
      }
      if (char === '\\') {
        escape = true;
        continue;
      }
      if (char === '"') {
        inString = !inString;
        continue;
      }
      if (!inString) {
        if (char === '{' || char === '[') {
          depth++;
        } else if (char === '}' || char === ']') {
          depth--;
          if (depth === 0) {
            foundEnd = i;
            break;
          }
        }
      }
    }

    if (foundEnd > startIdx) {
      const balanced = clean.substring(startIdx, foundEnd + 1).trim();
      try {
        return JSON.parse(balanced);
      } catch {
        try {
          const sanitized = balanced.replace(/,\s*([}\]])/g, '$1');
          return JSON.parse(sanitized);
        } catch {
          // Continue
        }
      }
    }
  }

  // 6. Truncation repair: auto-close open braces/brackets
  if (startIdx !== -1) {
    let partial = clean.substring(startIdx);
    const lastValidClosing = Math.max(partial.lastIndexOf('}'), partial.lastIndexOf(']'));
    if (lastValidClosing > 0) {
      const truncated = partial.substring(0, lastValidClosing + 1);
      try {
        return JSON.parse(truncated);
      } catch {
        try {
          return JSON.parse(truncated.replace(/,\s*([}\]])/g, '$1'));
        } catch {
          // Continue
        }
      }
    }
  }

  throw new Error(`Gagal membaca respons JSON dari model AI: ${rawText.slice(0, 120)}...`);
}

/**
 * Fallback Modul Ajar generator if AI service fails or returns incomplete content
 */
function createFallbackModulAjar(params: {
  mataPelajaran?: string;
  kelas?: string;
  fase?: string;
  semester?: string;
  tahunPelajaran?: string;
  alokasiWaktu?: string;
  babMateri?: string;
  subMateri?: string;
  profilPancasila?: string[];
  modelPembelajaran?: string;
  targetPesertaDidik?: string;
  namaPenyusun?: string;
  namaKepalaSekolah?: string;
  catatanTambahan?: string;
}) {
  const {
    mataPelajaran = 'Pendidikan Agama Islam',
    kelas = 'Kelas 4',
    fase = 'Fase B',
    semester = 'Semester 1 (Ganjil)',
    tahunPelajaran = '2025/2026',
    alokasiWaktu = '2 x 35 Menit (1 Pertemuan)',
    babMateri = 'Materi Pokok Pembelajaran',
    subMateri = '',
    profilPancasila = [],
    modelPembelajaran = 'Problem-Based Learning (PBL)',
    targetPesertaDidik = 'Peserta Didik Reguler (28 Siswa)',
    namaPenyusun = 'Guru Pengampu SDIT Al Fikri',
    namaKepalaSekolah = 'Kepala SDIT Al Fikri',
  } = params;

  return {
    identitas: {
      namaSekolah: 'SDIT Al Fikri',
      penyusun: namaPenyusun,
      kepalaSekolah: namaKepalaSekolah,
      mataPelajaran,
      fase,
      kelas,
      semester,
      tahunPelajaran,
      alokasiWaktu,
      babMateri,
      subMateri: subMateri || babMateri,
    },
    kompetensiAwal: `Peserta didik telah mengenal konsep dasar tentang ${babMateri} dan mampu menyebutkan contoh sederhana dalam kehidupan sehari-hari.`,
    profilPelajarPancasila: profilPancasila && profilPancasila.length > 0 ? profilPancasila : [
      'Beriman, Bertakwa kepada Tuhan YME, dan Berakhlak Mulia',
      'Bernalar Kritis',
      'Gotong Royong'
    ],
    saranaPrasarana: {
      media: ['Papan Tulis / Smartboard', 'Kartu Aktivitas / Flashcard', 'LCD Proyektor & Video Pembelajaran'],
      sumberBelajar: ['Buku Panduan Guru & Siswa Kurikulum Merdeka Kemendikbudristek', 'Al-Qur’an dan Terjemah', 'Lembar Kerja Peserta Didik (LKPD)']
    },
    targetPesertaDidik,
    modelPembelajaran,
    uraianMateri: {
      ringkasanKonsep: `Pembelajaran mengenai ${babMateri} (${subMateri || 'materi terkait'}) bertujuan untuk menanamkan pemahaman komprehensif bagi peserta didik pada jenjang ${kelas} (${fase}). Melalui telaah terstruktur, peserta didik dibimbing untuk menguasai konsep inti secara teoritis sekaligus menghubungkannya dengan konteks nyata di lingkungan keluarga, sekolah, dan masyarakat luas.\n\nPengembangan materi ini menekankan penguasaan literasi dasar, pembiasaan berpikir kritis, serta penguatan karakter akhlakul karimah yang terintegrasi secara utuh dalam setiap aktivitas belajar peserta didik.`,
      poinEsensial: [
        `Pengertian dan hakikat mendasar dari topik ${babMateri}.`,
        `Karakteristik, prinsip, dan komponen utama materi dalam kehidupan sehari-hari.`,
        `Contoh konkret pengamalan dan pemecahan masalah sederhana di lingkungan sekitar.`,
        `Refleksi sikap teladan, tanggung jawab, dan adab Islami yang relevan.`
      ],
      integrasiKeislaman: `Mengaitkan materi ${babMateri} dengan nilai tauhid, tadabbur ayat Al-Qur'an dan hadits nabawiyah, serta penanaman adab islami khas Sekolah Islam Terpadu (SDIT Al Fikri).`
    },
    komponenInti: {
      capaianPembelajaran: `Peserta didik mampu memahami dan menerapkan pemahaman tentang ${babMateri} dalam konteks kontekstual sehari-hari dengan akhlak mulia.`,
      tujuanPembelajaran: [
        `Peserta didik dapat menjelaskan pengertian dan makna ${babMateri} secara tepat setelah menyimak paparan guru.`,
        `Peserta didik dapat mengidentifikasi contoh penerapan ${babMateri} dalam kehidupan sehari-hari melalui diskusi kelompok.`,
        `Peserta didik dapat menyajikan hasil telaah dan refleksi sikap terpuji sesuai nilai-nilai luhur dan Islami.`
      ],
      pemahamanBermakna: `Memahami hakikat ${babMateri} menuntun kita menjadi pribadi yang berintegritas, gemar berbuat kebaikan, dan cinta ilmu pengetahuan.`,
      pertanyaanPemantik: [
        `Pernahkah kalian mengamati bagaimana ${babMateri} bekerja di sekitar kita?`,
        `Mengapa kita perlu mempelajari dan mengamalkan nilai ini dalam kehidupan sehari-hari di sekolah dan di rumah?`
      ],
      persiapanPembelajaran: [
        'Guru menyiapkan lembar kerja peserta didik (LKPD) dan media ajar visual.',
        'Guru mengatur tata letak ruang kelas agar kondusif untuk diskusi kelompok kolaboratif.'
      ],
      kegiatanPembelajaran: {
        pendahuluan: {
          durasi: '10 Menit',
          langkah: [
            'Guru membuka KBM dengan salam hangat, sapaan Islami, dan memimpin doa bersama.',
            'Guru memeriksa kehadiran dan kesiapan psikologis peserta didik (Ice Breaking / Yel-yel SDIT).',
            'Apersepsi: Guru mengaitkan materi sebelumnya dengan topik hari ini melalui pertanyaan pemantik.',
            'Guru menyampaikan tujuan pembelajaran, garis besar kegiatan, dan kesepakatan kelas.'
          ]
        },
        inti: {
          durasi: '50 Menit',
          langkah: [
            `Tahap 1 (Orientasi Masalah): Guru menayangkan stimulus/studi kasus kontekstual terkait ${babMateri}.`,
            'Tahap 2 (Organisasi Belajar): Peserta didik dibagi ke dalam kelompok kecil heterogen (4-5 siswa) dan menerima LKPD.',
            'Tahap 3 (Penyelidikan Terbimbing): Setiap kelompok berdiskusi, menggali literatur, dan mengumpulkan informasi dengan bimbingan guru.',
            'Tahap 4 (Pengembangan & Penyajian): Perwakilan kelompok mempresentasikan hasil analisis di depan kelas dengan percaya diri.',
            'Tahap 5 (Analisis & Evaluasi): Guru bersama peserta didik mengklarifikasi, memberikan apresiasi (takbir/tepuk apresiasi), dan menyimpulkan konsep utama.'
          ],
          diferensiasi: 'Bagi peserta didik dengan pemahaman cepat diberikan tantangan studi kasus analisis lanjutan, sedangkan peserta didik yang butuh pendampingan mendapatkan scaffolding visual dari guru.'
        },
        penutup: {
          durasi: '10 Menit',
          langkah: [
            'Peserta didik bersama guru merefleksikan proses KBM dan manfaat yang didapatkan.',
            'Guru memberikan umpan balik dan penguatan konsep esensial.',
            'Penyampaian rencana kegiatan pembelajaran untuk pertemuan berikutnya.',
            'KBM ditutup dengan doa kafaratul majelis dan salam penutup.'
          ]
        }
      },
      asesmen: {
        diagnostik: 'Tanya jawab singkat di awal KBM untuk memetakan kesiapan awal murid.',
        instrumenDiagnostik: [
          `Apa yang sudah kamu ketahui tentang ${babMateri}?`,
          `Sebutkan satu contoh yang berkaitan dengan ${babMateri} di sekitarmu!`,
          'Bagaimana perasaanmu menyambut materi pembelajaran hari ini?'
        ],
        formatif: 'Observasi keaktifan diskusi kelompok, unjuk kerja presentasi, dan penilaian performa LKPD.',
        rubrikFormatif: [
          {
            kriteria: 'Pemahaman Konsep',
            skor4: 'Menjelaskan seluruh konsep materi dengan akurat, mandiri, dan logis.',
            skor3: 'Menjelaskan sebagian besar konsep materi dengan tepat dan mandiri.',
            skor2: 'Menjelaskan konsep dasar namun masih membutuhkan bantuan sesekali.',
            skor1: 'Belum mampu menjelaskan konsep dan membutuhkan bimbingan intensif.'
          },
          {
            kriteria: 'Kerjasama & Karakter Islami',
            skor4: 'Sangat aktif berkolaborasi, menghargai pendapat teman, dan menunjukkan adab santun.',
            skor3: 'Aktif berpartisipasi dalam diskusi dan menunjukkan sikap santun.',
            skor2: 'Cukup terlibat dalam diskusi namun perlu dorongan dari guru.',
            skor1: 'Pasif dalam kelompok dan memerlukan pendampingan khusus.'
          }
        ],
        sumatif: 'Tes tertulis/latihan harian pemahaman konsep pada akhir materi pembelajaran.',
        soalSumatif: [
          {
            no: 1,
            butirSoal: `Jelaskan pengertian pokok dari ${babMateri} serta sebutkan manfaatnya dalam kehidupan sehari-hari!`,
            kunciJawaban: `Pemahaman mendalam mengenai ${babMateri} membantu siswa mengenali nilai kebaikan, berpikir runut, dan menerapkannya dalam interaksi positif di lingkungan sekitar.`,
            skor: 50
          },
          {
            no: 2,
            butirSoal: `Berikan 2 contoh konkret pengamalan nilai-nilai ${babMateri} di lingkungan sekolah atau rumah!`,
            kunciJawaban: `Contoh pengamalan yang menunjukkan sikap peduli, tertib, dan mencerminkan akhlak mulia sesuai nilai-nilai luhur dan Islami.`,
            skor: 50
          }
        ]
      },
      pengayaanDanRemedial: {
        pengayaan: 'Peserta didik yang telah tuntas diberikan tugas mandiri kreatif seperti membuat peta konsep (mind map) atau poster rangkuman materi.',
        remedial: 'Bimbingan khusus secara individual atau tutor sebaya bagi peserta didik yang belum mencapai tujuan pembelajaran utama.'
      },
      refleksi: {
        refleksiGuru: [
          'Apakah seluruh peserta didik aktif terlibat dalam kegiatan diskusi kelompok?',
          'Bagian mana dari alur pembelajaran yang memerlukan penyesuaian durasi atau media ajar?'
        ],
        refleksiSiswa: [
          'Hal apa yang paling menarik yang kamu pelajari hari ini?',
          'Apakah ada konsep yang masih terasa sulit untuk dipahami?'
        ]
      }
    },
    lampiran: {
      glosarium: [
        { istilah: 'Konseptual', arti: 'Berkaitan dengan konsep atau pengertian abstrak yang terstruktur.' },
        { istilah: 'Kolaboratif', arti: 'Bekerja sama secara aktif dalam kelompok untuk mencapai tujuan belajar.' },
        { istilah: 'Diferensiasi', arti: 'Penyesuaian metode pembelajaran sesuai kebutuhan dan kesiapan siswa.' }
      ],
      daftarPustaka: [
        'Kementerian Pendidikan, Kebudayaan, Riset, dan Teknologi RI. Buku Panduan Guru Kurikulum Merdeka SD.',
        'Kementerian Pendidikan, Kebudayaan, Riset, dan Teknologi RI. Buku Teks Utama Peserta Didik SD.',
        'Tim Kurikulum SDIT Al Fikri. Panduan Integrasi Nilai Islam Terpadu dalam KBM.'
      ]
    }
  };
}

// ========================================================
// 1. ENDPOINT: GENERATE KISI-KISI
// ========================================================
app.post('/api/evaluation/generate-blueprint', async (req, res) => {
  try {
    const {
      subjectName,
      className,
      semester,
      schoolYear,
      examType,
      materialTopic,
      topics,
      materials,
      distributionConfig,
      outputStyle,
    } = req.body;

    const isConcise = outputStyle !== 'detailed';

    const ai = getGeminiClient();

    if (!ai) {
      return res.status(200).json({
        status: 'fallback_mock_needed',
        items: [],
      });
    }

    // 1. PASTIKAN DATABASE KURIKULUM JSON TERSEDIA
    const curriculumData = getCurriculumDatabase();

    if (
      !curriculumData ||
      !Array.isArray(curriculumData?.subjects) ||
      curriculumData.subjects.length === 0
    ) {
      return res.status(500).json({
        status: 'curriculum_json_not_found',
        message: 'File nationalCurriculumSD.json tidak ditemukan atau kosong.',
        items: [],
      });
    }

    // 3. NORMALISASI NAMA MAPEL
    const normalize = (value: string = '') =>
      String(value)
        .toLowerCase()
        .replace(/&/g, 'dan')
        .replace(/[^\p{L}\p{N}]+/gu, ' ')
        .trim();

    const normalizedSubject = normalize(subjectName);

    // 4. CARI MAPEL DI DATABASE KURIKULUM
    const subject = curriculumData.subjects.find((item: any) => {
      const current = normalize(item?.subjectName || '');
      return (
        current === normalizedSubject ||
        current.includes(normalizedSubject) ||
        normalizedSubject.includes(current)
      );
    });

    if (!subject) {
      return res.status(200).json({
        status: 'curriculum_subject_not_found',
        items: [],
        message: `Mata pelajaran "${subjectName}" tidak ditemukan dalam nationalCurriculumSD.json.`,
      });
    }

    // 5. TENTUKAN KELAS DAN FASE
    const gradeMatch = String(className || '').match(/\d+/);
    const gradeNumber = gradeMatch ? Number(gradeMatch[0]) : null;

    if (!gradeNumber) {
      return res.status(200).json({
        status: 'invalid_class_level',
        items: [],
        message: `Nomor kelas tidak dapat dibaca dari "${className}".`,
      });
    }

    let targetPhase = '';
    if (gradeNumber <= 2) {
      targetPhase = 'A';
    } else if (gradeNumber <= 4) {
      targetPhase = 'B';
    } else {
      targetPhase = 'C';
    }

    // 6. CARI FASE YANG SESUAI
    const phaseData = subject.phases?.find(
      (phase: any) =>
        String(phase?.phase || '')
          .replace(/fase/i, '')
          .trim()
          .toUpperCase() === targetPhase
    );

    if (!phaseData) {
      return res.status(200).json({
        status: 'curriculum_phase_not_found',
        items: [],
        phase: `Fase ${targetPhase}`,
        subject: subject.subjectName,
        message: `Fase ${targetPhase} tidak ditemukan untuk ${subject.subjectName}.`,
      });
    }

    // 7. EKSTRAK CP / ELEMEN / LEARNING OUTCOMES
    const curriculumReferences: any[] = [];
    for (const element of phaseData.elements || []) {
      for (const outcome of element.learningOutcomes || []) {
        if (!outcome?.text) continue;
        curriculumReferences.push({
          element: element.elementName || '',
          learningOutcomeTitle: outcome.title || '',
          learningOutcome: outcome.text,
          sourcePage: outcome.sourcePage || null,
        });
      }
    }

    // 8. DATA TOPIK DARI GURU
    const rawTopicsList = Array.isArray(topics)
      ? topics
      : materialTopic
        ? Array.isArray(materialTopic)
          ? materialTopic
          : [
              {
                title: String(materialTopic),
                subTopics: '',
              },
            ]
        : [];

    const teacherTopics = rawTopicsList
      .map((t: any) => {
        const title = (t?.title || t?.material || t?.name || '').trim();
        const rawSub = t?.subTopics ?? t?.subtopics ?? '';
        let subtopicsFormatted = '';
        if (Array.isArray(rawSub)) {
          subtopicsFormatted = rawSub
            .map((s: any) => String(s).trim())
            .filter(Boolean)
            .join(', ');
        } else if (typeof rawSub === 'string') {
          subtopicsFormatted = rawSub
            .split('\n')
            .map((s: string) => s.trim())
            .filter(Boolean)
            .join(', ');
        }
        return {
          title,
          subtopics: subtopicsFormatted,
        };
      })
      .filter((t: any) => t.title.length > 0);

    const hasSpecificTeacherTopics = teacherTopics.length > 0;

    // 9. BAHAN MATERI GURU
    const materialNotes = materials?.textNotes || '';
    const materialFiles = Array.isArray(materials?.files)
      ? materials.files
      : [];
    const materialImages = Array.isArray(materials?.images)
      ? materials.images
      : [];

    const imageParts: any[] = [];
    materialImages.forEach((img: any) => {
      const dataUrl = img?.url || img?.base64Data || '';
      if (!dataUrl || typeof dataUrl !== 'string') return;
      const match = dataUrl.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
      if (match) {
        imageParts.push({
          inlineData: {
            mimeType: match[1],
            data: match[2],
          },
        });
      }
    });

    const extractedMaterials = materialFiles
      .map((file: any) => {
        const fileName = file?.name || 'Bahan Materi Guru';
        const extractedText = file?.extractedText || '';
        if (!extractedText.trim()) return '';
        return `\nNAMA FILE:\n${fileName}\n\nISI BAHAN MATERI:\n${extractedText}\n`;
      })
      .filter(Boolean)
      .join('\n\n');

    // 10. BATASI DATA KURIKULUM AGAR PROMPT TIDAK MENDIRIKAN DISTRAKSI MATERI LAIN
    // Jika guru sudah memberikan topik spesifik, kurangi kurikulum agar AI tidak mengambil materi di luar bab guru
    let relevantCurriculum = curriculumReferences;
    if (hasSpecificTeacherTopics) {
      const topicLowerList = teacherTopics.map((t: any) => t.title.toLowerCase());
      const matched = curriculumReferences.filter((ref: any) => {
        const combined = `${ref.element} ${ref.learningOutcomeTitle} ${ref.learningOutcome}`.toLowerCase();
        return topicLowerList.some((kw: string) => combined.includes(kw));
      });
      relevantCurriculum = matched.length > 0 ? matched.slice(0, 10) : curriculumReferences.slice(0, 6);
    } else {
      relevantCurriculum = curriculumReferences.slice(0, 25);
    }

    const curriculumContext = relevantCurriculum
      .map(
        (item: any, index: number) => `
REFERENSI FORMAT CAPAIAN #${index + 1}
Elemen: ${item.element}
Judul Capaian: ${item.learningOutcomeTitle}
Capaian Pembelajaran (CP): ${item.learningOutcome}
`
      )
      .join('\n');

    // 11. TOPIK GURU
    const teacherTopicContext = hasSpecificTeacherTopics
      ? teacherTopics
          .map(
            (topic: any, index: number) => `
TOPIK / BAB #${index + 1} DARI GURU (BATASAN MUTLAK):
- Judul Bab / Materi: ${topic.title}
${topic.subtopics ? `- Submateri / Ruang Lingkup: ${topic.subtopics}` : ''}
`
          )
          .join('\n')
      : `Tidak ada daftar bab terstruktur spesifik. Gunakan catatan materi/bahan ajar guru sebagai acuan.`;

    // 12. DISTRIBUSI SOAL
    const distributionContext = JSON.stringify(
      distributionConfig || {},
      null,
      2
    );

    // 13. PROMPT GENERATOR KISI-KISI
    const styleInstruction = isConcise
      ? `ATURAN GAYA PENULISAN RINGKAS (CONCISE):
1. "indicator": Tuliskan indikator secara SINGKAT, PADAT, DAN LANGSUNG FOKUS PADA KOMPETENSI INTI (Maksimal 10-15 kata). Contoh: "Disajikan gambar, siswa dapat menentukan organ pernapasan utama dengan tepat."
2. "curriculumGoal": Ringkas Capaian Pembelajaran (CP) menjadi poin inti secara padat (Maksimal 10-12 kata).
3. "material": Tulis nama materi/submateri secara lugas.`
      : `ATURAN GAYA PENULISAN DETAILED:
Tuliskan indikator, Capaian Pembelajaran (CP), dan materi secara lengkap, formal, dan naratif sesuai standar Kurikulum Merdeka.`;

    const strictTopicEnforcement = hasSpecificTeacherTopics
      ? `
================================================================================
ATURAN KEPATUHAN BAB & MATERI GURU (STRICT WHITELIST - WAJIB 100% DIPATUHI):
================================================================================
1. SUMBER MATERI MUTLAK:
   Guru telah menetapkan bab dan materi yang diajarkan untuk evaluasi ini pada "DAFTAR BAB / MATERI GURU".
2. LARANGAN KERAS:
   - DILARANG KERAS membuat indikator atau butir kisi-kisi dari bab/materi di luar daftar topik guru di bawah ini.
   - DILARANG mengambil bab/materi lain dari kurikulum nasional yang tidak tertulis pada bab guru.
   - DILARANG memasukkan materi semester lain atau tingkatan kelas lain.
3. DISTRIBUSI MATERI:
   - Sebarkan seluruh butir soal (PG, Isian, Menjodohkan, Uraian) HANYA pada bab/submateri yang dicantumkan guru.
   - Jika guru menginputkan sedikit bab (misal 1 atau 2 bab), variasikan indikator kognitif (C1 sampai C4) dan stimulus konteks dari bab tersebut, JANGAN mencari bab luar.
4. Nilai "material" pada setiap item JSON WAJIB langsung mencantumkan nama Bab/Submateri dari Guru.
================================================================================
`
      : ``;

    const prompt = `
Anda adalah ahli penyusun kisi-kisi evaluasi pembelajaran SDIT Al Fikri.
Tugas Anda adalah membuat KISI-KISI SOAL YANG SPESIFIK, TERUKUR, DAN BENAR-BENAR DAPAT DIJADIKAN DASAR PEMBUATAN NASKAH SOAL.

Mata Pelajaran: ${subjectName}
Kelas: ${className}
Semester: ${semester || ''}
Tahun Pelajaran: ${schoolYear || ''}
Jenis Evaluasi: ${examType || ''}
Fase: Fase ${targetPhase}

${styleInstruction}
${strictTopicEnforcement}

DAFTAR BAB / MATERI GURU:
${teacherTopicContext}

BAHAN MATERI GURU:
CATATAN: ${materialNotes || '-'}
FILE: ${extractedMaterials || '-'}
${imageParts.length > 0 ? `LAMPIRAN FOTO MATERI: Terdapat ${imageParts.length} foto/lampiran visual yang diunggah guru (halaman buku teks / ringkasan / diagram). BACA teks dalam foto (OCR) dan gunakan isi materi tersebut sebagai sumber acuan utama penyusunan kisi-kisi dan indikator.` : ''}

CONTOH GAYA PERUMUSAN CP KURIKULUM RESMI (HANYA REFERENSI FORMAT, JANGAN AMBIL MATERI DI LUAR BAB GURU):
Mata Pelajaran: ${subject.subjectName}
Fase: ${phaseData.phase}
${curriculumContext}

JUMLAH DAN DISTRIBUSI WAJIB:
${distributionContext}

Gunakan:
PG: section = "A"
ISIAN: section = "B"
MENJODOHKAN: section = "C"
URAIAN: section = "D"

OUTPUT HANYA JSON VALID:
{
  "items": [
    {
      "number": 1,
      "section": "A",
      "sectionNumber": 1,
      "sectionLabel": "Bagian A: Pilihan Ganda",
      "material": "Materi/Bab spesifik sesuai input guru",
      "curriculumGoal": "CP/elemen yang relevan",
      "indicator": "Disajikan [stimulus], peserta didik dapat [kegiatan/kemampuan spesifik]",
      "cognitiveLevel": "C2",
      "questionForm": "PG",
      "questionNumber": "1"
    }
  ]
}
`;

    // 14. GENERATE DENGAN GEMINI (RETRY & MULTI-MODEL FALLBACK)
    const blueprintContents =
      imageParts.length > 0
        ? [...imageParts, { text: prompt }]
        : prompt;

    const response = await generateContentWithRetry(ai, {
      contents: blueprintContents,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.35,
      },
    });

    const text = response.text || '{}';
    const parsed = safeExtractJson(text);
    let items = Array.isArray(parsed?.items) ? parsed.items : [];

    // 15. NORMALISASI HASIL
    items = items.map((item: any, index: number) => {
      const questionForm =
        item?.questionForm ||
        (item?.section === 'A'
          ? 'PG'
          : item?.section === 'B'
            ? 'ISIAN'
            : item?.section === 'C'
              ? 'MENJODOHKAN'
              : 'URAIAN');

      let section = item?.section;

      if (!section) {
        if (questionForm === 'PG') {
          section = 'A';
        } else if (questionForm === 'ISIAN') {
          section = 'B';
        } else if (questionForm === 'MENJODOHKAN') {
          section = 'C';
        } else {
          section = 'D';
        }
      }

      return {
        ...item,
        number: index + 1,
        section,
        sectionNumber: item?.sectionNumber || index + 1,
        sectionLabel:
          item?.sectionLabel ||
          (section === 'A'
            ? 'Bagian A: Pilihan Ganda'
            : section === 'B'
              ? 'Bagian B: Isian'
              : section === 'C'
                ? 'Bagian C: Menjodohkan'
                : 'Bagian D: Uraian'),
        material: String(item?.material || '').trim(),
        curriculumGoal: String(item?.curriculumGoal || '').trim(),
        indicator: String(item?.indicator || '').trim(),
        cognitiveLevel: item?.cognitiveLevel || 'C2',
        questionForm,
        questionNumber: String(
          item?.questionNumber || item?.sectionNumber || index + 1
        ),
      };
    });

    return res.json({
      status: 'success',
      items,
      meta: {
        subject: subject.subjectName,
        className,
        grade: gradeNumber,
        phase: `Fase ${targetPhase}`,
      },
    });
  } catch (error: any) {
    console.error('Generate blueprint error:', error);
    return res.status(200).json({
      status: 'error',
      message: error?.message || 'Gagal membuat kisi-kisi.',
      items: [],
    });
  }
});

// ========================================================
// 1B. ENDPOINT: RECOMMEND CURRICULUM
// ========================================================
app.post('/api/evaluation/recommend-curriculum', async (req, res) => {
  try {
    const { subjectName, className } = req.body;

    const curriculumData = getCurriculumDatabase();

    if (
      !curriculumData ||
      !Array.isArray(curriculumData.subjects) ||
      curriculumData.subjects.length === 0
    ) {
      return res.status(500).json({
        message: 'Database nationalCurriculumSD.json tidak ditemukan atau kosong.',
        items: [],
      });
    }

    const normalize = (value: string = '') =>
      value
        .toLowerCase()
        .replace(/&/g, 'dan')
        .replace(/[^\p{L}\p{N}]+/gu, ' ')
        .trim();

    const normalizedSubject = normalize(subjectName);

    const subject = curriculumData.subjects.find((item: any) => {
      const current = normalize(item.subjectName || '');
      return (
        current === normalizedSubject ||
        current.includes(normalizedSubject) ||
        normalizedSubject.includes(current)
      );
    });

    if (!subject) {
      return res.json({
        phase: '',
        subject: subjectName,
        items: [],
        message: `Mata pelajaran "${subjectName}" tidak ditemukan dalam JSON.`,
      });
    }

    const gradeMatch = String(className || '').match(/\d+/);
    const gradeNumber = gradeMatch ? Number(gradeMatch[0]) : null;

    if (!gradeNumber) {
      return res.json({
        phase: '',
        subject: subject.subjectName,
        items: [],
        message: `Nomor kelas tidak dapat dibaca dari "${className}".`,
      });
    }

    let targetPhase = '';
    if (gradeNumber <= 2) {
      targetPhase = 'A';
    } else if (gradeNumber <= 4) {
      targetPhase = 'B';
    } else {
      targetPhase = 'C';
    }

    const phaseData = subject.phases?.find(
      (phase: any) =>
        String(phase.phase)
          .replace(/fase/i, '')
          .trim()
          .toUpperCase() === targetPhase
    );

    if (!phaseData) {
      return res.json({
        phase: `Fase ${targetPhase}`,
        subject: subject.subjectName,
        items: [],
        message: `Fase ${targetPhase} tidak ditemukan untuk ${subject.subjectName}.`,
      });
    }

    const recommendations: any[] = [];
    for (const element of phaseData.elements || []) {
      for (const outcome of element.learningOutcomes || []) {
        if (!outcome.text) continue;

        recommendations.push({
          title:
            outcome.title ||
            element.elementName ||
            'Materi Kurikulum',
          subTopics: [element.elementName].filter(Boolean),
          element: element.elementName || '',
          phase: `Fase ${targetPhase}`,
          curriculumGoal: outcome.text,
          sourcePage: outcome.sourcePage || null,
        });
      }
    }

    return res.json({
      phase: `Fase ${targetPhase}`,
      subject: subject.subjectName,
      items: recommendations.slice(0, 8),
    });
  } catch (error: any) {
    console.error('CURRICULUM ERROR:', error);
    return res.status(500).json({
      message: error?.message || 'Gagal membaca database kurikulum.',
      items: [],
    });
  }
});

// ========================================================
// 2. ENDPOINT: GENERATE SOAL
// ========================================================
app.post('/api/evaluation/generate-questions', async (req, res) => {
  try {
    const {
      subjectName,
      className,
      examType,
      blueprint,
      materials,
      topics,
      materialTopic,
      config,
      outputStyle,
    } = req.body;

    const isConcise = outputStyle !== 'detailed';

    const ai = getGeminiClient();

    if (!ai) {
      return res.status(200).json({
        status: 'fallback_mock_needed',
        questions: [],
      });
    }

    const pgCount = Number(config?.pgCount || 0);
    const isianCount = Number(config?.isianCount || 0);
    const partCCount = Number(config?.partCCount || 0);
    const pgOptions = config?.pgOptions === 'A-D' ? 'A-D' : 'A-C';
    const partCType = config?.partCType || 'Uraian';
    const matchingMode = config?.matchingMode || 'text_to_text';
    const totalTarget = pgCount + isianCount + partCCount;

    if (totalTarget <= 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Jumlah soal belum ditentukan.',
        questions: [],
      });
    }

    const blueprintItems = Array.isArray(blueprint?.items)
      ? blueprint.items
      : [];
    const hasBlueprint = blueprintItems.length > 0;

    const materialNotes = materials?.textNotes || '';
    const materialFiles = Array.isArray(materials?.files)
      ? materials.files
      : [];
    const materialImages = Array.isArray(materials?.images)
      ? materials.images
      : [];

    const imageParts: any[] = [];
    materialImages.forEach((img: any) => {
      const dataUrl = img?.url || img?.base64Data || '';
      if (!dataUrl || typeof dataUrl !== 'string') return;
      const match = dataUrl.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
      if (match) {
        imageParts.push({
          inlineData: {
            mimeType: match[1],
            data: match[2],
          },
        });
      }
    });

    const extractedFileMaterials = materialFiles
      .map((file: any) => {
        const fileName = file?.name || 'Bahan ajar';
        const extractedText = file?.extractedText || '';
        if (!extractedText.trim()) return '';
        return `\nNama File:\n${fileName}\n\nIsi Bahan Ajar:\n${extractedText}\n`;
      })
      .filter(Boolean)
      .join('\n\n');

    const blueprintContext = hasBlueprint
      ? blueprintItems
          .map((item: any, index: number) => {
            return `
KISI-KISI BUTIR #${index + 1}
- Nomor Urut: ${item.number ?? index + 1}
- Bagian: ${item.section || ''} (${item.questionForm || ''})
- Level Kognitif: ${item.cognitiveLevel || 'C2'}
- MATERI/BAB WAJIB: ${item.material || ''}
- INDIKATOR CAPAIAN WAJIB: ${item.indicator || ''}
`;
          })
          .join('\n')
      : '';

    const directTopicsContext = Array.isArray(topics) && topics.length > 0
      ? topics.map((t: any, idx: number) => `${idx + 1}. ${t?.title || t?.material || t?.name || ''} ${t?.subTopics ? `(Sub: ${t.subTopics})` : ''}`).join('\n')
      : (materialTopic ? String(materialTopic) : '');

    const questionStyleInstruction = isConcise
      ? `ATURAN KHUSUS GAYA PENULISAN RINGKAS (CONCISE):
1. "questionText": Tuliskan BATANG SOAL secara LUGAS, EFEKTIF, DAN RINGKAS (Maksimal 15-20 kata per soal). Langsung pada inti pertanyaan tanpa kalimat atau cerita pengantar berlebihan kecuali untuk soal cerita/stimulus khusus.
2. "options": Pilihan jawaban dibuat singkat dan jelas.
3. "explanation": Pembahasan dibuat RINGKAS DAN PADAT (Maksimal 1-2 kalimat langsung pada inti jawaban).`
      : `ATURAN GAYA PENULISAN DETAILED:
Tuliskan naskah soal dan pembahasan secara naratif, lengkap, dan mendalam.`;

    const strictQuestionRule = hasBlueprint
      ? `
================================================================================
ATURAN KEPATUHAN KISI-KISI & MATERI NOMOR PER NOMOR (WAJIB 100% DIPATUHI):
================================================================================
1. KORELASI NOMOR KE KISI-KISI:
   Setiap butir soal (Soal 1 s/d ${totalTarget}) WAJIB 100% SESUAI DENGAN "MATERI/BAB WAJIB" DAN "INDIKATOR CAPAIAN WAJIB" pada KISI-KISI BUTIR NOMOR TERSEBUT.
2. LARANGAN KERAS:
   - DILARANG KERAS membuat soal dari bab/materi yang TIDAK ADA pada kisi-kisi butir nomor tersebut.
   - DILARANG mengganti materi dengan materi dari bab lain atau materi semester lain.
   - DILARANG membuat pertanyaan yang sama/identik antar nomor soal. Setiap butir soal HARUS memiliki stimulus, narasi pertanyaan, angka, dan konsep uji yang berbeda.
3. Nilai field "material" dan "indicator" pada setiap objek JSON soal WAJIB disalin persis dari KISI-KISI butir nomor bersangkutan.
================================================================================
`
      : `
================================================================================
ATURAN BATASAN MATERI DARI GURU (STRICT WHITELIST):
================================================================================
1. Soal HANYA boleh dibuat dari Bab/Materi atau Bahan Ajar yang dicantumkan guru di bawah.
2. DILARANG KERAS membuat soal dari materi/bab lain yang tidak diajarkan oleh guru.
3. Setiap nomor soal wajib memiliki pertanyaan, angka, dan konteks yang berbeda (dilarang duplikasi).
================================================================================
`;

    const prompt = `
Anda adalah GURU AHLI penyusun naskah soal evaluasi untuk SDIT Al Fikri.
Buatlah naskah soal yang konkret, bermutu tinggi, dan benar-benar sesuai kisi-kisi/materi guru.

Mata Pelajaran: ${subjectName}
Kelas: ${className}
Jenis Asesmen: ${examType}
Target: PG=${pgCount}, Isian=${isianCount}, Bagian C(${partCType})=${partCCount}.
Jumlah opsi PG: ${pgOptions}

${questionStyleInstruction}
${strictQuestionRule}

${hasBlueprint ? `KISI-KISI ACUAN MUTLAK:\n${blueprintContext}` : ''}

${directTopicsContext ? `DAFTAR BAB DARI GURU:\n${directTopicsContext}\n` : ''}

BAHAN AJAR GURU:
Catatan: ${materialNotes || '-'}
File: ${extractedFileMaterials || '-'}
${imageParts.length > 0 ? `Lampiran Foto/Gambar Materi (${imageParts.length} foto): BACA teks dan stimulus visual pada gambar yang dilampirkan guru (OCR) dan buat soal yang berakar pada konteks materi pada gambar tersebut.` : ''}

ATURAN FORMAT OUTPUT:
1. Field "questionText" HANYA berisi BATANG SOAL (TANPA mencantumkan A/B/C/D di dalam teks soal).
2. Opsi PG hanya diletakkan di dalam array field "options".
3. Kembalikan HANYA JSON VALID.

Struktur Output JSON:
{
  "questions": [
    {
      "number": 1,
      "globalNumber": 1,
      "section": "A",
      "sectionTitle": "Bagian I. Pilihan Ganda",
      "type": "PG",
      "material": "Materi sesuai kisi-kisi nomor ini",
      "indicator": "Indikator sesuai kisi-kisi nomor ini",
      "cognitiveLevel": "C2",
      "questionText": "Batang soal yang jelas tanpa opsi",
      "optionsCount": "${pgOptions}",
      "options": [
        { "key": "A", "text": "Opsi A" },
        { "key": "B", "text": "Opsi B" },
        { "key": "C", "text": "Opsi C" }
      ],
      "answerKey": "B",
      "explanation": "Pembahasan ringkas dan tepat"
    }
  ]
}
`;

    const questionContents =
      imageParts.length > 0
        ? [...imageParts, { text: prompt }]
        : prompt;

    const response = await generateContentWithRetry(ai, {
      contents: questionContents,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.5,
      },
    });

    const text = response.text || '{}';
    const parsed = safeExtractJson(text);
    let questions = Array.isArray(parsed?.questions) ? parsed.questions : [];

    // Normalisasi
    questions = questions.map((question: any, index: number) => {
      const section = question.section || 'A';
      let type = question.type;
      if (!type) {
        type = section === 'A' ? 'PG' : section === 'B' ? 'ISIAN' : 'URAIAN';
      }

      return {
        ...question,
        number: question.number || index + 1,
        globalNumber: question.globalNumber ?? index + 1,
        type,
        questionText: String(question.questionText || '').trim(),
        options: Array.isArray(question.options) ? question.options : [],
        optionsCount: type === 'PG' ? pgOptions : question.optionsCount,
        answerKey: question.answerKey || '',
        explanation: question.explanation || '',
      };
    });

    return res.json({
      status: 'success',
      questions,
    });
  } catch (err: any) {
    console.error('Error generating questions with Gemini:', err);
    return res.status(200).json({
      status: 'error',
      message: err?.message || 'Gagal membuat soal.',
      questions: [],
    });
  }
});

// ========================================================
// 3. ENDPOINT: REVIEW PEDAGOGIS HASIL UJIAN
// ========================================================
app.post('/api/evaluation/generate-review', async (req, res) => {
  try {
    const {
      subjectName,
      className,
      examType,
      examQuestionsText,
      analysisDataSummary,
    } = req.body;

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(200).json({ status: 'fallback_mock_needed' });
    }

    const prompt = `Anda adalah konsultan pedagogis dan evaluator pembelajaran sekolah dasar.
Berikan interpretasi pedagogis yang tajam, faktual, dan solutif berdasarkan naskah soal dan data analisis hasil ujian siswa berikut:

Data Analisis:
- Mapel: ${subjectName}, Kelas: ${className}, Ujian: ${examType}
- Jumlah Siswa: ${analysisDataSummary?.totalStudents || 0}, Rata-rata: ${analysisDataSummary?.averageScore || 0}
- Nilai Tertinggi: ${analysisDataSummary?.highestScore || 0}, Nilai Terendah: ${analysisDataSummary?.lowestScore || 0}
- Persentase Ketuntasan: ${analysisDataSummary?.passPercentage || 0}%
- Rincian Butir Soal per Kategori (PG, Isian, Menjodohkan, Uraian):
${JSON.stringify(analysisDataSummary?.questionStats || [], null, 2)}

Naskah Soal Asli:
${examQuestionsText || '-'}

ATURAN UTAMA REVIEW PEDAGOGIS:
1. PERHATIKAN PILIHAN GANDA (PG) vs NON-PG (Isian, Menjodohkan, Uraian):
   - Properti "attentionQuestions" HANYA UNTUK SOAL PILIHAN GANDA (PG)! Jangan masukkan soal Isian, Menjodohkan, atau Uraian ke dalam "attentionQuestions".
2. WAJIB KUTIP TEKS SOAL HARFIAH ASLI dari naskah soal pada properti "questionText" (misal: "12. Kabupaten Tangerang termasuk dalam provinsi...").
   - JANGAN mengganti atau menyimpulkan kalimat soal asli menjadi nama materi!
3. Cantumkan sectionLabel untuk PG persis seperti data input (misal: "PG No. 12", "PG No. 5").

Hasilkan 6 struktur analisis pedagogis lengkap. KEMBALIKAN HANYA JSON VALID DENGAN SKEMA:
{
  "summary": {
    "totalStudents": ${analysisDataSummary?.totalStudents || 0},
    "averageScore": ${analysisDataSummary?.averageScore || 0},
    "highestScore": ${analysisDataSummary?.highestScore || 0},
    "lowestScore": ${analysisDataSummary?.lowestScore || 0},
    "passPercentage": ${analysisDataSummary?.passPercentage || 0},
    "generalConclusion": "Kalimat kesimpulan menyeluruh tentang ketuntasan dan performa kelas"
  },
  "attentionQuestions": [
    {
      "questionNumber": 28,
      "questionType": "PG",
      "sectionLabel": "PG No. 28",
      "questionText": "Kabupaten Tangerang termasuk dalam provinsi...",
      "material": "Topik atau konsep materi butir soal",
      "indicator": "Indikator capaian butir",
      "successRate": 55,
      "priority": "HIGH",
      "diagnosticNote": "Penyebab kesalahan siswa atau miskonsepsi",
      "recommendedAction": "Langkah remedial atau penanganan guru"
    }
  ],
  "materialsNeedingReinforcement": [
    {
      "material": "Nama materi pokok",
      "status": "HIGH",
      "observation": "Fakta lapangan penyebab kesulitan peserta didik",
      "actionableAdvice": "Metode pengajaran atau analogi kontekstual konkret"
    }
  ],
  "indicatorsNeedingGuidance": [
    {
      "indicator": "Nama indikator kompetensi",
      "note": "Catatan bimbingan khusus scaffolding untuk guru"
    }
  ],
  "keyFindings": [
    "Temuan pola kesalahan butir berdaya serap rendah",
    "Analisis distribusi pilihan jawaban siswa"
  ],
  "followUpRecommendations": [
    "Jadwal dan model remedial teaching",
    "Kegiatan pengayaan bagi siswa yang tuntas",
    "Perbaikan redaksi butir untuk bank soal masa depan"
  ]
}`;

    const response = await generateContentWithRetry(ai, {
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.3,
      },
    });

    const text = response.text || '{}';
    const parsed = safeExtractJson(text);
    return res.json(parsed);
  } catch (err: any) {
    console.error('Error generating review with Gemini:', err);
    return res.status(200).json({ status: 'error' });
  }
});

// ========================================================
// 3B. ENDPOINT: GENERATE MODUL AJAR KURIKULUM MERDEKA (AI)
// ========================================================
app.post('/api/evaluation/generate-modul-ajar', async (req, res) => {
  try {
    const {
      mataPelajaran,
      kelas,
      fase,
      semester = 'Semester 1 (Ganjil)',
      tahunPelajaran = '2025/2026',
      alokasiWaktu = '2 x 35 Menit (1 Pertemuan)',
      babMateri,
      subMateri = '',
      profilPancasila = [],
      modelPembelajaran = 'Problem-Based Learning (PBL)',
      targetPesertaDidik = 'Peserta Didik Reguler (28 Siswa)',
      namaPenyusun = 'Guru Pengampu SDIT Al Fikri',
      namaKepalaSekolah = 'Kepala SDIT Al Fikri',
      catatanTambahan = '',
    } = req.body;

    const ai = getGeminiClient();

    if (!ai) {
      // Fallback template jika belum ada API key
      return res.json({
        status: 'ok',
        source: 'fallback',
        modulAjar: createFallbackModulAjar(req.body || {}),
      });
    }

    const prompt = `
Anda adalah Pakar Kurikulum Merdeka Jenjang Sekolah Dasar (SD/MI) berstandar BSKAP Kemendikbudristek No 046/H/KR/2025 dan Konsultan Mutu Pendidikan Sekolah Islam Terpadu (SDIT Al Fikri).
Tugas Anda adalah menyusun "MODUL AJAR KURIKULUM MERDEKA (RPP PLUS)" yang SANGAT LENGKAP, MENDALAM, DETAIL, APLIKATIF, DAN SIAP DIGUNAKAN GURU DI KELAS TANPA PERLU DIEDIT ULANG.

INPUT PARAMETER:
- Satuan Pendidikan: SDIT Al Fikri
- Mata Pelajaran: ${mataPelajaran}
- Fase & Kelas: ${fase} / ${kelas}
- Semester: ${semester}
- Tahun Pelajaran: ${tahunPelajaran}
- Alokasi Waktu: ${alokasiWaktu}
- Bab / Materi Pokok: ${babMateri}
- Sub-Materi / Topik Khusus: ${subMateri || '-'}
- Model Pembelajaran: ${modelPembelajaran}
- Profil Pelajar Pancasila: ${profilPancasila.join(', ') || 'Beriman & Bertakwa, Bernalar Kritis, Gotong Royong'}
- Target Peserta Didik: ${targetPesertaDidik}
- Guru Pengampu: ${namaPenyusun}
- Kepala Sekolah: ${namaKepalaSekolah}
- Catatan Tambahan / Fokus Khusus: ${catatanTambahan || '-'}

PANDUAN KONTEN YANG HARUS DETAIL DAN MENDALAM:
1. Uraian Materi Pembelajaran: WAJIB menyertakan ringkasan materi konseptual yang padat dan mendalam (2-3 paragraf kaya teks penjelasan konsep, 4-6 poin kunci, serta integrasi nilai Islam dan dalil naqli relevan).
2. Langkah Kegiatan: Tuliskan skenario operasional langkah per menit yang jelas antara aktivitas guru dan peserta didik.
3. Diferensiasi Pembelajaran: Tuliskan strategi nyata diferensiasi konten/proses bagi siswa yang perlu bimbingan vs siswa mahir.
4. Asesmen: Lengkapi dengan instrumen asesmen diagnostik (3 pertanyaan pemantik), rubrik formatif detail skala 4-3-2-1, serta 2-3 butir soal sumatif lengkap dengan kunci jawaban dan bobot skor.

PENTING: Keluaran HARUS HANYA SATU JSON OBJECT VALID. DILARANG MENAMBAHKAN TEKS CATATAN, KOMENTAR, ATAU MARKDOWN PENUTUP DI LUAR KURUNG KURAWAL JSON { }.
OUTPUT WAJIB DALAM FORMAT JSON BERIKUT:
{
  "identitas": {
    "namaSekolah": "SDIT Al Fikri",
    "penyusun": "${namaPenyusun}",
    "kepalaSekolah": "${namaKepalaSekolah}",
    "mataPelajaran": "${mataPelajaran}",
    "fase": "${fase}",
    "kelas": "${kelas}",
    "semester": "${semester}",
    "tahunPelajaran": "${tahunPelajaran}",
    "alokasiWaktu": "${alokasiWaktu}",
    "babMateri": "${babMateri}",
    "subMateri": "${subMateri || babMateri}"
  },
  "kompetensiAwal": "penjelasan mendalam mengenai kompetensi awal prasyarat siswa",
  "profilPelajarPancasila": ["dimensi 1", "dimensi 2", "dimensi 3"],
  "saranaPrasarana": {
    "media": ["daftar media konkret, digital, dan manipulatif"],
    "sumberBelajar": ["daftar buku referensi, sumber Al-Quran/hadits, dan lingkungan belajar"]
  },
  "targetPesertaDidik": "${targetPesertaDidik}",
  "modelPembelajaran": "${modelPembelajaran}",
  "uraianMateri": {
    "ringkasanKonsep": "penjelasan materi pelajaran secara detail, komprehensif, dan mudah dipahami anak usia SD (2-3 paragraf)",
    "poinEsensial": ["poin esensial 1", "poin esensial 2", "poin esensial 3", "poin esensial 4"],
    "integrasiKeislaman": "keterkaitan konsep materi dengan dalil Al-Qur'an / Hadits dan nilai adab Islami khas SDIT"
  },
  "komponenInti": {
    "capaianPembelajaran": "rumusan CP elemen terkait jenjang ini secara resmi",
    "tujuanPembelajaran": ["TP 1 berkaidah ABCD terukur", "TP 2 berkaidah ABCD", "TP 3 berkaidah ABCD"],
    "pemahamanBermakna": "penjelasan manfaat nyata pengetahuan ini dalam kehidupan dunia dan akhirat",
    "pertanyaanPemantik": ["pertanyaan pemantik 1", "pertanyaan pemantik 2", "pertanyaan pemantik 3"],
    "persiapanPembelajaran": ["langkah persiapan guru 1", "langkah persiapan guru 2", "langkah persiapan guru 3"],
    "kegiatanPembelajaran": {
      "pendahuluan": {
        "durasi": "10 Menit",
        "langkah": [
          "Orientasi dan pembukaan (salam, doa, tadarus singkat)",
          "Apersepsi dan tes kesiapan awal",
          "Penyampaian tujuan KBM dan motivasi"
        ]
      },
      "inti": {
        "durasi": "50 Menit",
        "langkah": [
          "Tahap 1 Orientasi masalah/stimulus",
          "Tahap 2 Pembagian kelompok dan LKPD",
          "Tahap 3 Penyelidikan terbimbing dan diskusi",
          "Tahap 4 Presentasi dan unjuk karya",
          "Tahap 5 Evaluasi dan konfirmasi konsep oleh guru"
        ],
        "diferensiasi": "strategi diferensiasi konten, proses, dan produk untuk siswa reguler, bimbingan, dan pengayaan"
      },
      "penutup": {
        "durasi": "10 Menit",
        "langkah": [
          "Refleksi dan penarikan kesimpulan",
          "Pemberian umpan balik dan tugas tindak lanjut",
          "Doa penutup majelis dan salam"
        ]
      }
    },
    "asesmen": {
      "diagnostik": "teknik asesmen awal pembelajaran",
      "instrumenDiagnostik": ["soal/pertanyaan diagnostik 1", "soal/pertanyaan diagnostik 2", "soal/pertanyaan diagnostik 3"],
      "formatif": "teknik asesmen proses pembelajaran",
      "rubrikFormatif": [
        {
          "kriteria": "Pemahaman Konsep",
          "skor4": "deskriptor sangat baik",
          "skor3": "deskriptor baik",
          "skor2": "deskriptor cukup",
          "skor1": "deskriptor perlu bimbingan"
        },
        {
          "kriteria": "Kerjasama & Karakter Islami",
          "skor4": "deskriptor sangat baik",
          "skor3": "deskriptor baik",
          "skor2": "deskriptor cukup",
          "skor1": "deskriptor perlu bimbingan"
        }
      ],
      "sumatif": "teknik asesmen akhir pembelajaran",
      "soalSumatif": [
        {
          "no": 1,
          "butirSoal": "butir pertanyaan evaluasi pemahaman",
          "kunciJawaban": "kunci jawaban lengkap",
          "skor": 50
        },
        {
          "no": 2,
          "butirSoal": "butir pertanyaan aplikasi/analisis kontekstual",
          "kunciJawaban": "kunci jawaban lengkap",
          "skor": 50
        }
      ]
    },
    "pengayaanDanRemedial": {
      "pengayaan": "kegiatan mandiri menantang untuk peserta didik yang tuntas",
      "remedial": "kegiatan bimbingan ulang terfokus untuk peserta didik yang belum tuntas"
    },
    "refleksi": {
      "refleksiGuru": ["pertanyaan evaluasi diri guru 1", "pertanyaan evaluasi diri guru 2"],
      "refleksiSiswa": ["pertanyaan refleksi siswa 1", "pertanyaan refleksi siswa 2", "pertanyaan refleksi siswa 3"]
    }
  },
  "lampiran": {
    "glosarium": [
      { "istilah": "Istilah 1", "arti": "Arti istilah lengkap" },
      { "istilah": "Istilah 2", "arti": "Arti istilah lengkap" }
    ],
    "daftarPustaka": [
      "Buku Guru dan Buku Siswa Kemendikbudristek",
      "Al-Qur'an dan Terjemah Kemenag RI",
      "Sumber literatur relevan lainnya"
    ]
  }
}
`;

    const response = await generateContentWithRetry(ai, {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        responseMimeType: 'application/json',
        temperature: 0.5,
      },
    });

    const text = response.text || '{}';
    let parsed: any = null;
    try {
      parsed = safeExtractJson(text);
    } catch (parseErr) {
      console.warn('safeExtractJson failed for Modul Ajar, using fallback template:', parseErr);
      parsed = createFallbackModulAjar(req.body || {});
    }

    return res.json({ status: 'ok', modulAjar: parsed });
  } catch (err: any) {
    console.error('Error generating Modul Ajar with Gemini:', err);
    try {
      const fallback = createFallbackModulAjar(req.body || {});
      return res.json({
        status: 'ok',
        source: 'fallback',
        modulAjar: fallback,
      });
    } catch {
      return res.status(500).json({
        status: 'error',
        message: err?.message || 'Gagal menyusun modul ajar dengan AI.'
      });
    }
  }
});

// ========================================================
// 3C. ENDPOINT: GENERATE LKPD (LEMBAR KERJA PESERTA DIDIK) AI
// ========================================================
app.post('/api/evaluation/generate-lkpd', async (req, res) => {
  try {
    const {
      mataPelajaran,
      kelas,
      fase,
      babMateri,
      subMateri = '',
      tipeAktivitas = 'Kelompok Kolaboratif',
      tingkatKesulitan = 'Sedang & Menantang',
      alokasiWaktu = '30 - 45 Menit',
      integrasiKeislaman = true,
      bilingual = false,
      petunjukTambahan = '',
    } = req.body;

    const ai = getGeminiClient();

    if (!ai) {
      // Fallback LKPD detail jika belum ada AI key
      return res.json({
        status: 'ok',
        source: 'fallback',
        lkpd: {
          identitas: {
            namaSekolah: 'SDIT Al Fikri',
            judulLkpd: `LEMBAR KERJA PESERTA DIDIK (LKPD): ${babMateri || 'Materi Pembelajaran'}`,
            mataPelajaran: mataPelajaran || 'Ilmu Pengetahuan Alam dan Sosial (IPAS)',
            fase: fase || 'Fase B',
            kelas: kelas || 'Kelas 4',
            babMateri: babMateri || 'Wujud Zat dan Perubahannya',
            subMateri: subMateri || 'Mengamati Perubahan Wujud Benda di Sekitar Kita',
            alokasiWaktu: alokasiWaktu,
            tipeAktivitas: tipeAktivitas,
          },
          tujuanPembelajaran: [
            `Peserta didik mampu mengidentifikasi karakteristik dan fenomena ${babMateri || 'pokok'} melalui observasi cermat dan telaah fakta.`,
            `Peserta didik mampu bekerja sama secara kompak dalam kelompok untuk mengolah data, merumuskan argumen logis, dan menarik kesimpulan.`,
            `Peserta didik mampu mensyukuri keteraturan ciptaan Allah Swt. dan membiasakan adab santun dalam keseharian.`
          ],
          petunjukBelajar: [
            'Awali aktivitas belajar dengan membaca basmalah dan doa sebelum belajar bersama anggota kelompok.',
            'Tuliskan identitas kelompok (nama anggota dan nomor presensi) pada kolom yang tersedia dengan rapi.',
            'Bacalah teks stimulus cerita kontekstual dengan saksama sebelum mengerjakan setiap aktivitas.',
            'Diskusikan setiap tugas dengan kompak, saling mendengarkan pendapat teman, dan catat hasil kesepakatan pada lembar kerja.',
            'Periksa kembali kelengkapan seluruh jawaban sebelum diserahkan kepada Ustadz / Ustadzah.'
          ],
          stimulusMateri: {
            judul: `Eksplorasi Konsep: Menemukan Hikmah ${babMateri || 'Materi Pokok'}`,
            teks: `Segala sesuatu di alam semesta ini diciptakan oleh Allah Swt. dengan ukuran, hukum, dan keteraturan yang sangat indah (sunnatullah). Dalam keseharian kita di sekolah maupun di rumah, kita sering menjumpai fenomena ${babMateri || 'materi ini'}, mulai dari proses alamiah di pagi hari hingga interaksi di sekitar kita. Melalui lembar kerja eksplorasi ini, kalian diajak menjadi para ilmuwan cilik yang teliti, berani mencoba, dan gemar mencari kebenaran ilmiah yang membawa manfaat.`,
            ceritaAtauKasusKontekstual: `Suatu hari di SDIT Al Fikri, Salman, Fathir, dan Maryam sedang mengamati fenomena di lingkungan sekolah. Mereka menemukan bahwa ketika terjadi perubahan kondisi atau perlakuan tertentu, muncul pola keteraturan yang sangat menarik untuk diselidiki. Salman bertanya, "Mengapa hal ini bisa terjadi secara konsisten?" Fathir mengusulkan agar mereka mencatat setiap ciri yang terlihat, sementara Maryam mengaitkannya dengan rasa syukur atas nikmat Allah Swt. yang telah menciptakan alam semesta ini dengan penuh hikmah. Mari kita bantu mereka memecahkan teka-teki ilmiah ini!`,
            pertanyaanPemandu: [
              'Berdasarkan cerita di atas, hal apa yang menarik perhatian Salman dan teman-temannya?',
              'Mengapa kita perlu melakukan penyelidikan yang jujur dan teliti saat mempelajari ilmu pengetahuan?'
            ],
            poinPenting: [
              'Keteraturan sunnatullah di alam semesta sebagai bukti keagungan Allah Swt.',
              'Pentingnya observasi ilmiah menggunakan panca indera dan nalar kritis.',
              'Kolaborasi aktif, kejujuran mencatat data, dan sikap saling menghormati.'
            ]
          },
          aktivitas: [
            {
              nomor: 1,
              judul: 'Aktivitas 1: Temukan Fakta & Pemetaan Ciri Objek (Eksplorasi Awal)',
              instruksi: 'Cermati teks bacaan dan amatilah fenomena di sekelilingmu. Diskusikan bersama teman kelompok, lalu lengkapilah tabel klasifikasi berikut dengan cermat!',
              formatJawaban: 'tabel',
              tabelData: {
                kolom: ['No', 'Objek / Fenomena Pengamatan', 'Ciri Khas yang Teramati', 'Kategori / Kesimpulan Sementara'],
                baris: [
                  ['1', 'Contoh Kasus 1 di Lingkungan Sekolah', '....................................................', '....................................'],
                  ['2', 'Contoh Kasus 2 dalam Keseharian di Rumah', '....................................................', '....................................'],
                  ['3', 'Contoh Kasus 3 di Lingkungan Alam Terbuka', '....................................................', '....................................']
                ]
              },
              ruangJawab: 'Catatan pengamatan tambahan kelompok: ....................................................................'
            },
            {
              nomor: 2,
              judul: 'Aktivitas 2: Analisis Observasi & Klasifikasi Ilmiah',
              instruksi: 'Bandingkan data yang telah kalian kumpulkan pada Aktivitas 1. Analisislah persamaan dan perbedaan utamanya berdasarkan konsep materi pokok!',
              formatJawaban: 'isian',
              soalAtauPertanyaan: [
                `Apa persamaan utama yang kalian temukan dari ketiga contoh di atas terkait materi ${babMateri || 'pokok'}?`,
                'Faktor apa saja yang mempengaruhi terjadinya perubahan atau perbedaan pada contoh-contoh tersebut?',
                'Bagaimana cara membuktikan kebenaran fakta tersebut secara ilmiah dan terukur?'
              ],
              ruangJawab: 'Tuliskan hasil diskusi analisis kelompok pada baris isian terstruktur yang disediakan.'
            },
            {
              nomor: 3,
              judul: 'Aktivitas 3: Studi Kasus Pemecahan Masalah Kritis (HOTS)',
              instruksi: 'Bacalah studi kasus tantangan berikut, rumuskan solusi terbaik dari kelompokmu, dan berikan alasan logis!',
              formatJawaban: 'isian',
              soalAtauPertanyaan: [
                'Jika kalian menghadapi situasi di mana terjadi kendala pada fenomena tersebut, langkah nyata apa yang akan kalian lakukan?',
                'Bagaimana solusi tersebut mencerminkan sikap amanah, tanggung jawab, dan kepedulian terhadap sesama manusia?',
                'Tuliskan satu hikmah kebaikan yang kelompok kalian peroleh dari penyelesaian kasus ini!'
              ],
              ruangJawab: 'Tuliskan argumen dan solusi kritis kelompokmu di sini.'
            },
            {
              nomor: 4,
              judul: 'Aktivitas 4: Kesimpulan & Aksi Nyata Karakter Islami',
              instruksi: 'Rangkumlah intisari pembelajaran hari ini ke dalam kalimat yang jelas dan tentukan satu komitmen kebaikan bersama!',
              formatJawaban: 'refleksi',
              soalAtauPertanyaan: [
                'Kesimpulan Inti Pembelajaran Hari Ini:',
                'Komitmen Nyata Kelompok Kami untuk Diamalkan di Sekolah/Rumah:'
              ],
              ruangJawab: 'Tuliskan kesimpulan dan komitmen kelompok pada kotak komitmen.'
            }
          ],
          kunciJawabanDanRubrik: {
            panduanGuru: 'Guru berkeliling memfasilitasi diskusi setiap kelompok, memberikan pertanyaan penuntun (scaffolding) bagi murid yang mengalami hambatan, serta menilai keaktifan interaksi santun.',
            rubrikPenilaian: [
              {
                aspek: 'Ketepatan Konsep & Analisis Ilmiah',
                skor4: 'Seluruh analisis tepat, mendalam, didukung bukti logis dan data akurat.',
                skor3: 'Sebagian besar analisis tepat dengan penjelasan yang cukup jelas.',
                skor2: 'Terdapat beberapa kekeliruan konsep dalam penjelasan namun arah analisis benar.',
                skor1: 'Konsep belum tepat dan membutuhkan bimbingan intensif dari guru.'
              },
              {
                aspek: 'Kerja Sama & Keterlibatan Anggota',
                skor4: 'Semua anggota berpartisipasi aktif, saling menghargai pendapat, dan kompak.',
                skor3: 'Sebagian besar anggota aktif berkontribusi dalam pengerjaan.',
                skor2: 'Hanya sebagian kecil anggota yang aktif berdiskusi.',
                skor1: 'Kelompok tidak kompak dan pasif dalam berdiskusi.'
              },
              {
                aspek: 'Kerapian, Kelengkapan & Ketepatan Waktu',
                skor4: 'LKPD terisi lengkap, tulisan rapi, dan selesai tepat pada waktu yang ditentukan.',
                skor3: 'LKPD lengkap dan rapi dengan sedikit toleransi keterlambatan waktu.',
                skor2: 'LKPD kurang lengkap atau kurang rapi dalam penyajian.',
                skor1: 'LKPD banyak yang kosong dan melewati batas waktu pengumpulan.'
              }
            ],
            kunciJawabanAktivitas: [
              {
                nomor: 1,
                jawaban: 'Peserta didik mengisi tabel dengan mencantumkan ciri fisik atau bukti ilmiah yang teramati secara nyata sesuai instruksi pengamatan.'
              },
              {
                nomor: 2,
                jawaban: 'Jawaban analisis membandingkan keteraturan hukum alam/konsep, menguraikan faktor penyebab, dan merumuskan argumen berdasarkan bukti fakta.'
              },
              {
                nomor: 3,
                jawaban: 'Solusi memuat langkah konkret yang logis, bertanggung jawab, dan mengintegrasikan nilai kepedulian sosial serta adab islami.'
              },
              {
                nomor: 4,
                jawaban: 'Kesimpulan merangkum definisi dan manfaat konsep materi secara utuh, disertai komitmen perilaku terpuji dalam keseharian.'
              }
            ]
          },
          refleksiDiriSiswa: [
            'Saya merasa senang dan antusias saat menyelesaikan tantangan di LKPD ini bersama teman-teman.',
            'Saya mampu memahami materi pelajaran dengan lebih jelas melalui kegiatan observasi langsung.',
            'Saya siap menerapkan ilmu dan komitmen kebaikan ini dalam kehidupan sehari-hari.'
          ]
        }
      });
    }

    const prompt = `
Anda adalah Pakar Pengembang Lembar Kerja Peserta Didik (LKPD) Inovatif untuk Sekolah Dasar / Madrasah Ibtidaiyah (SDIT Al Fikri) berbasis Kurikulum Merdeka.
Susunlah LKPD (Lembar Kerja Peserta Didik) yang SANGAT LENGKAP, MENDALAM, MENARIK, DAN BERBOBOT.
LKPD ini BUKAN sekadar lembaran singkat, melainkan instrumen belajar komprehensif yang memuat narasi stimulus kontekstual kaya, 4 aktivitas bertingkat (C1 sampai C5 HOTS), kunci jawaban detail, serta rubrik analitik guru.

INPUT PARAMETER:
- Satuan Pendidikan: SDIT Al Fikri
- Mata Pelajaran: ${mataPelajaran}
- Fase & Kelas: ${fase} / ${kelas}
- Bab / Topik Materi Pokok: ${babMateri}
- Sub-Materi / Fokus: ${subMateri || '-'}
- Tipe Aktivitas: ${tipeAktivitas}
- Tingkat Kesulitan: ${tingkatKesulitan}
- Alokasi Waktu: ${alokasiWaktu}
- Integrasi Keislaman SDIT: ${integrasiKeislaman ? 'Ya, sertakan hikmah kebesaran Allah Swt., adab, atau teladan islami kontekstual' : 'Umum'}
- Format Bilingual: ${bilingual ? 'Sertakan terminologi penting dalam Bahasa Inggris atau Bahasa Arab' : 'Bahasa Indonesia baku yang ramah anak'}
- Catatan / Permintaan Khusus: ${petunjukTambahan || '-'}

FORMAT LKPD HARUS MEMILIKI:
1. Identitas LKPD lengkap.
2. Tujuan Pembelajaran terukur dan ramah anak.
3. Petunjuk Belajar jelas (diawali doa).
4. Stimulus Materi: WAJIB memuat narasi cerita / studi kasus kontekstual (2-3 paragraf mendalam dengan nama tokoh anak SDIT dan masalah nyata) serta pertanyaan pemandu.
5. Empat (4) Aktivitas Berjenjang:
   - Aktivitas 1: Temukan Fakta & Pemetaan Ciri (Format tabel pengamatan).
   - Aktivitas 2: Analisis Observasi & Klasifikasi Ilmiah (Pertanyaan telaah mendalam).
   - Aktivitas 3: Studi Kasus Pemecahan Masalah Kritis / HOTS (Tantangan kontekstual pemecahan masalah nyata).
   - Aktivitas 4: Kesimpulan & Aksi Nyata Karakter Islami (Komitmen kebaikan).
6. Kunci Jawaban Lengkap dan Rubrik Penilaian Guru skala 4-3-2-1.
7. Refleksi Diri Siswa.

OUTPUT WAJIB DALAM FORMAT JSON MURNI TANPA MARKDOWN TAMBAHAN:
{
  "identitas": {
    "namaSekolah": "SDIT Al Fikri",
    "judulLkpd": "LEMBAR KERJA PESERTA DIDIK (LKPD): ${babMateri}",
    "mataPelajaran": "${mataPelajaran}",
    "fase": "${fase}",
    "kelas": "${kelas}",
    "babMateri": "${babMateri}",
    "subMateri": "${subMateri || babMateri}",
    "alokasiWaktu": "${alokasiWaktu}",
    "tipeAktivitas": "${tipeAktivitas}"
  },
  "tujuanPembelajaran": ["Tujuan 1", "Tujuan 2", "Tujuan 3"],
  "petunjukBelajar": ["Petunjuk 1 (doa)", "Petunjuk 2", "Petunjuk 3", "Petunjuk 4"],
  "stimulusMateri": {
    "judul": "Judul Stimulus Menarik",
    "teks": "Paragraf pengantar kontekstual mengenai keteraturan alam dan hikmah ciptaan Allah.",
    "ceritaAtauKasusKontekstual": "Narasi cerita edukatif atau studi kasus kontekstual setebal 2-3 paragraf kaya detail tentang anak SDIT Al Fikri yang mengamati fenomena ini.",
    "pertanyaanPemandu": ["Pertanyaan pemandu 1 dari cerita", "Pertanyaan pemandu 2"],
    "poinPenting": ["Poin penting 1", "Poin penting 2", "Poin penting 3"]
  },
  "aktivitas": [
    {
      "nomor": 1,
      "judul": "Aktivitas 1: Temukan Fakta & Pemetaan Ciri",
      "instruksi": "Instruksi kerja jelas dan mendalam...",
      "formatJawaban": "tabel",
      "tabelData": {
        "kolom": ["No", "Objek / Fenomena Pengamatan", "Ciri Khas yang Teramati", "Kategori / Kesimpulan"],
        "baris": [
          ["1", "Contoh 1", "....................................................", "...................................."],
          ["2", "Contoh 2", "....................................................", "...................................."],
          ["3", "Contoh 3", "....................................................", "...................................."]
        ]
      },
      "ruangJawab": "Catatan pengamatan tambahan kelompok..."
    },
    {
      "nomor": 2,
      "judul": "Aktivitas 2: Analisis Observasi & Klasifikasi Ilmiah",
      "instruksi": "Bandingkan data dan analisislah berdasarkan konsep materi...",
      "formatJawaban": "isian",
      "soalAtauPertanyaan": ["Pertanyaan analisis 1", "Pertanyaan analisis 2", "Pertanyaan analisis 3"],
      "ruangJawab": "Ruang jawaban analisis..."
    },
    {
      "nomor": 3,
      "judul": "Aktivitas 3: Studi Kasus Pemecahan Masalah Kritis (HOTS)",
      "instruksi": "Pecahkan kasus nyata berikut dengan nalar kritis dan sikap tanggung jawab...",
      "formatJawaban": "isian",
      "soalAtauPertanyaan": ["Pertanyaan pemecahan kasus 1", "Pertanyaan pemecahan kasus 2", "Pertanyaan pemecahan kasus 3"],
      "ruangJawab": "Ruang solusi pemecahan kasus..."
    },
    {
      "nomor": 4,
      "judul": "Aktivitas 4: Kesimpulan & Aksi Nyata Karakter Islami",
      "instruksi": "Tuliskan kesimpulan utama dan komitmen kebaikan kelompok...",
      "formatJawaban": "refleksi",
      "soalAtauPertanyaan": ["Kesimpulan Inti Pembelajaran:", "Komitmen Nyata Kelompok Kami:"],
      "ruangJawab": "Ruang kesimpulan dan komitmen..."
    }
  ],
  "kunciJawabanDanRubrik": {
    "panduanGuru": "Panduan fasilitasi KBM untuk guru pengampu",
    "rubrikPenilaian": [
      {
        "aspek": "Ketepatan Konsep & Analisis Ilmiah",
        "skor4": "Kriteria skor 4 (Sangat Baik)",
        "skor3": "Kriteria skor 3 (Baik)",
        "skor2": "Kriteria skor 2 (Cukup)",
        "skor1": "Kriteria skor 1 (Perlu Bimbingan)"
      },
      {
        "aspek": "Kerja Sama & Partisipasi Kelompok",
        "skor4": "Kriteria skor 4",
        "skor3": "Kriteria skor 3",
        "skor2": "Kriteria skor 2",
        "skor1": "Kriteria skor 1"
      },
      {
        "aspek": "Kerapian, Kelengkapan & Ketepatan Waktu",
        "skor4": "Kriteria skor 4",
        "skor3": "Kriteria skor 3",
        "skor2": "Kriteria skor 2",
        "skor1": "Kriteria skor 1"
      }
    ],
    "kunciJawabanAktivitas": [
      { "nomor": 1, "jawaban": "Kunci dan panduan jawaban aktivitas 1 secara terperinci" },
      { "nomor": 2, "jawaban": "Kunci dan panduan jawaban aktivitas 2 secara terperinci" },
      { "nomor": 3, "jawaban": "Kunci dan panduan jawaban aktivitas 3 secara terperinci" },
      { "nomor": 4, "jawaban": "Kunci dan panduan jawaban aktivitas 4 secara terperinci" }
    ]
  },
  "refleksiDiriSiswa": [
    "Saya merasa senang dan aktif dalam kegiatan pembelajaran hari ini.",
    "Saya memahami materi yang dipelajari dengan baik melalui lembar kerja ini.",
    "Saya siap menerapkan komitmen kebaikan ini dalam keseharian."
  ]
}
`;

    const response = await generateContentWithRetry(ai, {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        responseMimeType: 'application/json',
        temperature: 0.6,
      },
    });

    const text = response.text || '{}';
    const parsed = safeExtractJson(text);
    return res.json({ status: 'ok', lkpd: parsed });
  } catch (err: any) {
    console.error('Error generating LKPD with Gemini:', err);
    return res.status(500).json({
      status: 'error',
      message: err?.message || 'Gagal menyusun LKPD dengan AI.'
    });
  }
});

// ========================================================
// 3D. ENDPOINT: GENERATE PROTA (PROGRAM TAHUNAN)
// ========================================================
app.post('/api/evaluation/generate-prota', async (req, res) => {
  try {
    const {
      mataPelajaran = 'Pendidikan Agama Islam',
      kelas = 'Kelas 4',
      fase = 'Fase B',
      tahunPelajaran = '2025/2026',
      namaPenyusun = 'Guru Pengampu SDIT Al Fikri',
      namaKepalaSekolah = 'M. Yunus, S.Ag',
      jpPerMinggu = 4,
      modeAcuan = 'kurikulum_nasional',
      daftarBabBuku = '',
      fokusMateri = '',
      integrasiIslami = true,
      pekanEfektif1 = 20,
      pekanEfektif2 = 19,
    } = req.body;

    const ai = getGeminiClient();

    const sem1Weeks = Number(pekanEfektif1) || 20;
    const sem2Weeks = Number(pekanEfektif2) || 19;
    const jpMinggu = Number(jpPerMinggu) || 4;

    const defaultProta = {
      identitas: {
        namaSekolah: 'SDIT Al Fikri',
        mataPelajaran,
        fase,
        kelas,
        tahunPelajaran,
        penyusun: namaPenyusun,
        kepalaSekolah: namaKepalaSekolah,
        jpPerMinggu: jpMinggu,
        modeAcuan,
      },
      rincianMingguEfektif: {
        semester1: {
          totalMinggu: 26,
          mingguTidakEfektif: 26 - sem1Weeks,
          mingguEfektif: sem1Weeks,
          totalJP: sem1Weeks * jpMinggu,
        },
        semester2: {
          totalMinggu: 26,
          mingguTidakEfektif: 26 - sem2Weeks,
          mingguEfektif: sem2Weeks,
          totalJP: sem2Weeks * jpMinggu,
        },
        totalMingguEfektifTahunan: sem1Weeks + sem2Weeks,
        totalJPTahunan: (sem1Weeks + sem2Weeks) * jpMinggu,
      },
      distribusiMateri: [
        {
          no: 1,
          semester: 1,
          elemen: 'Fondasi Konsep & Literasi',
          capaianPembelajaran: 'Memahami teks dan pesan pokok materi secara mendalam serta mengamalkannya dalam kehidupan sehari-hari.',
          tujuanPembelajaran: '1.1 Memahami makna, pesan pokok, dan konsep utama secara terstruktur.',
          materiPokok: 'Bab 1: Eksplorasi Konsep Dasar & Pemahaman Awal',
          alokasiWaktuJP: Math.round(jpMinggu * 4),
          keterangan: 'KBM Efektif + Formatif'
        },
        {
          no: 2,
          semester: 1,
          elemen: 'Akidah & Karakter / Nalar Kritis',
          capaianPembelajaran: 'Mengenal sifat-sifat mulia, prinsip ketauhidan, dan mengimplementasikannya dalam pembiasaan adab.',
          tujuanPembelajaran: '1.2 Menjelaskan makna nilai-nilai luhur dan menghubungkannya dengan fenomena kontekstual.',
          materiPokok: 'Bab 2: Pembentukan Karakter & Penerapan Konseptual',
          alokasiWaktuJP: Math.round(jpMinggu * 4),
          keterangan: 'KBM Efektif + Unjuk Kerja'
        },
        {
          no: 3,
          semester: 1,
          elemen: 'Akhlak & Adab Terpuji',
          capaianPembelajaran: 'Membiasakan perilaku terpuji kepada sesama teman, guru, orang tua, dan lingkungan sekitar.',
          tujuanPembelajaran: '1.3 Menampilkan sikap santun, jujur, peduli, dan bertanggung jawab di sekolah dan rumah.',
          materiPokok: 'Bab 3: Implementasi Adab & Akhlak Luhur Islami',
          alokasiWaktuJP: Math.round(jpMinggu * 4),
          keterangan: 'KBM Efektif + Observasi Sikap'
        },
        {
          no: 4,
          semester: 1,
          elemen: 'Evaluasi Tengah Semester (STS)',
          capaianPembelajaran: 'Mengukur ketercapaian kompetensi pembelajaran paruh semester pertama.',
          tujuanPembelajaran: '1.4 Melaksanakan refleksi dan evaluasi sumatif tengah semester (STS).',
          materiPokok: 'Sumatif Tengah Semester (STS) 1 & Remedial / Pengayaan',
          alokasiWaktuJP: jpMinggu * 2,
          keterangan: 'Jadwal STS Sekolah'
        },
        {
          no: 5,
          semester: 1,
          elemen: 'Fikih Ibadah / Praktik Aplikasi',
          capaianPembelajaran: 'Memahami tata cara dan ketentuan pelaksanaan ibadah serta kegiatan ilmiah secara teratur.',
          tujuanPembelajaran: '1.5 Mempraktikkan tata cara dan prosedur yang benar dan tertib.',
          materiPokok: 'Bab 4: Keterampilan Praktik Ibadah & Pembiasaan Harian',
          alokasiWaktuJP: Math.round(jpMinggu * 4),
          keterangan: 'KBM Efektif + Praktik'
        },
        {
          no: 6,
          semester: 1,
          elemen: 'Asesmen Sumatif Akhir Semester (SAS)',
          capaianPembelajaran: 'Mengukur ketercapaian seluruh tujuan pembelajaran pada Semester 1.',
          tujuanPembelajaran: '1.6 Mengikuti asesmen sumatif akhir semester (SAS) dan refleksi semester 1.',
          materiPokok: 'Sumatif Akhir Semester (SAS) 1 & Pembagian Rapor',
          alokasiWaktuJP: jpMinggu * 2,
          keterangan: 'Jadwal SAS Sekolah'
        },
        {
          no: 7,
          semester: 2,
          elemen: 'Sejarah / Pengetahuan Lingkungan & Sosial',
          capaianPembelajaran: 'Memahami keteladanan tokoh mulia dan kearifan lingkungan dalam membangun peradaban.',
          tujuanPembelajaran: '2.1 Mengidentifikasi kisah teladan dan mengambil ibrah untuk diterapkan dalam kehidupan.',
          materiPokok: 'Bab 5: Ibrah Keteladanan & Kisah Tokoh Inspiratif',
          alokasiWaktuJP: Math.round(jpMinggu * 4),
          keterangan: 'KBM Efektif + Diskusi Studi Kasus'
        },
        {
          no: 8,
          semester: 2,
          elemen: 'Literasi Kritis & Sains Kontekstual',
          capaianPembelajaran: 'Menganalisis fenomena sains dan sosial dengan berlandaskan keimanan dan nalar kritis.',
          tujuanPembelajaran: '2.2 Menyajikan gagasan solutif atas masalah lingkungan atau sosial di sekitar.',
          materiPokok: 'Bab 6: Kolaborasi Proyek Literasi & Sains Kontekstual',
          alokasiWaktuJP: Math.round(jpMinggu * 4),
          keterangan: 'KBM Efektif + Mini Project'
        },
        {
          no: 9,
          semester: 2,
          elemen: 'Sumatif Tengah Semester (STS) 2',
          capaianPembelajaran: 'Evaluasi ketercapaian tujuan pembelajaran paruh semester genap.',
          tujuanPembelajaran: '2.3 Melaksanakan asesmen sumatif tengah semester 2.',
          materiPokok: 'Sumatif Tengah Semester (STS) 2 & Pembahasan Evaluasi',
          alokasiWaktuJP: jpMinggu * 2,
          keterangan: 'Jadwal STS Sekolah'
        },
        {
          no: 10,
          semester: 2,
          elemen: 'Penguatan Karakter & Aksi Nyata Berkelanjutan',
          capaianPembelajaran: 'Menginternalisasi nilai-nilai keislaman terpadu dan Profil Pelajar Pancasila dalam tindakan nyata.',
          tujuanPembelajaran: '2.4 Menghasilkan karya atau aksi nyata yang bermanfaat bagi lingkungan sekolah/masyarakat.',
          materiPokok: 'Bab 7: Aksi Nyata Karakter & Gelar Karya Pembelajaran',
          alokasiWaktuJP: Math.round(jpMinggu * 4),
          keterangan: 'KBM Efektif + Pameran Karya'
        },
        {
          no: 11,
          semester: 2,
          elemen: 'Sumatif Akhir Tahun (SAT) / Kenaikan Kelas',
          capaianPembelajaran: 'Mengukur ketercapaian seluruh capaian pembelajaran tingkat kelas.',
          tujuanPembelajaran: '2.5 Melaksanakan asesmen sumatif akhir tahun (SAT) dan persiapan kenaikan kelas.',
          materiPokok: 'Sumatif Akhir Tahun (SAT), Leger Nilai & Penyerahan Rapor Kenaikan Kelas',
          alokasiWaktuJP: jpMinggu * 2,
          keterangan: 'Jadwal SAT Sekolah'
        }
      ]
    };

    if (!ai) {
      return res.json({ status: 'ok', source: 'fallback', prota: defaultProta });
    }

    const panduanSumberAcuan =
      modeAcuan === 'buku_paket' && daftarBabBuku && daftarBabBuku.trim().length > 0
        ? `SUMBER ACUAN: DAFTAR ISI BUKU PAKET SISWA (BUKU PEGANGAN GURU/SISWA)
Berikut adalah daftar bab / topik buku paket yang diinput oleh guru:
"""
${daftarBabBuku.trim()}
"""
PETUNJUK WAJIB SUMBER BUKU PAKET:
1. Anda HARUS menggunakan bab-bab/topik di atas sebagai "materiPokok" utama secara berurutan. Jangan mengubah nama bab atau menggantinya dengan topik lain di luar daftar tersebut.
2. Petakan setiap bab buku paket tersebut ke elemen Kurikulum Merdeka yang paling sesuai, dan rumuskan Tujuan Pembelajaran (TP) yang jelas dan operasional untuk tiap bab.
3. Bagikan bab-bab tersebut ke Semester 1 dan Semester 2 secara seimbang, serta sisipkan agenda STS (Sumatif Tengah Semester) dan SAS/SAT (Sumatif Akhir Semester/Tahun).`
        : `SUMBER ACUAN: STANDAR KURIKULUM NASIONAL (CAPAIAN PEMBELAJARAN BSKAP 046/H/KR/2025).
${fokusMateri ? `Catatan / Fokus materi khusus dari guru: "${fokusMateri}"` : ''}
Susunlah pemetaan Alur Tujuan Pembelajaran (ATP) dan materi pokok esensial sesuai standar resmi jenjang SD/MI Fase ${fase} / ${kelas}.`;

    const prompt = `
Anda adalah Pakar Kurikulum Merdeka Sekolah Dasar (SD/MI) berstandar BSKAP Kemendikbudristek No 046/H/KR/2025 dan Konsultan JSIT (SDIT Al Fikri).
Susunlah "PROGRAM TAHUNAN (PROTA)" Kurikulum Merdeka yang sangat rapi, akurat, dan realistis untuk 1 tahun ajaran penuh (Semester 1 & 2).

INPUT PARAMETER:
- Satuan Pendidikan: SDIT Al Fikri
- Mata Pelajaran: ${mataPelajaran}
- Fase & Kelas: ${fase} / ${kelas}
- Tahun Pelajaran: ${tahunPelajaran}
- Alokasi Jam per Minggu: ${jpMinggu} JP
- Guru Pengampu: ${namaPenyusun}
- Kepala Sekolah: ${namaKepalaSekolah}
- Alokasi Minggu Efektif: Semester 1 = ${sem1Weeks} minggu (${sem1Weeks * jpMinggu} JP), Semester 2 = ${sem2Weeks} minggu (${sem2Weeks * jpMinggu} JP)
${integrasiIslami ? '- Integrasikan nilai-nilai karakter Islami (ADAB, Al-Qur’an/Hadits, Profil Pelajar Rahmatan Lil Alamin & Pancasila)' : ''}

${panduanSumberAcuan}

OUTPUT DALAM FORMAT JSON MURNI TANPA MARKDOWN:
{
  "identitas": {
    "namaSekolah": "SDIT Al Fikri",
    "mataPelajaran": "${mataPelajaran}",
    "fase": "${fase}",
    "kelas": "${kelas}",
    "tahunPelajaran": "${tahunPelajaran}",
    "penyusun": "${namaPenyusun}",
    "kepalaSekolah": "${namaKepalaSekolah}",
    "jpPerMinggu": ${jpMinggu}
  },
  "rincianMingguEfektif": {
    "semester1": { "totalMinggu": 26, "mingguTidakEfektif": ${26 - sem1Weeks}, "mingguEfektif": ${sem1Weeks}, "totalJP": ${sem1Weeks * jpMinggu} },
    "semester2": { "totalMinggu": 26, "mingguTidakEfektif": ${26 - sem2Weeks}, "mingguEfektif": ${sem2Weeks}, "totalJP": ${sem2Weeks * jpMinggu} },
    "totalMingguEfektifTahunan": ${sem1Weeks + sem2Weeks},
    "totalJPTahunan": ${(sem1Weeks + sem2Weeks) * jpMinggu}
  },
  "distribusiMateri": [
    {
      "no": 1,
      "semester": 1,
      "elemen": "Nama Elemen Kurikulum Merdeka",
      "capaianPembelajaran": "Rumusan CP",
      "tujuanPembelajaran": "TP 1.1 ...",
      "materiPokok": "Bab 1: ...",
      "alokasiWaktuJP": 16,
      "keterangan": "KBM Efektif"
    }
  ]
}
`;

    const response = await generateContentWithRetry(ai, {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { responseMimeType: 'application/json', temperature: 0.5 },
    });

    const text = response.text || '{}';
    const parsed = safeExtractJson(text);
    return res.json({ status: 'ok', prota: parsed });
  } catch (err: any) {
    console.error('Error generating Prota with Gemini:', err);
    return res.status(500).json({ status: 'error', message: err?.message || 'Gagal menyusun Prota.' });
  }
});

// ========================================================
// 3E. ENDPOINT: GENERATE PROMES (PROGRAM SEMESTER)
// ========================================================
app.post('/api/evaluation/generate-promes', async (req, res) => {
  try {
    const {
      mataPelajaran = 'Pendidikan Agama Islam',
      kelas = 'Kelas 4',
      fase = 'Fase B',
      semester = '1 (Ganjil)',
      tahunPelajaran = '2025/2026',
      namaPenyusun = 'Guru Pengampu SDIT Al Fikri',
      namaKepalaSekolah = 'M. Yunus, S.Ag',
      jpPerMinggu = 4,
      modeAcuan = 'kurikulum_nasional',
      daftarBabBuku = '',
      fokusMateri = '',
      integrasiIslami = true,
      pekanEfektif = 18,
      pekanCadangan = 2,
    } = req.body;

    const isSemester1 = String(semester).includes('1') || String(semester).toLowerCase().includes('ganjil');
    const bulanDaftar = isSemester1
      ? ['Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
      : ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni'];

    const ai = getGeminiClient();
    const jpMinggu = Number(jpPerMinggu) || 4;

    const defaultPromes = {
      identitas: {
        namaSekolah: 'SDIT Al Fikri',
        mataPelajaran,
        fase,
        kelas,
        semester: isSemester1 ? 'Semester 1 (Ganjil)' : 'Semester 2 (Genap)',
        tahunPelajaran,
        penyusun: namaPenyusun,
        kepalaSekolah: namaKepalaSekolah,
        jpPerMinggu: jpMinggu,
        modeAcuan,
      },
      bulan: bulanDaftar.map((nama) => ({
        nama,
        mingguKe: [1, 2, 3, 4, 5],
      })),
      agendaKhusus: [
        { kode: 'STS', nama: 'Sumatif Tengah Semester', warna: 'bg-amber-500/20 text-amber-300' },
        { kode: 'SAS', nama: 'Sumatif Akhir Semester / SAT', warna: 'bg-rose-500/20 text-rose-300' },
        { kode: 'P5', nama: 'Projek Penguatan P5', warna: 'bg-indigo-500/20 text-indigo-300' },
        { kode: 'LIB', nama: 'Libur Semester / Nasional', warna: 'bg-slate-700 text-slate-300' },
      ],
      distribusiBab: [
        {
          no: 1,
          elemen: 'Fondasi Konsep & Literasi',
          tujuanPembelajaran: 'Menganalisis konsep dasar dan karakteristik materi esensial secara kritis dan santun.',
          materiPokok: isSemester1 ? 'Bab 1: Eksplorasi Konsep Dasar & Pemahaman Awal' : 'Bab 5: Ibrah Keteladanan Tokoh Inspiratif',
          alokasiJP: jpMinggu * 4,
          alokasiMingguan: {
            [`${bulanDaftar[0]}_3`]: jpMinggu,
            [`${bulanDaftar[0]}_4`]: jpMinggu,
            [`${bulanDaftar[1]}_1`]: jpMinggu,
            [`${bulanDaftar[1]}_2`]: jpMinggu,
          }
        },
        {
          no: 2,
          elemen: 'Karakter & Nilai Keislaman',
          tujuanPembelajaran: 'Menghubungkan nilai-nilai luhur dengan fenomena kontekstual dalam pembiasaan adab.',
          materiPokok: isSemester1 ? 'Bab 2: Pembentukan Karakter & Penerapan Konseptual' : 'Bab 6: Kolaborasi Proyek Literasi & Sains',
          alokasiJP: jpMinggu * 4,
          alokasiMingguan: {
            [`${bulanDaftar[1]}_3`]: jpMinggu,
            [`${bulanDaftar[1]}_4`]: jpMinggu,
            [`${bulanDaftar[2]}_1`]: jpMinggu,
            [`${bulanDaftar[2]}_2`]: jpMinggu,
          }
        },
        {
          no: 3,
          elemen: 'Evaluasi Tengah Semester',
          tujuanPembelajaran: 'Mengukur ketercapaian kompetensi paruh semester pertama/kedua.',
          materiPokok: 'Sumatif Tengah Semester (STS) & Pembahasan Refleksi',
          alokasiJP: jpMinggu * 2,
          alokasiMingguan: {
            [`${bulanDaftar[2]}_3`]: 'STS',
            [`${bulanDaftar[2]}_4`]: jpMinggu,
          }
        },
        {
          no: 4,
          elemen: 'Aplikasi Praktik & Kolaborasi',
          tujuanPembelajaran: 'Mempraktikkan keterampilan dan adab terpuji melalui kerja sama kelompok.',
          materiPokok: isSemester1 ? 'Bab 3: Implementasi Adab & Akhlak Luhur Islami' : 'Bab 7: Aksi Nyata Karakter & Gelar Karya',
          alokasiJP: jpMinggu * 4,
          alokasiMingguan: {
            [`${bulanDaftar[3]}_1`]: jpMinggu,
            [`${bulanDaftar[3]}_2`]: jpMinggu,
            [`${bulanDaftar[3]}_3`]: jpMinggu,
            [`${bulanDaftar[3]}_4`]: jpMinggu,
          }
        },
        {
          no: 5,
          elemen: 'Projek & Asesmen Akhir',
          tujuanPembelajaran: 'Mengukur seluruh capaian pembelajaran semester secara komprehensif.',
          materiPokok: isSemester1 ? 'Sumatif Akhir Semester (SAS) 1 & Rapor' : 'Sumatif Akhir Tahun (SAT) & Kenaikan Kelas',
          alokasiJP: jpMinggu * 2,
          alokasiMingguan: {
            [`${bulanDaftar[4]}_4`]: 'SAS',
            [`${bulanDaftar[5]}_1`]: 'SAS',
            [`${bulanDaftar[5]}_2`]: 'Rapor',
            [`${bulanDaftar[5]}_3`]: 'LIB',
            [`${bulanDaftar[5]}_4`]: 'LIB',
          }
        }
      ]
    };

    if (!ai) {
      return res.json({ status: 'ok', source: 'fallback', promes: defaultPromes });
    }

    const panduanSumberAcuanPromes =
      modeAcuan === 'buku_paket' && daftarBabBuku && daftarBabBuku.trim().length > 0
        ? `SUMBER ACUAN: DAFTAR ISI BUKU PAKET SISWA (BUKU PEGANGAN GURU/SISWA)
Berikut adalah daftar bab / topik yang diajarkan pada semester ini:
"""
${daftarBabBuku.trim()}
"""
PETUNJUK WAJIB SUMBER BUKU PAKET:
1. Jadikan setiap bab/unit di atas sebagai "materiPokok" dalam tabel distribusi PROMES secara runtut (jangan mengubah nama bab buku).
2. Rumuskan elemen Kurikulum Merdeka dan Tujuan Pembelajaran (TP) terukur untuk masing-masing bab buku tersebut.
3. Distribusikan alokasi mingguan (kolom bulan & mingguKe) secara realistis sesuai ${jpMinggu} JP per minggu dengan total ± ${pekanEfektif} pekan efektif.
4. Sisipkan jadwal agenda khusus seperti STS pada akhir bulan ke-3 (minggu 3/4), SAS/SAT pada bulan ke-5/ke-6, dan minggu libur.`
        : `SUMBER ACUAN: STANDAR KURIKULUM NASIONAL (CAPAIAN PEMBELAJARAN BSKAP 046/H/KR/2025).
${fokusMateri ? `Catatan / Fokus materi khusus dari guru: "${fokusMateri}"` : ''}
Susunlah bab-bab esensial sesuai standar resmi jenjang SD/MI Fase ${fase} / ${kelas}.`;

    const prompt = `
Anda adalah Pakar Kurikulum Merdeka Sekolah Dasar (SD/MI) berstandar BSKAP Kemendikbudristek No 046/H/KR/2025 dan Konsultan JSIT (SDIT Al Fikri).
Susunlah "PROGRAM SEMESTER (PROMES)" Kurikulum Merdeka dalam format matriks kalender mingguan untuk ${isSemester1 ? 'Semester 1 (Juli - Desember)' : 'Semester 2 (Januari - Juni)'}.

INPUT PARAMETER:
- Satuan Pendidikan: SDIT Al Fikri
- Mata Pelajaran: ${mataPelajaran}
- Fase & Kelas: ${fase} / ${kelas}
- Semester: ${isSemester1 ? 'Semester 1 (Ganjil)' : 'Semester 2 (Genap)'}
- Tahun Pelajaran: ${tahunPelajaran}
- Alokasi Jam per Minggu: ${jpMinggu} JP
- Guru Pengampu: ${namaPenyusun}
- Kepala Sekolah: ${namaKepalaSekolah}
- Bulan: ${bulanDaftar.join(', ')} (masing-masing 5 minggu per bulan)
- Target Minggu Efektif KBM: ± ${pekanEfektif} pekan (${pekanEfektif * jpMinggu} JP)
${integrasiIslami ? '- Integrasikan nilai-nilai karakter Islami (ADAB, Al-Qur’an/Hadits, Profil Pelajar Pancasila & Rahmatan Lil Alamin)' : ''}

${panduanSumberAcuanPromes}

OUTPUT DALAM FORMAT JSON MURNI TANPA MARKDOWN:
{
  "identitas": {
    "namaSekolah": "SDIT Al Fikri",
    "mataPelajaran": "${mataPelajaran}",
    "fase": "${fase}",
    "kelas": "${kelas}",
    "semester": "${isSemester1 ? 'Semester 1 (Ganjil)' : 'Semester 2 (Genap)'}",
    "tahunPelajaran": "${tahunPelajaran}",
    "penyusun": "${namaPenyusun}",
    "kepalaSekolah": "${namaKepalaSekolah}",
    "jpPerMinggu": ${jpMinggu}
  },
  "bulan": [
    ${bulanDaftar.map((b) => `{"nama": "${b}", "mingguKe": [1, 2, 3, 4, 5]}`).join(',\n    ')}
  ],
  "agendaKhusus": [
    { "kode": "STS", "nama": "Sumatif Tengah Semester", "warna": "bg-amber-500/20 text-amber-300" },
    { "kode": "SAS", "nama": "Sumatif Akhir Semester / SAT", "warna": "bg-rose-500/20 text-rose-300" },
    { "kode": "P5", "nama": "Projek Penguatan P5", "warna": "bg-indigo-500/20 text-indigo-300" },
    { "kode": "LIB", "nama": "Libur Semester / Nasional", "warna": "bg-slate-700 text-slate-300" }
  ],
  "distribusiBab": [
    {
      "no": 1,
      "elemen": "Nama Elemen",
      "tujuanPembelajaran": "TP terukur ...",
      "materiPokok": "Bab 1: ...",
      "alokasiJP": 16,
      "alokasiMingguan": {
        "${bulanDaftar[0]}_3": ${jpMinggu},
        "${bulanDaftar[0]}_4": ${jpMinggu}
      }
    }
  ]
}
`;

    const response = await generateContentWithRetry(ai, {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { responseMimeType: 'application/json', temperature: 0.5 },
    });

    const text = response.text || '{}';
    const parsed = safeExtractJson(text);
    return res.json({ status: 'ok', promes: parsed });
  } catch (err: any) {
    console.error('Error generating Promes with Gemini:', err);
    return res.status(500).json({ status: 'error', message: err?.message || 'Gagal menyusun Promes.' });
  }
});

// ========================================================
// 4. ENDPOINT: SINKRONISASI GOOGLE DRIVE TRACKING SOAL
// ========================================================
const DEFAULT_SERVICE_ACCOUNT = {
  client_email: "arsipku@future-alcove-506716-e7.iam.gserviceaccount.com",
  private_key: `-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC7qRTmxcaYflmY\nK1uQiyaQd8EwHgEhEJUtEOU5mMtVbpzw1vkYGJJsFSko1p2+yCyyZxsumzU4Xf44\n3orokqKnn9O9b1jat61aJxsnwF2RDSrOcFD5r+aUPpKpUdFGA2CjeXacNYY3LAqQ\n3zoQhUyVivzx/6LClJQCMMnZ22zgBJ8hQoKny5EvrPKovhrXit9sXpzYcwZlGkVM\nabXGlHexmNGfsx2SGlAGHTAWldTZ963AEq4AvS3aoXlKAT8o+eBZwzZ/Yg0DmJPj\nhJWkID47jhsWUXQFAQ71JFi5sG/V8tshFr3YsX09xxMiZYEDUyNEV6Qc9VitD7KQ\ngnhUmi8ZAgMBAAECggEAFT19P+SFRqfQaLyJk9noHsRrMZDH1G/9znjB1SvR4eTP\n7yOJ1JwdYI3hl315I8mg431vkm4fTza2SkYIB2xnbB0XOHMEpdbR0GkqNezcOkl4\n/Z4xUB2EdeWCMJdx3iCOPNqH3gTh4NdDh+O4PPv1b9yoJhTm3Wq3OOtAQYAIOe+i\nXE8p7uIjsibuIukQdJHgQlkN3YXExJuq6ZjJvYul29oxupR162wS3FSiRDUK247u\nPrIauEWaDlfcRaT6B24RGSv6zrxJiNNadZvNLYnx5PDQ6qoRCqRzpWecaOjjAHXD\ngkzlrnRtkDY8EJ5RcbleDMA+ek8O1oDE1vFBhoiOgQKBgQDbvnewb5hItkCbStAB\nfsVQKCyTYad+9D6C5ZNTols5HkQyeSPaIyIU2Jy9hFtdwxmsch4o98FNzxs1DeDS\nqWvbqnkoR1a2T13XQ70Fnk3nWVNFH/YYuqz0Soqo0wls4Z6VnSk/HzbSo/8N3N8H\ncIrxKiUICSLA1QLvPX5XdK0I2QKBgQDan3jJb0UhsLK6DxbsKFTibGqysKh46DGh\n9/7uhiecuUZDEEr/woXiPn2JXPUV6MITF0ssUXBgMHR6+G6JCvHViInXvA6tUO8n\nnLC7VPqXUjsMO5r7DASG+CyMxp+ytgsf9KWDO8HqWQtM6h/yXzO1MzMydfkWBFv9\ngzVlJ6xwQQKBgQChiimOyNrYSTLBdoPnNXxz6rSqO9XYHFGABKkDiI0rNjbILAnR\nKJa7YGoJYC2ShgRvowzM7SVrv96uZ99ovieOOooKtDbomvvPbfqdEL0QX7g5Tr+p\nekH+7HV2mn2JT2s3bWuO/bFdtDWhyUcjvvZFR8glWiH0RCN+IGSqghlaMQKBgAKM\ncWAHyAqIgMzieCXwomyxTt0eahhevJViyroFHlkZX9RQUE+C+QSWLeh4CPNkbz7B\nusKdgG3eorz8QG2gjwkqOlElhBZJJ0CS9wx4BSPWdZHC8B+VGEhqhDpv5lSzApYw\nx+0ruSr+Nr+CyzSMH5IxMpuX/HthOaFO8kRnnf8BAoGBANUQPDZO1dZxxfYxqI4p\nSrbwivWonmJPUlfcklJwzOCW4Li/HOq3aXZJw7WbqfY1qRcnuRfrf1DFPBXIPKKy\n40vleg9Lhbjt7Galq0i+AZBTHDl36KNtuRRile0qeBBcLwvccn9StRl+k1ZEjbJQ\nIGIWm25gM6ZN6/ZfCq2SaMqL\n-----END PRIVATE KEY-----\n`
};

async function getGoogleServiceAccountToken(): Promise<string | null> {
  try {
    const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || DEFAULT_SERVICE_ACCOUNT.client_email;
    const rawPrivateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || DEFAULT_SERVICE_ACCOUNT.private_key;
    if (!clientEmail || !rawPrivateKey) return null;

    const privateKey = rawPrivateKey.replace(/\\n/g, '\n');
    const now = Math.floor(Date.now() / 1000);
    const header = { alg: 'RS256', typ: 'JWT' };
    const claimSet = {
      iss: clientEmail,
      scope: 'https://www.googleapis.com/auth/drive.readonly',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now,
    };

    const base64Url = (str: string) =>
      Buffer.from(str)
        .toString('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');

    const signatureInput = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(claimSet))}`;

    const signer = crypto.createSign('RSA-SHA256');
    signer.update(signatureInput);
    const signature = signer
      .sign(privateKey, 'base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    const jwt = `${signatureInput}.${signature}`;

    const resp = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    });

    if (!resp.ok) {
      console.warn('Google SA Token Error:', await resp.text());
      return null;
    }

    const data = await resp.json();
    return data.access_token || null;
  } catch (err) {
    console.error('Failed to issue Service Account JWT token:', err);
    return null;
  }
}

app.post('/api/drive/sync-tracking', async (req, res) => {
  try {
    const { folderUrl, folderId } = req.body;
    let targetFolderId = folderId;

    if (!targetFolderId && folderUrl) {
      const match = String(folderUrl).match(/folders\/([a-zA-Z0-9_-]+)/i);
      if (match && match[1]) {
        targetFolderId = match[1];
      } else if (/^[a-zA-Z0-9_-]{20,}$/.test(String(folderUrl).trim())) {
        targetFolderId = String(folderUrl).trim();
      }
    }

    if (!targetFolderId) {
      return res.json({
        status: 'error',
        message: 'Tautan Google Drive Folder tidak valid.',
        files: [],
      });
    }

    const allFiles: Array<{
      id: string;
      name: string;
      mimeType?: string;
      webViewLink?: string;
      path?: string;
    }> = [];

    const visitedFolderIds = new Set<string>();
    let apiMethodUsed = 'Public Drive Reader';

    // Layer 1: Service Account Token (Private Shared Folders)
    const saToken = await getGoogleServiceAccountToken();
    if (saToken) {
      async function fetchFolderContentsSa(
        fId: string,
        currentPath: string = '',
        depth: number = 0
      ) {
        if (depth > 6 || visitedFolderIds.has(fId)) return;
        visitedFolderIds.add(fId);

        const query = encodeURIComponent(`'${fId}' in parents and trashed = false`);
        const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,mimeType,webViewLink)&pageSize=1000`;

        try {
          const resp = await fetch(url, {
            headers: {
              Authorization: `Bearer ${saToken}`,
            },
          });
          if (!resp.ok) return;
          const data = await resp.json();
          const items = Array.isArray(data.files) ? data.files : [];

          for (const item of items) {
            const itemPath = currentPath
              ? `${currentPath} / ${item.name}`
              : item.name;

            if (item.mimeType === 'application/vnd.google-apps.folder') {
              await fetchFolderContentsSa(item.id, itemPath, depth + 1);
            } else {
              if (!allFiles.some((f) => f.id === item.id)) {
                allFiles.push({
                  id: item.id,
                  name: item.name,
                  mimeType: item.mimeType,
                  webViewLink:
                    item.webViewLink ||
                    `https://drive.google.com/file/d/${item.id}/view`,
                  path: currentPath,
                });
              }
            }
          }
        } catch (err) {
          console.warn('Drive SA Fetch warning:', err);
        }
      }

      await fetchFolderContentsSa(targetFolderId);
      if (allFiles.length > 0) {
        apiMethodUsed = 'Service Account Official API (Private Shared Folder)';
      }
    }

    // Layer 2: Try Google Drive API v3 Key if Service Account got no files
    const apiKey = process.env.GOOGLE_DRIVE_API_KEY || process.env.GEMINI_API_KEY;

    if (allFiles.length === 0 && apiKey) {
      visitedFolderIds.clear();
      async function fetchFolderContentsApi(
        fId: string,
        currentPath: string = '',
        depth: number = 0
      ) {
        if (depth > 6 || visitedFolderIds.has(fId)) return;
        visitedFolderIds.add(fId);

        const query = encodeURIComponent(`'${fId}' in parents and trashed = false`);
        const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,mimeType,webViewLink)&key=${apiKey}&pageSize=1000`;

        try {
          const resp = await fetch(url);
          if (!resp.ok) return;
          const data = await resp.json();
          const items = Array.isArray(data.files) ? data.files : [];

          for (const item of items) {
            const itemPath = currentPath
              ? `${currentPath} / ${item.name}`
              : item.name;

            if (item.mimeType === 'application/vnd.google-apps.folder') {
              await fetchFolderContentsApi(item.id, itemPath, depth + 1);
            } else {
              if (!allFiles.some((f) => f.id === item.id)) {
                allFiles.push({
                  id: item.id,
                  name: item.name,
                  mimeType: item.mimeType,
                  webViewLink:
                    item.webViewLink ||
                    `https://drive.google.com/file/d/${item.id}/view`,
                  path: currentPath,
                });
              }
            }
          }
        } catch (err) {
          console.warn('Drive API v3 fetch warning:', err);
        }
      }

      await fetchFolderContentsApi(targetFolderId);
      if (allFiles.length > 0) {
        apiMethodUsed = 'Google Drive API Key';
      }
    }

    // Layer 2: Public Drive Page Scraper & Embedded View Parser (if Layer 1 returned no files or no key)
    if (allFiles.length === 0) {
      visitedFolderIds.clear();

      async function scrapePublicDriveFolder(
        fId: string,
        currentPath: string = '',
        depth: number = 0
      ) {
        if (depth > 5 || visitedFolderIds.has(fId)) return;
        visitedFolderIds.add(fId);

        const urlsToTry = [
          `https://drive.google.com/embeddedfolderview?id=${fId}#list`,
          `https://drive.google.com/drive/folders/${fId}`,
        ];

        const subfoldersFound: Array<{ id: string; name: string }> = [];

        for (const targetUrl of urlsToTry) {
          try {
            const resp = await fetch(targetUrl, {
              headers: {
                'User-Agent':
                  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              },
            });

            if (!resp.ok) continue;
            const html = await resp.text();

            // 1. Extract HTML element titles and links (e.g. from embedded folderview or drive folder)
            const htmlTitleLinkRegex = /href="[^"]*\/file\/d\/([a-zA-Z0-9_-]{20,})[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;
            let elMatch;
            while ((elMatch = htmlTitleLinkRegex.exec(html)) !== null) {
              const fileId = elMatch[1];
              const rawAnchorInner = elMatch[2] || '';
              const cleanName = rawAnchorInner.replace(/<[^>]+>/g, '').trim();
              if (fileId && cleanName && cleanName.length > 1 && !cleanName.startsWith('http')) {
                if (!allFiles.some((f) => f.id === fileId)) {
                  allFiles.push({
                    id: fileId,
                    name: cleanName,
                    mimeType: 'application/octet-stream',
                    webViewLink: `https://drive.google.com/file/d/${fileId}/view`,
                    path: currentPath,
                  });
                }
              }
            }

            // 2. Extract JSON array pairs: ["FILE_ID","File_Name.ext"] or ["FOLDER_ID","Folder Name"]
            const jsonPairRegex = /\["([a-zA-Z0-9_-]{20,})","([^"]+)"/g;
            let match;
            while ((match = jsonPairRegex.exec(html)) !== null) {
              const itemId = match[1];
              let itemName = match[2];

              // Unescape unicode strings \u0026 -> &, etc.
              try {
                itemName = JSON.parse(`"${itemName}"`);
              } catch (e) {
                // Ignore parse errors
              }

              if (
                !itemId ||
                !itemName ||
                itemName.startsWith('http') ||
                itemName.startsWith('drive#') ||
                itemName.length > 150
              ) {
                continue;
              }

              // Check if file extension or document keyword present
              const isFile =
                /\.(docx?|pdf|xlsx?|pptx?|gdoc|gsheet|gslides|txt|zip|rar|jpg|png|jpeg)$/i.test(
                  itemName
                ) ||
                /soal|pas|pts|pat|kls|kelas|mapel|uts|uas|naskah|dokumen|ujian|asesmen|kunci|kisi/i.test(
                  itemName
                );

              if (isFile) {
                if (!allFiles.some((f) => f.id === itemId)) {
                  allFiles.push({
                    id: itemId,
                    name: itemName,
                    mimeType: 'application/octet-stream',
                    webViewLink: `https://drive.google.com/file/d/${itemId}/view`,
                    path: currentPath,
                  });
                }
              } else if (
                /^[a-zA-Z0-9\s._-]{1,60}$/.test(itemName) &&
                !visitedFolderIds.has(itemId) &&
                itemId !== targetFolderId
              ) {
                subfoldersFound.push({ id: itemId, name: itemName });
              }
            }

            // 2. Extract file links from /file/d/FILE_ID
            const directFileRegex = /\/file\/d\/([a-zA-Z0-9_-]{20,})/g;
            let fileMatch;
            while ((fileMatch = directFileRegex.exec(html)) !== null) {
              const fileId = fileMatch[1];
              if (fileId && !allFiles.some((f) => f.id === fileId)) {
                // Try extracting surrounding text for file name
                const fileIdx = html.indexOf(fileId);
                let fallbackName = `Soal_Ujian_${fileId.slice(0, 5)}`;
                if (fileIdx !== -1) {
                  const chunk = html.slice(Math.max(0, fileIdx - 150), fileIdx + 250);
                  const titleM =
                    chunk.match(/title="([^"]+)"/) ||
                    chunk.match(/alt="([^"]+)"/) ||
                    chunk.match(/>([^<]+\.[a-zA-Z0-9]{2,4})</);
                  if (titleM && titleM[1]) {
                    fallbackName = titleM[1];
                  }
                }
                allFiles.push({
                  id: fileId,
                  name: fallbackName,
                  mimeType: 'application/octet-stream',
                  webViewLink: `https://drive.google.com/file/d/${fileId}/view`,
                  path: currentPath,
                });
              }
            }

            // 3. Extract subfolder links
            const subfolderRegex = /embeddedfolderview\?id=([a-zA-Z0-9_-]{20,})/g;
            let sfMatch;
            while ((sfMatch = subfolderRegex.exec(html)) !== null) {
              const sfId = sfMatch[1];
              if (sfId && sfId !== fId && !visitedFolderIds.has(sfId)) {
                subfoldersFound.push({ id: sfId, name: 'Subfolder' });
              }
            }
          } catch (err) {
            console.warn('Scraper fetch error for URL:', targetUrl, err);
          }
        }

        // Recursively visit subfolders (limit depth & deduplicate)
        const uniqueSubfolders = Array.from(
          new Map(subfoldersFound.map((item) => [item.id, item])).values()
        );
        for (const sub of uniqueSubfolders) {
          const subPath = currentPath
            ? `${currentPath} / ${sub.name}`
            : sub.name;
          await scrapePublicDriveFolder(sub.id, subPath, depth + 1);
        }
      }

      await scrapePublicDriveFolder(targetFolderId);
    }

    if (allFiles.length > 0) {
      return res.json({
        status: 'success',
        folderId: targetFolderId,
        files: allFiles,
        apiMethodUsed,
      });
    }

    return res.json({
      status: 'drive_access_required',
      folderId: targetFolderId,
      message:
        'Folder Google Drive siap disinkronkan. Pastikan opsi "Siapa saja yang memiliki link dapat melihat" (Anyone with the link can view) diaktifkan pada folder Google Drive Anda.',
      files: [],
    });
  } catch (error: any) {
    console.error('Error in /api/drive/sync-tracking:', error);
    return res.json({
      status: 'error',
      message: error?.message || 'Gagal memproses sinkronisasi Google Drive.',
      files: [],
    });
  }
});

// ========================================================
// 4.5. ENDPOINT: GENERATE CATATAN GURU RAPOR STS VIA GEMINI AI
// ========================================================
app.post('/api/rapor-sts/generate-ai-notes', async (req, res) => {
  try {
    const { students, className, subjectName, semester, schoolYear } = req.body;

    if (!Array.isArray(students) || students.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Daftar data siswa tidak valid atau kosong.',
        notes: {},
      });
    }

    const ai = getGeminiClient();

    // Fallback generator helper
    const generateFallbackNote = (st: any) => {
      const firstName = (st.studentName || 'Siswa').split(' ')[0] || st.studentName || 'Siswa';
      const score = typeof st.stsScore === 'number' ? st.stsScore : 0;
      const passingGrade = st.passingGrade || 75;
      const isHighAchievement = score >= 88 || (st.totalTps > 0 && (st.achievedTps?.length || 0) === st.totalTps && score >= 80);
      const isGoodAchievement = score >= passingGrade;

      if (isHighAchievement) {
        const templates = [
          `Alhamdulillah, ananda ${firstName} menunjukkan pemahaman materi yang sangat istimewa pada ${subjectName || 'mata pelajaran ini'}. Pertahankan semangat belajar, ketekunan, dan akhlak muliamu!`,
          `Prestasi ananda ${firstName} sangat membanggakan dengan penguasaan kompetensi yang optimal. Tetaplah rendah hati dan teruslah menginspirasi teman-teman.`,
          `Masya Allah, ananda ${firstName} memiliki dedikasi belajar yang sangat baik. Semoga Allah Swt senantiasa memberkahi ilmu dan kebaikanmu.`,
        ];
        return templates[Math.abs(st.studentName.length) % templates.length];
      } else if (isGoodAchievement) {
        const templates = [
          `Ananda ${firstName} telah mencapai kompetensi pembelajaran dengan baik. Terus tingkatkan konsistensi belajar dan keaktifan di kelas.`,
          `Alhamdulillah, capaian belajar ananda ${firstName} sudah tuntas dengan baik. Tingkatkan latihan mandiri agar pemahaman materi semakin mendalam.`,
          `Ananda ${firstName} menunjukkan perkembangan yang positif. Pertahankan semangat belajar dan senantiasa istiqomah dalam berakhlak terpuji.`,
        ];
        return templates[Math.abs(st.studentName.length) % templates.length];
      } else if (score > 0) {
        const templates = [
          `Ananda ${firstName} memiliki potensi yang baik. Perbanyak mengulang materi${st.unachievedTps?.length ? ` terutama pada ${st.unachievedTps[0]}` : ''} dan jangan ragu untuk bertanya saat bimbingan. Tetap semangat!`,
          `Terus semangat belajar untuk ananda ${firstName}. Dengan bimbingan intensif dan latihan berkala, insya Allah ananda pasti dapat meraih hasil yang lebih baik.`,
          `Ananda ${firstName} perlu lebih fokus dan disiplin dalam mengulang materi pembelajaran pokok. Guru dan orang tua senantiasa mendampingi.`,
        ];
        return templates[Math.abs(st.studentName.length) % templates.length];
      } else {
        return `Tingkatkan kedisiplinan dan semangat belajar ananda ${firstName} dalam setiap kegiatan pembelajaran.`;
      }
    };

    // If no Gemini client, use smart fallback directly
    if (!ai) {
      const notesMap: Record<string, string> = {};
      students.forEach((st: any) => {
        notesMap[st.studentId] = generateFallbackNote(st);
      });
      return res.json({
        status: 'success',
        source: 'rule_based_fallback',
        notes: notesMap,
      });
    }

    // Build prompt for Gemini AI
    const studentListPrompt = students
      .map((st: any, idx: number) => {
        const tpsTuntas = Array.isArray(st.achievedTps) && st.achievedTps.length > 0 ? st.achievedTps.join('; ') : 'Belum ada';
        const tpsBelum = Array.isArray(st.unachievedTps) && st.unachievedTps.length > 0 ? st.unachievedTps.join('; ') : 'Tidak ada (Semua tuntas)';
        return `Siswa #${idx + 1}:
ID: "${st.studentId}"
Nama: "${st.studentName}"
Nilai STS: ${st.stsScore !== null && st.stsScore !== undefined ? st.stsScore : 'Belum dinilai'} (KKTP/KKM: ${st.passingGrade || 75})
TP Tercapai: ${tpsTuntas}
TP Perlu Bimbingan: ${tpsBelum}`;
      })
      .join('\n\n');

    const prompt = `Anda adalah seorang pendidik dan wali kelas profesional di SDIT Al Fikri.
Tugas Anda adalah membuat "Catatan Guru / Wali Kelas" untuk Rapor Sumatif Tengah Semester (STS) Kurikulum Merdeka.

KONTEKS KELAS & MAPEL:
- Kelas: ${className || 'SDIT'}
- Mata Pelajaran: ${subjectName || 'Umum'}
- Semester: ${semester || '2'} | Tahun Ajaran: ${schoolYear || '2024/2025'}

PANDUAN PENULISAN CATATAN GURU:
1. Panggil siswa dengan "Ananda [Nama Depan Siswa]".
2. Bernuansa Islami khas SDIT yang santun, hangat, mengapresiasi kebaikan (misal: "Alhamdulillah", "Masya Allah" untuk nilai tinggi/tuntas), mendoakan, dan memotivasi.
3. Kontekstual sesuai nilai STS dan penguasaan tujuan pembelajaran yang dicapai/perlu bimbingan.
4. Ringkas, padat, dan elegan (antara 25 - 45 kata atau 2-3 kalimat per siswa).
5. Berikan variasi kalimat yang alami dan personal untuk tiap siswa, hindari kalimat yang persis sama berulang-ulang.

DATA SISWA YANG PERLU DIBUATKAN CATATAN:
${studentListPrompt}

OUTPUT HARUS BERUPA JSON VALID PERSIS DENGAN FORMAT BERIKUT (TANPA MARKDOWN TAMBAHAN DI LUAR JSON):
{
  "notes": {
    "[ID_SISWA_1]": "Teks catatan guru untuk siswa 1...",
    "[ID_SISWA_2]": "Teks catatan guru untuk siswa 2..."
  }
}`;

    try {
      const response = await generateContentWithRetry(ai, {
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.65,
        },
      });

      const rawText = response.text || '';
      let parsedJson: any = null;
      try {
        parsedJson = safeExtractJson(rawText);
      } catch (parseErr) {
        // Handled by student fallback loop
      }

      const finalNotes: Record<string, string> = {};
      const returnedNotes = (parsedJson?.notes && typeof parsedJson.notes === 'object') ? parsedJson.notes : {};
      const noteKeys = Object.keys(returnedNotes);

      students.forEach((st: any, idx: number) => {
        let noteFound = '';
        if (typeof returnedNotes[st.studentId] === 'string' && returnedNotes[st.studentId].trim()) {
          noteFound = returnedNotes[st.studentId].trim();
        } else {
          // Check case-insensitive, fuzzy or index match
          const matchingKey = noteKeys.find(
            (k) =>
              k.trim().toLowerCase() === String(st.studentId).trim().toLowerCase() ||
              k.trim().toLowerCase() === String(st.studentName).trim().toLowerCase() ||
              k.includes(st.studentId) ||
              k === `siswa_${idx + 1}` ||
              k === String(idx + 1)
          );
          if (matchingKey && typeof returnedNotes[matchingKey] === 'string' && returnedNotes[matchingKey].trim()) {
            noteFound = returnedNotes[matchingKey].trim();
          }
        }

        finalNotes[st.studentId] = noteFound || generateFallbackNote(st);
      });

      return res.json({
        status: 'success',
        source: 'gemini_ai',
        notes: finalNotes,
      });
    } catch (_aiErr: any) {
      const notesMap: Record<string, string> = {};
      students.forEach((st: any) => {
        notesMap[st.studentId] = generateFallbackNote(st);
      });
      return res.json({
        status: 'success',
        source: 'rule_based_fallback',
        notes: notesMap,
      });
    }
  } catch (error: any) {
    return res.status(200).json({
      status: 'success',
      source: 'fallback',
      notes: {},
    });
  }
});

// ========================================================
// 5. ENDPOINT: PRINT GATEWAY & SPOOLER (IN-MEMORY QUEUE)
// ========================================================

interface PrintJobRecord {
  id: string;
  fileName: string;
  fileType: string;
  fileData: string; // base64
  fileSize: number;
  printer: string;
  paper: 'A4' | 'F4' | 'A5' | 'Letter';
  orientation: 'portrait' | 'landscape';
  scale: 'fit' | 'actual' | 'fill';
  copies: number;
  pageRange: string;
  duplex?: 'simplex' | 'duplex_long' | 'duplex_short';
  color?: 'monochrome' | 'color';
  status: 'WAITING' | 'PROCESSING' | 'SENT' | 'FAILED';
  statusMessage?: string;
  createdAt: number;
  updatedAt: number;
}

interface ConversionRecord {
  id: string;
  fileName: string;
  fileData: string; // base64
  pdfData?: string; // converted base64
  status: 'WAITING' | 'PROCESSING' | 'DONE' | 'FAILED';
  error?: string;
  createdAt: number;
}

// In-Memory state: print gateway state updated by external local node agent heartbeats
const printGatewayState = {
  lastHeartbeat: 0, // 0 until an actual agent sends a heartbeat
  gatewayName: 'Gateway Printer SDIT AL FIKRI',
  printers: [
    { id: 'kyocera', name: 'KYOCERA ECOSYS M2040dn (Ruang Guru / TU)', type: 'windows', status: 'ready' },
    { id: 'epson', name: 'EPSON L3250 SERIES (Ruang Guru)', type: 'epson_connect', status: 'ready' },
    { id: 'pdf_direct', name: 'Printer Dokumen Standar SDIT (PDF / Direct)', type: 'direct_spool', status: 'ready' }
  ],
  capabilities: {
    libreOffice: true,
    sumatraPdf: true,
  }
};

const printJobs = new Map<string, PrintJobRecord>();
const conversions = new Map<string, ConversionRecord>();

// Auto clean jobs older than 30 minutes
setInterval(() => {
  const now = Date.now();
  const maxAge = 30 * 60 * 1000;
  for (const [id, job] of printJobs.entries()) {
    if (now - job.createdAt > maxAge) {
      printJobs.delete(id);
    }
  }
  for (const [id, conv] of conversions.entries()) {
    if (now - conv.createdAt > maxAge) {
      conversions.delete(id);
    }
  }
}, 5 * 60 * 1000);

// Status check for teacher UI (alias 1)
app.get('/api/print/status', (_req, res) => {
  const now = Date.now();
  const isOnline = printGatewayState.lastHeartbeat > 0 && (now - printGatewayState.lastHeartbeat) < 25000;
  return res.json({
    status: 'ok',
    online: isOnline,
    lastSeenSecondsAgo: printGatewayState.lastHeartbeat ? Math.round((now - printGatewayState.lastHeartbeat) / 1000) : null,
    lastSeenAt: printGatewayState.lastHeartbeat ? new Date(printGatewayState.lastHeartbeat).toISOString() : null,
    gatewayName: printGatewayState.gatewayName,
    printers: printGatewayState.printers,
    capabilities: printGatewayState.capabilities,
    message: isOnline 
      ? 'Print Gateway lokal terhubung & aktif.' 
      : 'Print Gateway offline. Jalankan node agent.mjs atau npm run print-agent di komputer/laptop sekolah.'
  });
});

// Status check for PrintDocumentModal (alias 2)
app.get('/api/print/gateway/status', (_req, res) => {
  const now = Date.now();
  const isOnline = printGatewayState.lastHeartbeat > 0 && (now - printGatewayState.lastHeartbeat) < 25000;
  return res.json({
    status: 'ok',
    online: isOnline,
    lastSeenSecondsAgo: printGatewayState.lastHeartbeat ? Math.round((now - printGatewayState.lastHeartbeat) / 1000) : null,
    lastSeenAt: printGatewayState.lastHeartbeat ? new Date(printGatewayState.lastHeartbeat).toISOString() : null,
    gatewayName: printGatewayState.gatewayName,
    printers: printGatewayState.printers,
    capabilities: printGatewayState.capabilities,
    message: isOnline 
      ? 'Print Gateway lokal terhubung & aktif.' 
      : 'Print Gateway offline. Jalankan node agent.mjs atau npm run print-agent di komputer/laptop sekolah.'
  });
});

// Create Print Job / Preview (Used by PrintDocumentModal)
app.post('/api/print/jobs', (req, res) => {
  try {
    const {
      mode = 'print',
      fileName = 'Dokumen',
      dataBase64 = '',
      printer = 'kyocera',
      paper = 'A4',
      orientation = 'portrait',
      scale = 'fit',
      copies = 1,
      pageRange = 'Semua',
      margin = '10'
    } = req.body || {};

    const cleanBase64 = String(dataBase64 || '').replace(/^data:[^;]+;base64,/, '').trim();
    if (!cleanBase64 && mode === 'print') {
      return res.status(400).json({ status: 'error', message: 'Data dokumen kosong.' });
    }

    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const selectedPrinter = printGatewayState.printers.find(p => p.id === printer)?.name || printer || 'KYOCERA ECOSYS M2040dn';

    const newJob: PrintJobRecord = {
      id: jobId,
      fileName: String(fileName),
      fileType: String(fileName).split('.').pop()?.toLowerCase() || 'pdf',
      fileData: cleanBase64,
      fileSize: cleanBase64.length,
      printer: selectedPrinter,
      paper,
      orientation,
      scale,
      copies: Math.min(99, Math.max(1, Number(copies) || 1)),
      pageRange: String(pageRange || 'Semua'),
      duplex: 'simplex',
      color: 'monochrome',
      status: 'WAITING',
      statusMessage: mode === 'preview' 
        ? 'Preview siap.' 
        : `Dokumen "${fileName}" (${copies}x) berhasil didaftarkan ke antrean ${selectedPrinter}.`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    printJobs.set(jobId, newJob);

    return res.json({
      status: 'ok',
      jobId,
      mode,
      message: newJob.statusMessage,
    });
  } catch (err: any) {
    return res.status(500).json({ status: 'error', message: err?.message || 'Gagal membuat antrean print.' });
  }
});

// Single Job Status Check (Used by waitForJob in PrintDocumentModal)
app.get('/api/print/jobs/:id', (req, res) => {
  const jobId = req.params.id;
  const job = printJobs.get(jobId);

  if (!job) {
    return res.status(404).json({
      status: 'error',
      statusJob: 'FAILED',
      message: 'Print job tidak ditemukan atau sudah kedaluwarsa.',
    });
  }

  return res.json({
    status: 'ok',
    jobId: job.id,
    fileName: job.fileName,
    printer: job.printer,
    statusJob: job.status,
    message: job.statusMessage || `Dokumen siap diproses di ${job.printer}.`,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    resultDataBase64: job.fileData,
  });
});

// Teacher submits print job
app.post('/api/print/submit', (req, res) => {
  try {
    const {
      fileName,
      fileType,
      fileData,
      fileSize,
      printer,
      paper = 'A4',
      orientation = 'portrait',
      scale = 'fit',
      copies = 1,
      pageRange = 'Semua',
      duplex = 'simplex',
      color = 'monochrome',
    } = req.body || {};

    if (!fileName || !fileData) {
      return res.status(400).json({
        status: 'error',
        message: 'File dokumen dan data tidak boleh kosong.',
      });
    }

    if (!printer) {
      return res.status(400).json({
        status: 'error',
        message: 'Printer tujuan harus dipilih.',
      });
    }

    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const newJob: PrintJobRecord = {
      id: jobId,
      fileName: String(fileName),
      fileType: String(fileType || 'pdf'),
      fileData: String(fileData),
      fileSize: Number(fileSize) || fileData.length,
      printer: String(printer),
      paper,
      orientation,
      scale,
      copies: Math.min(99, Math.max(1, Number(copies) || 1)),
      pageRange: String(pageRange || 'Semua'),
      duplex,
      color,
      status: 'WAITING',
      statusMessage: `Dokumen berhasil mendaftar di antrean ${printer}.`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    printJobs.set(jobId, newJob);

    return res.json({
      status: 'success',
      jobId,
      message: 'Print job berhasil didaftarkan.',
    });
  } catch (err: any) {
    return res.status(500).json({
      status: 'error',
      message: err?.message || 'Gagal mendaftarkan print job.',
    });
  }
});

// Teacher checks single job status
app.get('/api/print/job/:id', (req, res) => {
  const jobId = req.params.id;
  const job = printJobs.get(jobId);

  if (!job) {
    return res.status(404).json({
      status: 'not_found',
      message: 'Print job tidak ditemukan atau sudah kadaluarsa.',
    });
  }

  return res.json({
    status: 'ok',
    job: {
      id: job.id,
      fileName: job.fileName,
      printer: job.printer,
      status: job.status,
      statusMessage: job.statusMessage,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    },
  });
});

// Teacher requests Office -> PDF conversion via online gateway
app.post('/api/print/convert-request', (req, res) => {
  try {
    const { fileName, fileData } = req.body || {};
    if (!fileName || !fileData) {
      return res.status(400).json({ status: 'error', message: 'Data file tidak lengkap.' });
    }

    const convId = `conv_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const record: ConversionRecord = {
      id: convId,
      fileName: String(fileName),
      fileData: String(fileData),
      status: 'WAITING',
      createdAt: Date.now(),
    };

    conversions.set(convId, record);

    return res.json({
      status: 'success',
      conversionId: convId,
    });
  } catch (err: any) {
    return res.status(500).json({ status: 'error', message: err?.message || 'Gagal membuat antrean konversi.' });
  }
});

// Teacher polls conversion result
app.get('/api/print/convert-result/:id', (req, res) => {
  const conv = conversions.get(req.params.id);
  if (!conv) {
    return res.status(404).json({ status: 'not_found', message: 'Antrean konversi tidak ditemukan.' });
  }

  if (conv.status === 'DONE' && conv.pdfData) {
    return res.json({
      status: 'done',
      pdfData: conv.pdfData,
    });
  }

  return res.json({
    status: conv.status,
    error: conv.error,
  });
});

// GATEWAY ENDPOINTS (Called by laptop gateway service)

// 1. Gateway sends heartbeat
app.post('/api/print/gateway/heartbeat', (req, res) => {
  const { gatewayName, printers, capabilities } = req.body || {};

  printGatewayState.lastHeartbeat = Date.now();
  if (gatewayName) printGatewayState.gatewayName = gatewayName;
  if (Array.isArray(printers) && printers.length > 0) {
    printGatewayState.printers = printers;
  }
  if (capabilities) {
    printGatewayState.capabilities = capabilities;
  }

  return res.json({
    status: 'ok',
    acknowledgedAt: Date.now(),
  });
});

// 2. Gateway fetches pending print jobs & pending conversions
app.get('/api/print/gateway/pending', (_req, res) => {
  // Update heartbeat as active connection
  printGatewayState.lastHeartbeat = Date.now();

  const pendingJobs: Array<Omit<PrintJobRecord, 'fileData'> & { fileData: string }> = [];
  for (const job of printJobs.values()) {
    if (job.status === 'WAITING' || job.status === 'SENT') {
      pendingJobs.push(job);
      job.status = 'PROCESSING';
      job.updatedAt = Date.now();
    }
  }

  const pendingConversions: ConversionRecord[] = [];
  for (const conv of conversions.values()) {
    if (conv.status === 'WAITING') {
      pendingConversions.push(conv);
    }
  }

  return res.json({
    status: 'ok',
    jobs: pendingJobs,
    conversions: pendingConversions,
  });
});

// 3. Gateway updates job status (PROCESSING, SENT, FAILED)
app.post('/api/print/gateway/update-job', (req, res) => {
  const { jobId, status, message } = req.body || {};
  const job = printJobs.get(jobId);

  if (!job) {
    return res.status(404).json({ status: 'not_found', message: 'Job tidak ditemukan.' });
  }

  if (status) {
    job.status = status;
    job.updatedAt = Date.now();
  }
  if (message) {
    job.statusMessage = message;
  }

  return res.json({ status: 'ok', jobId: job.id, currentStatus: job.status });
});

// 4. Gateway posts converted PDF
app.post('/api/print/gateway/update-conversion', (req, res) => {
  const { conversionId, status, pdfData, error } = req.body || {};
  const conv = conversions.get(conversionId);

  if (!conv) {
    return res.status(404).json({ status: 'not_found', message: 'Konversi tidak ditemukan.' });
  }

  conv.status = status;
  if (pdfData) conv.pdfData = pdfData;
  if (error) conv.error = error;

  return res.json({ status: 'ok', conversionId: conv.id });
});

// ========================================================
// 6. ENDPOINT: HEALTH CHECK
// ========================================================
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'SDIT Al Fikri Evaluation Service',
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    printGatewayOnline: (Date.now() - printGatewayState.lastHeartbeat) < 20000,
    timestamp: new Date().toISOString(),
  });
});

export { app };

export default function handler(req: any, res: any) {
  return app(req, res);
}
