import React, { useState, useEffect } from 'react';
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
  Clock,
  FileSpreadsheet,
  Award,
  BookOpen,
  Layers,
  FileText,
  Book,
  FolderOpen,
  BookmarkCheck,
  Trash2,
  HardDrive,
} from 'lucide-react';
import { exportProtaToWord } from '../../utils/protaPromesWordExport';
import {
  saveProtaDraft,
  getProtaDrafts,
  deleteProtaDraft,
  type SavedProtaDraft,
  saveFormAutosave,
  getFormAutosave,
} from '../../services/administrasiLocalStorage';
import { getActiveTeacherSession } from '../../services/teacherStorage';

export interface ProtaData {
  identitas: {
    namaSekolah: string;
    mataPelajaran: string;
    fase: string;
    kelas: string;
    tahunPelajaran: string;
    penyusun: string;
    kepalaSekolah: string;
    jpPerMinggu: number;
    modeAcuan?: string;
  };
  rincianMingguEfektif: {
    semester1: {
      totalMinggu: number;
      mingguTidakEfektif: number;
      mingguEfektif: number;
      totalJP: number;
    };
    semester2: {
      totalMinggu: number;
      mingguTidakEfektif: number;
      mingguEfektif: number;
      totalJP: number;
    };
    totalMingguEfektifTahunan: number;
    totalJPTahunan: number;
  };
  distribusiMateri: Array<{
    no: number;
    semester: number;
    elemen: string;
    capaianPembelajaran: string;
    tujuanPembelajaran: string;
    materiPokok: string;
    alokasiWaktuJP: number;
    keterangan?: string;
  }>;
}

interface ProtaGeneratorModalProps {
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

export const ProtaGeneratorModal: React.FC<ProtaGeneratorModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [mataPelajaran, setMataPelajaran] = useState(DAFTAR_MAPEL[0]);
  const [kelas, setKelas] = useState('Kelas 4');
  const [fase, setFase] = useState('Fase B');
  const [tahunPelajaran, setTahunPelajaran] = useState('2025/2026');
  const [jpPerMinggu, setJpPerMinggu] = useState<number>(4);
  const [namaPenyusun, setNamaPenyusun] = useState(() => {
    const session = getActiveTeacherSession();
    return session?.name || 'Guru Pengampu SDIT Al Fikri';
  });
  const [namaKepalaSekolah, setNamaKepalaSekolah] = useState('M. Yunus, S.Ag');

  // Mode Acuan Pembelajaran: Kurikulum Nasional vs Buku Paket
  const [modeAcuan, setModeAcuan] = useState<'kurikulum_nasional' | 'buku_paket'>('kurikulum_nasional');
  const [daftarBabBuku, setDaftarBabBuku] = useState('');
  const [fokusMateri, setFokusMateri] = useState('');
  const [pekanEfektif1, setPekanEfektif1] = useState<number>(20);
  const [pekanEfektif2, setPekanEfektif2] = useState<number>(19);
  const [integrasiIslami, setIntegrasiIslami] = useState(true);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [hasilProta, setHasilProta] = useState<ProtaData | null>(null);

  const [isCopied, setIsCopied] = useState(false);
  const [isEditable, setIsEditable] = useState(false);

  // Browser LocalStorage Drafts State
  const [draftsList, setDraftsList] = useState<SavedProtaDraft[]>([]);
  const [showDraftsModal, setShowDraftsModal] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(false);
  const [isAutoSaved, setIsAutoSaved] = useState(false);

