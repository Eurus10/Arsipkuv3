import React, { useState } from 'react';
import {
  Printer,
  ChevronLeft,
  ChevronRight,
  User,
  Users,
  Loader2,
  FileSpreadsheet,
  FileText,
  FileDown,
} from 'lucide-react';
import jsPDF from 'jspdf';
import * as htmlToImage from 'html-to-image';
import html2canvas from 'html2canvas';
import {
  RaporStsClassData,
  RaporSubject,
  StudentScoreDetail,
  StudentAdditionalInfo,
} from '../../types/raporSts';
import { Student } from '../../services/studentStorage';
import {
  exportStudentRaporToExcel,
  exportClassRaporToExcel,
  exportStudentRaporToWord,
  exportClassRaporToWord,
  formatPersonNameWithDegree,
} from '../../services/raporStsExportService';

interface RaporPrintPreviewProps {
  classData: RaporStsClassData;
  students: Student[];
  semester?: '1' | '2';
  schoolYear?: string;
}

/**
 * Helper to sanitize modern CSS colors (oklab, oklch, color-mix, etc.) before html2canvas parses them
 */
function sanitizeModernColorsInClonedDoc(clonedDoc: globalThis.Document): void {
  try {
    const sanitizeText = (text: string): string => {
      if (!text) return '';
      let prev = '';
      let current = text;
      let iterations = 0;
      const modernColorRegex = /(?:oklch|oklab|color-mix|light-dark|lab|lch|color)\([^()]*\)/gi;
      while (prev !== current && iterations < 10) {
        prev = current;
        current = current.replace(modernColorRegex, '#000000');
        iterations++;
      }
      return current;
    };

    // 1. Remove all external <link rel="stylesheet"> in clonedDoc to prevent html2canvas parsing modern CSS rules
    const linkElements = clonedDoc.querySelectorAll('link[rel="stylesheet"]');
    linkElements.forEach((link) => {
      link.remove();
    });

    // 2. Sanitize all <style> tags in cloned document
    const styleElements = clonedDoc.querySelectorAll('style');
    styleElements.forEach((styleEl) => {
      if (styleEl.textContent) {
        styleEl.textContent = sanitizeText(styleEl.textContent);
      }
    });

    // 3. Sanitize inline style attributes
    const allElements = clonedDoc.querySelectorAll('*');
    allElements.forEach((el) => {
      const styleAttr = el.getAttribute('style');
      if (styleAttr) {
        el.setAttribute('style', sanitizeText(styleAttr));
      }
    });

    // 4. Inject explicit fallback styles for html2canvas
    const resetStyle = clonedDoc.createElement('style');
    resetStyle.textContent = `
      * {
        box-sizing: border-box !important;
        --tw-shadow-color: transparent !important;
        --tw-ring-color: transparent !important;
        --tw-outline-color: transparent !important;
        box-shadow: none !important;
      }
      body {
        background-color: #ffffff !important;
        color: #000000 !important;
        font-family: 'Bookman Old Style', 'Times New Roman', serif !important;
      }
    `;
    clonedDoc.head?.appendChild(resetStyle);
  } catch (err) {
    console.warn('Gagal membersihkan warna modern CSS:', err);
  }
}

/**
 * Universal canvas renderer: uses browser-native SVG rasterization (html-to-image)
 * with robust html2canvas fallback sanitized against modern colors (oklch, color-mix).
 */
async function renderElementToCanvas(element: HTMLElement): Promise<HTMLCanvasElement> {
  // Method 1: html-to-image
  try {
    const canvas = await htmlToImage.toCanvas(element, {
      pixelRatio: 2,
      backgroundColor: '#ffffff',
      cacheBust: true,
      skipFonts: true,
      filter: (node) => {
        if (node.nodeType === 1) {
          const el = node as HTMLElement;
          if (el.tagName === 'SCRIPT' || el.hasAttribute('aria-hidden')) return false;
        }
        return true;
      },
    });
    if (canvas && canvas.width > 50 && canvas.height > 50) {
      return canvas;
    }
  } catch (err) {
    console.warn('html-to-image toCanvas failed, falling back to sanitized html2canvas:', err);
  }

  // Method 2: html2canvas with sanitized styles that strip oklch
  return await html2canvas(element, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    logging: false,
    backgroundColor: '#ffffff',
    windowWidth: 850,
    onclone: (clonedDoc) => {
      sanitizeModernColorsInClonedDoc(clonedDoc);
    },
  });
}

/**
 * Renders an element to multi-page or single-page PDF with exact 1cm (10mm) margins.
 * Intelligent Slicing:
 * - Scans logical break points (table row borders, note borders, signature section)
 * - Prevents cutting through lines of text or across table rows
 * - Generates crisp, clean pages where each page respects 10mm top & bottom margins
 */
