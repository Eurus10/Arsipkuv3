import React, { useState, useMemo } from 'react';
import { X, Download, Printer, Calculator } from 'lucide-react';
import { type Student } from '../../services/studentStorage';
import { exportDaftarNilaiToExcel, type NilaiStudentRow } from '../../services/administrasiExcelService';

interface StudentScoreData {
  formatif?: Record<number, number | ''>;
  sts?: number | '';
  sas?: number | '';
}

interface DaftarNilaiGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentsList: Student[];
}

export const DaftarNilaiGeneratorModal: React.FC<DaftarNilaiGeneratorModalProps> = ({
  isOpen,
  onClose,
  studentsList,
}) => {
  const [subjectName, setSubjectName] = useState('Pendidikan Pancasila');
  const [selectedClass, setSelectedClass] = useState('2C');
  const [semester, setSemester] = useState('Ganjil');
  const [schoolYear, setSchoolYear] = useState('2026-2027');
  const [numChapters, setNumChapters] = useState<number>(4);
  const [headmasterName, setHeadmasterName] = useState('H. M. HALIM MUSTOMI, S.Pd.');
  const [teacherName, setTeacherName] = useState('GURU KELAS');

  const filteredStudents = useMemo(() => {
    if (selectedClass === 'Semua Kelas') return studentsList.slice(0, 25);
    return studentsList.filter((s) => s.classId.toUpperCase() === selectedClass.toUpperCase());
  }, [studentsList, selectedClass]);

  // Scores map: { studentId -> StudentScoreData }
  const [scores, setScores] = useState<Record<string, StudentScoreData>>({});

  const handleFormatifChange = (studentId: string, chapIdx: number, val: string) => {
    const numVal = val === '' ? '' : Math.min(100, Math.max(0, Number(val) || 0));
    setScores((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        formatif: {
          ...(prev[studentId]?.formatif || {}),
          [chapIdx]: numVal,
        },
      },
    }));
  };

  const handleStsSasChange = (studentId: string, field: 'sts' | 'sas', val: string) => {
    const numVal = val === '' ? '' : Math.min(100, Math.max(0, Number(val) || 0));
    setScores((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: numVal,
      },
    }));
  };

  const calculateStudentAverage = (stId: string) => {
    const sc = scores[stId] || {};

    const allScores: number[] = [];
    for (let i = 0; i < numChapters; i++) {
      const val = sc.formatif?.[i];
      if (val !== undefined && val !== '') {
        const num = Number(val);
        if (!isNaN(num)) allScores.push(num);
      }
    }

    if (sc.sts !== undefined && sc.sts !== '') {
      const num = Number(sc.sts);
      if (!isNaN(num)) allScores.push(num);
    }

    if (sc.sas !== undefined && sc.sas !== '') {
      const num = Number(sc.sas);
      if (!isNaN(num)) allScores.push(num);
    }

    return allScores.length > 0 ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length) : '';
  };

  const handleExportExcel = () => {
    const rows: NilaiStudentRow[] = filteredStudents.map((st, idx) => {
      const sc = scores[st.id] || {};
      const avg = calculateStudentAverage(st.id);

      const formatifScores: (number | string)[] = [];
      for (let i = 0; i < numChapters; i++) {
        formatifScores.push(sc.formatif?.[i] ?? '');
      }

      return {
        no: idx + 1,
        nama: st.name,
        formatifScores,
        sts: sc.sts ?? '',
        sas: sc.sas ?? '',
        nilaiRataRata: avg,
      };
    });

    exportDaftarNilaiToExcel({
      schoolName: 'SDIT AL FIKRI',
      subjectName,
      npsn: '102280302038 / 20614083',
      classLevel: selectedClass,
      semester,
      schoolYear,
      headmasterName,
      teacherName,
      numChapters,
      dateStr: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
      students: rows,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-[#121624] border border-slate-800 rounded-2xl sm:rounded-3xl w-full max-w-6xl overflow-hidden shadow-2xl my-auto">
        {/* Header Modal */}
        <div className="px-5 py-4 bg-gradient-to-r from-emerald-950/40 via-[#181D2F] to-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">Generator Daftar Nilai (Formatif &amp; Sumatif Kurikulum SDIT Al Fikri)</h2>
              <p className="text-xs text-slate-400">Pencatatan Nilai Formatif per Bab, Sumatif (STS &amp; SAS) &amp; Nilai Rata-Rata</p>
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
        <div className="p-4 bg-[#181D2F]/60 border-b border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
          <div className="lg:col-span-2">
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Mata Pelajaran (Mapel)</label>
            <input
              type="text"
              value={subjectName}
              onChange={(e) => setSubjectName(e.target.value)}
              placeholder="Contoh: Pendidikan Pancasila"
              className="w-full bg-[#0F131F] border border-slate-700 text-emerald-300 rounded-xl px-3 py-2 text-xs font-bold focus:border-emerald-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Pilih Kelas</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full bg-[#0F131F] border border-slate-700 text-white rounded-xl px-3 py-2 text-xs font-semibold focus:border-emerald-500 outline-none cursor-pointer"
            >
              <option value="Semua Kelas">Semua Kelas</option>
              {['1A', '1B', '2A', '2B', '2C', '3A', '3B', '4A', '4B', '5A', '5B', '6A', '6B'].map((cls) => (
                <option key={cls} value={cls}>Kelas {cls}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Semester</label>
            <select
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              className="w-full bg-[#0F131F] border border-slate-700 text-white rounded-xl px-3 py-2 text-xs font-semibold focus:border-emerald-500 outline-none cursor-pointer"
            >
              <option value="Ganjil">Semester Ganjil</option>
              <option value="Genap">Semester Genap</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Jumlah Bab Formatif</label>
            <select
              value={numChapters}
              onChange={(e) => setNumChapters(Number(e.target.value))}
              className="w-full bg-[#0F131F] border border-slate-700 text-amber-400 rounded-xl px-3 py-2 text-xs font-bold focus:border-amber-500 outline-none cursor-pointer"
            >
              {[2, 3, 4, 5, 6, 7, 8].map((n) => (
                <option key={n} value={n}>{n} Bab Formatif</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Kepala Sekolah</label>
            <input
              type="text"
              value={headmasterName}
              onChange={(e) => setHeadmasterName(e.target.value)}
              className="w-full bg-[#0F131F] border border-slate-700 text-white rounded-xl px-3 py-2 text-xs font-semibold focus:border-emerald-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Guru Kelas</label>
            <input
              type="text"
              value={teacherName}
              onChange={(e) => setTeacherName(e.target.value)}
              className="w-full bg-[#0F131F] border border-slate-700 text-white rounded-xl px-3 py-2 text-xs font-semibold focus:border-emerald-500 outline-none"
            />
          </div>
        </div>

        {/* Live Preview Container */}
        <div className="p-4 max-h-[60vh] overflow-x-auto overflow-y-auto bg-slate-950">
          <div className="min-w-[900px] bg-white text-slate-900 p-6 rounded-xl shadow-lg font-sans text-xs">
            {/* KOP Title */}
            <div className="text-center mb-4">
              <h1 className="text-base font-black tracking-wide uppercase">DAFTAR NILAI PESERTA DIDIK</h1>
            </div>

            <div className="grid grid-cols-2 text-[11px] font-semibold mb-3">
              <div>
                <p>NAMA SEKOLAH: <b>SDIT AL FIKRI</b></p>
                <p>MATA PELAJARAN: <b className="text-emerald-800 uppercase">{subjectName || '-'}</b></p>
                <p>KELAS/SEMESTER: <b>{selectedClass} / {semester}</b></p>
              </div>
              <div className="text-right">
                <p>NSS/NPSN: <b>102280302038 / 20614083</b></p>
                <p>TAHUN PELAJARAN: <b>{schoolYear}</b></p>
                <p>KECAMATAN/KABUPATEN: <b>TIGARAKSA / TANGERANG</b></p>
              </div>
            </div>

            {/* Table */}
            <table className="w-full border-collapse border border-slate-900 text-[10px]">
              <thead>
                <tr className="bg-[#FFFF00] text-slate-900 font-bold border-b border-slate-900">
                  <th rowSpan={2} className="border border-slate-900 w-8 px-1 py-1 text-center">NO</th>
                  <th rowSpan={2} className="border border-slate-900 max-w-[170px] w-40 px-2 py-1 text-left truncate">NAMA PESERTA DIDIK</th>
                  
                  {/* Formatif Group Header */}
                  <th colSpan={numChapters} className="border border-slate-900 px-1 py-1 text-center bg-amber-200">
                    NILAI FORMATIF
                  </th>

                  {/* Sumatif Group Header */}
                  <th colSpan={2} className="border border-slate-900 px-1 py-1 text-center bg-emerald-200">
                    NILAI SUMATIF
                  </th>

                  <th rowSpan={2} className="border border-slate-900 w-20 px-1 py-1 text-center bg-sky-200">
                    NILAI RATA-RATA
                  </th>
                </tr>

                <tr className="bg-[#FFFF00] text-slate-900 font-bold border-b border-slate-900">
                  {/* Formatif Subheaders */}
                  {Array.from({ length: numChapters }).map((_, i) => (
                    <th key={`f-${i}`} className="border border-slate-900 w-12 text-center bg-amber-100">
                      BAB {i + 1}
                    </th>
                  ))}

                  {/* Sumatif Subheaders (Only STS & SAS) */}
                  <th className="border border-slate-900 w-12 text-center bg-emerald-100">STS</th>
                  <th className="border border-slate-900 w-12 text-center bg-emerald-100">SAS</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={numChapters + 5} className="text-center py-8 text-slate-400 italic">
                      Belum ada siswa untuk kelas ini. Silakan pilih kelas lain.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((st, idx) => {
                    const sc = scores[st.id] || {};
                    const avg = calculateStudentAverage(st.id);

                    return (
                      <tr key={st.id} className="hover:bg-amber-50/50">
                        <td className="border border-slate-900 text-center py-1">{idx + 1}</td>
                        <td className="border border-slate-900 px-2 py-1 font-semibold max-w-[170px] w-40 truncate" title={st.name}>
                          {st.name}
                        </td>

                        {/* Formatif Inputs */}
                        {Array.from({ length: numChapters }).map((_, i) => (
                          <td key={`f-val-${i}`} className="border border-slate-900 p-0 text-center">
                            <input
                              type="number"
                              value={sc.formatif?.[i] ?? ''}
                              onChange={(e) => handleFormatifChange(st.id, i, e.target.value)}
                              className="w-full text-center bg-transparent outline-none focus:bg-amber-100 py-1 font-semibold text-[10px]"
                            />
                          </td>
                        ))}

                        {/* Sumatif: STS Input */}
                        <td className="border border-slate-900 p-0 text-center bg-emerald-50/30">
                          <input
                            type="number"
                            value={sc.sts ?? ''}
                            onChange={(e) => handleStsSasChange(st.id, 'sts', e.target.value)}
                            className="w-full text-center bg-transparent outline-none focus:bg-emerald-100 py-1 font-semibold text-[10px]"
                          />
                        </td>

                        {/* Sumatif: SAS Input */}
                        <td className="border border-slate-900 p-0 text-center bg-emerald-50/30">
                          <input
                            type="number"
                            value={sc.sas ?? ''}
                            onChange={(e) => handleStsSasChange(st.id, 'sas', e.target.value)}
                            className="w-full text-center bg-transparent outline-none focus:bg-emerald-100 py-1 font-semibold text-[10px]"
                          />
                        </td>

                        {/* Single Combined Average Column */}
                        <td className="border border-slate-900 text-center font-black text-sky-950 bg-sky-100/80 py-1">
                          {avg !== '' ? avg : '-'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {/* Signatures */}
            <div className="mt-8 flex justify-between text-[11px] font-semibold text-center px-8">
              <div>
                <p>MENGETAHUI,</p>
                <p className="font-bold">KEPALA SEKOLAH</p>
                <div className="h-14"></div>
                <p className="font-bold underline">{headmasterName}</p>
              </div>
              <div>
                <p>TIGARAKSA, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                <p className="font-bold">GURU KELAS</p>
                <div className="h-14"></div>
                <p className="font-bold underline">{teacherName}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div className="p-4 bg-[#181D2F] border-t border-slate-800 flex items-center justify-end gap-2">
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak / PDF</span>
          </button>
          <button
            onClick={handleExportExcel}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-emerald-600/20 active:scale-[0.98]"
          >
            <Download className="w-4 h-4" />
            <span>Download Legger Excel (.xlsx Presisi)</span>
          </button>
        </div>
      </div>
    </div>
  );
};

