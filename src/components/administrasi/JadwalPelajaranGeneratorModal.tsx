import React, { useState } from 'react';
import { X, Download, Printer, Calendar, Clock, Plus, Trash2, ShieldAlert } from 'lucide-react';
import { exportJadwalToExcel, type JadwalSessionRow } from '../../services/administrasiExcelService';

interface JadwalPelajaranGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DEFAULT_SESSIONS: JadwalSessionRow[] = [
  { no: 1, waktu: '07.00 - 07.30', senin: 'UPACARA', selasa: 'SHALAT DHUHA', rabu: 'SENAM', kamis: 'SHALAT DHUHA', jumat: 'SHALAT DHUHA', sabtu: 'PRAMUKA/TAEKWONDO' },
  { no: 2, waktu: '07.30 - 08.05', senin: 'MATEMATIKA', selasa: 'B. ARAB', rabu: 'PJOK', kamis: 'B. INDONESIA', jumat: 'PENGAJIAN', sabtu: 'EKSKUL VOKAL' },
  { no: 3, waktu: '08.05 - 08.40', senin: 'MATEMATIKA', selasa: 'B. ARAB', rabu: 'PJOK', kamis: 'B. INDONESIA', jumat: 'FIQIH', sabtu: 'SABTU CERIA' },
  { no: 4, waktu: '08.40 - 09.15', senin: 'MATEMATIKA', selasa: 'MATEMATIKA', rabu: 'B. INGGRIS', kamis: 'PEND. PANCASILA', jumat: 'SENI BUDAYA', sabtu: 'EKSKUL' },
  { no: 5, waktu: '09.15 - 09.50', senin: 'B. INDONESIA', selasa: 'MATEMATIKA', rabu: 'B. INGGRIS', kamis: 'PEND. PANCASILA', jumat: 'ISTIRAHAT', sabtu: 'ISTIRAHAT' },
  { no: 6, waktu: '09.50 - 10.25', senin: 'ISTIRAHAT', selasa: 'ISTIRAHAT', rabu: 'ISTIRAHAT', kamis: 'ISTIRAHAT', jumat: 'SENI BUDAYA', sabtu: '-' },
  { no: 7, waktu: '10.25 - 11.00', senin: 'AKIDAH AKHLAK', selasa: 'B. INDONESIA', rabu: 'PAI', kamis: 'TAHFIDZ', jumat: '-', sabtu: '-' },
  { no: 8, waktu: '11.00 - 11.35', senin: 'AKIDAH AKHLAK', selasa: 'B. INDONESIA', rabu: 'PAI', kamis: 'TAHFIDZ', jumat: '-', sabtu: '-' },
  { no: 9, waktu: '11.35 - 12.10', senin: 'IPAS', selasa: 'IPAS', rabu: 'IPAS', kamis: 'DOA & HADIST', jumat: '-', sabtu: '-' },
  { no: 10, waktu: '12.10 - 12.45', senin: 'IPAS', selasa: 'IPAS', rabu: 'IPAS', kamis: 'DOA & HADIST', jumat: '-', sabtu: '-' },
  { no: 11, waktu: '12.45 - 13.00', senin: 'SHALAT DZUHUR', selasa: 'SHALAT DZUHUR', rabu: 'SHALAT DZUHUR', kamis: 'SHALAT DZUHUR', jumat: '-', sabtu: '-' },
];

