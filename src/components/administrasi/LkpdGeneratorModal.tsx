import React, { useState } from 'react';
import {
  X,
  Sparkles,
  BookOpen,
  Printer,
  Copy,
  Check,
  Loader2,
  FileSpreadsheet,
  Download,
  Users,
  Eye,
  EyeOff,
  RotateCcw,
  Edit3,
  CheckCircle2,
  HelpCircle,
  Clock,
  HeartHandshake,
  Languages,
} from 'lucide-react';

export interface LkpdData {
  identitas: {
    namaSekolah: string;
    judulLkpd: string;
    mataPelajaran: string;
    fase: string;
    kelas: string;
    babMateri: string;
    subMateri: string;
    alokasiWaktu: string;
    tipeAktivitas: string;
  };
  tujuanPembelajaran: string[];
  petunjukBelajar: string[];
  stimulusMateri: {
    judul: string;
    teks: string;
    ceritaAtauKasusKontekstual?: string;
    pertanyaanPemandu?: string[];
    poinPenting: string[];
  };
  aktivitas: Array<{
    nomor: number;
    judul: string;
    instruksi: string;
    formatJawaban: 'tabel' | 'isian' | 'pilihan_alasan' | 'proyek_mini' | 'refleksi';
    tabelData?: {
      kolom: string[];
      baris: string[][];
    };
    soalAtauPertanyaan?: string[];
    ruangJawab: string;
  }>;
  kunciJawabanDanRubrik: {
    panduanGuru: string;
    rubrikPenilaian: Array<{
      aspek: string;
      skor4: string;
      skor3: string;
      skor2: string;
      skor1: string;
    }>;
    kunciJawabanAktivitas: Array<{
      nomor: number;
      jawaban: string;
    }>;
  };
  refleksiDiriSiswa: string[];
}

interface LkpdGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DAFTAR_MAPEL = [
  'Ilmu Pengetahuan Alam & Sosial (IPAS)',
  'Matematika',
  'Pendidikan Agama Islam & Budi Pekerti (PAI)',
  'Bahasa Indonesia',
  'Pendidikan Pancasila / PKn',
  'Bahasa Inggris',
  'Bahasa Arab',
  'Al-Qur’an Hadits',
  'Akidah Akhlak',
  'Fikih',
  'Seni Rupa & Budaya',
  'PJOK',
];

const OPSI_TIPE_AKTIVITAS = [
  'Kelompok Kolaboratif (4-5 Siswa)',
  'Mandiri / Individu Terarah',
  'Eksplorasi Konsep & Pengamatan Nyata',
  'Diskusi Masalah & Studi Kasus',
];

const OPSI_TINGKAT_KESULITAN = [
  'Sedang & Menantang (Standar)',
  'Mudah & Menyenangkan (Fondasi)',
  'HOTS / Penalaran Tinggi (Tantangan Kritis)',
];