  // Sync drafts & form autosave from browser localStorage on open
  useEffect(() => {
    if (isOpen) {
      setDraftsList(getProtaDrafts());
      const session = getActiveTeacherSession();
      if (session?.name && namaPenyusun === 'Guru Pengampu SDIT Al Fikri') {
        setNamaPenyusun(session.name);
      }
      const savedForm = getFormAutosave<any>('sdit_form_draft_prota_v1');
      if (savedForm?.data) {
        const d = savedForm.data;
        if (d.mataPelajaran) setMataPelajaran(d.mataPelajaran);
        if (d.kelas) setKelas(d.kelas);
        if (d.fase) setFase(d.fase);
        if (d.tahunPelajaran) setTahunPelajaran(d.tahunPelajaran);
        if (d.jpPerMinggu) setJpPerMinggu(d.jpPerMinggu);
        if (d.namaPenyusun && !session?.name) setNamaPenyusun(d.namaPenyusun);
        if (d.namaKepalaSekolah) setNamaKepalaSekolah(d.namaKepalaSekolah);
        if (d.modeAcuan) setModeAcuan(d.modeAcuan);
        if (d.daftarBabBuku) setDaftarBabBuku(d.daftarBabBuku);
        if (d.fokusMateri) setFokusMateri(d.fokusMateri);
        if (d.pekanEfektif1) setPekanEfektif1(d.pekanEfektif1);
        if (d.pekanEfektif2) setPekanEfektif2(d.pekanEfektif2);
      }
    }
  }, [isOpen]);

