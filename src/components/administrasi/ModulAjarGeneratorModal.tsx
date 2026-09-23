import React, { useState } from 'react';
import {
  X,
  Sparkles,
  BookOpen,
  Printer,
  Copy,
  Check,
  Loader2,
  FileText,
  Download,
  GraduationCap,
  Calendar,
  Layers,
  Award,
  CheckCircle2,
  ListOrdered,
  RotateCcw,
  Edit3,
  HelpCircle,
} from 'lucide-react';

export interface ModulAjarData {
  identitas: {
    namaSekolah: string;
    penyusun: string;
    kepalaSekolah: string;
    mataPelajaran: string;
    fase: string;
    kelas: string;
    semester: string;
    tahunPelajaran: string;
    alokasiWaktu: string;
    babMateri: string;
    subMateri: string;
  };
  kompetensiAwal: string;
  profilPelajarPancasila: string[];
  saranaPrasarana: {
    media: string[];
    sumberBelajar: string[];
  };
  targetPesertaDidik: string;
  modelPembelajaran: string;
  uraianMateri?: {
    ringkasanKonsep?: string;
    poinEsensial?: string[];
    integrasiKeislaman?: string;
  };
  komponenInti: {
    capaianPembelajaran: string;
    tujuanPembelajaran: string[];
    pemahamanBermakna: string;
    pertanyaanPemantik: string[];
    persiapanPembelajaran: string[];
    kegiatanPembelajaran: {
      pendahuluan: {
        durasi: string;
        langkah: string[];
      };
      inti: {
        durasi: string;
        langkah: string[];
        diferensiasi?: string;
      };
      penutup: {
        durasi: string;
        langkah: string[];
      };
    };
    asesmen: {
      diagnostik: string;
      instrumenDiagnostik?: string[];
      formatif: string;
      rubrikFormatif?: Array<{
        kriteria: string;
        skor4: string;
        skor3: string;
        skor2: string;
        skor1: string;
      }>;
      sumatif: string;
      soalSumatif?: Array<{
        no: number;
        butirSoal: string;
        kunciJawaban: string;
        skor: number;
      }>;
    };
    pengayaanDanRemedial: {
      pengayaan: string;
      remedial: string;
    };
    refleksi: {
      refleksiGuru: string[];
      refleksiSiswa: string[];
    };
  };
  lampiran: {
    glosarium: Array<{ istilah: string; arti: string }>;
    daftarPustaka: string[];
  };
}

interface ModulAjarGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DAFTAR_MAPEL = [
  'Pendidikan Agama Islam & Budi Pekerti (PAI)',
  'Pendidikan Pancasila / PKn',
  'Bahasa Indonesia',
  'Matematika',
  'Ilmu Pengetahuan Alam & Sosial (IPAS)',
  'Bahasa Inggris',
  'Bahasa Arab',
  'Al-Qur’an Hadits',
  'Akidah Akhlak',
  'Fikih',
  'Seni Rupa & Budaya',
  'Pendidikan Jasmani, Olahraga & Kesehatan (PJOK)',
];

const OPSI_PROFIL_PANCASILA = [
  'Beriman, Bertakwa kepada Tuhan YME, & Berakhlak Mulia',
  'Bernalar Kritis',
  'Gotong Royong',
  'Mandiri',
  'Kreatif',
  'Berkebinekaan Global',
];

const OPSI_MODEL_PEMBELAJARAN = [
  'Problem-Based Learning (PBL)',
  'Project-Based Learning (PjBL)',
  'Discovery Learning',
  'Inquiry Learning',
  'Cooperative Learning',
  'Pembelajaran Berdiferensiasi (Konten & Proses)',
];

