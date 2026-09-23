import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Printer,
  Copy,
  Check,
  Loader2,
  Calendar,
  Download,
  RotateCcw,
  Edit3,
  HelpCircle,
  FileSpreadsheet,
  Clock,
  BookOpen,
  Layers,
  FileText,
  Book,
} from 'lucide-react';

export interface PromesData {
  identitas: {
    namaSekolah: string;
    mataPelajaran: string;
    fase: string;
    kelas: string;
    semester: string;
    tahunPelajaran: string;
    penyusun: string;
    kepalaSekolah: string;
    jpPerMinggu: number;
    totalMingguEfektif: number;
    totalJP: number;
    modeAcuan?: string;
    fokusMateri?: string;
  };
  daftarBulan: string[];
  alokasiMateriDanMinggu: Array<{
    no: number;
    tujuanPembelajaran: string;
    materiPokok: string;
    alokasiJP: number;
    matriksMingguan: {
      [bulanNama: string]: Array<number | string>;
    };
  }>;
  rekapitulasiAgenda: {
    kbmEfektifJP: number;
    asesmenTengahSemesterJP: number;
    asesmenAkhirSemesterJP: number;
    cadanganDanRemedialJP: number;
    totalSemesterJP: number;
  };
}

interface PromesGeneratorModalProps {
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

const DAFTAR_KELAS_FASE = [
  { kelas: 'Kelas 1', fase: 'Fase A' },
  { kelas: 'Kelas 2', fase: 'Fase A' },
  { kelas: 'Kelas 3', fase: 'Fase B' },
  { kelas: 'Kelas 4', fase: 'Fase B' },
  { kelas: 'Kelas 5', fase: 'Fase C' },
  { kelas: 'Kelas 6', fase: 'Fase C' },
];

export const PromesGeneratorModal: React.FC<PromesGeneratorModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [mataPelajaran, setMataPelajaran] = useState(DAFTAR_MAPEL[0]);
  const [kelas, setKelas] = useState('Kelas 4');
  const [fase, setFase] = useState('Fase B');
  const [semester, setSemester] = useState('Semester 1 (Ganjil)');
  const [tahunPelajaran, setTahunPelajaran] = useState('2025/2026');
  const [jpPerMinggu, setJpPerMinggu] = useState<number>(4);
  const [namaPenyusun, setNamaPenyusun] = useState('Guru Pengampu SDIT Al Fikri');
  const [namaKepalaSekolah, setNamaKepalaSekolah] = useState('M. Yunus, S.Ag');

  // Mode Acuan Pembelajaran: Kurikulum Nasional vs Buku Paket
  const [modeAcuan, setModeAcuan] = useState<'kurikulum_nasional' | 'buku_paket'>('kurikulum_nasional');
  const [daftarBabBuku, setDaftarBabBuku] = useState('');
  const [fokusMateri, setFokusMateri] = useState('');
  const [pekanEfektif, setPekanEfektif] = useState<number>(18);
  const [pekanCadangan, setPekanCadangan] = useState<number>(2);
  const [integrasiIslami, setIntegrasiIslami] = useState(true);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [hasilPromes, setHasilPromes] = useState<PromesData | null>(null);

  const [isCopied, setIsCopied] = useState(false);
  const [isEditable, setIsEditable] = useState(false);

  if (!isOpen) return null;

  const handleKelasChange = (kls: string) => {
    setKelas(kls);
    const item = DAFTAR_KELAS_FASE.find((k) => k.kelas === kls);
    if (item) setFase(item.fase);
  };

