import React, { useState, useMemo } from 'react';
import {
  Search,
  RotateCcw,
  X,
  GraduationCap,
  LayoutGrid,
  List,
  Sparkles,
  SlidersHorizontal,
  FileSpreadsheet,
} from 'lucide-react';
import { DocumentItem, CATEGORIES_RAPOR, CLASS_LEVELS, SEMESTER_TYPES } from '../types';
import { RaporGridCard } from './RaporGridCard';
import { DocumentCard } from './DocumentCard';
import { getAllSchoolYears } from '../services/storage';

interface RaporViewProps {
  documents: DocumentItem[];
  onEditDocument?: (doc: DocumentItem) => void;
}

export const RaporView: React.FC<RaporViewProps> = ({
  documents,
  onEditDocument,
}) => {
  const [search, setSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState('Semua Kelas');
  const [selectedYear, setSelectedYear] = useState('Semua Tahun');
  const [selectedCategory, setSelectedCategory] = useState('Semua Kategori Rapor');
  const [selectedSemester, setSelectedSemester] = useState('Semua Semester');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const availableYears = useMemo(() => {
    return ['Semua Tahun', ...getAllSchoolYears(documents)];
  }, [documents]);

  const raporDocs = useMemo(() => {
    return documents.filter((doc) => doc.type === 'rapor');
  }, [documents]);

  const filteredDocs = useMemo(() => {
    return raporDocs.filter((doc) => {
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchesQuery =
          doc.title.toLowerCase().includes(q) ||
          doc.category.toLowerCase().includes(q) ||
          doc.classLevel.toLowerCase().includes(q) ||
          doc.schoolYear.toLowerCase().includes(q) ||
          (doc.semester && doc.semester.toLowerCase().includes(q)) ||
          (doc.note && doc.note.toLowerCase().includes(q));
        if (!matchesQuery) return false;
      }

      if (selectedClass !== 'Semua Kelas' && doc.classLevel !== selectedClass) {
        return false;
      }

      if (selectedYear !== 'Semua Tahun' && doc.schoolYear !== selectedYear) {
        return false;
      }

      if (
        selectedCategory !== 'Semua Kategori Rapor' &&
        doc.category !== selectedCategory
      ) {
        return false;
      }

      if (
        selectedSemester !== 'Semua Semester' &&
        doc.semester !== selectedSemester
      ) {
        return false;
      }

      return true;
    });
  }, [raporDocs, search, selectedClass, selectedYear, selectedCategory, selectedSemester]);

  const hasActiveFilters =
    search.trim() !== '' ||
    selectedClass !== 'Semua Kelas' ||
    selectedYear !== 'Semua Tahun' ||
    selectedCategory !== 'Semua Kategori Rapor' ||
    selectedSemester !== 'Semua Semester';

  const resetFilters = () => {
    setSearch('');
    setSelectedClass('Semua Kelas');
    setSelectedYear('Semua Tahun');
    setSelectedCategory('Semua Kategori Rapor');
    setSelectedSemester('Semua Semester');
  };

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-8 py-6 sm:py-8 pb-28 md:pb-12 text-slate-100 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-rose-400">
              Arsip Rapor
            </span>
          </div>
          <h1 className="text-xl sm:text-3xl font-extrabold text-white font-heading tracking-tight">
            Arsip Rapor & Leger Nilai
          </h1>
          <p className="hidden sm:block text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl font-medium">
            Koleksi buku rapor semester ganjil/genap, rapor P5 Kurikulum Merdeka, leger nilai, dan dokumen kelulusan siswa SDIT AL FIKRI.
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center justify-between sm:justify-start gap-2 self-stretch md:self-auto bg-[#181B26] p-1 rounded-xl sm:rounded-2xl border border-[#272D3E]">
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg sm:rounded-xl text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'grid'
                ? 'bg-rose-500 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Grid Card</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg sm:rounded-xl text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'list'
                ? 'bg-rose-500 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">List Daftar</span>
          </button>
        </div>
      </div>

      {/* Streamlined Filter Toolbar (Dropdowns) */}
      <div className="bg-[#181B26] border border-[#272D3E] rounded-2xl sm:rounded-3xl p-3 sm:p-5 mb-5 sm:mb-6 shadow-lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5 sm:gap-3 items-center">
          {/* Search Input */}
          <div className="relative lg:col-span-3 col-span-1 sm:col-span-2">
            <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none">
              <Search className="w-4 h-4 text-slate-400" />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari rapor, leger nilai..."
              className="w-full bg-[#13151E] border border-[#2B3245] py-2 sm:py-2.5 pl-10 pr-9 rounded-xl sm:rounded-2xl text-xs sm:text-sm text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-rose-400 transition-all font-medium"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Kelas */}
          <div className="lg:col-span-2">
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full bg-[#13151E] border border-[#2B3245] py-2 sm:py-2.5 px-3 rounded-xl sm:rounded-2xl text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-rose-400 transition-all font-medium cursor-pointer"
            >
              {CLASS_LEVELS.map((cls) => (
                <option key={cls} value={cls} className="bg-[#181B26] text-white">
                  {cls}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Tahun Pelajaran */}
          <div className="lg:col-span-2">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full bg-[#13151E] border border-[#2B3245] py-2 sm:py-2.5 px-3 rounded-xl sm:rounded-2xl text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-rose-400 transition-all font-medium cursor-pointer"
            >
              {availableYears.map((yr) => (
                <option key={yr} value={yr} className="bg-[#181B26] text-white">
                  {yr === 'Semua Tahun' ? 'Semua Tahun' : `T.P. ${yr}`}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Semester */}
          <div className="lg:col-span-2">
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              className="w-full bg-[#13151E] border border-[#2B3245] py-2 sm:py-2.5 px-3 rounded-xl sm:rounded-2xl text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-rose-400 transition-all font-medium cursor-pointer"
            >
              <option value="Semua Semester" className="bg-[#181B26] text-white">Semua Semester</option>
              {SEMESTER_TYPES.map((sem) => (
                <option key={sem} value={sem} className="bg-[#181B26] text-white">
                  {sem}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Kategori Rapor */}
          <div className="lg:col-span-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-[#13151E] border border-[#2B3245] py-2 sm:py-2.5 px-3 rounded-xl sm:rounded-2xl text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-rose-400 transition-all font-medium cursor-pointer"
            >
              <option value="Semua Kategori Rapor" className="bg-[#181B26] text-white">Semua Kategori</option>
              {CATEGORIES_RAPOR.map((cat) => (
                <option key={cat} value={cat} className="bg-[#181B26] text-white">
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Reset button if active */}
          {hasActiveFilters && (
            <div className="lg:col-span-1 col-span-1 sm:col-span-2 flex justify-end">
              <button
                type="button"
                onClick={resetFilters}
                className="w-full sm:w-auto px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl sm:rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                title="Reset Filter"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      {filteredDocs.length === 0 ? (
        <div className="text-center py-16 bg-[#181B26] rounded-3xl border border-[#272D3E] p-8">
          <div className="w-16 h-16 rounded-2xl bg-[#13151E] border border-[#2B3245] flex items-center justify-center mx-auto mb-4 text-slate-500">
            <GraduationCap className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-white">Tidak Ada Dokumen Rapor Ditemukan</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Coba ubah kata kunci pencarian atau filter di atas.
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="mt-4 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Filter</span>
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDocs.map((doc) => (
            <RaporGridCard key={doc.id} doc={doc} onEdit={onEditDocument} />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredDocs.map((doc) => (
            <DocumentCard key={doc.id} doc={doc} onEdit={onEditDocument} />
          ))}
        </div>
      )}
    </div>
  );
};