async function addElementToPdf(
  pdf: jsPDF,
  element: HTMLElement,
  isFirstPageInDocument: boolean = true
): Promise<void> {
  const pageWidth = 210; // A4 mm
  const pageHeight = 297; // A4 mm
  const margin = 10; // 10 mm = 1.0 cm exactly
  const usableWidth = pageWidth - margin * 2; // 190 mm
  const usableHeight = pageHeight - margin * 2; // 277 mm

  const fullCanvas = await renderElementToCanvas(element);
  const pxPerMm = fullCanvas.width / usableWidth;
  const maxPageHeightPx = usableHeight * pxPerMm;

  // If the content comfortably fits in 1 page (allow slight 6% tolerance with compact scale)
  if (fullCanvas.height <= maxPageHeightPx * 1.06) {
    if (!isFirstPageInDocument) {
      pdf.addPage();
    }
    const finalHeightMm = Math.min(usableHeight, fullCanvas.height / pxPerMm);
    const finalWidthMm = (fullCanvas.width * finalHeightMm) / fullCanvas.height;
    const xOffset = margin + (usableWidth - finalWidthMm) / 2;
    const imgData = fullCanvas.toDataURL('image/jpeg', 0.96);
    pdf.addImage(imgData, 'JPEG', xOffset, margin, finalWidthMm, finalHeightMm);
    return;
  }

  // Multi-page handling: Determine safe vertical slice positions based on DOM child elements
  const elementRect = element.getBoundingClientRect();
  const safeBreakYList: number[] = [];

  // Identify all potential safe break elements (table rows, notes block, signature block)
  const candidateElements = element.querySelectorAll('tr, .mb-6, .pt-2, h1, h2, h3, table');
  candidateElements.forEach((child) => {
    const rect = child.getBoundingClientRect();
    const relativeBottomPx = (rect.bottom - elementRect.top) * (fullCanvas.height / elementRect.height);
    if (relativeBottomPx > 0 && relativeBottomPx < fullCanvas.height) {
      safeBreakYList.push(relativeBottomPx);
    }
  });

  // Sort and remove duplicates
  safeBreakYList.sort((a, b) => a - b);

  let currentSourceY = 0;
  let pageCount = 0;

  while (currentSourceY < fullCanvas.height - 5) {
    pageCount++;
    if (!isFirstPageInDocument || pageCount > 1) {
      pdf.addPage();
    }

    const remainingHeightPx = fullCanvas.height - currentSourceY;

    let sliceHeightPx: number;
    if (remainingHeightPx <= maxPageHeightPx) {
      // Remaining content fits on this final page
      sliceHeightPx = remainingHeightPx;
    } else {
      // Find the largest safe cut point <= currentSourceY + maxPageHeightPx
      const targetMaxCut = currentSourceY + maxPageHeightPx;
      // We look for a safe break within [targetMaxCut - 220px, targetMaxCut]
      const validCuts = safeBreakYList.filter(
        (y) => y > currentSourceY + 80 && y <= targetMaxCut
      );

      if (validCuts.length > 0) {
        // Pick the closest break point to the bottom of the page
        sliceHeightPx = validCuts[validCuts.length - 1] - currentSourceY;
      } else {
        // Fallback to max allowed height
        sliceHeightPx = maxPageHeightPx;
      }
    }

    // Create a temporary canvas for this page slice
    const pageCanvas = document.createElement('canvas');
    pageCanvas.width = fullCanvas.width;
    pageCanvas.height = Math.round(sliceHeightPx);

    const ctx = pageCanvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
      ctx.drawImage(
        fullCanvas,
        0,
        Math.round(currentSourceY),
        fullCanvas.width,
        Math.round(sliceHeightPx),
        0,
        0,
        pageCanvas.width,
        Math.round(sliceHeightPx)
      );
    }

    const sliceImgData = pageCanvas.toDataURL('image/jpeg', 0.96);
    const sliceHeightMm = (sliceHeightPx * usableWidth) / fullCanvas.width;

    pdf.addImage(sliceImgData, 'JPEG', margin, margin, usableWidth, sliceHeightMm);

    currentSourceY += sliceHeightPx;
  }
}