export const LkpdGeneratorModal: React.FC<LkpdGeneratorModalProps> = ({
  isOpen,
  onClose,
}) => {
  // Inputs
  const [tingkatKelas, setTingkatKelas] = useState<string>('4');
  const [mataPelajaran, setMataPelajaran] = useState<string>(DAFTAR_MAPEL[0]);
  const [babMateri, setBabMateri] = useState<string>('');
  const [subMateri, setSubMateri] = useState<string>('');
  const [tipeAktivitas, setTipeAktivitas] = useState<string>(OPSI_TIPE_AKTIVITAS[0]);
  const [tingkatKesulitan, setTingkatKesulitan] = useState<string>(OPSI_TINGKAT_KESULITAN[0]);
  const [alokasiWaktu, setAlokasiWaktu] = useState<string>('30 - 45 Menit');
  const [integrasiKeislaman, setIntegrasiKeislaman] = useState<boolean>(true);
  const [bilingual, setBilingual] = useState<boolean>(false);
  const [petunjukTambahan, setPetunjukTambahan] = useState<string>('');

  // Status & Result
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasilLkpd, setHasilLkpd] = useState<LkpdData | null>(null);
  const [tampilkanKunciGuru, setTampilkanKunciGuru] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isEditable, setIsEditable] = useState<boolean>(false);

  if (!isOpen) return null;

  const getFase = (kelasStr: string) => {
    const k = parseInt(kelasStr, 10);
    if (k <= 2) return 'Fase A';
    if (k <= 4) return 'Fase B';
    return 'Fase C';
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!babMateri.trim()) {
      setErrorMessage('Silakan isi Bab atau Topik Materi Pokok LKPD.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    const fase = getFase(tingkatKelas);

    try {
      const response = await fetch('/api/evaluation/generate-lkpd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mataPelajaran,
          kelas: `Kelas ${tingkatKelas}`,
          fase,
          babMateri: babMateri.trim(),
          subMateri: subMateri.trim(),
          tipeAktivitas,
          tingkatKesulitan,
          alokasiWaktu,
          integrasiKeislaman,
          bilingual,
          petunjukTambahan: petunjukTambahan.trim(),
        }),
      });

      const data = await response.json();

      if (data.status === 'ok' && data.lkpd) {
        setHasilLkpd(data.lkpd);
      } else {
        throw new Error(data.message || 'Gagal menyusun LKPD dari server.');
      }
    } catch (err: any) {
      console.error('Error generate LKPD:', err);
      setErrorMessage(
        err?.message ||
          'Terjadi kendala saat menghubungi AI. Silakan coba beberapa saat lagi.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyText = () => {
    if (!hasilLkpd) return;
    const txt = [
      hasilLkpd.identitas.judulLkpd,
      `Mata Pelajaran: ${hasilLkpd.identitas.mataPelajaran} | ${hasilLkpd.identitas.kelas} (${hasilLkpd.identitas.fase})`,
      `Alokasi Waktu : ${hasilLkpd.identitas.alokasiWaktu} | Tipe: ${hasilLkpd.identitas.tipeAktivitas}`,
      ``,
      `TUJUAN PEMBELAJARAN:`,
      hasilLkpd.tujuanPembelajaran.map((t, i) => `  ${i + 1}. ${t}`).join('\n'),
      ``,
      `PETUNJUK BELAJAR:`,
      hasilLkpd.petunjukBelajar.map((p, i) => `  ${i + 1}. ${p}`).join('\n'),
      ``,
      `STIMULUS: ${hasilLkpd.stimulusMateri.judul}`,
      hasilLkpd.stimulusMateri.teks,
      ``,
      ...hasilLkpd.aktivitas.map((act) => {
        return [
          `--- ${act.judul} ---`,
          `Instruksi: ${act.instruksi}`,
          act.soalAtauPertanyaan
            ? act.soalAtauPertanyaan.map((q, idx) => `  ${idx + 1}. ${q}`).join('\n')
            : '',
          ``,
        ].join('\n');
      }),
    ].join('\n');

    navigator.clipboard.writeText(txt);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  const handleDownloadDoc = () => {
    if (!hasilLkpd) return;
    const content = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>${hasilLkpd.identitas.babMateri} - LKPD SDIT Al Fikri</title>
      <style>
        body { font-family: 'Arial', sans-serif; line-height: 1.5; color: #111; margin: 30px; }
        .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 16px; }
        .box { border: 1px solid #333; padding: 10px; margin: 12px 0; border-radius: 4px; }
        table { border-collapse: collapse; width: 100%; margin: 12px 0; }
        th, td { border: 1px solid #444; padding: 6px 8px; font-size: 12px; }
        th { background-color: #e2f0d9; }
      </style>
      </head>
      <body>
        <div class="header">
          <h2 style="margin: 0; color: #0d3826;">${hasilLkpd.identitas.namaSekolah}</h2>
          <h3 style="margin: 4px 0;">${hasilLkpd.identitas.judulLkpd}</h3>
          <p style="margin: 0; font-size: 13px;">Mata Pelajaran: ${hasilLkpd.identitas.mataPelajaran} | ${hasilLkpd.identitas.kelas} (${hasilLkpd.identitas.fase}) | Waktu: ${hasilLkpd.identitas.alokasiWaktu}</p>
        </div>
        <div class="box">
          <table style="border: none; margin: 0;">
            <tr style="border: none;">
              <td style="border: none;" width="60%">Nama Anggota/Siswa:<br/>1. ...................................................<br/>2. ...................................................<br/>3. ...................................................<br/>4. ...................................................</td>
              <td style="border: none;" width="40%">Kelas / No. Presensi: .....................<br/>Tanggal: ............................................<br/>Nilai / Paraf Guru:</td>
            </tr>
          </table>
        </div>
        <h4>A. TUJUAN PEMBELAJARAN:</h4>
        <ol>${hasilLkpd.tujuanPembelajaran.map((t) => `<li>${t}</li>`).join('')}</ol>
        <h4>B. PETUNJUK PENGERJAAN:</h4>
        <ol>${hasilLkpd.petunjukBelajar.map((p) => `<li>${p}</li>`).join('')}</ol>
        <div class="box" style="background-color: #f9fbf9;">
          <h4 style="margin-top: 0; color: #0d3826;">${hasilLkpd.stimulusMateri.judul}</h4>
          <p>${hasilLkpd.stimulusMateri.teks}</p>
        </div>
        ${hasilLkpd.aktivitas
          .map(
            (act) => `
          <h4>${act.judul}</h4>
          <p><strong>Instruksi:</strong> ${act.instruksi}</p>
          ${
            act.tabelData
              ? `<table>
                  <tr>${act.tabelData.kolom.map((c) => `<th>${c}</th>`).join('')}</tr>
                  ${act.tabelData.baris.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`).join('')}
                </table>`
              : ''
          }
          ${
            act.soalAtauPertanyaan
              ? `<ol>${act.soalAtauPertanyaan.map((q) => `<li style="margin-bottom: 25px;">${q}<br/><div style="border-bottom: 1px dotted #888; height: 35px; width: 100%;"></div></li>`).join('')}</ol>`
              : ''
          }
        `
          )
          .join('')}
      </body>
      </html>
    `;
    const blob = new Blob(['\ufeff' + content], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `LKPD_${hasilLkpd.identitas.mataPelajaran.replace(/[^a-zA-Z0-9]/g, '_')}_Kelas_${tingkatKelas}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] my-auto">
        {/* Header Modal */}
        <div className="relative px-6 py-4 bg-gradient-to-r from-teal-950 via-[#0e272b] to-slate-900 border-b border-teal-800/40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-300">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white">
                  Generator LKPD (Lembar Kerja Peserta Didik)
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-teal-500/20 border border-teal-500/40 text-[10px] font-black text-teal-300 flex items-center gap-1 uppercase">
                  <Sparkles className="w-3 h-3" /> AI Assistant
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Hasilkan lembar kerja siswa interaktif, stimulus kontekstual, rubrik guru, dan format siap cetak.
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
          {!hasilLkpd ? (
            /* FORM INPUT */
            <form onSubmit={handleGenerate} className="space-y-6">
              {/* Box 1: Identitas Mapel & Sasaran */}
              <div className="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-teal-400 flex items-center gap-2">
                  <BookOpen className="w-4 h-4" /> 1. Sasaran Belajar & Mata Pelajaran
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Mata Pelajaran <span className="text-teal-400">*</span>
                    </label>
                    <select
                      value={mataPelajaran}
                      onChange={(e) => setMataPelajaran(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-teal-500"
                    >
                      {DAFTAR_MAPEL.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Kelas & Fase
                    </label>
                    <div className="flex items-center gap-2">
                      <select
                        value={tingkatKelas}
                        onChange={(e) => setTingkatKelas(e.target.value)}
                        className="w-1/2 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-teal-500"
                      >
                        {[1, 2, 3, 4, 5, 6].map((k) => (
                          <option key={k} value={k}>
                            Kelas {k}
                          </option>
                        ))}
                      </select>
                      <span className="w-1/2 px-3 py-2.5 bg-teal-950/60 border border-teal-600/40 rounded-xl text-center text-xs font-bold text-teal-300">
                        {getFase(tingkatKelas)}
                      </span>
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Bab atau Topik Materi Pokok <span className="text-teal-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={babMateri}
                      onChange={(e) => setBabMateri(e.target.value)}
                      placeholder="Contoh: Perubahan Wujud Zat / Sifat-Sifat Cahaya / Mengenal Kalimat Thayyibah"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Sub-Topik / Fokus Aktivitas
                    </label>
                    <input
                      type="text"
                      value={subMateri}
                      onChange={(e) => setSubMateri(e.target.value)}
                      placeholder="Contoh: Mengamati Es Mencair (Opsional)"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>
              </div>

              {/* Box 2: Desain Aktivitas & Karakteristik Siswa */}
              <div className="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-teal-400 flex items-center gap-2">
                  <Users className="w-4 h-4" /> 2. Desain Aktivitas Siswa
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Tipe Aktivitas Siswa
                    </label>
                    <select
                      value={tipeAktivitas}
                      onChange={(e) => setTipeAktivitas(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-teal-500"
                    >
                      {OPSI_TIPE_AKTIVITAS.map((tip) => (
                        <option key={tip} value={tip}>
                          {tip}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Tingkat Kesulitan Soal/Aktivitas
                    </label>
                    <select
                      value={tingkatKesulitan}
                      onChange={(e) => setTingkatKesulitan(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-teal-500"
                    >
                      {OPSI_TINGKAT_KESULITAN.map((dif) => (
                        <option key={dif} value={dif}>
                          {dif}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Alokasi Waktu Pengerjaan
                    </label>
                    <div className="relative">
                      <Clock className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                      <input
                        type="text"
                        value={alokasiWaktu}
                        onChange={(e) => setAlokasiWaktu(e.target.value)}
                        placeholder="30 - 45 Menit"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-teal-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Switch Integrasi Islami & Bilingual */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/70 border border-slate-700 cursor-pointer hover:border-teal-500/50 transition-colors">
                    <input
                      type="checkbox"
                      checked={integrasiKeislaman}
                      onChange={(e) => setIntegrasiKeislaman(e.target.checked)}
                      className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 bg-slate-800 border-slate-600"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                        <HeartHandshake className="w-3.5 h-3.5 text-emerald-400" />
                        Karakter Islam Terpadu SDIT
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Sertakan hikmah ketuhanan, adab, dan refleksi kebaikan.
                      </p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/70 border border-slate-700 cursor-pointer hover:border-teal-500/50 transition-colors">
                    <input
                      type="checkbox"
                      checked={bilingual}
                      onChange={(e) => setBilingual(e.target.checked)}
                      className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 bg-slate-800 border-slate-600"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                        <Languages className="w-3.5 h-3.5 text-cyan-400" />
                        Terminologi Bilingual
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Sertakan istilah penting dalam Bahasa Arab atau Inggris.
                      </p>
                    </div>
                  </label>
                </div>

                {/* Catatan Tambahan */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Instruksi Khusus / Tambahan untuk AI
                  </label>
                  <input
                    type="text"
                    value={petunjukTambahan}
                    onChange={(e) => setPetunjukTambahan(e.target.value)}
                    placeholder="Contoh: Sisipkan tabel pengamatan 4 benda konkret di kelas dan soal pemecahan masalah sederhana"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              {errorMessage && (
                <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs sm:text-sm flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Submit Button */}
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
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white text-xs font-black shadow-lg shadow-teal-950/40 flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Menyusun Lembar LKPD AI...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Buat LKPD Sekarang</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* PREVIEW DOKUMEN LKPD */
            <div className="space-y-4">
              {/* Toolbar Aksi */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-slate-800/80 border border-slate-700/80 print:hidden">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setHasilLkpd(null)}
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

                  {/* Toggle Kunci Guru */}
                  <button
                    type="button"
                    onClick={() => setTampilkanKunciGuru(!tampilkanKunciGuru)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                      tampilkanKunciGuru
                        ? 'bg-teal-600 text-white'
                        : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                    }`}
                  >
                    {tampilkanKunciGuru ? (
                      <>
                        <Eye className="w-3.5 h-3.5" />
                        <span>Kunci Guru Ditampilkan</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-3.5 h-3.5" />
                        <span>Mode Siswa (Kunci Tersembunyi)</span>
                      </>
                    )}
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
                        <Check className="w-3.5 h-3.5 text-teal-400" />
                        <span className="text-teal-400">Tersalin!</span>
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
                    className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Unduh Word</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePrint}
                    className="px-4 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-teal-950/40"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Cetak LKPD</span>
                  </button>
                </div>
              </div>

              {/* DOKUMEN CETAK LKPD */}
              <div
                id="printable-lkpd"
                contentEditable={isEditable}
                suppressContentEditableWarning={true}
                className="bg-white text-slate-900 p-6 sm:p-10 rounded-2xl shadow-xl border border-slate-200 print:m-0 print:p-0 print:border-none print:shadow-none font-sans leading-relaxed text-xs sm:text-sm"
              >
                {/* Header LKPD */}
                <div className="text-center border-b-2 border-slate-900 pb-3 mb-5">
                  <p className="text-xs font-black uppercase text-teal-900 tracking-wider">
                    {hasilLkpd.identitas.namaSekolah}
                  </p>
                  <h1 className="text-sm sm:text-base font-black tracking-wide uppercase text-slate-900 mt-0.5">
                    {hasilLkpd.identitas.judulLkpd}
                  </h1>
                  <p className="text-xs text-slate-600 mt-1">
                    Mata Pelajaran: <strong>{hasilLkpd.identitas.mataPelajaran}</strong> | {hasilLkpd.identitas.kelas} ({hasilLkpd.identitas.fase}) | Alokasi Waktu: {hasilLkpd.identitas.alokasiWaktu}
                  </p>
                </div>

                {/* Kotak Identitas Siswa / Kelompok */}
                <div className="border border-slate-400 rounded-lg p-3 mb-5 grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/50">
                  <div>
                    <span className="font-bold text-slate-800">Nama Anggota / Siswa:</span>
                    <div className="mt-1 space-y-1 text-xs text-slate-600">
                      <div className="border-b border-dotted border-slate-400 pb-0.5">
                        1. ............................................................................
                      </div>
                      <div className="border-b border-dotted border-slate-400 pb-0.5">
                        2. ............................................................................
                      </div>
                      <div className="border-b border-dotted border-slate-400 pb-0.5">
                        3. ............................................................................
                      </div>
                      <div className="border-b border-dotted border-slate-400 pb-0.5">
                        4. ............................................................................
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col justify-between">
                    <div className="space-y-1.5 text-xs text-slate-800">
                      <div>
                        <strong>Kelas / No. Presensi : </strong>
                        <span>{hasilLkpd.identitas.kelas} / ................</span>
                      </div>
                      <div>
                        <strong>Hari / Tanggal : </strong>
                        <span>................................................</span>
                      </div>
                      <div>
                        <strong>Tipe Aktivitas : </strong>
                        <span>{hasilLkpd.identitas.tipeAktivitas}</span>
                      </div>
                    </div>

                    <div className="border border-slate-400 rounded p-1.5 text-center mt-2 bg-white">
                      <span className="text-[11px] font-bold text-slate-600 uppercase block">
                        Nilai / Paraf Guru
                      </span>
                      <div className="h-8" />
                    </div>
                  </div>
                </div>

                {/* TUJUAN PEMBELAJARAN */}
                <div className="mb-4">
                  <h3 className="font-bold text-slate-900 text-xs sm:text-sm uppercase tracking-wide bg-teal-50 border-l-4 border-teal-600 px-2 py-1 mb-1.5">
                    A. TUJUAN PEMBELAJARAN
                  </h3>
                  <ol className="list-decimal list-inside pl-2 space-y-0.5 text-slate-800">
                    {hasilLkpd.tujuanPembelajaran.map((tp, idx) => (
                      <li key={idx}>{tp}</li>
                    ))}
                  </ol>
                </div>

                {/* PETUNJUK PENGERJAAN */}
                <div className="mb-5">
                  <h3 className="font-bold text-slate-900 text-xs sm:text-sm uppercase tracking-wide bg-teal-50 border-l-4 border-teal-600 px-2 py-1 mb-1.5">
                    B. PETUNJUK PENGERJAAN
                  </h3>
                  <ol className="list-decimal list-inside pl-2 space-y-0.5 text-slate-800">
                    {hasilLkpd.petunjukBelajar.map((pb, idx) => (
                      <li key={idx}>{pb}</li>
                    ))}
                  </ol>
                </div>

                {/* STIMULUS MATERI */}
                <div className="mb-6 p-4 rounded-xl border border-teal-200 bg-teal-50/40 space-y-3">
                  <div>
                    <h4 className="font-black text-teal-950 text-sm mb-1">
                      {hasilLkpd.stimulusMateri.judul}
                    </h4>
                    <p className="text-slate-800 text-xs sm:text-sm leading-relaxed">
                      {hasilLkpd.stimulusMateri.teks}
                    </p>
                  </div>

                  {hasilLkpd.stimulusMateri.ceritaAtauKasusKontekstual && (
                    <div className="p-3 bg-white border border-teal-200 rounded-lg text-xs leading-relaxed text-slate-800 shadow-sm">
                      <strong className="text-teal-900 block mb-1">📖 Studi Kasus / Cerita Pengantar:</strong>
                      <p className="italic">{hasilLkpd.stimulusMateri.ceritaAtauKasusKontekstual}</p>
                    </div>
                  )}

                  {hasilLkpd.stimulusMateri.pertanyaanPemandu && hasilLkpd.stimulusMateri.pertanyaanPemandu.length > 0 && (
                    <div className="bg-teal-100/60 p-2.5 rounded-lg text-xs">
                      <strong className="text-teal-950 block mb-1">❓ Pertanyaan Pemandu Diskusi:</strong>
                      <ul className="list-disc list-inside space-y-0.5 text-teal-900">
                        {hasilLkpd.stimulusMateri.pertanyaanPemandu.map((q, idx) => (
                          <li key={idx}>{q}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {hasilLkpd.stimulusMateri.poinPenting &&
                    hasilLkpd.stimulusMateri.poinPenting.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {hasilLkpd.stimulusMateri.poinPenting.map((p, idx) => (
                          <span
                            key={idx}
                            className="text-[11px] font-bold px-2.5 py-0.5 bg-teal-100 text-teal-900 rounded-full"
                          >
                            ✓ {p}
                          </span>
                        ))}
                      </div>
                    )}
                </div>

                {/* AKTIVITAS SISWA */}
                <div className="space-y-6">
                  {hasilLkpd.aktivitas.map((act) => (
                    <div
                      key={act.nomor}
                      className="border border-slate-300 rounded-xl p-4 bg-white"
                    >
                      <h4 className="font-black text-slate-900 text-sm pb-1 border-b border-slate-200 mb-2">
                        {act.judul}
                      </h4>
                      <p className="text-xs sm:text-sm text-slate-700 italic mb-3">
                        <strong>Instruksi: </strong>
                        {act.instruksi}
                      </p>

                      {/* Tampilan Tabel Jika Ada */}
                      {act.tabelData && (
                        <div className="overflow-x-auto mb-3">
                          <table className="w-full border-collapse border border-slate-400 text-xs">
                            <thead>
                              <tr className="bg-slate-100 text-slate-900">
                                {act.tabelData.kolom.map((col, cIdx) => (
                                  <th
                                    key={cIdx}
                                    className="border border-slate-400 px-2 py-1.5 text-center font-bold"
                                  >
                                    {col}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {act.tabelData.baris.map((row, rIdx) => (
                                <tr key={rIdx}>
                                  {row.map((cell, cellIdx) => (
                                    <td
                                      key={cellIdx}
                                      className={`border border-slate-400 px-2 py-2 ${
                                        cellIdx === 0 ? 'text-center font-bold w-10' : ''
                                      }`}
                                    >
                                      {cell}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Tampilan Pertanyaan / Isian */}
                      {act.soalAtauPertanyaan && act.soalAtauPertanyaan.length > 0 && (
                        <div className="space-y-4">
                          {act.soalAtauPertanyaan.map((q, qIdx) => (
                            <div key={qIdx} className="space-y-1.5">
                              <p className="font-medium text-slate-900">
                                {qIdx + 1}. {q}
                              </p>
                              {/* Garis-Garis Jawaban Siswa */}
                              <div className="space-y-2 pt-1 pl-4">
                                <div className="border-b border-dotted border-slate-400 h-4" />
                                <div className="border-b border-dotted border-slate-400 h-4" />
                                <div className="border-b border-dotted border-slate-400 h-4" />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* REFLEKSI DIRI SISWA */}
                <div className="mt-6 border border-slate-300 rounded-xl p-4 bg-slate-50/40">
                  <h4 className="font-bold text-slate-900 text-xs sm:text-sm uppercase tracking-wide mb-2">
                    C. REFLEKSI DIRI SISWA
                  </h4>
                  <p className="text-xs text-slate-600 mb-2">
                    Berilah tanda centang (✓) pada kalimat yang sesuai dengan perasaanmu hari ini:
                  </p>
                  <div className="space-y-1.5 text-xs text-slate-800">
                    {hasilLkpd.refleksiDiriSiswa.map((ref, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="w-4 h-4 border border-slate-400 rounded inline-block" />
                        <span>{ref}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* KUNCI JAWABAN & RUBRIK (PANDUAN GURU) */}
                {tampilkanKunciGuru && (
                  <div className="mt-8 pt-6 border-t-2 border-dashed border-teal-600 print:break-before-page">
                    <div className="bg-teal-900 text-white px-3 py-1.5 rounded-t-lg font-bold text-xs uppercase flex items-center justify-between">
                      <span>PANDUAN GURU & RUBRIK PENILAIAN (KUNCI JAWABAN)</span>
                      <span className="text-[10px] bg-teal-800 px-2 py-0.5 rounded">
                        Halaman Pegangan Guru
                      </span>
                    </div>

                    <div className="border border-teal-700 p-4 rounded-b-lg bg-teal-50/50 space-y-4">
                      <div>
                        <h5 className="font-bold text-teal-950 text-xs">Petunjuk Pengamatan Guru:</h5>
                        <p className="text-xs text-teal-900 mt-0.5">
                          {hasilLkpd.kunciJawabanDanRubrik.panduanGuru}
                        </p>
                      </div>

                      {/* Kunci Jawaban Aktivitas */}
                      <div>
                        <h5 className="font-bold text-teal-950 text-xs mb-1.5">
                          Kunci / Rekomendasi Jawaban Aktivitas:
                        </h5>
                        <div className="space-y-2">
                          {hasilLkpd.kunciJawabanDanRubrik.kunciJawabanAktivitas.map((k) => (
                            <div
                              key={k.nomor}
                              className="text-xs bg-white p-2 rounded border border-teal-200"
                            >
                              <strong>Aktivitas {k.nomor}: </strong>
                              <span className="text-slate-800">{k.jawaban}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Rubrik Penilaian */}
                      {hasilLkpd.kunciJawabanDanRubrik.rubrikPenilaian &&
                        hasilLkpd.kunciJawabanDanRubrik.rubrikPenilaian.length > 0 && (
                          <div>
                            <h5 className="font-bold text-teal-950 text-xs mb-1.5">
                              Rubrik Penilaian Kinerja Siswa:
                            </h5>
                            <div className="overflow-x-auto">
                              <table className="w-full border-collapse border border-teal-400 text-[11px]">
                                <thead>
                                  <tr className="bg-teal-200 text-teal-950">
                                    <th className="border border-teal-400 p-1">Aspek Dinilai</th>
                                    <th className="border border-teal-400 p-1">Skor 4 (Sangat Baik)</th>
                                    <th className="border border-teal-400 p-1">Skor 3 (Baik)</th>
                                    <th className="border border-teal-400 p-1">Skor 2 (Cukup)</th>
                                    <th className="border border-teal-400 p-1">Skor 1 (Kurang)</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {hasilLkpd.kunciJawabanDanRubrik.rubrikPenilaian.map(
                                    (rub, rIdx) => (
                                      <tr key={rIdx} className="bg-white">
                                        <td className="border border-teal-400 p-1 font-bold">
                                          {rub.aspek}
                                        </td>
                                        <td className="border border-teal-400 p-1 text-slate-700">
                                          {rub.skor4}
                                        </td>
                                        <td className="border border-teal-400 p-1 text-slate-700">
                                          {rub.skor3}
                                        </td>
                                        <td className="border border-teal-400 p-1 text-slate-700">
                                          {rub.skor2}
                                        </td>
                                        <td className="border border-teal-400 p-1 text-slate-700">
                                          {rub.skor1}
                                        </td>
                                      </tr>
                                    )
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
