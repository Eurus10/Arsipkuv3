import React, { useState } from 'react';
import { X, Printer, FileText, Download, CheckCircle2 } from 'lucide-react';
import { type Student } from '../../services/studentStorage';

interface SuratOfficialGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentsList: Student[];
}

export const SuratOfficialGeneratorModal: React.FC<SuratOfficialGeneratorModalProps> = ({
  isOpen,
  onClose,
  studentsList,
}) => {
  const [letterType, setLetterType] = useState<'aktif' | 'panggilan' | 'undangan' | 'mutasi'>('aktif');
  const [letterNumber, setLetterNumber] = useState('042/SDIT-AF/KET/IX/2026');
  const [selectedStudentId, setSelectedStudentId] = useState(studentsList[0]?.id || '');
  const [letterDate, setLetterDate] = useState(new Date().toISOString().split('T')[0]);
  const [purpose, setPurpose] = useState('Persyaratan Administrasi & Keperluan Lomba');
  const [headmasterName, setHeadmasterName] = useState('H. M. HALIM MUSTOMI, S.Pd.');

  const selectedStudent = studentsList.find((s) => s.id === selectedStudentId) || {
    name: 'ABQARY AFKARIANSYAH',
    classId: '3C',
    schoolName: 'SDIT Al Fikri',
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-[#121624] border border-slate-800 rounded-2xl sm:rounded-3xl w-full max-w-5xl overflow-hidden shadow-2xl my-auto">
        {/* Header Modal */}
        <div className="px-5 py-4 bg-gradient-to-r from-teal-950/40 via-[#181D2F] to-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">Generator Surat Resmi Sekolah</h2>
              <p className="text-xs text-slate-400">KOP Resmi SDIT Al Fikri & Auto-Fill Data Siswa</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Controls Bar */}
        <div className="p-4 bg-[#181D2F]/60 border-b border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Jenis Surat</label>
            <select
              value={letterType}
              onChange={(e) => setLetterType(e.target.value as any)}
              className="w-full bg-[#0F131F] border border-slate-700 text-white rounded-xl px-3 py-2 text-xs font-semibold focus:border-teal-500 outline-none"
            >
              <option value="aktif">Surat Keterangan Aktif Siswa</option>
              <option value="panggilan">Surat Panggilan Orang Tua</option>
              <option value="undangan">Surat Undangan Orang Tua / Rapat</option>
              <option value="mutasi">Surat Keterangan Pindah / Mutasi</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Nomor Surat</label>
            <input
              type="text"
              value={letterNumber}
              onChange={(e) => setLetterNumber(e.target.value)}
              className="w-full bg-[#0F131F] border border-slate-700 text-white rounded-xl px-3 py-2 text-xs font-semibold focus:border-teal-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Pilih Siswa (Auto-fill)</label>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="w-full bg-[#0F131F] border border-slate-700 text-white rounded-xl px-3 py-2 text-xs font-semibold focus:border-teal-500 outline-none"
            >
              {studentsList.length === 0 ? (
                <option value="">(Belum Ada Siswa di Database)</option>
              ) : (
                studentsList.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name} (Kelas {st.classId})
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Keperluan / Catatan</label>
            <input
              type="text"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="w-full bg-[#0F131F] border border-slate-700 text-white rounded-xl px-3 py-2 text-xs font-semibold focus:border-teal-500 outline-none"
            />
          </div>
        </div>

        {/* Live Printable Letter Preview */}
        <div className="p-6 max-h-[60vh] overflow-y-auto bg-slate-950 flex justify-center">
          <div className="w-full max-w-2xl bg-white text-slate-900 p-8 rounded-xl shadow-xl font-serif text-xs leading-relaxed border border-slate-200">
            {/* Official KOP */}
            <div className="border-b-4 border-double border-slate-900 pb-3 mb-6 text-center">
              <h2 className="text-sm font-bold tracking-wider text-emerald-900 uppercase">YAYASAN AL FIKRI TIGARAKSA</h2>
              <h1 className="text-base font-black tracking-wide text-slate-900 uppercase">SEKOLAH DASAR ISLAM TERPADU AL FIKRI</h1>
              <p className="text-[10px] font-sans text-slate-600">
                Jl. Raya Tigaraksa - Cisoka Km. 1.5, Pasir Nangka, Kec. Tigaraksa, Kabupaten Tangerang, Banten
              </p>
              <p className="text-[10px] font-sans text-slate-600">NPSN: 20614083 | Akreditasi A | Email: sdit.alfikri@gmail.com</p>
            </div>

            {/* Letter Title */}
            <div className="text-center mb-6">
              <h3 className="font-bold text-sm underline uppercase">
                {letterType === 'aktif' && 'SURAT KETERANGAN AKTIF SEKOAH'}
                {letterType === 'panggilan' && 'SURAT PANGGILAN ORANG TUA / WALI'}
                {letterType === 'undangan' && 'SURAT UNDANGAN KEGIATAN SEKOLAH'}
                {letterType === 'mutasi' && 'SURAT KETERANGAN PINDAH / MUTASI'}
              </h3>
              <p className="font-sans text-[11px]">Nomor: {letterNumber}</p>
            </div>

            {/* Body */}
            <div className="space-y-3 font-sans text-xs">
              <p>Yang bertanda tangan di bawah ini Kepala Sekolah Dasar Islam Terpadu (SDIT) Al Fikri Tigaraksa, menerangkan dengan sebenarnya bahwa:</p>

              <div className="pl-6 space-y-1 font-semibold">
                <div className="grid grid-cols-3"><span>Nama Peserta Didik</span><span>: {selectedStudent.name}</span></div>
                <div className="grid grid-cols-3"><span>Kelas / Rombel</span><span>: Kelas {selectedStudent.classId}</span></div>
                <div className="grid grid-cols-3"><span>NISN / NIS</span><span>: 3184920192 / 24251001</span></div>
                <div className="grid grid-cols-3"><span>Nama Sekolah</span><span>: SDIT Al Fikri Tigaraksa</span></div>
              </div>

              {letterType === 'aktif' && (
                <p>
                  Adalah benar terdaftar sebagai peserta didik aktif di SDIT Al Fikri Tigaraksa pada Tahun Pelajaran 2026/2027. Surat keterangan ini dibuat untuk keperluan <b>{purpose}</b>.
                </p>
              )}

              {letterType === 'panggilan' && (
                <p>
                  Mengharap kehadiran Bapak/Ibu Orang Tua / Wali murid dari siswa tersebut pada hari dan jam kerja untuk koordinasi perihal perkembangan belajar peserta didik.
                </p>
              )}

              <p>Demikian surat ini dibuat agar dapat dipergunakan sebagaimana mestinya.</p>
            </div>

            {/* Signature */}
            <div className="mt-12 flex justify-end text-center font-sans text-xs">
              <div>
                <p>Tigaraksa, {new Date(letterDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                <p className="font-bold">Kepala SDIT Al Fikri</p>
                <div className="h-16"></div>
                <p className="font-bold underline">{headmasterName}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div className="p-4 bg-[#181D2F] border-t border-slate-800 flex items-center justify-end gap-2">
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-teal-600/20 active:scale-[0.98]"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Surat PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
};