export const RaporPrintPreview: React.FC<RaporPrintPreviewProps> = ({
  classData,
  students,
  semester,
  schoolYear,
}) => {
  const [selectedStudentIndex, setSelectedStudentIndex] = useState(0);
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [exportScope, setExportScope] = useState<'single' | 'class'>('single');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isExportingWord, setIsExportingWord] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [pdfProgress, setPdfProgress] = useState<{ current: number; total: number; name: string } | null>(null);

  const { config, subjects, subjectRecords, additionalInfo } = classData;
  const currentStudent = students[selectedStudentIndex] || students[0];

  // Active semester & school year (dynamic from setting / workspace selection)
  const activeSemester = semester || config.semester || '1';
  const activeSchoolYear = schoolYear || config.schoolYear || '2026/2027';
  const activeClass = config.classLevel || '1A';

  // Group subjects by category as requested:
  // I. Agama ('agama')
  // II. Umum ('umum' or unassigned)
  // III. Mulok ('mulok' as configured in Pengaturan Rapor)
  const agamaSubjects = subjects.filter((s) => s.category === 'agama');
  const umumSubjects = subjects.filter((s) => s.category === 'umum' || (!s.category));
  const mulokSubjects = subjects.filter((s) => s.category === 'mulok');
  const otherSubjects = subjects.filter(
    (s) => s.category && s.category !== 'agama' && s.category !== 'umum' && s.category !== 'mulok'
  );

  // Combine mulok and any other custom categories
  const finalMulokSubjects = [...mulokSubjects, ...otherSubjects];

  // Helper to format Tempat & Tanggal Lahir
  const formatTTL = (pob?: string, dob?: string): string => {
    if (!pob && !dob) return '-';
    let formattedDob = dob || '';
    if (formattedDob && !isNaN(Number(formattedDob)) && Number(formattedDob) > 20000 && Number(formattedDob) < 60000) {
      const excelEpoch = new Date(1899, 11, 30);
      const d = new Date(excelEpoch.getTime() + Number(formattedDob) * 86400000);
      if (!isNaN(d.getTime())) {
        formattedDob = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
      }
    }
    return [pob, formattedDob].filter(Boolean).join(', ');
  };

  // Helper to format NIM / NISN
  const formatNimNisn = (nim?: string, nisn?: string): string => {
    if (nim && nisn) return `${nim} / ${nisn}`;
    return nim || nisn || '-';
  };

  const handleNextStudent = () => {
    if (selectedStudentIndex < students.length - 1) {
      setSelectedStudentIndex(selectedStudentIndex + 1);
    }
  };

  const handlePrevStudent = () => {
    if (selectedStudentIndex > 0) {
      setSelectedStudentIndex(selectedStudentIndex - 1);
    }
  };

  // Export to Excel (.xlsx)
  const handleExportExcel = () => {
    setIsExportingExcel(true);
    try {
      if (exportScope === 'single') {
        exportStudentRaporToExcel(classData, currentStudent, activeSemester, activeSchoolYear);
      } else {
        exportClassRaporToExcel(classData, students, activeSemester, activeSchoolYear);
      }
    } catch (err) {
      console.error('Failed to export Excel:', err);
      alert('Gagal mengekspor file Excel. Silakan coba kembali.');
    } finally {
      setIsExportingExcel(false);
    }
  };

  // Export to Word (.docx)
  const handleExportWord = async () => {
    setIsExportingWord(true);
    try {
      if (exportScope === 'single') {
        await exportStudentRaporToWord(classData, currentStudent, activeSemester, activeSchoolYear);
      } else {
        await exportClassRaporToWord(classData, students, activeSemester, activeSchoolYear);
      }
    } catch (err) {
      console.error('Failed to export Word:', err);
      alert('Gagal mengekspor file Word. Silakan coba kembali.');
    } finally {
      setIsExportingWord(false);
    }
  };

  // Export Single Student PDF
  const handleExportSinglePdf = async (student: Student) => {
    setIsGeneratingPdf(true);
    setPdfProgress({ current: 1, total: 1, name: student.name });

    try {
      await new Promise((resolve) => setTimeout(resolve, 150));

      let element = document.getElementById(`rapor-sheet-${student.id}`);
      if (!element) {
        element = document.getElementById('single-rapor-sheet');
      }

      if (!element) {
        throw new Error('Elemen rapor tidak ditemukan.');
      }

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });

      // Render with 1cm margin & intelligent multi-page clean cut
      await addElementToPdf(pdf, element, true);

      const cleanName = student.name.replace(/[^a-zA-Z0-9]/g, '_');
      pdf.save(`Rapor_STS_${activeClass}_Sem${activeSemester}_${cleanName}.pdf`);
    } catch (err) {
      console.error('Failed to export single PDF:', err);
      alert('Gagal membuat file PDF. Silakan gunakan tombol Cetak Langsung sebagai alternatif.');
    } finally {
      setIsGeneratingPdf(false);
      setPdfProgress(null);
    }
  };

  // Export Whole Class PDF
  const handleExportWholeClassPdf = async () => {
    if (students.length === 0) return;

    setIsGeneratingPdf(true);
    const originalIndex = selectedStudentIndex;
    const originalBatch = isBatchMode;

    try {
      setIsBatchMode(false);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });

      for (let i = 0; i < students.length; i++) {
        const student = students[i];
        setSelectedStudentIndex(i);
        setPdfProgress({ current: i + 1, total: students.length, name: student.name });

        // Allow DOM to re-render student's sheet
        await new Promise((resolve) => setTimeout(resolve, 180));

        const element = document.getElementById('single-rapor-sheet');
        if (!element) continue;

        // Render with 1cm margin & intelligent multi-page clean cut
        await addElementToPdf(pdf, element, i === 0);
      }

      const cleanYear = activeSchoolYear.replace(/[^a-zA-Z0-9]/g, '-');
      pdf.save(`Rapor_STS_Kelas_${activeClass}_Sem${activeSemester}_${cleanYear}_Lengkap.pdf`);
    } catch (err) {
      console.error('Failed to export whole class PDF:', err);
      alert('Gagal membuat bundel PDF seluruh kelas. Silakan coba kembali.');
    } finally {
      setSelectedStudentIndex(originalIndex);
      setIsBatchMode(originalBatch);
      setIsGeneratingPdf(false);
      setPdfProgress(null);
    }
  };

  // Main PDF Export Dispatcher based on Scope
  const handleExportPdf = async () => {
    if (exportScope === 'single') {
      await handleExportSinglePdf(currentStudent);
    } else {
      await handleExportWholeClassPdf();
    }
  };

  // Browser Native Print
  const handlePrint = () => {
    if (exportScope === 'class') {
      setIsBatchMode(true);
      setTimeout(() => {
        window.print();
      }, 250);
    } else {
      setIsBatchMode(false);
      setTimeout(() => {
        window.print();
      }, 150);
    }
  };

  if (students.length === 0) {
    return (
      <div className="p-12 text-center text-slate-400 text-xs bg-slate-900/60 rounded-2xl border border-slate-800">
        Belum ada data siswa untuk dicetak di kelas ini.
      </div>
    );
  }

  // Render a Single Rapor Sheet
  const renderSingleStudentRapor = (student: Student, domId?: string, isPrintBatch = false) => {
    const subjectNote = Object.values(subjectRecords)
      .map((sr) => sr.scores[student.id]?.teacherNote)
      .find((note) => note && note.trim().length > 0);

    const addInfo = additionalInfo[student.id] || {
      studentId: student.id,
      attendance: { sakit: 0, izin: 0, alpha: 0 },
      extracurriculars: [],
      teacherNotes: subjectNote || 'Tingkatkan terus semangat belajarmu dan pertahankan akhlak mulia.',
    };

    const displayNote =
      addInfo.teacherNotes && addInfo.teacherNotes.trim().length > 0
        ? addInfo.teacherNotes
        : subjectNote || 'Tingkatkan terus semangat belajarmu dan pertahankan akhlak mulia.';

    // Semester title formatting (Ganjil / Genap)
    const semesterTitle =
      activeSemester === '1'
        ? 'SUMATIF TENGAH SEMESTER GANJIL (STS 1)'
        : 'SUMATIF TENGAH SEMESTER GENAP (STS 2)';

    // School Year display (format 2026-2027)
    const schoolYearTitle = activeSchoolYear.includes('/')
      ? activeSchoolYear.replace('/', '-')
      : activeSchoolYear;

    // Vibrant bright yellow for header cells and section separators (as requested in item 5)
    const YELLOW_BRIGHT_BG = '#FDE047';

    // Bookman Old Style font family (as requested in item 1)
    const BOOKMAN_FONT_FAMILY = "'Bookman Old Style', 'URW Bookman', 'Bookman', 'Palatino Linotype', serif";

    return (
      <div
        id={domId}
        key={student.id}
        className={`bg-white text-black p-8 sm:p-10 mx-auto max-w-[850px] rounded-xl leading-normal print:p-0 print:m-0 print:max-w-none ${
          isPrintBatch ? 'page-break-after mb-12 print:mb-0' : ''
        }`}
        style={{
          fontFamily: BOOKMAN_FONT_FAMILY,
          backgroundColor: '#ffffff',
          color: '#000000',
          border: '1px solid #d1d5db',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        }}
      >
        {/* JUDUL RESMI (SESUAI GAMBAR & SETTING AKTIF) */}
        <div className="text-center mb-6">
          <h1 className="text-base font-bold uppercase tracking-wider text-black m-0">
            LAPORAN
          </h1>
          <h2 className="text-sm font-bold uppercase tracking-wide text-black mt-1 mb-0">
            {semesterTitle}
          </h2>
          <h3 className="text-sm font-bold uppercase tracking-wide text-black mt-1 mb-0">
            TAHUN PELAJARAN {schoolYearTitle}
          </h3>
        </div>

        {/* IDENTITAS SISWA (HANYA NAMA SISWA YANG BOLD, LABEL & TTL REGULER) */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-xs mb-4 text-black font-normal">
          {/* Kolom Kiri */}
          <div className="space-y-1">
            <div className="flex items-start">
              <span className="w-48 font-normal">NAMA</span>
              <span className="w-3 font-normal">:</span>
              <span className="font-bold uppercase flex-1">{student.name}</span>
            </div>
            <div className="flex items-start">
              <span className="w-48 font-normal">TEMPAT, TANGGAL LAHIR</span>
              <span className="w-3 font-normal">:</span>
              <span className="font-normal flex-1">
                {formatTTL(student.tempatLahir, student.tanggalLahir)}
              </span>
            </div>
          </div>

          {/* Kolom Kanan */}
          <div className="space-y-1">
            <div className="flex items-start">
              <span className="w-28 font-normal">NIM/NISN</span>
              <span className="w-3 font-normal">:</span>
              <span className="font-normal flex-1">
                {formatNimNisn(student.nim, student.nisn)}
              </span>
            </div>
            <div className="flex items-start">
              <span className="w-28 font-normal">KELAS</span>
              <span className="w-3 font-normal">:</span>
              <span className="font-normal flex-1">{activeClass}</span>
            </div>
          </div>
        </div>

        {/* TABEL HASIL CAPAIAN KOMPETENSI */}
        <div className="mb-6">
          <table
            className="w-full text-xs text-black border-collapse"
            style={{
              borderCollapse: 'collapse',
              border: '1px solid #000000',
              width: '100%',
              fontFamily: BOOKMAN_FONT_FAMILY,
            }}
          >
            <thead>
              {/* Header Baris 1 */}
              <tr style={{ backgroundColor: YELLOW_BRIGHT_BG }}>
                <th
                  rowSpan={2}
                  style={{
                    border: '1px solid #000000',
                    padding: '6px 4px',
                    width: '36px',
                    textAlign: 'center',
                    fontWeight: 'bold',
                    color: '#000000',
                  }}
                >
                  NO
                </th>
                <th
                  rowSpan={2}
                  style={{
                    border: '1px solid #000000',
                    padding: '6px 10px',
                    width: '260px',
                    whiteSpace: 'nowrap',
                    textAlign: 'center',
                    fontWeight: 'bold',
                    color: '#000000',
                  }}
                >
                  MATA PELAJARAN
                </th>
                <th
                  colSpan={2}
                  style={{
                    border: '1px solid #000000',
                    padding: '6px 8px',
                    textAlign: 'center',
                    fontWeight: 'bold',
                    color: '#000000',
                  }}
                >
                  HASIL CAPAIAN KOMPETENSI
                </th>
              </tr>
              {/* Header Baris 2: Sub-Kolom */}
              <tr style={{ backgroundColor: YELLOW_BRIGHT_BG }}>
                <th
                  style={{
                    border: '1px solid #000000',
                    padding: '6px 4px',
                    width: '75px',
                    textAlign: 'center',
                    fontWeight: 'bold',
                    color: '#000000',
                  }}
                >
                  NILAI AKHIR
                </th>
                <th
                  style={{
                    border: '1px solid #000000',
                    padding: '6px 8px',
                    textAlign: 'center',
                    fontWeight: 'bold',
                    color: '#000000',
                  }}
                >
                  CAPAIAN KOMPETENSI
                </th>
              </tr>
            </thead>

            <tbody>
              {/* I. PENDIDIKAN AGAMA */}
              <tr style={{ backgroundColor: YELLOW_BRIGHT_BG, fontWeight: 'bold' }}>
                <td
                  style={{
                    border: '1px solid #000000',
                    padding: '4px 4px',
                    textAlign: 'center',
                    color: '#000000',
                  }}
                >
                  I.
                </td>
                <td
                  style={{
                    border: '1px solid #000000',
                    padding: '4px 10px',
                    color: '#000000',
                    whiteSpace: 'nowrap',
                  }}
                >
                  PENDIDIKAN AGAMA
                </td>
                <td
                  style={{
                    border: '1px solid #000000',
                    padding: '4px 4px',
                    backgroundColor: YELLOW_BRIGHT_BG,
                  }}
                ></td>
                <td
                  style={{
                    border: '1px solid #000000',
                    padding: '4px 8px',
                    backgroundColor: YELLOW_BRIGHT_BG,
                  }}
                ></td>
              </tr>

              {/* DAFTAR MAPEL AGAMA (TIDAK BOLD, WHITE-SPACE NOWRAP) */}
              {agamaSubjects.map((subj, idx) => {
                const scoreData: StudentScoreDetail | undefined =
                  subjectRecords[subj.id]?.scores[student.id];
                const score = scoreData?.finalScore;
                const desc =
                  scoreData?.customDescription ||
                  scoreData?.autoDescription ||
                  '';

                return (
                  <tr key={subj.id} className="align-top">
                    <td
                      style={{
                        border: '1px solid #000000',
                        padding: '5px 4px',
                        textAlign: 'center',
                        fontWeight: 'normal',
                      }}
                    >
                      {idx + 1}.
                    </td>
                    <td
                      style={{
                        border: '1px solid #000000',
                        padding: '5px 10px',
                        fontWeight: 'normal',
                        whiteSpace: 'nowrap',
                        textTransform: 'uppercase',
                        color: '#000000',
                      }}
                    >
                      {subj.name}
                    </td>
                    <td
                      style={{
                        border: '1px solid #000000',
                        padding: '5px 4px',
                        textAlign: 'center',
                        fontWeight: 'normal',
                        color: '#000000',
                      }}
                    >
                      {typeof score === 'number' ? score : '-'}
                    </td>
                    <td
                      style={{
                        border: '1px solid #000000',
                        padding: '5px 8px',
                        textAlign: 'justify',
                        fontSize: '11px',
                        lineHeight: '1.4',
                        fontWeight: 'normal',
                        color: '#000000',
                      }}
                    >
                      {desc || '-'}
                    </td>
                  </tr>
                );
              })}

              {/* II. PENDIDIKAN UMUM */}
              <tr style={{ backgroundColor: YELLOW_BRIGHT_BG, fontWeight: 'bold' }}>
                <td
                  style={{
                    border: '1px solid #000000',
                    padding: '4px 4px',
                    textAlign: 'center',
                    color: '#000000',
                  }}
                >
                  II.
                </td>
                <td
                  style={{
                    border: '1px solid #000000',
                    padding: '4px 10px',
                    color: '#000000',
                    whiteSpace: 'nowrap',
                  }}
                >
                  PENDIDIKAN UMUM
                </td>
                <td
                  style={{
                    border: '1px solid #000000',
                    padding: '4px 4px',
                    backgroundColor: YELLOW_BRIGHT_BG,
                  }}
                ></td>
                <td
                  style={{
                    border: '1px solid #000000',
                    padding: '4px 8px',
                    backgroundColor: YELLOW_BRIGHT_BG,
                  }}
                ></td>
              </tr>

              {/* DAFTAR MAPEL UMUM (TIDAK BOLD, WHITE-SPACE NOWRAP) */}
              {umumSubjects.map((subj, idx) => {
                const scoreData: StudentScoreDetail | undefined =
                  subjectRecords[subj.id]?.scores[student.id];
                const score = scoreData?.finalScore;
                const desc =
                  scoreData?.customDescription ||
                  scoreData?.autoDescription ||
                  '';

                return (
                  <tr key={subj.id} className="align-top">
                    <td
                      style={{
                        border: '1px solid #000000',
                        padding: '5px 4px',
                        textAlign: 'center',
                        fontWeight: 'normal',
                      }}
                    >
                      {idx + 1}.
                    </td>
                    <td
                      style={{
                        border: '1px solid #000000',
                        padding: '5px 10px',
                        fontWeight: 'normal',
                        whiteSpace: 'nowrap',
                        textTransform: 'uppercase',
                        color: '#000000',
                      }}
                    >
                      {subj.name}
                    </td>
                    <td
                      style={{
                        border: '1px solid #000000',
                        padding: '5px 4px',
                        textAlign: 'center',
                        fontWeight: 'normal',
                        color: '#000000',
                      }}
                    >
                      {typeof score === 'number' ? score : '-'}
                    </td>
                    <td
                      style={{
                        border: '1px solid #000000',
                        padding: '5px 8px',
                        textAlign: 'justify',
                        fontSize: '11px',
                        lineHeight: '1.4',
                        fontWeight: 'normal',
                        color: '#000000',
                      }}
                    >
                      {desc || '-'}
                    </td>
                  </tr>
                );
              })}

              {/* III. MUATAN LOKAL (SESUAI PENGATURAN MAPEL MULOK DI PENGATURAN RAPOR) */}
              {finalMulokSubjects.length > 0 && (
                <>
                  <tr style={{ backgroundColor: YELLOW_BRIGHT_BG, fontWeight: 'bold' }}>
                    <td
                      style={{
                        border: '1px solid #000000',
                        padding: '4px 4px',
                        textAlign: 'center',
                        color: '#000000',
                      }}
                    >
                      III.
                    </td>
                    <td
                      style={{
                        border: '1px solid #000000',
                        padding: '4px 10px',
                        color: '#000000',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      MUATAN LOKAL
                    </td>
                    <td
                      style={{
                        border: '1px solid #000000',
                        padding: '4px 4px',
                        backgroundColor: YELLOW_BRIGHT_BG,
                      }}
                    ></td>
                    <td
                      style={{
                        border: '1px solid #000000',
                        padding: '4px 8px',
                        backgroundColor: YELLOW_BRIGHT_BG,
                      }}
                    ></td>
                  </tr>

                  {finalMulokSubjects.map((subj, idx) => {
                    const scoreData: StudentScoreDetail | undefined =
                      subjectRecords[subj.id]?.scores[student.id];
                    const score = scoreData?.finalScore;
                    const desc =
                      scoreData?.customDescription ||
                      scoreData?.autoDescription ||
                      '';

                    return (
                      <tr key={subj.id} className="align-top">
                        <td
                          style={{
                            border: '1px solid #000000',
                            padding: '5px 4px',
                            textAlign: 'center',
                            fontWeight: 'normal',
                          }}
                        >
                          {idx + 1}.
                        </td>
                        <td
                          style={{
                            border: '1px solid #000000',
                            padding: '5px 10px',
                            fontWeight: 'normal',
                            whiteSpace: 'nowrap',
                            textTransform: 'uppercase',
                            color: '#000000',
                          }}
                        >
                          {subj.name}
                        </td>
                        <td
                          style={{
                            border: '1px solid #000000',
                            padding: '5px 4px',
                            textAlign: 'center',
                            fontWeight: 'normal',
                            color: '#000000',
                          }}
                        >
                          {typeof score === 'number' ? score : '-'}
                        </td>
                        <td
                          style={{
                            border: '1px solid #000000',
                            padding: '5px 8px',
                            textAlign: 'justify',
                            fontSize: '11px',
                            lineHeight: '1.4',
                            fontWeight: 'normal',
                            color: '#000000',
                          }}
                        >
                          {desc || '-'}
                        </td>
                      </tr>
                    );
                  })}
                </>
              )}
            </tbody>
          </table>
        </div>

        {/* CATATAN GURU / WALI KELAS */}
        {displayNote && (
          <div className="mb-6">
            <div className="text-xs font-bold text-black uppercase mb-1">
              CATATAN GURU / WALI KELAS:
            </div>
            <div
              style={{
                border: '1px solid #000000',
                padding: '8px 12px',
                fontSize: '11px',
                fontStyle: 'italic',
                lineHeight: '1.5',
              }}
            >
              "{displayNote}"
            </div>
          </div>
        )}

        {/* TANDA TANGAN RESMI (SESUAI PERMINTAAN: TTD GURU KELAS TANPA NAMA KELAS, GELAR TIDAK KAPITAL SEMUA) */}
        <div className="pt-2 text-xs text-black">
          <div className="text-right mb-4">
            {config.reportDatePlace || 'Tangerang, 20 Maret 2027'}
          </div>

          <div className="grid grid-cols-2 gap-8 text-center mb-8">
            <div>
              <p className="m-0">Mengetahui,</p>
              <p className="font-bold m-0 mb-16">Orang Tua / Wali Siswa</p>
              <p className="font-bold m-0">..................................................</p>
            </div>

            <div>
              <p className="m-0">Mengetahui,</p>
              <p className="font-bold m-0 mb-16">Guru Kelas,</p>
              <p className="font-bold underline m-0">
                {formatPersonNameWithDegree(config.teacherName || 'Guru Kelas')}
              </p>
              <p className="text-[10px] m-0">
                NIP. {config.teacherNip || '-'}
              </p>
            </div>
          </div>

          <div className="text-center">
            <p className="m-0">Mengetahui,</p>
            <p className="font-bold m-0 mb-16">
              Kepala Sekolah {config.schoolName || 'SDIT AL FIKRI'}
            </p>
            <p className="font-bold underline m-0">
              {formatPersonNameWithDegree(config.headmasterName || 'Kepala Sekolah')}
            </p>
            <p className="text-[10px] m-0">
              NIP. {config.headmasterNip || '-'}
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Control Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/80 border border-slate-800 print:hidden shadow-lg">
        {/* Student Selector Pagination */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handlePrevStudent}
            disabled={selectedStudentIndex === 0 || isBatchMode || isGeneratingPdf}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-white cursor-pointer transition-colors"
            title="Siswa Sebelumnya"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-amber-400 shrink-0" />
            <select
              value={selectedStudentIndex}
              disabled={isBatchMode || isGeneratingPdf}
              onChange={(e) => {
                setSelectedStudentIndex(parseInt(e.target.value, 10));
                setIsBatchMode(false);
              }}
              className="bg-slate-950 text-amber-300 font-bold text-xs px-3 py-1.5 border border-amber-500/40 rounded-xl focus:outline-none cursor-pointer disabled:opacity-50"
            >
              {students.map((st, i) => (
                <option key={st.id} value={i} className="bg-slate-900 text-white">
                  {i + 1}. {st.name} ({st.nim || st.nisn || '-'})
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleNextStudent}
            disabled={selectedStudentIndex === students.length - 1 || isBatchMode || isGeneratingPdf}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-white cursor-pointer transition-colors"
            title="Siswa Berikutnya"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Toggle Screen Preview Mode */}
          <button
            type="button"
            onClick={() => setIsBatchMode(!isBatchMode)}
            disabled={isGeneratingPdf}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ml-1 ${
              isBatchMode
                ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
            }`}
            title="Ganti tampilan pratinjau di layar (1 siswa atau seluruh kelas)"
          >
            {isBatchMode ? `Pratinjau: Semua (${students.length})` : 'Pratinjau: 1 Siswa'}
          </button>
        </div>

        {/* Action Controls: Export Scope + 3 Symbol Export Buttons (Word, Excel, PDF) + Print */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Scope Selector: Siswa Ini vs Seluruh Kelas */}
          <div className="flex items-center bg-slate-950/80 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setExportScope('single')}
              disabled={isGeneratingPdf}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                exportScope === 'single'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Unduh untuk 1 siswa yang sedang dipilih saat ini"
            >
              <User className="w-3.5 h-3.5" />
              <span>Siswa Ini</span>
            </button>
            <button
              type="button"
              onClick={() => setExportScope('class')}
              disabled={isGeneratingPdf}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                exportScope === 'class'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title={`Unduh untuk seluruh siswa dalam satu kelas (${students.length} siswa)`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Semua ({students.length})</span>
            </button>
          </div>

          {/* Symbol Export Group */}
          <div className="flex items-center gap-1.5 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
            {/* Symbol 1: Word (.docx) */}
            <button
              type="button"
              onClick={handleExportWord}
              disabled={isGeneratingPdf || isExportingWord || isExportingExcel}
              className="p-2 rounded-lg bg-blue-600 hover:bg-blue-500 active:scale-95 disabled:opacity-50 text-white font-bold flex items-center gap-1 shadow-sm transition-all cursor-pointer"
              title={`Unduh Word (.docx) - ${exportScope === 'single' ? currentStudent.name : 'Seluruh Kelas (' + students.length + ' Siswa)'}`}
            >
              {isExportingWord ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <div className="flex items-center gap-1">
                  <FileText className="w-4 h-4" />
                  <span className="text-[11px] font-black bg-blue-800/80 px-1 py-0.5 rounded leading-none">W</span>
                </div>
              )}
            </button>

            {/* Symbol 2: Excel (.xlsx) */}
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={isGeneratingPdf || isExportingWord || isExportingExcel}
              className="p-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-95 disabled:opacity-50 text-white font-bold flex items-center gap-1 shadow-sm transition-all cursor-pointer"
              title={`Unduh Excel (.xlsx) - ${exportScope === 'single' ? currentStudent.name : 'Seluruh Kelas (' + students.length + ' Siswa)'}`}
            >
              {isExportingExcel ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <div className="flex items-center gap-1">
                  <FileSpreadsheet className="w-4 h-4" />
                  <span className="text-[11px] font-black bg-emerald-800/80 px-1 py-0.5 rounded leading-none">X</span>
                </div>
              )}
            </button>

            {/* Symbol 3: PDF (.pdf) */}
            <button
              type="button"
              onClick={handleExportPdf}
              disabled={isGeneratingPdf || isExportingWord || isExportingExcel}
              className="p-2 rounded-lg bg-rose-600 hover:bg-rose-500 active:scale-95 disabled:opacity-50 text-white font-bold flex items-center gap-1 shadow-sm transition-all cursor-pointer"
              title={`Unduh PDF (.pdf) - ${exportScope === 'single' ? currentStudent.name : 'Seluruh Kelas (' + students.length + ' Siswa)'}`}
            >
              {isGeneratingPdf ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <div className="flex items-center gap-1">
                  <FileDown className="w-4 h-4" />
                  <span className="text-[10px] font-black bg-rose-800/80 px-1 py-0.5 rounded leading-none">PDF</span>
                </div>
              )}
            </button>

            <div className="h-5 w-px bg-slate-800 mx-0.5" />

            {/* Symbol 4: Cetak / Print */}
            <button
              type="button"
              onClick={handlePrint}
              disabled={isGeneratingPdf || isExportingWord || isExportingExcel}
              className="p-2 rounded-lg bg-amber-500 hover:bg-amber-400 active:scale-95 disabled:opacity-50 text-slate-950 font-black flex items-center shadow-sm transition-all cursor-pointer"
              title={`Cetak Langsung (Printer / Dialog Print) - ${exportScope === 'single' ? currentStudent.name : 'Seluruh Kelas'}`}
            >
              <Printer className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Generating PDF / Export Progress Banner */}
      {isGeneratingPdf && pdfProgress && (
        <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-300 flex items-center justify-between gap-3 text-xs animate-pulse">
          <div className="flex items-center gap-2.5 font-bold">
            <Loader2 className="w-4 h-4 animate-spin text-amber-400 shrink-0" />
            <span>
              Sedang memproses PDF ({pdfProgress.current} dari {pdfProgress.total}):{' '}
              <strong className="text-white">{pdfProgress.name}</strong>...
            </span>
          </div>
          <span className="text-[11px] font-mono text-amber-200 bg-amber-950/60 px-2 py-0.5 rounded-lg">
            {Math.round((pdfProgress.current / pdfProgress.total) * 100)}%
          </span>
        </div>
      )}

      {/* Screen Preview Container */}
      <div className="py-4">
        {isBatchMode ? (
          students.map((st) =>
            renderSingleStudentRapor(st, `rapor-sheet-${st.id}`, true)
          )
        ) : (
          renderSingleStudentRapor(currentStudent, 'single-rapor-sheet', false)
        )}
      </div>

      {/* Dedicated Print Styles for 1cm (10mm) Margins & Clean Page Breaking */}
      <style>{`
        @page {
          size: A4 portrait;
          margin: 10mm 10mm 10mm 10mm;
        }
        @media print {
          body {
            background-color: #ffffff !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          .page-break-after {
            page-break-after: always !important;
            break-after: page !important;
          }
          table {
            page-break-inside: auto !important;
          }
          tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          thead {
            display: table-header-group !important;
          }
          tfoot {
            display: table-footer-group !important;
          }
        }
      `}</style>
    </div>
  );
};