  // Form input autosave
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      saveFormAutosave('sdit_form_draft_prota_v1', {
        mataPelajaran,
        kelas,
        fase,
        tahunPelajaran,
        jpPerMinggu,
        namaPenyusun,
        namaKepalaSekolah,
        modeAcuan,
        daftarBabBuku,
        fokusMateri,
        pekanEfektif1,
        pekanEfektif2,
        integrasiIslami,
      });
      setIsAutoSaved(true);
      const reset = setTimeout(() => setIsAutoSaved(false), 2000);
      return () => clearTimeout(reset);
    }, 600);
    return () => clearTimeout(timer);
  }, [
    isOpen,
    mataPelajaran,
    kelas,
    fase,
    tahunPelajaran,
    jpPerMinggu,
    namaPenyusun,
    namaKepalaSekolah,
    modeAcuan,
    daftarBabBuku,
    fokusMateri,
    pekanEfektif1,
    pekanEfektif2,
    integrasiIslami,
  ]);

  if (!isOpen) return null;

  const handleKelasChange = (kls: string) => {
    setKelas(kls);
    const item = DAFTAR_KELAS_FASE.find((k) => k.kelas === kls);
    if (item) setFase(item.fase);
  };

  const handleSaveToBrowser = () => {
    if (!hasilProta) return;
    try {
      saveProtaDraft(hasilProta);
      setDraftsList(getProtaDrafts());
      setSaveSuccessMsg(true);
      setTimeout(() => setSaveSuccessMsg(false), 2500);
    } catch (e: any) {
      setErrorMessage(e.message || 'Gagal menyimpan ke browser.');
    }
  };

  const handleLoadDraft = (draft: SavedProtaDraft) => {
    setHasilProta(draft.protaData);
    setMataPelajaran(draft.mataPelajaran || DAFTAR_MAPEL[0]);
    setKelas(draft.kelas || 'Kelas 4');
    setFase(draft.fase || 'Fase B');
    setTahunPelajaran(draft.tahunPelajaran || '2025/2026');
    setShowDraftsModal(false);
  };

  const handleDeleteDraft = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteProtaDraft(id);
    setDraftsList(getProtaDrafts());
  };

  const handleLoadSampleBab = () => {
    if (mataPelajaran.includes('Pendidikan Agama Islam') || mataPelajaran.includes('PAI')) {
      setDaftarBabBuku(
`Bab 1: Mari Belajar Surah Al-Hujurat dan Hadis Keberagaman
Bab 2: Teladan Mulia Asmaulhusna (Al-Malik, Al-Quddus, As-Salam)
Bab 3: Indahnya Saling Menghargai dalam Keragaman
Bab 4: Menyambut Usia Baligh & Fikih Bersuci
Bab 5: Kisah Hijrah Nabi Muhammad SAW ke Madinah
Bab 6: Senangnya Belajar Surah At-Tin
Bab 7: Beriman kepada Rasul-Rasul Allah
Bab 8: Menghiasi Diri dengan Akhlak Terpuji
Bab 9: Mengenal Salat Jumat, Duha, dan Tahajud
Bab 10: Keteladanan Sahabat Nabi Muhammad SAW`
      );
    } else if (mataPelajaran.includes('IPAS')) {
      setDaftarBabBuku(
`Bab 1: Tumbuhan, Sumber Kehidupan di Bumi
Bab 2: Wujud Zat dan Perubahannya
Bab 3: Gaya di Sekitar Kita
Bab 4: Mengubah Bentuk Energi
Bab 5: Cerita Tentang Daerahku
Bab 6: Indonesiaku Kaya Budaya
Bab 7: Bagaimana Mendapatkan Semua Keperluan Kita?
Bab 8: Membangun Masyarakat yang Beradab`
      );
    } else if (mataPelajaran.includes('Bahasa Indonesia')) {
      setDaftarBabBuku(
`Bab 1: Sudah Besar (Mengenal Perasaan dan Tokoh Cerita)
Bab 2: Di Bawah Atap (Aturan dan Sopan Santun Rumah)
Bab 3: Lihat Sekitar (Lalu Lintas dan Denah Lingkungan)
Bab 4: Meliuk dan Menerjang (Teks Prosedur dan Gerakan Tubuh)
Bab 5: Bertukar atau Membayar (Uang dan Barter)
Bab 6: Satu Titik (Bentang Alam dan Keindahan Alam)
Bab 7: Asal-Usul (Cerita Rakyat dan Nenek Moyang)
Bab 8: Sehatlah Ragaku (Kesehatan Makanan dan Istirahat)`
      );
    } else {
      setDaftarBabBuku(
`Bab 1: Eksplorasi Konsep Dasar & Pemahaman Awal
Bab 2: Pembentukan Karakter & Penerapan Konseptual
Bab 3: Implementasi Adab & Keterampilan Praktik
Bab 4: Pengayaan Materi & Evaluasi Tengah Semester
Bab 5: Ibrah Keteladanan & Wawasan Lingkungan
Bab 6: Kolaborasi Proyek & Aksi Pembelajaran
Bab 7: Gelar Karya & Evaluasi Akhir Tahun`
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/evaluation/generate-prota', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mataPelajaran,
          kelas,
          fase,
          tahunPelajaran,
          jpPerMinggu,
          namaPenyusun,
          namaKepalaSekolah,
          modeAcuan,
          daftarBabBuku,
          fokusMateri,
          pekanEfektif1,
          pekanEfektif2,
          integrasiIslami,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.status === 'error') {
        throw new Error(data.message || 'Gagal menyusun Program Tahunan.');
      }

      setHasilProta(data.prota);
      try {
        saveProtaDraft(data.prota);
        setDraftsList(getProtaDrafts());
      } catch (errDraft) {
        console.warn('Gagal autosave ke browser:', errDraft);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Terjadi kesalahan saat membuat Prota.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyText = () => {
    const el = document.getElementById('printable-prota-area');
    if (!el) return;
    navigator.clipboard.writeText(el.innerText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDownloadWord = () => {
    if (!hasilProta) return;
    exportProtaToWord(hasilProta);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-700/80 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Modal */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 bg-gradient-to-r from-emerald-950/80 via-slate-900 to-teal-950/80 border-b border-slate-700/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-white tracking-wide">
                  Generator Program Tahunan (PROTA)
                </h3>
                <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Kurikulum Merdeka BSKAP 2025
                </span>
                {isAutoSaved && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 animate-pulse">
                    ✓ Tersimpan di browser
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                Alur Tujuan Pembelajaran (ATP), Rincian Minggu Efektif (RME), dan Alokasi JP
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowDraftsModal(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-500/40 text-emerald-300 text-xs font-bold transition-all cursor-pointer shadow-sm"
              title="Buka daftar draft Prota yang tersimpan di browser Anda"
            >
              <FolderOpen className="w-3.5 h-3.5 text-emerald-400" />
              <span>Draft Browser ({draftsList.length})</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 text-slate-200 text-xs sm:text-sm">
          {!hasilProta ? (
            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Layout Kompak 2 Kolom: Kiri (Data Pokok & Waktu) & Kanan (Acuan Materi & Daftar Bab) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 items-start">
                
                {/* ================= KOLOM KIRI ================= */}
                <div className="space-y-3">
                  {/* Kartu 1: Identitas & Pendidik */}
                  <div className="p-3.5 rounded-xl bg-slate-800/70 border border-slate-700/80 space-y-2.5">
                    <div className="flex items-center justify-between border-b border-slate-700/60 pb-1.5">
                      <h5 className="text-[11px] font-black uppercase text-emerald-400 tracking-wider flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5" /> Identitas & Pendidik
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
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
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
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
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
                          Tahun Pelajaran
                        </label>
                        <input
                          type="text"
                          value={tahunPelajaran}
                          onChange={(e) => setTahunPelajaran(e.target.value)}
                          placeholder="2025/2026"
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
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
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-300 mb-1">
                          Kepala Sekolah
                        </label>
                        <input
                          type="text"
                          value={namaKepalaSekolah}
                          onChange={(e) => setNamaKepalaSekolah(e.target.value)}
                          placeholder="Kepala Sekolah"
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Kartu 2: Alokasi JP & Kalender Efektif (Kalkulator Ringkas) */}
                  <div className="p-3.5 rounded-xl bg-slate-800/70 border border-slate-700/80 space-y-2">
                    <div className="flex items-center justify-between border-b border-slate-700/60 pb-1.5">
                      <h5 className="text-[11px] font-black uppercase text-teal-400 tracking-wider flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" /> Alokasi Waktu & Minggu Efektif
                      </h5>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">
                        Total {(pekanEfektif1 + pekanEfektif2) * jpPerMinggu} JP / Tahun
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
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white text-center font-bold focus:outline-none focus:border-teal-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-300 mb-1">
                          Pekan S1 (Ganjil)
                        </label>
                        <input
                          type="number"
                          min={10}
                          max={26}
                          value={pekanEfektif1}
                          onChange={(e) => setPekanEfektif1(Number(e.target.value) || 20)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white text-center font-bold focus:outline-none focus:border-teal-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-300 mb-1">
                          Pekan S2 (Genap)
                        </label>
                        <input
                          type="number"
                          min={10}
                          max={26}
                          value={pekanEfektif2}
                          onChange={(e) => setPekanEfektif2(Number(e.target.value) || 19)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white text-center font-bold focus:outline-none focus:border-teal-500"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 bg-slate-900/70 px-2.5 py-1.5 rounded-lg border border-slate-700/50">
                      <span>Sem 1: <b>{pekanEfektif1} pekan</b> ({pekanEfektif1 * jpPerMinggu} JP)</span>
                      <span>•</span>
                      <span>Sem 2: <b>{pekanEfektif2} pekan</b> ({pekanEfektif2 * jpPerMinggu} JP)</span>
                    </div>
                  </div>
                </div>

                {/* ================= KOLOM KANAN ================= */}
                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl bg-slate-800/70 border border-slate-700/80 space-y-2.5">
                    <div className="flex items-center justify-between border-b border-slate-700/60 pb-1.5">
                      <h5 className="text-[11px] font-black uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5" /> Sumber Acuan Materi
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
                            ? 'bg-emerald-600 text-white shadow-sm'
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
                        <span>Daftar Isi Buku Paket</span>
                      </button>
                    </div>

                    {/* Form Sesuai Mode Acuan */}
                    {modeAcuan === 'kurikulum_nasional' ? (
                      <div className="space-y-2">
                        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px] leading-relaxed">
                          <p className="font-bold flex items-center gap-1 mb-0.5">
                            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Standar BSKAP 046/H/KR/2025
                          </p>
                          AI otomatis menyusun materi pokok, elemen, capaian, dan TP standar resmi Kemendikbudristek untuk jenjang {kelas} ({fase}).
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-300 mb-1">
                            Fokus / Catatan Tambahan Guru (Opsional)
                          </label>
                          <input
                            type="text"
                            value={fokusMateri}
                            onChange={(e) => setFokusMateri(e.target.value)}
                            placeholder="Contoh: Penekanan literasi Al-Qur'an, adab bergaul, proyek sains..."
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-bold text-amber-300 flex items-center gap-1">
                            <Book className="w-3 h-3" /> Input Daftar Bab / Topik Buku Paket
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
                          Ketik atau salin daftar bab dari buku pegangan. AI akan memetakan TP dan alokasi JP tanpa mengubah judul bab.
                        </p>
                        <textarea
                          rows={4}
                          value={daftarBabBuku}
                          onChange={(e) => setDaftarBabBuku(e.target.value)}
                          placeholder={"Bab 1: Eksplorasi Konsep Dasar\nBab 2: Pembentukan Karakter\nBab 3: Implementasi Adab\n(1 bab per baris)"}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-[11px] text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500 font-mono leading-relaxed"
                        />
                      </div>
                    )}

                    {/* Integrasi Karakter Islami JSIT */}
                    <div className="pt-2 border-t border-slate-700/60 flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="integrasi-islami-prota"
                        checked={integrasiIslami}
                        onChange={(e) => setIntegrasiIslami(e.target.checked)}
                        className="rounded border-slate-700 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5 cursor-pointer"
                      />
                      <label htmlFor="integrasi-islami-prota" className="text-[11px] text-slate-300 cursor-pointer">
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
                        className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black shadow-md shadow-emerald-950/40 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Menyusun PROTA Lengkap...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4" />
                            <span>Generate Program Tahunan</span>
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
                    onClick={() => setHasilProta(null)}
                    className="px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Atur Ulang
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
                    onClick={handleSaveToBrowser}
                    className="px-3 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-600 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                    title="Simpan dokumen Prota ini ke penyimpanan lokal browser Anda"
                  >
                    {saveSuccessMsg ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-300" />
                        <span className="text-emerald-200">Tersimpan di Browser!</span>
                      </>
                    ) : (
                      <>
                        <HardDrive className="w-3.5 h-3.5 text-teal-300" />
                        <span>Simpan ke Browser</span>
                      </>
                    )}
                  </button>

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
                    className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                    title="Unduh dokumen resmi Prota dalam format Microsoft Word (.docx)"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Unduh Word (.docx)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePrint}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Cetak / PDF</span>
                  </button>
                </div>
              </div>

              {/* DOKUMEN PROTA RESMI SIAP CETAK */}
              <div
                id="printable-prota-area"
                contentEditable={isEditable}
                suppressContentEditableWarning={true}
                className="bg-white text-slate-900 p-5 sm:p-8 rounded-2xl shadow-xl border border-slate-200 print:m-0 print:p-0 print:border-none print:shadow-none font-sans leading-relaxed text-[11px]"
              >
                {/* Kop / Header Dokumen */}
                <div className="text-center border-b-2 border-slate-900 pb-3 mb-4">
                  <h1 className="text-sm sm:text-base font-black tracking-wide uppercase text-slate-900">
                    PROGRAM TAHUNAN (PROTA)
                  </h1>
                  <h2 className="text-xs sm:text-sm font-bold text-slate-800 uppercase mt-0.5">
                    KURIKULUM MERDEKA - SDIT AL FIKRI
                  </h2>
                  <p className="text-[11px] text-slate-600 mt-0.5 font-medium">
                    Tahun Pelajaran {hasilProta.identitas.tahunPelajaran}
                  </p>
                </div>

                {/* Identitas Pembelajaran */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 mb-4 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px]">
                  <div>
                    <span className="text-slate-500">Satuan Pendidikan:</span>
                    <p className="font-bold text-slate-900">{hasilProta.identitas.namaSekolah}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Mata Pelajaran:</span>
                    <p className="font-bold text-slate-900">{hasilProta.identitas.mataPelajaran}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Fase / Kelas:</span>
                    <p className="font-bold text-slate-900">
                      {hasilProta.identitas.fase} / {hasilProta.identitas.kelas}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500">Alokasi Waktu:</span>
                    <p className="font-bold text-slate-900">{hasilProta.identitas.jpPerMinggu} JP / Minggu</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Guru Pengampu:</span>
                    <p className="font-bold text-slate-900">{hasilProta.identitas.penyusun}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Kepala Sekolah:</span>
                    <p className="font-bold text-slate-900">{hasilProta.identitas.kepalaSekolah}</p>
                  </div>
                </div>

                {/* Bagian A: Analisis Alokasi Waktu Efektif */}
                <div className="mb-5">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-emerald-700" /> A. Analisis Alokasi Waktu & Rincian Minggu Efektif
                  </h3>
                  <table className="w-full text-[11px] border border-slate-300 text-left">
                    <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                      <tr>
                        <th className="p-2 border-r border-slate-300 text-center w-10">No</th>
                        <th className="p-2 border-r border-slate-300">Semester</th>
                        <th className="p-2 border-r border-slate-300 text-center">Jumlah Minggu Kalender</th>
                        <th className="p-2 border-r border-slate-300 text-center">Minggu Tidak Efektif</th>
                        <th className="p-2 border-r border-slate-300 text-center">Minggu Efektif KBM</th>
                        <th className="p-2 text-center">Total Jam Pelajaran (JP)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      <tr>
                        <td className="p-2 border-r border-slate-300 text-center font-medium">1</td>
                        <td className="p-2 border-r border-slate-300 font-bold">Semester 1 (Ganjil)</td>
                        <td className="p-2 border-r border-slate-300 text-center">{hasilProta.rincianMingguEfektif.semester1.totalMinggu}</td>
                        <td className="p-2 border-r border-slate-300 text-center">{hasilProta.rincianMingguEfektif.semester1.mingguTidakEfektif}</td>
                        <td className="p-2 border-r border-slate-300 text-center font-bold text-emerald-700">{hasilProta.rincianMingguEfektif.semester1.mingguEfektif}</td>
                        <td className="p-2 text-center font-bold text-slate-900">{hasilProta.rincianMingguEfektif.semester1.totalJP} JP</td>
                      </tr>
                      <tr>
                        <td className="p-2 border-r border-slate-300 text-center font-medium">2</td>
                        <td className="p-2 border-r border-slate-300 font-bold">Semester 2 (Genap)</td>
                        <td className="p-2 border-r border-slate-300 text-center">{hasilProta.rincianMingguEfektif.semester2.totalMinggu}</td>
                        <td className="p-2 border-r border-slate-300 text-center">{hasilProta.rincianMingguEfektif.semester2.mingguTidakEfektif}</td>
                        <td className="p-2 border-r border-slate-300 text-center font-bold text-emerald-700">{hasilProta.rincianMingguEfektif.semester2.mingguEfektif}</td>
                        <td className="p-2 text-center font-bold text-slate-900">{hasilProta.rincianMingguEfektif.semester2.totalJP} JP</td>
                      </tr>
                      <tr className="bg-slate-50 font-bold">
                        <td colSpan={4} className="p-2 border-r border-slate-300 text-right uppercase">
                          Total Jam Pembelajaran Efektif 1 Tahun Ajaran
                        </td>
                        <td className="p-2 border-r border-slate-300 text-center text-emerald-800">
                          {hasilProta.rincianMingguEfektif.totalMingguEfektifTahunan} Minggu
                        </td>
                        <td className="p-2 text-center text-emerald-800">
                          {hasilProta.rincianMingguEfektif.totalJPTahunan} JP
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Bagian B: Distribusi Alur Tujuan Pembelajaran & Alokasi JP */}
                <div className="mb-6">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" /> B. Distribusi Materi Pokok, Capaian, & Alur Tujuan Pembelajaran (ATP)
                  </h3>
                  <table className="w-full text-[10.5px] border border-slate-300 text-left">
                    <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                      <tr>
                        <th className="p-2 border-r border-slate-300 text-center w-8">No</th>
                        <th className="p-2 border-r border-slate-300 text-center w-12">Smt</th>
                        <th className="p-2 border-r border-slate-300 w-28">Elemen CP</th>
                        <th className="p-2 border-r border-slate-300">Alur Tujuan Pembelajaran (ATP / TP) & Materi Pokok</th>
                        <th className="p-2 border-r border-slate-300 text-center w-14">Alokasi (JP)</th>
                        <th className="p-2 text-left w-64 min-w-[200px]">Keterangan & Strategi KBM</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {hasilProta.distribusiMateri.map((item, idx) => (
                        <tr key={idx} className={item.materiPokok.toLowerCase().includes('sumatif') ? 'bg-amber-50/50' : ''}>
                          <td className="p-2 border-r border-slate-300 text-center font-medium">{item.no}</td>
                          <td className="p-2 border-r border-slate-300 text-center font-semibold">{item.semester}</td>
                          <td className="p-2 border-r border-slate-300 font-medium text-slate-800">{item.elemen}</td>
                          <td className="p-2 border-r border-slate-300">
                            <p className="font-bold text-slate-900">{item.materiPokok}</p>
                            <p className="text-slate-700 mt-0.5">{item.tujuanPembelajaran}</p>
                            {item.capaianPembelajaran && (
                              <p className="text-[9.5px] text-slate-500 italic mt-0.5">
                                CP: {item.capaianPembelajaran}
                              </p>
                            )}
                          </td>
                          <td className="p-2 border-r border-slate-300 text-center font-bold text-slate-900">
                            {item.alokasiWaktuJP} JP
                          </td>
                          <td className="p-2 text-slate-700 font-normal text-[10px] leading-relaxed text-justify">
                            {item.keterangan || 'KBM Tatap Muka & Asesmen Formatif'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-100 font-bold border-t border-slate-300 text-slate-900">
                        <td colSpan={4} className="p-2 text-right uppercase border-r border-slate-300">
                          Total Alokasi Waktu Seluruh Bab & Evaluasi:
                        </td>
                        <td className="p-2 text-center border-r border-slate-300 text-emerald-800">
                          {hasilProta.distribusiMateri.reduce((acc, curr) => acc + (Number(curr.alokasiWaktuJP) || 0), 0)} JP
                        </td>
                        <td className="p-2 text-center text-[10px] text-slate-600">Sesuai RME</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Tanda Tangan Formal */}
                <div className="pt-4 border-t border-slate-300 grid grid-cols-2 text-center text-[11px]">
                  <div>
                    <p className="text-slate-600">Mengetahui,</p>
                    <p className="font-semibold text-slate-800">Kepala SDIT Al Fikri</p>
                    <div className="h-16 flex items-end justify-center">
                      <p className="font-bold underline text-slate-900">{hasilProta.identitas.kepalaSekolah}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-slate-600">Depok, Juli {hasilProta.identitas.tahunPelajaran.split('/')[0]}</p>
                    <p className="font-semibold text-slate-800">Guru Pengampu Mata Pelajaran</p>
                    <div className="h-16 flex items-end justify-center">
                      <p className="font-bold underline text-slate-900">{hasilProta.identitas.penyusun}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* MODAL / DRAWER DAFTAR DRAFT TERSIMPAN DI BROWSER */}
        {showDraftsModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-black/70 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-4 sm:p-5 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-700/80 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400">
                    <HardDrive className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-white">Draft Prota di Browser</h4>
                    <p className="text-[11px] text-slate-400">
                      Tersimpan secara lokal di browser Anda (tanpa membebani cloud)
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDraftsModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {draftsList.length === 0 ? (
                <div className="py-8 text-center text-slate-400 space-y-2">
                  <FolderOpen className="w-8 h-8 mx-auto text-slate-600" />
                  <p className="text-xs">Belum ada draft Prota yang tersimpan di browser ini.</p>
                  <p className="text-[11px] text-slate-500">
                    Setelah meng-generate Prota, dokumen akan otomatis tersimpan di sini.
                  </p>
                </div>
              ) : (
                <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                  {draftsList.map((draft) => (
                    <div
                      key={draft.id}
                      onClick={() => handleLoadDraft(draft)}
                      className="p-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/70 hover:border-emerald-500/50 transition-all cursor-pointer flex items-center justify-between group"
                    >
                      <div className="space-y-1">
                        <div className="text-xs font-bold text-white flex items-center gap-1.5">
                          <span>{draft.mataPelajaran}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-normal">
                            {draft.kelas}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400">
                          TP {draft.tahunPelajaran} • {draft.totalJP} JP ({draft.totalMinggu} Pekan)
                        </p>
                        <p className="text-[9px] text-slate-500">
                          Disimpan: {new Date(draft.updatedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleLoadDraft(draft)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold cursor-pointer"
                        >
                          Muat
                        </button>
                        <button
                          type="button"
                          onClick={() => exportProtaToWord(draft.protaData)}
                          className="p-1.5 rounded-lg bg-blue-600/80 hover:bg-blue-600 text-white text-[11px] cursor-pointer"
                          title="Unduh Word langsung"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteDraft(draft.id, e)}
                          className="p-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 text-[11px] cursor-pointer"
                          title="Hapus dari browser"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-2 border-t border-slate-700/60 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowDraftsModal(false)}
                  className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
