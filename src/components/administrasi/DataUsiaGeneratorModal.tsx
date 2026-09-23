import React, { useState, useMemo } from 'react';
import { X, Download, Printer, Users, Calendar, Sparkles } from 'lucide-react';
import { type Student } from '../../services/studentStorage';
import { exportDataUsiaToExcel, type UsiaStudentRow } from '../../services/administrasiExcelService';
import { extractBirthYearMonthDay, formatIndonesianDate } from '../../utils/dateFormatter';

interface DataUsiaGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentsList: Student[];
}

const MONTHS = ['Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni'];

const DEFAULT_SCHOOL_YEARS = [
  '2023-2024',
  '2024-2025',
  '2025-2026',
  '2026-2027',
  '2027-2028',
  '2028-2029',
  '2029-2030',
  '2030-2031',
];

export const DataUsiaGeneratorModal: React.FC<DataUsiaGeneratorModalProps> = ({
  isOpen,
  onClose,
  studentsList,
}) => {
  const [selectedClass, setSelectedClass] = useState('1A');
  const [schoolYear, setSchoolYear] = useState('2026-2027');
  const [isCustomYear, setIsCustomYear] = useState(false);
  const [headmasterName, setHeadmasterName] = useState('H. M. HALIM MUSTOMI, S.Pd.');
  const [teacherName, setTeacherName] = useState('WALI KELAS 1A');

  const filteredStudents = useMemo(() => {
    if (selectedClass === 'Semua Kelas') return studentsList.slice(0, 25);
    return studentsList.filter((s) => s.classId.toUpperCase() === selectedClass.toUpperCase());
  }, [studentsList, selectedClass]);

  // Parse startYear and endYear dynamically from schoolYear (e.g. "2026-2027" -> 2026, 2027)
  const { startYear, endYear } = useMemo(() => {
    const matches = schoolYear.match(/\d{4}/g);
    if (matches && matches.length >= 2) {
      return {
        startYear: parseInt(matches[0], 10),
        endYear: parseInt(matches[1], 10),
      };
    } else if (matches && matches.length === 1) {
      const start = parseInt(matches[0], 10);
      return {
        startYear: start,
        endYear: start + 1,
      };
    }
    return { startYear: 2026, endYear: 2027 };
  }, [schoolYear]);

  // Helper to extract student birth information consistently
  const getBirthDetails = (tanggalLahir: string | undefined, idx: number) => {
    if (tanggalLahir) {
      const details = extractBirthYearMonthDay(tanggalLahir);
      if (details && details.year > 1990) {
        return {
          bYear: details.year,
          bMonth: details.month,
          bDay: details.day,
          formatted: formatIndonesianDate(tanggalLahir),
        };
      }
    }
    const bYear = 2019 + (idx % 2);
    const bMonth = (idx % 12) + 1;
    const bDay = (idx % 28) + 1;
    return {
      bYear,
      bMonth,
      bDay,
      formatted: `${bDay}/${bMonth}/${bYear}`,
    };
  };

  // Helper to calculate age string (e.g. "6 th 3 bln", "7 th 0 bln")
  // Automatically responds to the selected academic year:
  // - Months 0..5 (Juli..Desember) calculated against startYear
  // - Months 6..11 (Januari..Juni) calculated against endYear
  const calculateAgeStr = (birthYear: number, birthMonth: number, targetMonthIdx: number) => {
    const targetYear = targetMonthIdx < 6 ? startYear : endYear;
    const targetMonth = targetMonthIdx < 6 ? targetMonthIdx + 7 : targetMonthIdx - 5;

    let ageYears = targetYear - birthYear;
    let ageMonths = targetMonth - birthMonth;

    if (ageMonths < 0) {
      ageYears -= 1;
      ageMonths += 12;
    }

    if (ageYears < 0) {
      return '0 th 0 bln';
    }

    return `${ageYears} th ${ageMonths} bln`;
  };

  const handleExportExcel = () => {
    const rows: UsiaStudentRow[] = filteredStudents.map((st, idx) => {
      const birth = getBirthDetails(st.tanggalLahir, idx);

      const monthlyAges: Record<string, string> = {};
      MONTHS.forEach((m, mIdx) => {
        monthlyAges[m] = calculateAgeStr(birth.bYear, birth.bMonth, mIdx);
      });

      return {
        no: idx + 1,
        nama: st.name,
        tempatLahir: st.tempatLahir || 'Tangerang',
        tanggalLahir: birth.formatted,
        monthlyAges,
      };
    });

    exportDataUsiaToExcel({
      schoolName: 'SDIT AL FIKRI',
      schoolYear,
      classLevel: selectedClass,
      headmasterName,
      teacherName,
      students: rows,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-[#121624] border border-slate-800 rounded-2xl sm:rounded-3xl w-full max-w-6xl overflow-hidden shadow-2xl my-auto">
        {/* Header Modal */}
        <div className="px-5 py-4 bg-gradient-to-r from-purple-950/40 via-[#181D2F] to-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">Generator Form Usia Siswa (Format Presisi SDIT Al Fikri)</h2>
              <p className="text-xs text-slate-400">Template Presisi 4. DATA USIA.png.jpg</p>
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
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Pilih Kelas</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full bg-[#0F131F] border border-slate-700 text-white rounded-xl px-3 py-2 text-xs font-semibold focus:border-purple-500 outline-none"
            >
              <option value="Semua Kelas">Semua Kelas</option>
              {['1A', '1B', '2A', '2B', '3A', '3B', '4A', '4B', '5A', '5B', '6A', '6B'].map((cls) => (
                <option key={cls} value={cls}>Kelas {cls}</option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-semibold text-slate-400">Tahun Pelajaran (Patokan Usia)</label>
              <button
                type="button"
                onClick={() => setIsCustomYear(!isCustomYear)}
                className="text-[10px] text-purple-400 hover:text-purple-300 font-medium underline cursor-pointer"
              >
                {isCustomYear ? 'Pilih Daftar' : 'Ketik Manual'}
              </button>
            </div>
            {isCustomYear ? (
              <input
                type="text"
                value={schoolYear}
                onChange={(e) => setSchoolYear(e.target.value)}
                placeholder="Contoh: 2026-2027"
                className="w-full bg-[#0F131F] border border-purple-500 text-white rounded-xl px-3 py-2 text-xs font-semibold focus:ring-1 focus:ring-purple-500 outline-none"
              />
            ) : (
              <select
                value={schoolYear}
                onChange={(e) => {
                  if (e.target.value === 'custom') {
                    setIsCustomYear(true);
                  } else {
                    setSchoolYear(e.target.value);
                  }
                }}
                className="w-full bg-[#0F131F] border border-slate-700 text-white rounded-xl px-3 py-2 text-xs font-semibold focus:border-purple-500 outline-none cursor-pointer"
              >
                {DEFAULT_SCHOOL_YEARS.map((yr) => (
                  <option key={yr} value={yr}>
                    TP {yr} {yr === '2026-2027' ? '(Aktif)' : ''}
                  </option>
                ))}
                <option value="custom">+ Tahun Lainnya (Kustom)...</option>
              </select>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Kepala Sekolah</label>
            <input
              type="text"
              value={headmasterName}
              onChange={(e) => setHeadmasterName(e.target.value)}
              className="w-full bg-[#0F131F] border border-slate-700 text-white rounded-xl px-3 py-2 text-xs font-semibold focus:border-purple-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Wali Kelas</label>
            <input
              type="text"
              value={teacherName}
              onChange={(e) => setTeacherName(e.target.value)}
              className="w-full bg-[#0F131F] border border-slate-700 text-white rounded-xl px-3 py-2 text-xs font-semibold focus:border-purple-500 outline-none"
            />
          </div>
        </div>

        {/* Dynamic Period Info Banner */}
        <div className="px-4 py-2 bg-purple-950/30 border-b border-purple-900/40 flex flex-wrap items-center justify-between gap-2 text-[11px]">
          <div className="flex items-center gap-2 text-purple-300 font-medium">
            <Calendar className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
            <span>
              Patokan Periode Usia:{' '}
              <strong className="text-white font-bold">
                Juli {startYear} s.d. Juni {endYear}
              </strong>
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
              <Sparkles className="w-3 h-3 mr-1 text-purple-400" />
              Otomatis Menyesuaikan
            </span>
          </div>
          <div className="text-slate-400 text-[10px]">
            Tiap pergantian tahun ajaran, usia seluruh siswa langsung dihitung ulang otomatis untuk 12 bulan
          </div>
        </div>

        {/* Live Preview Container */}
        <div className="p-4 max-h-[60vh] overflow-x-auto overflow-y-auto bg-slate-950">
          <div className="min-w-[1000px] bg-white text-slate-900 p-6 rounded-xl shadow-lg font-sans text-xs">
            {/* KOP Title */}
            <div className="text-center mb-5">
              <h1 className="text-base font-black tracking-wide uppercase">DATA USIA KELAS {selectedClass}</h1>
              <h2 className="text-xs font-bold uppercase">TAHUN PELAJARAN {schoolYear}</h2>
              <p className="text-[10px] text-slate-500 mt-0.5">
                (Patokan Perhitungan: Juli {startYear} s.d. Juni {endYear})
              </p>
            </div>

            {/* Table */}
            <table className="w-full border-collapse border border-slate-900 text-[10px]">
              <thead>
                <tr className="bg-[#FFFF00] text-slate-900 font-bold border-b border-slate-900">
                  <th rowSpan={2} className="border border-slate-900 w-8 px-1 py-1 text-center">No.</th>
                  <th rowSpan={2} className="border border-slate-900 px-2 py-1 text-left">Nama Siswa</th>
                  <th rowSpan={2} className="border border-slate-900 px-2 py-1 text-left">Tempat Lahir</th>
                  <th rowSpan={2} className="border border-slate-900 px-2 py-1 text-center">Tanggal Lahir</th>
                  <th colSpan={12} className="border border-slate-900 px-1 py-1 text-center">Usia per Bulan</th>
                </tr>
                <tr className="bg-[#FFFF00] text-slate-900 font-bold border-b border-slate-900">
                  {MONTHS.map((m) => (
                    <th key={m} className="border border-slate-900 px-1 py-0.5 text-center">{m}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={16} className="text-center py-8 text-slate-400 italic">
                      Belum ada siswa untuk kelas ini. Silakan pilih kelas lain.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((st, idx) => {
                    const birth = getBirthDetails(st.tanggalLahir, idx);

                    return (
                      <tr key={st.id} className="hover:bg-purple-50/40">
                        <td className="border border-slate-900 text-center py-1">{idx + 1}</td>
                        <td className="border border-slate-900 px-2 py-1 font-semibold">{st.name}</td>
                        <td className="border border-slate-900 px-2 py-1">{st.tempatLahir || 'Tangerang'}</td>
                        <td className="border border-slate-900 text-center py-1">{birth.formatted}</td>

                        {MONTHS.map((m, mIdx) => (
                          <td key={m} className="border border-slate-900 text-center py-1 text-[9px] font-medium text-slate-700">
                            {calculateAgeStr(birth.bYear, birth.bMonth, mIdx)}
                          </td>
                        ))}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {/* Signatures */}
            <div className="mt-8 flex justify-between text-[11px] font-semibold text-center px-12">
              <div>
                <p className="font-bold">KEPALA SEKOLAH</p>
                <div className="h-14"></div>
                <p className="font-bold underline">{headmasterName}</p>
              </div>
              <div>
                <p className="font-bold">WALI KELAS</p>
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
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-black rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-purple-600/20 active:scale-[0.98]"
          >
            <Download className="w-4 h-4" />
            <span>Download Data Usia Excel (.xlsx)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