export const ModulAjarGeneratorModal: React.FC<ModulAjarGeneratorModalProps> = ({
  isOpen,
  onClose,
}) => {
  // Input State
  const [tingkatKelas, setTingkatKelas] = useState<string>('4');
  const [mataPelajaran, setMataPelajaran] = useState<string>(DAFTAR_MAPEL[0]);
  const [semester, setSemester] = useState<string>('Semester 1 (Ganjil)');
  const [tahunPelajaran, setTahunPelajaran] = useState<string>('2025/2026');
  const [alokasiWaktu, setAlokasiWaktu] = useState<string>('2 x 35 Menit (1 Pertemuan)');
  const [babMateri, setBabMateri] = useState<string>('');
  const [subMateri, setSubMateri] = useState<string>('');
  const [profilPancasila, setProfilPancasila] = useState<string[]>([
    'Beriman, Bertakwa kepada Tuhan YME, & Berakhlak Mulia',
    'Bernalar Kritis',
    'Gotong Royong',
  ]);
  const [modelPembelajaran, setModelPembelajaran] = useState<string>(
    OPSI_MODEL_PEMBELAJARAN[0]
  );
  const [targetPesertaDidik, setTargetPesertaDidik] = useState<string>(
    'Peserta Didik Reguler / Tipikal (28 Siswa)'
  );
  const [namaPenyusun, setNamaPenyusun] = useState<string>('Guru Pengampu SDIT Al Fikri');
  const [namaKepalaSekolah, setNamaKepalaSekolah] = useState<string>('Kepala SDIT Al Fikri');
  const [catatanTambahan, setCatatanTambahan] = useState<string>('');

  // Status & Hasil State
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasilModul, setHasilModul] = useState<ModulAjarData | null>(null);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isEditable, setIsEditable] = useState<boolean>(false);

  if (!isOpen) return null;

  // Tentukan Fase Otomatis
  const getFase = (kelasStr: string) => {
    const k = parseInt(kelasStr, 10);
    if (k <= 2) return 'Fase A';
    if (k <= 4) return 'Fase B';
    return 'Fase C';
  };

  const handleToggleProfil = (item: string) => {
    if (profilPancasila.includes(item)) {
      setProfilPancasila(profilPancasila.filter((p) => p !== item));
    } else {
      setProfilPancasila([...profilPancasila, item]);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!babMateri.trim()) {
      setErrorMessage('Silakan isi Bab atau Topik Materi Pokok terlebih dahulu.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    const fase = getFase(tingkatKelas);

    try {
      const response = await fetch('/api/evaluation/generate-modul-ajar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mataPelajaran,
          kelas: `Kelas ${tingkatKelas}`,
          fase,
          semester,
          tahunPelajaran,
          alokasiWaktu,
          babMateri: babMateri.trim(),
          subMateri: subMateri.trim(),
          profilPancasila,
          modelPembelajaran,
          targetPesertaDidik,
          namaPenyusun: namaPenyusun.trim(),
          namaKepalaSekolah: namaKepalaSekolah.trim(),
          catatanTambahan: catatanTambahan.trim(),
        }),
      });

      const data = await response.json();

      if (data.status === 'ok' && data.modulAjar) {
        setHasilModul(data.modulAjar);
      } else {
        throw new Error(data.message || 'Gagal memproses pembuatan modul ajar dari server.');
      }
    } catch (err: any) {
      console.error('Error generate Modul Ajar:', err);
      setErrorMessage(
        err?.message ||
          'Terjadi kendala saat menghubungkan ke AI. Silakan periksa koneksi atau coba sesaat lagi.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyText = () => {
    if (!hasilModul) return;
    const txt = [
      `MODUL AJAR KURIKULUM MERDEKA SDIT AL FIKRI`,
      `=============================================`,
      `Mata Pelajaran: ${hasilModul.identitas.mataPelajaran}`,
      `Fase / Kelas  : ${hasilModul.identitas.fase} / ${hasilModul.identitas.kelas}`,
      `Semester      : ${hasilModul.identitas.semester}`,
      `Tahun Ajaran  : ${hasilModul.identitas.tahunPelajaran}`,
      `Alokasi Waktu : ${hasilModul.identitas.alokasiWaktu}`,
      `Bab / Materi  : ${hasilModul.identitas.babMateri}`,
      `Sub-Materi    : ${hasilModul.identitas.subMateri}`,
      `Penyusun      : ${hasilModul.identitas.penyusun}`,
      ``,
      `I. INFORMASI UMUM`,
      `Kompetensi Awal: ${hasilModul.kompetensiAwal}`,
      `Profil Pelajar Pancasila: ${hasilModul.profilPelajarPancasila.join(', ')}`,
      `Model Pembelajaran: ${hasilModul.modelPembelajaran}`,
      `Target Peserta Didik: ${hasilModul.targetPesertaDidik}`,
      `Media Pembelajaran: ${hasilModul.saranaPrasarana.media.join(', ')}`,
      `Sumber Belajar: ${hasilModul.saranaPrasarana.sumberBelajar.join(', ')}`,
      ``,
      `II. KOMPONEN INTI`,
      `Capaian Pembelajaran: ${hasilModul.komponenInti.capaianPembelajaran}`,
      `Tujuan Pembelajaran:`,
      hasilModul.komponenInti.tujuanPembelajaran.map((t, i) => `  ${i + 1}. ${t}`).join('\n'),
      `Pemahaman Bermakna: ${hasilModul.komponenInti.pemahamanBermakna}`,
      `Pertanyaan Pemantik:`,
      hasilModul.komponenInti.pertanyaanPemantik.map((q, i) => `  - ${q}`).join('\n'),
      ``,
      `III. KEGIATAN PEMBELAJARAN`,
      `A. Pendahuluan (${hasilModul.komponenInti.kegiatanPembelajaran.pendahuluan.durasi}):`,
      hasilModul.komponenInti.kegiatanPembelajaran.pendahuluan.langkah
        .map((s, i) => `  ${i + 1}. ${s}`)
        .join('\n'),
      `B. Kegiatan Inti (${hasilModul.komponenInti.kegiatanPembelajaran.inti.durasi}):`,
      hasilModul.komponenInti.kegiatanPembelajaran.inti.langkah
        .map((s, i) => `  ${i + 1}. ${s}`)
        .join('\n'),
      hasilModul.komponenInti.kegiatanPembelajaran.inti.diferensiasi
        ? `  * Diferensiasi: ${hasilModul.komponenInti.kegiatanPembelajaran.inti.diferensiasi}`
        : '',
      `C. Penutup (${hasilModul.komponenInti.kegiatanPembelajaran.penutup.durasi}):`,
      hasilModul.komponenInti.kegiatanPembelajaran.penutup.langkah
        .map((s, i) => `  ${i + 1}. ${s}`)
        .join('\n'),
      ``,
      `IV. ASESMEN & PENILAIAN`,
      `Diagnostik : ${hasilModul.komponenInti.asesmen.diagnostik}`,
      `Formatif   : ${hasilModul.komponenInti.asesmen.formatif}`,
      `Sumatif    : ${hasilModul.komponenInti.asesmen.sumatif}`,
      ``,
      `V. PENGAYAAN DAN REMEDIAL`,
      `Pengayaan : ${hasilModul.komponenInti.pengayaanDanRemedial.pengayaan}`,
      `Remedial  : ${hasilModul.komponenInti.pengayaanDanRemedial.remedial}`,
    ].join('\n');

    navigator.clipboard.writeText(txt);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  const handleDownloadDoc = () => {
    if (!hasilModul) return;
    const content = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>${hasilModul.identitas.babMateri} - Modul Ajar</title>
      <style>
        body { font-family: 'Calibri', Arial, sans-serif; line-height: 1.6; color: #111; margin: 40px; }
        h1, h2, h3 { color: #0d3826; }
        table { border-collapse: collapse; width: 100%; margin: 15px 0; }
        td, th { border: 1px solid #ccc; padding: 6px 10px; font-size: 13px; }
        .header-title { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
      </style>
      </head>
      <body>
        <div class="header-title">
          <h2>MODUL AJAR KURIKULUM MERDEKA SDIT AL FIKRI</h2>
          <p>Tahun Pelajaran ${hasilModul.identitas.tahunPelajaran} | ${hasilModul.identitas.semester}</p>
        </div>
        <h3>I. INFORMASI UMUM</h3>
        <table>
          <tr><td width="30%"><strong>Nama Sekolah</strong></td><td>${hasilModul.identitas.namaSekolah}</td></tr>
          <tr><td><strong>Mata Pelajaran</strong></td><td>${hasilModul.identitas.mataPelajaran}</td></tr>
          <tr><td><strong>Fase / Kelas</strong></td><td>${hasilModul.identitas.fase} / ${hasilModul.identitas.kelas}</td></tr>
          <tr><td><strong>Alokasi Waktu</strong></td><td>${hasilModul.identitas.alokasiWaktu}</td></tr>
          <tr><td><strong>Bab / Materi Pokok</strong></td><td>${hasilModul.identitas.babMateri}</td></tr>
          <tr><td><strong>Sub-Materi</strong></td><td>${hasilModul.identitas.subMateri}</td></tr>
          <tr><td><strong>Profil Pelajar Pancasila</strong></td><td>${hasilModul.profilPelajarPancasila.join(', ')}</td></tr>
          <tr><td><strong>Model Pembelajaran</strong></td><td>${hasilModul.modelPembelajaran}</td></tr>
          <tr><td><strong>Target Peserta Didik</strong></td><td>${hasilModul.targetPesertaDidik}</td></tr>
        </table>
        <h3>II. KOMPONEN INTI</h3>
        <p><strong>Capaian Pembelajaran:</strong><br/>${hasilModul.komponenInti.capaianPembelajaran}</p>
        <p><strong>Tujuan Pembelajaran:</strong></p>
        <ol>${hasilModul.komponenInti.tujuanPembelajaran.map((tp) => `<li>${tp}</li>`).join('')}</ol>
        <p><strong>Pemahaman Bermakna:</strong><br/>${hasilModul.komponenInti.pemahamanBermakna}</p>
        <p><strong>Pertanyaan Pemantik:</strong></p>
        <ul>${hasilModul.komponenInti.pertanyaanPemantik.map((q) => `<li>${q}</li>`).join('')}</ul>
        <h3>III. KEGIATAN PEMBELAJARAN</h3>
        <h4>A. Kegiatan Pendahuluan (${hasilModul.komponenInti.kegiatanPembelajaran.pendahuluan.durasi})</h4>
        <ol>${hasilModul.komponenInti.kegiatanPembelajaran.pendahuluan.langkah.map((l) => `<li>${l}</li>`).join('')}</ol>
        <h4>B. Kegiatan Inti (${hasilModul.komponenInti.kegiatanPembelajaran.inti.durasi})</h4>
        <ol>${hasilModul.komponenInti.kegiatanPembelajaran.inti.langkah.map((l) => `<li>${l}</li>`).join('')}</ol>
        ${hasilModul.komponenInti.kegiatanPembelajaran.inti.diferensiasi ? `<p><em>Diferensiasi: ${hasilModul.komponenInti.kegiatanPembelajaran.inti.diferensiasi}</em></p>` : ''}
        <h4>C. Kegiatan Penutup (${hasilModul.komponenInti.kegiatanPembelajaran.penutup.durasi})</h4>
        <ol>${hasilModul.komponenInti.kegiatanPembelajaran.penutup.langkah.map((l) => `<li>${l}</li>`).join('')}</ol>
        <h3>IV. ASESMEN</h3>
        <p><strong>1. Asesmen Diagnostik:</strong> ${hasilModul.komponenInti.asesmen.diagnostik}</p>
        <p><strong>2. Asesmen Formatif:</strong> ${hasilModul.komponenInti.asesmen.formatif}</p>
        <p><strong>3. Asesmen Sumatif:</strong> ${hasilModul.komponenInti.asesmen.sumatif}</p>
        <table style="margin-top: 50px; border: none;">
          <tr style="border: none;">
            <td style="border: none; text-align: center;" width="50%">
              Mengetahui,<br/>Kepala SDIT Al Fikri<br/><br/><br/><br/>
              <strong><u>${hasilModul.identitas.kepalaSekolah}</u></strong>
            </td>
            <td style="border: none; text-align: center;" width="50%">
              Depok, .................... 2026<br/>Guru Pengampu Mata Pelajaran<br/><br/><br/><br/>
              <strong><u>${hasilModul.identitas.penyusun}</u></strong>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
    const blob = new Blob(['\ufeff' + content], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Modul_Ajar_${hasilModul.identitas.mataPelajaran.replace(/[^a-zA-Z0-9]/g, '_')}_Kelas_${tingkatKelas}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] my-auto">
        {/* Header Modal */}
        <div className="relative px-6 py-4 bg-gradient-to-r from-emerald-950 via-[#102422] to-slate-900 border-b border-emerald-800/40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white">
                  Generator Modul Ajar (Kurikulum Merdeka)
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-[10px] font-black text-emerald-300 flex items-center gap-1 uppercase">
                  <Sparkles className="w-3 h-3" /> AI Assistant
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Penyusunan instan RPP Plus standar BSKAP Kemendikbudristek & karakter Islam terpadu SDIT Al Fikri.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Konten Scrollable */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6">
          {/* FORM INPUT JIKA BELUM ADA HASIL / JIKA INGIN MENGATUR ULANG */}
          {!hasilModul ? (
            <form onSubmit={handleGenerate} className="space-y-6">
              <div className="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                  <Layers className="w-4 h-4" /> 1. Identitas Mata Pelajaran & Kelas
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {/* Mapel */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Mata Pelajaran <span className="text-emerald-400">*</span>
                    </label>
                    <select
                      value={mataPelajaran}
                      onChange={(e) => setMataPelajaran(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                    >
                      {DAFTAR_MAPEL.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Kelas & Fase */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Kelas & Fase Otomatis
                    </label>
                    <div className="flex items-center gap-2">
                      <select
                        value={tingkatKelas}
                        onChange={(e) => setTingkatKelas(e.target.value)}
                        className="w-1/2 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                      >
                        {[1, 2, 3, 4, 5, 6].map((k) => (
                          <option key={k} value={k}>
                            Kelas {k}
                          </option>
                        ))}
                      </select>
                      <span className="w-1/2 px-3 py-2.5 bg-emerald-950/60 border border-emerald-600/40 rounded-xl text-center text-xs font-bold text-emerald-300">
                        {getFase(tingkatKelas)}
                      </span>
                    </div>
                  </div>

                  {/* Semester */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Semester
                    </label>
                    <select
                      value={semester}
                      onChange={(e) => setSemester(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="Semester 1 (Ganjil)">Semester 1 (Ganjil)</option>
                      <option value="Semester 2 (Genap)">Semester 2 (Genap)</option>
                    </select>
                  </div>

                  {/* Tahun Pelajaran */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Tahun Pelajaran
                    </label>
                    <input
                      type="text"
                      value={tahunPelajaran}
                      onChange={(e) => setTahunPelajaran(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                      placeholder="2025/2026"
                    />
                  </div>

                  {/* Alokasi Waktu */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Alokasi Waktu
                    </label>
                    <input
                      type="text"
                      value={alokasiWaktu}
                      onChange={(e) => setAlokasiWaktu(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                      placeholder="2 x 35 Menit (1 Pertemuan)"
                    />
                  </div>
                </div>
              </div>

              {/* MATERI & PEDAGOGIK */}
              <div className="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                  <GraduationCap className="w-4 h-4" /> 2. Materi Pokok & Model Pembelajaran
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Bab / Topik Materi Pokok */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Bab atau Topik Materi Pokok <span className="text-emerald-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={babMateri}
                      onChange={(e) => setBabMateri(e.target.value)}
                      placeholder="Contoh: Meneladani Asmaul Husna / Pecahan Senilai / Ekosistem Lingkungan Sekolah"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                      required
                    />
                  </div>

                  {/* Sub-Materi */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Sub-Materi / Fokus Pertemuan
                    </label>
                    <input
                      type="text"
                      value={subMateri}
                      onChange={(e) => setSubMateri(e.target.value)}
                      placeholder="Contoh: Makna Al-Malik, Al-Quddus, & As-Salam (Opsional)"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Model Pembelajaran */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Model Pembelajaran
                    </label>
                    <select
                      value={modelPembelajaran}
                      onChange={(e) => setModelPembelajaran(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                    >
                      {OPSI_MODEL_PEMBELAJARAN.map((mdl) => (
                        <option key={mdl} value={mdl}>
                          {mdl}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Profil Pelajar Pancasila Selection */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2">
                    Profil Pelajar Pancasila yang Dituju:
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {OPSI_PROFIL_PANCASILA.map((p) => {
                      const selected = profilPancasila.includes(p);
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => handleToggleProfil(p)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                            selected
                              ? 'bg-emerald-600 text-white border border-emerald-400'
                              : 'bg-slate-900/80 text-slate-400 border border-slate-700 hover:text-slate-200'
                          }`}
                        >
                          {selected ? '✓ ' : '+ '}
                          {p}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* IDENTITAS PENGESAHAN */}
              <div className="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                  <Award className="w-4 h-4" /> 3. Identitas Pengesahan & Pengampu
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Nama Guru Pengampu
                    </label>
                    <input
                      type="text"
                      value={namaPenyusun}
                      onChange={(e) => setNamaPenyusun(e.target.value)}
                      placeholder="Contoh: Ust. Ahmad Fauzi, S.Pd"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Nama Kepala Sekolah
                    </label>
                    <input
                      type="text"
                      value={namaKepalaSekolah}
                      onChange={(e) => setNamaKepalaSekolah(e.target.value)}
                      placeholder="Contoh: Kepala SDIT Al Fikri"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Catatan / Permintaan Tambahan untuk AI
                    </label>
                    <input
                      type="text"
                      value={catatanTambahan}
                      onChange={(e) => setCatatanTambahan(e.target.value)}
                      placeholder="Contoh: Sertakan pembiasaan zikir pagi dan metode game kartu berpasangan"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {errorMessage && (
                <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs sm:text-sm flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Action Submit */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black shadow-lg shadow-emerald-950/40 flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Menyusun Modul Ajar AI...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Buat Modul Ajar Sekarang</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* HASIL DOKUMEN MODUL AJAR PREVIEW */
            <div className="space-y-4">
              {/* Toolbar Aksi Atas */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-slate-800/80 border border-slate-700/80 print:hidden">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setHasilModul(null)}
                    className="px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Susun Ulang
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditable(!isEditable)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                      isEditable
                        ? 'bg-amber-500 text-black'
                        : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                    }`}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    {isEditable ? 'Mode Edit Aktif' : 'Edit Teks'}
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyText}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Tersalin!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Salin Teks</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadDoc}
                    className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Unduh Word (.doc)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePrint}
                    className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-emerald-950/40"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Cetak / Simpan PDF</span>
                  </button>
                </div>
              </div>

              {/* DOKUMEN CETAK STANDAR KURIKULUM MERDEKA */}
              <div
                id="printable-modul-ajar"
                contentEditable={isEditable}
                suppressContentEditableWarning={true}
                className="bg-white text-slate-900 p-6 sm:p-10 rounded-2xl shadow-xl border border-slate-200 print:m-0 print:p-0 print:border-none print:shadow-none font-sans leading-relaxed text-xs sm:text-sm"
              >
                {/* Header Formal */}
                <div className="text-center border-b-2 border-slate-900 pb-4 mb-6">
                  <h1 className="text-base sm:text-lg font-black tracking-wide uppercase text-slate-900">
                    MODUL AJAR KURIKULUM MERDEKA (RPP PLUS)
                  </h1>
                  <h2 className="text-sm sm:text-base font-bold text-slate-800 uppercase mt-0.5">
                    SDIT AL FIKRI
                  </h2>
                  <p className="text-xs text-slate-600 mt-1">
                    Tahun Pelajaran {hasilModul.identitas.tahunPelajaran} | {hasilModul.identitas.semester}
                  </p>
                </div>

                {/* BAGIAN I: INFORMASI UMUM */}
                <div className="mb-6 space-y-3">
                  <h3 className="text-xs sm:text-sm font-black bg-emerald-100 text-emerald-900 px-3 py-1.5 rounded uppercase tracking-wide">
                    I. INFORMASI UMUM
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 border border-slate-200 rounded-lg p-3 bg-slate-50/50">
                    <div>
                      <span className="font-bold text-slate-700">Nama Sekolah: </span>
                      <span>{hasilModul.identitas.namaSekolah}</span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-700">Mata Pelajaran: </span>
                      <span>{hasilModul.identitas.mataPelajaran}</span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-700">Fase / Kelas: </span>
                      <span>
                        {hasilModul.identitas.fase} / {hasilModul.identitas.kelas}
                      </span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-700">Alokasi Waktu: </span>
                      <span>{hasilModul.identitas.alokasiWaktu}</span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-700">Bab / Materi: </span>
                      <span>{hasilModul.identitas.babMateri}</span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-700">Sub-Materi: </span>
                      <span>{hasilModul.identitas.subMateri || '-'}</span>
                    </div>
                    <div className="md:col-span-2">
                      <span className="font-bold text-slate-700">Profil Pelajar Pancasila: </span>
                      <span>{hasilModul.profilPelajarPancasila.join(', ')}</span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-700">Model Pembelajaran: </span>
                      <span>{hasilModul.modelPembelajaran}</span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-700">Target Peserta Didik: </span>
                      <span>{hasilModul.targetPesertaDidik}</span>
                    </div>
                  </div>

                  <div className="space-y-1 pt-1">
                    <p>
                      <strong>A. Kompetensi Awal: </strong>
                      {hasilModul.kompetensiAwal}
                    </p>
                    <p>
                      <strong>B. Media Pembelajaran: </strong>
                      {hasilModul.saranaPrasarana?.media?.join(', ')}
                    </p>
                    <p>
                      <strong>C. Sumber Belajar: </strong>
                      {hasilModul.saranaPrasarana?.sumberBelajar?.join(', ')}
                    </p>
                  </div>
                </div>

                {/* BAGIAN II: KOMPONEN INTI */}
                <div className="mb-6 space-y-3">
                  <h3 className="text-xs sm:text-sm font-black bg-emerald-100 text-emerald-900 px-3 py-1.5 rounded uppercase tracking-wide">
                    II. KOMPONEN INTI
                  </h3>

                  <div className="space-y-2">
                    <div>
                      <h4 className="font-bold text-slate-900">A. Capaian Pembelajaran (CP):</h4>
                      <p className="pl-4 text-slate-800 italic">
                        "{hasilModul.komponenInti.capaianPembelajaran}"
                      </p>
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-900">B. Tujuan Pembelajaran (TP):</h4>
                      <ol className="list-decimal list-inside pl-4 space-y-1">
                        {hasilModul.komponenInti.tujuanPembelajaran.map((tp, idx) => (
                          <li key={idx} className="text-slate-800">
                            {tp}
                          </li>
                        ))}
                      </ol>
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-900">C. Pemahaman Bermakna:</h4>
                      <p className="pl-4 text-slate-800">
                        {hasilModul.komponenInti.pemahamanBermakna}
                      </p>
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-900">D. Pertanyaan Pemantik:</h4>
                      <ul className="list-disc list-inside pl-4 space-y-1">
                        {hasilModul.komponenInti.pertanyaanPemantik.map((q, idx) => (
                          <li key={idx} className="text-slate-800">
                            {q}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {hasilModul.uraianMateri && (
                      <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                        <h4 className="font-bold text-slate-900">E. Uraian Materi Pembelajaran:</h4>
                        {hasilModul.uraianMateri.ringkasanKonsep && (
                          <p className="text-slate-800 pl-2 leading-relaxed">
                            {hasilModul.uraianMateri.ringkasanKonsep}
                          </p>
                        )}
                        {hasilModul.uraianMateri.poinEsensial && hasilModul.uraianMateri.poinEsensial.length > 0 && (
                          <div className="pl-2">
                            <span className="font-bold text-xs text-slate-700">Poin Esensial:</span>
                            <ul className="list-disc list-inside space-y-0.5 mt-0.5 text-slate-800">
                              {hasilModul.uraianMateri.poinEsensial.map((pe, idx) => (
                                <li key={idx}>{pe}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {hasilModul.uraianMateri.integrasiKeislaman && (
                          <div className="p-2 bg-emerald-50 border-l-4 border-emerald-600 rounded-r text-xs text-emerald-950 mt-2">
                            <strong>Integrasi Nilai Keislaman & Karakter: </strong>
                            {hasilModul.uraianMateri.integrasiKeislaman}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* BAGIAN III: KEGIATAN PEMBELAJARAN LANGKAH-LANGKAH */}
                <div className="mb-6 space-y-3">
                  <h3 className="text-xs sm:text-sm font-black bg-emerald-100 text-emerald-900 px-3 py-1.5 rounded uppercase tracking-wide">
                    III. KEGIATAN PEMBELAJARAN
                  </h3>

                  <div className="space-y-4">
                    {/* Pendahuluan */}
                    <div className="border border-slate-200 rounded-lg p-3">
                      <div className="flex items-center justify-between font-bold text-slate-900 pb-1 border-b border-slate-200 mb-2">
                        <span>A. Kegiatan Pendahuluan</span>
                        <span className="text-xs bg-slate-200 px-2 py-0.5 rounded">
                          {hasilModul.komponenInti.kegiatanPembelajaran.pendahuluan.durasi}
                        </span>
                      </div>
                      <ol className="list-decimal list-inside space-y-1 text-slate-800 pl-1">
                        {hasilModul.komponenInti.kegiatanPembelajaran.pendahuluan.langkah.map(
                          (l, idx) => (
                            <li key={idx}>{l}</li>
                          )
                        )}
                      </ol>
                    </div>

                    {/* Inti */}
                    <div className="border border-slate-200 rounded-lg p-3">
                      <div className="flex items-center justify-between font-bold text-slate-900 pb-1 border-b border-slate-200 mb-2">
                        <span>B. Kegiatan Inti ({hasilModul.modelPembelajaran})</span>
                        <span className="text-xs bg-slate-200 px-2 py-0.5 rounded">
                          {hasilModul.komponenInti.kegiatanPembelajaran.inti.durasi}
                        </span>
                      </div>
                      <ol className="list-decimal list-inside space-y-1.5 text-slate-800 pl-1">
                        {hasilModul.komponenInti.kegiatanPembelajaran.inti.langkah.map(
                          (l, idx) => (
                            <li key={idx} className="leading-relaxed">
                              {l}
                            </li>
                          )
                        )}
                      </ol>
                      {hasilModul.komponenInti.kegiatanPembelajaran.inti.diferensiasi && (
                        <div className="mt-3 p-2 bg-emerald-50 border-l-4 border-emerald-600 rounded-r text-xs text-emerald-900">
                          <strong>Strategi Diferensiasi: </strong>
                          {hasilModul.komponenInti.kegiatanPembelajaran.inti.diferensiasi}
                        </div>
                      )}
                    </div>

                    {/* Penutup */}
                    <div className="border border-slate-200 rounded-lg p-3">
                      <div className="flex items-center justify-between font-bold text-slate-900 pb-1 border-b border-slate-200 mb-2">
                        <span>C. Kegiatan Penutup</span>
                        <span className="text-xs bg-slate-200 px-2 py-0.5 rounded">
                          {hasilModul.komponenInti.kegiatanPembelajaran.penutup.durasi}
                        </span>
                      </div>
                      <ol className="list-decimal list-inside space-y-1 text-slate-800 pl-1">
                        {hasilModul.komponenInti.kegiatanPembelajaran.penutup.langkah.map(
                          (l, idx) => (
                            <li key={idx}>{l}</li>
                          )
                        )}
                      </ol>
                    </div>
                  </div>
                </div>

                {/* BAGIAN IV: ASESMEN */}
                <div className="mb-6 space-y-3">
                  <h3 className="text-xs sm:text-sm font-black bg-emerald-100 text-emerald-900 px-3 py-1.5 rounded uppercase tracking-wide">
                    IV. ASESMEN & PENILAIAN
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="border border-slate-200 p-3 rounded-lg bg-slate-50/50">
                      <h4 className="font-bold text-slate-900 mb-1">1. Asesmen Diagnostik:</h4>
                      <p className="text-xs text-slate-700">
                        {hasilModul.komponenInti.asesmen.diagnostik}
                      </p>
                      {hasilModul.komponenInti.asesmen.instrumenDiagnostik && hasilModul.komponenInti.asesmen.instrumenDiagnostik.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-slate-200">
                          <span className="text-[11px] font-bold text-slate-800">Pertanyaan Diagnostik:</span>
                          <ul className="list-disc list-inside space-y-0.5 mt-1 text-[11px] text-slate-700">
                            {hasilModul.komponenInti.asesmen.instrumenDiagnostik.map((inst, i) => (
                              <li key={i}>{inst}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                    <div className="border border-slate-200 p-3 rounded-lg bg-slate-50/50">
                      <h4 className="font-bold text-slate-900 mb-1">2. Asesmen Formatif:</h4>
                      <p className="text-xs text-slate-700">
                        {hasilModul.komponenInti.asesmen.formatif}
                      </p>
                    </div>
                    <div className="border border-slate-200 p-3 rounded-lg bg-slate-50/50">
                      <h4 className="font-bold text-slate-900 mb-1">3. Asesmen Sumatif:</h4>
                      <p className="text-xs text-slate-700">
                        {hasilModul.komponenInti.asesmen.sumatif}
                      </p>
                    </div>
                  </div>

                  {/* Tabel Rubrik Formatif Berjenjang */}
                  {hasilModul.komponenInti.asesmen.rubrikFormatif && hasilModul.komponenInti.asesmen.rubrikFormatif.length > 0 && (
                    <div className="mt-3">
                      <h4 className="font-bold text-slate-900 text-xs mb-1.5">Rubrik Penilaian Formatif (Skala 4):</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse border border-slate-300 text-left text-[11px]">
                          <thead>
                            <tr className="bg-slate-100 font-bold text-slate-900">
                              <th className="border border-slate-300 p-1.5">Kriteria</th>
                              <th className="border border-slate-300 p-1.5">Sangat Baik (4)</th>
                              <th className="border border-slate-300 p-1.5">Baik (3)</th>
                              <th className="border border-slate-300 p-1.5">Cukup (2)</th>
                              <th className="border border-slate-300 p-1.5">Perlu Bimbingan (1)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {hasilModul.komponenInti.asesmen.rubrikFormatif.map((r, i) => (
                              <tr key={i}>
                                <td className="border border-slate-300 p-1.5 font-bold">{r.kriteria}</td>
                                <td className="border border-slate-300 p-1.5">{r.skor4}</td>
                                <td className="border border-slate-300 p-1.5">{r.skor3}</td>
                                <td className="border border-slate-300 p-1.5">{r.skor2}</td>
                                <td className="border border-slate-300 p-1.5">{r.skor1}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Butir Soal Evaluasi Sumatif */}
                  {hasilModul.komponenInti.asesmen.soalSumatif && hasilModul.komponenInti.asesmen.soalSumatif.length > 0 && (
                    <div className="mt-3">
                      <h4 className="font-bold text-slate-900 text-xs mb-1.5">Instrumen Butir Soal Evaluasi Sumatif:</h4>
                      <div className="space-y-2 border border-slate-200 rounded-lg p-3 bg-slate-50/50">
                        {hasilModul.komponenInti.asesmen.soalSumatif.map((s, idx) => (
                          <div key={idx} className="text-xs text-slate-800 pb-1.5 border-b border-slate-200 last:border-b-0">
                            <p className="font-medium">
                              <strong>{s.no || idx + 1}.</strong> {s.butirSoal}
                            </p>
                            <div className="mt-0.5 text-[11px] text-emerald-800 flex items-center justify-between">
                              <span><strong>Kunci/Pedoman:</strong> {s.kunciJawaban}</span>
                              <span className="font-bold bg-emerald-100 px-1.5 py-0.5 rounded">Bobot: {s.skor} Poin</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* BAGIAN V: PENGAYAAN DAN REMEDIAL */}
                <div className="mb-6 space-y-2">
                  <h3 className="text-xs sm:text-sm font-black bg-emerald-100 text-emerald-900 px-3 py-1.5 rounded uppercase tracking-wide">
                    V. PENGAYAAN DAN REMEDIAL
                  </h3>
                  <div className="border border-slate-200 rounded-lg p-3 space-y-2">
                    <p>
                      <strong>A. Kegiatan Pengayaan: </strong>
                      {hasilModul.komponenInti.pengayaanDanRemedial?.pengayaan}
                    </p>
                    <p>
                      <strong>B. Kegiatan Remedial: </strong>
                      {hasilModul.komponenInti.pengayaanDanRemedial?.remedial}
                    </p>
                  </div>
                </div>

                {/* TANDA TANGAN PENGESAHAN */}
                <div className="pt-8 mt-8 border-t border-slate-300 grid grid-cols-2 text-center text-xs sm:text-sm">
                  <div>
                    <p>Mengetahui,</p>
                    <p className="font-bold">Kepala SDIT Al Fikri</p>
                    <div className="h-20" />
                    <p className="font-bold underline uppercase">
                      {hasilModul.identitas.kepalaSekolah}
                    </p>
                  </div>

                  <div>
                    <p>Depok, ......................... 2026</p>
                    <p className="font-bold">Guru Pengampu Mata Pelajaran</p>
                    <div className="h-20" />
                    <p className="font-bold underline uppercase">
                      {hasilModul.identitas.penyusun}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