  const handleLoadSampleBab = () => {
    const isSem1 = semester.includes('1') || semester.includes('Ganjil');

    if (mataPelajaran.includes('Pendidikan Agama Islam') || mataPelajaran.includes('PAI')) {
      if (isSem1) {
        setDaftarBabBuku(
`Bab 1: Mari Belajar Surah Al-Hujurat dan Hadis Keberagaman
Bab 2: Teladan Mulia Asmaulhusna (Al-Malik, Al-Quddus, As-Salam)
Bab 3: Indahnya Saling Menghargai dalam Keragaman
Bab 4: Menyambut Usia Baligh & Fikih Bersuci
Bab 5: Kisah Hijrah Nabi Muhammad SAW ke Madinah`
        );
      } else {
        setDaftarBabBuku(
`Bab 6: Senangnya Belajar Surah At-Tin
Bab 7: Beriman kepada Rasul-Rasul Allah
Bab 8: Menghiasi Diri dengan Akhlak Terpuji
Bab 9: Mengenal Salat Jumat, Duha, dan Tahajud
Bab 10: Keteladanan Sahabat Nabi Muhammad SAW`
        );
      }
    } else if (mataPelajaran.includes('IPAS')) {
      if (isSem1) {
        setDaftarBabBuku(
`Bab 1: Tumbuhan, Sumber Kehidupan di Bumi
Bab 2: Wujud Zat dan Perubahannya
Bab 3: Gaya di Sekitar Kita
Bab 4: Mengubah Bentuk Energi`
        );
      } else {
        setDaftarBabBuku(
`Bab 5: Cerita Tentang Daerahku
Bab 6: Indonesiaku Kaya Budaya
Bab 7: Bagaimana Mendapatkan Semua Keperluan Kita?
Bab 8: Membangun Masyarakat yang Beradab`
        );
      }
    } else if (mataPelajaran.includes('Bahasa Indonesia')) {
      if (isSem1) {
        setDaftarBabBuku(
`Bab 1: Sudah Besar (Mengenal Perasaan dan Tokoh Cerita)
Bab 2: Di Bawah Atap (Aturan dan Sopan Santun Rumah)
Bab 3: Lihat Sekitar (Lalu Lintas dan Denah Lingkungan)
Bab 4: Meliuk dan Menerjang (Teks Prosedur dan Gerakan Tubuh)`
        );
      } else {
        setDaftarBabBuku(
`Bab 5: Bertukar atau Membayar (Uang dan Barter)
Bab 6: Satu Titik (Bentang Alam dan Keindahan Alam)
Bab 7: Asal-Usul (Cerita Rakyat dan Nenek Moyang)
Bab 8: Sehatlah Ragaku (Kesehatan Makanan dan Istirahat)`
        );
      }
    } else {
      setDaftarBabBuku(
`Bab 1: Pengantar Konseptual & Dasar Pembelajaran
Bab 2: Pendalaman Materi & Latihan Terstruktur
Bab 3: Implementasi Nilai Adab & Keterampilan Praktik
Bab 4: Asesmen Formatif & Proyek Kolaboratif`
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/evaluation/generate-promes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mataPelajaran,
          kelas,
          fase,
          semester,
          tahunPelajaran,
          jpPerMinggu,
          namaPenyusun,
          namaKepalaSekolah,
          modeAcuan,
          daftarBabBuku,
          fokusMateri,
          pekanEfektif,
          pekanCadangan,
          integrasiIslami,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.status === 'error') {
        throw new Error(data.message || 'Gagal menyusun Program Semester.');
      }

      setHasilPromes(data.promes);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Terjadi kesalahan saat membuat Promes.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyText = () => {
    const el = document.getElementById('printable-promes-area');
    if (!el) return;
    navigator.clipboard.writeText(el.innerText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDownloadWord = () => {
    const el = document.getElementById('printable-promes-area');
    if (!el) return;
    const content = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><title>Program Semester - ${mataPelajaran}</title>
      <style>
        body { font-family: 'Times New Roman', Times, serif; font-size: 10pt; }
        table { border-collapse: collapse; width: 100%; margin-top: 8px; margin-bottom: 8px; }
        th, td { border: 1px solid black; padding: 4px; }
        th { background-color: #f2f2f2; text-align: center; }
        .text-center { text-align: center; }
        .font-bold { font-weight: bold; }
      </style>
      </head>
      <body>
        ${el.innerHTML}
      </body>
      </html>
    `;
    const blob = new Blob(['\ufeff', content], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `PROMES_${mataPelajaran.replace(/[^a-zA-Z0-9]/g, '_')}_${kelas}_${semester.replace(/[^a-zA-Z0-9]/g, '_')}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-6xl bg-slate-900 border border-slate-700/80 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Modal */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 bg-gradient-to-r from-teal-950/80 via-slate-900 to-emerald-950/80 border-b border-slate-700/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-white tracking-wide">
                  Generator Program Semester (PROMES)
                </h3>
                <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  Matriks Distribusi Mingguan Kurikulum Merdeka
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Pemetaan TP, Materi, Alokasi JP, dan Matriks Mingguan Bulan 1–6 (STS, SAS, Libur)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 text-slate-200 text-xs sm:text-sm">
          {!hasilPromes ? (
            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Layout Kompak 2 Kolom: Kiri (Data Pokok & Waktu Semester) & Kanan (Acuan Materi & Daftar Bab) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 items-start">
                
                {/* ================= KOLOM KIRI ================= */}
                <div className="space-y-3">
                  {/* Kartu 1: Identitas & Pendidik */}
                  <div className="p-3.5 rounded-xl bg-slate-800/70 border border-slate-700/80 space-y-2.5">
                    <div className="flex items-center justify-between border-b border-slate-700/60 pb-1.5">
                      <h5 className="text-[11px] font-black uppercase text-teal-400 tracking-wider flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5" /> Identitas & Periode Semester
                      </h5>
                      <span className="text-[10px] text-slate-400 font-semibold">SDIT Al Fikri</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="col-span-2">
                        <label className="block text-[10px] font-bold text-slate-300 mb-1">
                          Mata Pelajaran
                        </label>
                        <select
                          value={mataPelajaran}
                          onChange={(e) => setMataPelajaran(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-teal-500"
                        >
                          {DAFTAR_MAPEL.map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-300 mb-1">
                          Kelas & Fase
                        </label>
                        <select
                          value={kelas}
                          onChange={(e) => handleKelasChange(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-teal-500"
                        >
                          {DAFTAR_KELAS_FASE.map((k) => (
                            <option key={k.kelas} value={k.kelas}>
                              {k.kelas} ({k.fase})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-300 mb-1">
                          Semester
                        </label>
                        <select
                          value={semester}
                          onChange={(e) => setSemester(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-teal-500"
                        >
                          <option value="Semester 1 (Ganjil)">Semester 1 (Ganjil - Jul s.d Des)</option>
                          <option value="Semester 2 (Genap)">Semester 2 (Genap - Jan s.d Jun)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-300 mb-1">
                          Tahun Pelajaran
                        </label>
                        <input
                          type="text"
                          value={tahunPelajaran}
                          onChange={(e) => setTahunPelajaran(e.target.value)}
                          placeholder="2025/2026"
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-teal-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-300 mb-1">
                          Guru Pengampu
                        </label>
                        <input
                          type="text"
                          value={namaPenyusun}
                          onChange={(e) => setNamaPenyusun(e.target.value)}
                          placeholder="Guru Pengampu"
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-teal-500"
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="block text-[10px] font-bold text-slate-300 mb-1">
                          Kepala Sekolah
                        </label>
                        <input
                          type="text"
                          value={namaKepalaSekolah}
                          onChange={(e) => setNamaKepalaSekolah(e.target.value)}
                          placeholder="Kepala Sekolah"
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-teal-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Kartu 2: Alokasi JP & Kalender Efektif Semester */}
                  <div className="p-3.5 rounded-xl bg-slate-800/70 border border-slate-700/80 space-y-2">
                    <div className="flex items-center justify-between border-b border-slate-700/60 pb-1.5">
                      <h5 className="text-[11px] font-black uppercase text-emerald-400 tracking-wider flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" /> Beban JP & Minggu Efektif
                      </h5>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {pekanEfektif * jpPerMinggu} JP / Semester
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-300 mb-1">
                          JP / Minggu
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={12}
                          value={jpPerMinggu}
                          onChange={(e) => setJpPerMinggu(Number(e.target.value) || 4)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white text-center font-bold focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-300 mb-1">
                          Pekan Efektif KBM
                        </label>
                        <input
                          type="number"
                          min={10}
                          max={26}
                          value={pekanEfektif}
                          onChange={(e) => setPekanEfektif(Number(e.target.value) || 18)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white text-center font-bold focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-300 mb-1">
                          Pekan Cadangan/Ujian
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={8}
                          value={pekanCadangan}
                          onChange={(e) => setPekanCadangan(Number(e.target.value) || 2)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white text-center font-bold focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 bg-slate-900/70 px-2.5 py-1.5 rounded-lg border border-slate-700/50">
                      <span>Bulan: <b>{semester.includes('1') ? 'Juli s.d Desember' : 'Januari s.d Juni'}</b></span>
                      <span>•</span>
                      <span>Cadangan: <b>{pekanCadangan} pekan</b> (STS, SAS, Libur)</span>
                    </div>
                  </div>
                </div>

                {/* ================= KOLOM KANAN ================= */}
                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl bg-slate-800/70 border border-slate-700/80 space-y-2.5">
                    <div className="flex items-center justify-between border-b border-slate-700/60 pb-1.5">
                      <h5 className="text-[11px] font-black uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5" /> Sumber Acuan Materi Semester
                      </h5>
                      <span className="text-[10px] text-slate-400">Pilih Opsi</span>
                    </div>

                    {/* Toggle Tab Mode Acuan */}
                    <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-900/90 rounded-xl border border-slate-700/80">
                      <button
                        type="button"
                        onClick={() => setModeAcuan('kurikulum_nasional')}
                        className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                          modeAcuan === 'kurikulum_nasional'
                            ? 'bg-teal-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Kurikulum Nasional</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setModeAcuan('buku_paket')}
                        className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                          modeAcuan === 'buku_paket'
                            ? 'bg-amber-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <Book className="w-3.5 h-3.5" />
                        <span>Daftar Bab Buku Paket</span>
                      </button>
                    </div>

                    {/* Form Sesuai Mode Acuan */}
                    {modeAcuan === 'kurikulum_nasional' ? (
                      <div className="space-y-2">
                        <div className="p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-300 text-[11px] leading-relaxed">
                          <p className="font-bold flex items-center gap-1 mb-0.5">
                            <Check className="w-3.5 h-3.5 text-teal-400 shrink-0" /> Standar BSKAP 046/H/KR/2025
                          </p>
                          AI membagi materi {semester} ke dalam bulan 1 s.d 6 secara proporsional dengan alokasi STS & SAS.
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-300 mb-1">
                            Fokus / Catatan Tambahan Guru (Opsional)
                          </label>
                          <input
                            type="text"
                            value={fokusMateri}
                            onChange={(e) => setFokusMateri(e.target.value)}
                            placeholder="Contoh: Fokus pada projek praktikum, literasi hadis, atau penguatan numerasi..."
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-bold text-amber-300 flex items-center gap-1">
                            <Book className="w-3 h-3" /> Input Bab Buku Paket ({semester})
                          </label>
                          <button
                            type="button"
                            onClick={handleLoadSampleBab}
                            className="text-[10px] font-extrabold text-teal-400 hover:text-teal-300 underline cursor-pointer"
                          >
                            + Muat Contoh Bab
                          </button>
                        </div>
                        <p className="text-[10px] text-slate-400 leading-snug">
                          Tuliskan bab yang diajarkan pada semester ini. AI akan mendistribusikan jam dan minggu ke kolom bulan 1 s.d 6.
                        </p>
                        <textarea
                          rows={4}
                          value={daftarBabBuku}
                          onChange={(e) => setDaftarBabBuku(e.target.value)}
                          placeholder={"Bab 1: Judul Bab Pertama\nBab 2: Judul Bab Kedua\nBab 3: Judul Bab Ketiga\n(1 bab per baris)"}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-[11px] text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500 font-mono leading-relaxed"
                        />
                      </div>
                    )}

                    {/* Integrasi Karakter Islami JSIT */}
                    <div className="pt-2 border-t border-slate-700/60 flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="integrasi-islami-promes"
                        checked={integrasiIslami}
                        onChange={(e) => setIntegrasiIslami(e.target.checked)}
                        className="rounded border-slate-700 text-teal-600 focus:ring-teal-500 w-3.5 h-3.5 cursor-pointer"
                      />
                      <label htmlFor="integrasi-islami-promes" className="text-[11px] text-slate-300 cursor-pointer">
                        Integrasikan Karakter Islami (JSIT) & Profil Pelajar Pancasila
                      </label>
                    </div>
                  </div>

                  {/* Tombol Eksekusi Submit */}
                  <div>
                    {errorMessage && (
                      <div className="mb-2 p-2 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                        <HelpCircle className="w-4 h-4 shrink-0" />
                        <span>{errorMessage}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={onClose}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white text-xs font-black shadow-md shadow-teal-950/40 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Menyusun Matriks PROMES...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4" />
                            <span>Generate Program Semester</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            </form>
          ) : (
            <div className="space-y-4">
              {/* Toolbar Aksi Atas */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-2xl bg-slate-800/80 border border-slate-700/80 print:hidden">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setHasilPromes(null)}
                    className="px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Buat Ulang
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditable(!isEditable)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      isEditable
                        ? 'bg-amber-500 text-black font-extrabold'
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
                    className="px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
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
                    onClick={handleDownloadWord}
                    className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Unduh Word (.doc)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePrint}
                    className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Cetak / PDF</span>
                  </button>
                </div>
              </div>

              {/* DOKUMEN PROMES RESMI BERSIAP CETAK */}
              <div
                id="printable-promes-area"
                contentEditable={isEditable}
                suppressContentEditableWarning={true}
                className="bg-white text-slate-900 p-5 sm:p-8 rounded-2xl shadow-xl border border-slate-200 print:m-0 print:p-0 print:border-none print:shadow-none font-sans leading-relaxed text-[11px]"
              >
                {/* Header Formal Promes */}
                <div className="text-center border-b-2 border-slate-900 pb-3 mb-4">
                  <h1 className="text-sm sm:text-base font-black tracking-wide uppercase text-slate-900">
                    PROGRAM SEMESTER (PROMES)
                  </h1>
                  <h2 className="text-xs sm:text-sm font-bold text-slate-800 uppercase mt-0.5">
                    KURIKULUM MERDEKA - SDIT AL FIKRI
                  </h2>
                  <p className="text-[11px] text-slate-600 mt-0.5 font-medium">
                    Tahun Pelajaran {hasilPromes.identitas.tahunPelajaran} | {hasilPromes.identitas.semester}
                  </p>
                </div>

                {/* Identitas Promes */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 mb-4 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px]">
                  <div>
                    <span className="font-bold text-slate-700">Satuan Pendidikan: </span>
                    <span>{hasilPromes.identitas.namaSekolah}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-700">Mata Pelajaran: </span>
                    <span>{hasilPromes.identitas.mataPelajaran}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-700">Fase / Kelas: </span>
                    <span>{hasilPromes.identitas.fase} / {hasilPromes.identitas.kelas}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-700">Alokasi per Minggu: </span>
                    <span>{hasilPromes.identitas.jpPerMinggu} Jam Pelajaran (JP)</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-700">Minggu Efektif Semester: </span>
                    <span>{hasilPromes.identitas.totalMingguEfektif} Minggu ({hasilPromes.identitas.totalJP} JP)</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-700">Guru Pengampu: </span>
                    <span>{hasilPromes.identitas.penyusun}</span>
                  </div>
                  {hasilPromes.identitas.modeAcuan && (
                    <div className="col-span-2 sm:col-span-3 pt-1 border-t border-slate-200 text-slate-600">
                      <span className="font-bold text-slate-700">Acuan Penyusunan: </span>
                      <span className="px-2 py-0.5 rounded bg-teal-100 text-teal-800 font-semibold text-[10px]">
                        {hasilPromes.identitas.modeAcuan === 'buku_paket' ? 'Daftar Bab Buku Paket Pegangan Guru' : 'Capaian Pembelajaran Kurikulum Nasional'}
                      </span>
                    </div>
                  )}
                </div>

                {/* MATRIKS PROMES BULANAN & MINGGUAN */}
                <div className="mb-5 overflow-x-auto">
                  <table className="w-full border-collapse border border-slate-400 text-center text-[10.5px]">
                    <thead>
                      <tr className="bg-slate-100 font-bold text-slate-900">
                        <th rowSpan={2} className="border border-slate-400 p-1 w-8">No</th>
                        <th rowSpan={2} className="border border-slate-400 p-1 text-left min-w-[200px]">
                          Tujuan Pembelajaran (TP) & Pokok Bahasan
                        </th>
                        <th rowSpan={2} className="border border-slate-400 p-1 w-12">
                          Alokasi (JP)
                        </th>
                        {hasilPromes.daftarBulan.map((bln) => (
                          <th key={bln} colSpan={5} className="border border-slate-400 p-1 bg-teal-50">
                            {bln}
                          </th>
                        ))}
                      </tr>
                      <tr className="bg-slate-50 font-bold text-slate-700 text-[9.5px]">
                        {hasilPromes.daftarBulan.map((bln) => (
                          <React.Fragment key={bln}>
                            <th className="border border-slate-400 p-0.5 w-6">1</th>
                            <th className="border border-slate-400 p-0.5 w-6">2</th>
                            <th className="border border-slate-400 p-0.5 w-6">3</th>
                            <th className="border border-slate-400 p-0.5 w-6">4</th>
                            <th className="border border-slate-400 p-0.5 w-6">5</th>
                          </React.Fragment>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {hasilPromes.alokasiMateriDanMinggu.map((item, idx) => {
                        const isSpecial =
                          item.materiPokok.includes('STS') ||
                          item.materiPokok.includes('SAS') ||
                          item.materiPokok.includes('SAT') ||
                          item.materiPokok.includes('Cadangan');

                        return (
                          <tr
                            key={idx}
                            className={isSpecial ? 'bg-amber-50/70 font-semibold' : 'hover:bg-slate-50/60'}
                          >
                            <td className="border border-slate-400 p-1 font-bold">{item.no || idx + 1}</td>
                            <td className="border border-slate-400 p-1 text-left leading-tight">
                              <span className="font-bold block text-slate-900">{item.materiPokok}</span>
                              <span className="text-slate-600 text-[10px]">{item.tujuanPembelajaran}</span>
                            </td>
                            <td className="border border-slate-400 p-1 font-bold text-teal-900">
                              {item.alokasiJP} JP
                            </td>

                            {/* Render Matriks 5 Minggu per Bulan */}
                            {hasilPromes.daftarBulan.map((bln) => {
                              const weeks = item.matriksMingguan?.[bln] || ['', '', '', '', ''];
                              return (
                                <React.Fragment key={bln}>
                                  {[0, 1, 2, 3, 4].map((wIdx) => {
                                    const val = weeks[wIdx];
                                    const hasValue = val !== '' && val !== null && val !== undefined && val !== 0;
                                    const isTextBadge = typeof val === 'string' && val.trim().length > 0 && isNaN(Number(val));

                                    return (
                                      <td
                                        key={wIdx}
                                        className={`border border-slate-400 p-0.5 text-[9.5px] ${
                                          hasValue
                                            ? isTextBadge
                                              ? 'bg-amber-200 font-extrabold text-amber-950'
                                              : 'bg-teal-100/80 font-bold text-teal-900'
                                            : ''
                                        }`}
                                      >
                                        {hasValue ? val : ''}
                                      </td>
                                    );
                                  })}
                                </React.Fragment>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-100 font-black text-slate-900">
                        <td colSpan={2} className="border border-slate-400 p-1.5 text-right">
                          TOTAL ALOKASI JP SEMESTER:
                        </td>
                        <td className="border border-slate-400 p-1.5 text-teal-900">
                          {hasilPromes.rekapitulasiAgenda.totalSemesterJP} JP
                        </td>
                        <td colSpan={hasilPromes.daftarBulan.length * 5} className="border border-slate-400 p-1.5 text-left pl-3 text-slate-700">
                          KBM Efektif: {hasilPromes.rekapitulasiAgenda.kbmEfektifJP} JP | STS: {hasilPromes.rekapitulasiAgenda.asesmenTengahSemesterJP} JP | SAS: {hasilPromes.rekapitulasiAgenda.asesmenAkhirSemesterJP} JP | Cadangan/Remedial: {hasilPromes.rekapitulasiAgenda.cadanganDanRemedialJP} JP
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Lembar Tanda Tangan Pengesahan */}
                <div className="pt-4 border-t border-slate-300 grid grid-cols-2 text-center text-xs">
                  <div>
                    <p>Mengetahui,</p>
                    <p className="font-bold">Kepala SDIT Al Fikri</p>
                    <div className="h-16" />
                    <p className="font-bold underline uppercase">
                      {hasilPromes.identitas.kepalaSekolah}
                    </p>
                  </div>

                  <div>
                    <p>Depok, ......................... 2026</p>
                    <p className="font-bold">Guru Pengampu Mata Pelajaran</p>
                    <div className="h-16" />
                    <p className="font-bold underline uppercase">
                      {hasilPromes.identitas.penyusun}
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