export const JadwalPelajaranGeneratorModal: React.FC<JadwalPelajaranGeneratorModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [selectedClass, setSelectedClass] = useState('A');
  const [schoolYear, setSchoolYear] = useState('2026-2027');
  const [headmasterName, setHeadmasterName] = useState('H. M. HALIM MUSTOMI, S.Pd.');
  const [teacherName, setTeacherName] = useState('YENI ASTRIANI, S.Pd');

  const [sessions, setSessions] = useState<JadwalSessionRow[]>(DEFAULT_SESSIONS);

  const handleCellChange = (rowIdx: number, dayKey: keyof JadwalSessionRow, value: string) => {
    setSessions((prev) => {
      const updated = [...prev];
      updated[rowIdx] = { ...updated[rowIdx], [dayKey]: value };
      return updated;
    });
  };

  const handleExportExcel = () => {
    exportJadwalToExcel({
      schoolName: 'SDIT AL FIKRI',
      schoolYear: `TAHUN PELAJARAN ${schoolYear}`,
      classLevel: selectedClass,
      headmasterName,
      teacherName,
      rows: sessions,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-[#121624] border border-slate-800 rounded-2xl sm:rounded-3xl w-full max-w-6xl overflow-hidden shadow-2xl my-auto">
        {/* Header Modal */}
        <div className="px-5 py-4 bg-gradient-to-r from-blue-950/40 via-[#181D2F] to-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">Generator Jadwal Pelajaran (Format Presisi SDIT Al Fikri)</h2>
              <p className="text-xs text-slate-400">Template Presisi 2. JADWAL PELAJARAN.png.jpg</p>
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
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Pilih Rombel / Kelas</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full bg-[#0F131F] border border-slate-700 text-white rounded-xl px-3 py-2 text-xs font-semibold focus:border-blue-500 outline-none"
            >
              {['A', 'B', 'C', '1A', '1B', '2A', '2B', '3A', '3B', '4A', '4B', '5A', '5B', '6A', '6B'].map((cls) => (
                <option key={cls} value={cls}>Kelas {cls}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Tahun Pelajaran</label>
            <input
              type="text"
              value={schoolYear}
              onChange={(e) => setSchoolYear(e.target.value)}
              className="w-full bg-[#0F131F] border border-slate-700 text-white rounded-xl px-3 py-2 text-xs font-semibold focus:border-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Kepala Sekolah</label>
            <input
              type="text"
              value={headmasterName}
              onChange={(e) => setHeadmasterName(e.target.value)}
              className="w-full bg-[#0F131F] border border-slate-700 text-white rounded-xl px-3 py-2 text-xs font-semibold focus:border-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Wali Kelas</label>
            <input
              type="text"
              value={teacherName}
              onChange={(e) => setTeacherName(e.target.value)}
              className="w-full bg-[#0F131F] border border-slate-700 text-white rounded-xl px-3 py-2 text-xs font-semibold focus:border-blue-500 outline-none"
            />
          </div>
        </div>

        {/* Live Preview Container */}
        <div className="p-4 max-h-[60vh] overflow-x-auto overflow-y-auto bg-slate-950">
          <div className="min-w-[900px] bg-white text-slate-900 p-6 rounded-xl shadow-lg font-sans text-xs">
            {/* Title Header */}
            <div className="text-center mb-5">
              <h1 className="text-base font-black tracking-wide uppercase">JADWAL PELAJARAN</h1>
              <h2 className="text-sm font-bold uppercase">SDIT AL FIKRI</h2>
              <p className="text-xs font-semibold uppercase">TAHUN PELAJARAN {schoolYear}</p>
            </div>

            {/* Timetable */}
            <table className="w-full border-collapse border border-slate-900 text-[11px]">
              <thead>
                <tr className="bg-[#BDD7EE] text-slate-900 font-bold border-b border-slate-900">
                  <th rowSpan={2} className="border border-slate-900 w-16 px-2 py-2 text-center">KELAS</th>
                  <th rowSpan={2} className="border border-slate-900 w-12 px-2 py-2 text-center">NO.</th>
                  <th rowSpan={2} className="border border-slate-900 w-28 px-2 py-2 text-center">WAKTU</th>
                  <th colSpan={6} className="border border-slate-900 px-2 py-1 text-center">HARI</th>
                </tr>
                <tr className="bg-[#BDD7EE] text-slate-900 font-bold border-b border-slate-900">
                  <th className="border border-slate-900 px-2 py-1 text-center">SENIN</th>
                  <th className="border border-slate-900 px-2 py-1 text-center">SELASA</th>
                  <th className="border border-slate-900 px-2 py-1 text-center">RABU</th>
                  <th className="border border-slate-900 px-2 py-1 text-center">KAMIS</th>
                  <th className="border border-slate-900 px-2 py-1 text-center">JUM'AT</th>
                  <th className="border border-slate-900 px-2 py-1 text-center">SABTU</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((row, idx) => (
                  <tr key={row.no} className="hover:bg-blue-50/40">
                    {idx === 0 && (
                      <td
                        rowSpan={sessions.length}
                        className="border border-slate-900 text-center font-black text-2xl bg-slate-50"
                      >
                        {selectedClass}
                      </td>
                    )}
                    <td className="border border-slate-900 text-center py-1.5 font-bold">{row.no}</td>
                    <td className="border border-slate-900 text-center py-1.5 px-1 font-medium bg-slate-50/50">{row.waktu}</td>

                    {(['senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'] as (keyof JadwalSessionRow)[]).map((dayKey) => {
                      const val = row[dayKey] as string;
                      const isSpecial = val.includes('ISTIRAHAT') || val.includes('SHALAT') || val.includes('UPACARA') || val.includes('SENAM');

                      return (
                        <td
                          key={String(dayKey)}
                          className={`border border-slate-900 px-1 py-1 text-center font-bold ${
                            isSpecial ? 'bg-[#BDD7EE] text-slate-900' : 'bg-white'
                          }`}
                        >
                          <input
                            type="text"
                            value={val}
                            onChange={(e) => handleCellChange(idx, dayKey, e.target.value)}
                            className="w-full bg-transparent text-center outline-none border-b border-transparent focus:border-blue-500 font-bold text-[11px]"
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
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
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-blue-600/20 active:scale-[0.98]"
          >
            <Download className="w-4 h-4" />
            <span>Download Excel (.xlsx Presisi)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
