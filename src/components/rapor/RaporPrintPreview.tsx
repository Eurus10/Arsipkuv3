import React, { useState, useMemo } from 'react';
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
  CharacterDescriptor,
  StudentCharacterRecord,
  DEFAULT_CHARACTER_DESCRIPTORS,
  getScorePredicate,
  getMasteryStatusFromPredicate,
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
  descriptors?: CharacterDescriptor[];
  characterRecords?: Record<string, StudentCharacterRecord>;
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
  // Method 1: html-to-image with pixelRatio 2 for crisp 300 DPI high-resolution rendering with optimized file size
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
    windowWidth: element.clientWidth || 800,
    onclone: (clonedDoc) => {
      sanitizeModernColorsInClonedDoc(clonedDoc);
    },
  });
}

/**
 * Renders an element to multi-page or single-page PDF with exact 1cm (10mm) margins.
 * Refined PDF Architecture:
 * - Renders inside an isolated offscreen container (0 padding, 0 shadow, 0 screen borders)
 * - Strips all card outline borders, box-shadows, and border-radius from .rapor-page
 * - Fills 100% of usable width (190mm A4 / 195mm F4) from margin to margin without center shrinking
 * - Slices only at valid table row boundaries or section boundaries
 * - Repeats table header (thead) on page 2 if table spans across pages
 * - Preserves Catatan Guru and TTD sections without cutting signatures in half
 */
async function addElementToPdf(
  pdf: jsPDF,
  element: HTMLElement,
  isFirstPageInDocument: boolean = true,
  paperSize: 'a4' | 'f4' = 'a4'
): Promise<void> {
  const isF4 = paperSize === 'f4';
  const pageWidth = isF4 ? 215 : 210; // mm
  const pageHeight = isF4 ? 330 : 297; // mm
  const margin = 10; // 10 mm = 1.0 cm exactly
  const usableWidth = pageWidth - margin * 2; // 195 mm (F4) or 190 mm (A4)
  const usableHeight = pageHeight - margin * 2; // 310 mm (F4) or 277 mm (A4)

  // 1. Create an isolated offscreen staging container with clean 0-padding, 0-border, 0-shadow
  // at exact proportional pixel width (A4: 760px, F4: 780px)
  const targetWidthPx = isF4 ? 780 : 760;
  const offscreenContainer = document.createElement('div');
  offscreenContainer.style.position = 'fixed';
  offscreenContainer.style.left = '-9999px';
  offscreenContainer.style.top = '0';
  offscreenContainer.style.width = `${targetWidthPx}px`;
  offscreenContainer.style.zIndex = '-9999';
  offscreenContainer.style.opacity = '1';
  offscreenContainer.style.backgroundColor = '#ffffff';

  const cleanClone = element.cloneNode(true) as HTMLElement;
  cleanClone.id = 'clean-rapor-pdf-render';
  cleanClone.style.margin = '0';
  cleanClone.style.padding = '0';
  cleanClone.style.border = 'none';
  cleanClone.style.outline = 'none';
  cleanClone.style.boxShadow = 'none';
  cleanClone.style.borderRadius = '0';
  cleanClone.style.maxWidth = 'none';
  cleanClone.style.width = '100%';
  cleanClone.style.backgroundColor = '#ffffff';
  cleanClone.style.color = '#000000';

  // Explicitly remove all borders, shadows, and rounded corners from all child pages
  const childPages = cleanClone.querySelectorAll<HTMLElement>('.rapor-page');
  childPages.forEach((p) => {
    p.style.border = 'none';
    p.style.outline = 'none';
    p.style.boxShadow = 'none';
    p.style.borderRadius = '0';
    p.style.margin = '0';
    p.style.padding = '0';
    p.style.backgroundColor = '#ffffff';
    p.style.color = '#000000';
  });

  offscreenContainer.appendChild(cleanClone);
  document.body.appendChild(offscreenContainer);

  try {
    // Check if cleanClone contains distinct .rapor-page elements (e.g. Page 1: Akademik, Page 2: Karakter)
    const pageEls = cleanClone.querySelectorAll<HTMLElement>('.rapor-page');
    if (pageEls.length > 0) {
      for (let pIdx = 0; pIdx < pageEls.length; pIdx++) {
        const pageEl = pageEls[pIdx];
        if (pIdx > 0 || !isFirstPageInDocument) {
          pdf.addPage();
        }
        const pageCanvas = await renderElementToCanvas(pageEl);
        const finalHeightMm = (pageCanvas.height * usableWidth) / pageCanvas.width;
        // Optimized 0.80 JPEG quality for crisp 300DPI text with 60-75% smaller file size (~350-500KB vs 2MB)
        const imgData = pageCanvas.toDataURL('image/jpeg', 0.80);
        pdf.addImage(imgData, 'JPEG', margin, margin, usableWidth, Math.min(usableHeight, finalHeightMm), undefined, 'FAST');
      }
      return;
    }

    const fullCanvas = await renderElementToCanvas(cleanClone);
    const pxPerMm = fullCanvas.width / usableWidth;
    const maxPageHeightPx = usableHeight * pxPerMm;

    // A. Single-Page: Content comfortably fits in 1 page
    if (fullCanvas.height <= maxPageHeightPx) {
      if (!isFirstPageInDocument) {
        pdf.addPage();
      }
      const finalHeightMm = (fullCanvas.height * usableWidth) / fullCanvas.width;
      const imgData = fullCanvas.toDataURL('image/jpeg', 0.80);
      // Fills 100% usable width without centering offset or horizontal shrinkage
      pdf.addImage(imgData, 'JPEG', margin, margin, usableWidth, finalHeightMm, undefined, 'FAST');
      return;
    }

    // B. Multi-Page: Content extends beyond 1 page
    // Safe row-boundary slicing + repeated table header on subsequent pages
    const cloneRect = cleanClone.getBoundingClientRect();
    const scaleY = fullCanvas.height / cloneRect.height;

    // Prepare repeated table header (thead)
    const theadEl = cleanClone.querySelector('thead');
    let theadCanvas: HTMLCanvasElement | null = null;
    let theadHeightPx = 0;
    if (theadEl) {
      const theadRect = theadEl.getBoundingClientRect();
      const theadTopPx = Math.max(0, (theadRect.top - cloneRect.top) * scaleY);
      theadHeightPx = Math.round(theadRect.height * scaleY);
      if (theadHeightPx > 10) {
        theadCanvas = document.createElement('canvas');
        theadCanvas.width = fullCanvas.width;
        theadCanvas.height = theadHeightPx;
        const theadCtx = theadCanvas.getContext('2d');
        if (theadCtx) {
          theadCtx.fillStyle = '#ffffff';
          theadCtx.fillRect(0, 0, theadCanvas.width, theadHeightPx);
          theadCtx.drawImage(
            fullCanvas,
            0,
            Math.round(theadTopPx),
            fullCanvas.width,
            theadHeightPx,
            0,
            0,
            theadCanvas.width,
            theadHeightPx
          );
        }
      }
    }

    // Track table bottom position
    const tableEl = cleanClone.querySelector('table');
    let tableBottomPx = fullCanvas.height;
    if (tableEl) {
      const tableRect = tableEl.getBoundingClientRect();
      tableBottomPx = Math.round((tableRect.bottom - cloneRect.top) * scaleY);
    }

    // Identify safe break points:
    // 1. Bottom of each table row
    // 2. Top and bottom of Catatan Guru
    // 3. Top and bottom of TTD section (keeps entire signature block unified)
    const safeBreakYList: number[] = [];

    const rowElements = cleanClone.querySelectorAll('tbody > tr');
    rowElements.forEach((tr) => {
      const rect = tr.getBoundingClientRect();
      const bottomPx = Math.round((rect.bottom - cloneRect.top) * scaleY);
      if (bottomPx > 20 && bottomPx < fullCanvas.height) {
        safeBreakYList.push(bottomPx);
      }
    });

    const catatanEl = cleanClone.querySelector('.catatan-guru-section');
    if (catatanEl) {
      const rect = catatanEl.getBoundingClientRect();
      const topPx = Math.round((rect.top - cloneRect.top) * scaleY);
      const bottomPx = Math.round((rect.bottom - cloneRect.top) * scaleY);
      if (topPx > 20) safeBreakYList.push(topPx);
      if (bottomPx > 20 && bottomPx < fullCanvas.height) safeBreakYList.push(bottomPx);
    }

    const ttdEl = cleanClone.querySelector('.ttd-section');
    if (ttdEl) {
      const rect = ttdEl.getBoundingClientRect();
      const topPx = Math.round((rect.top - cloneRect.top) * scaleY);
      const bottomPx = Math.round((rect.bottom - cloneRect.top) * scaleY);
      if (topPx > 20) safeBreakYList.push(topPx);
      if (bottomPx > 20 && bottomPx < fullCanvas.height) safeBreakYList.push(bottomPx);
    }

    const sortedBreaks = Array.from(new Set(safeBreakYList)).sort((a, b) => a - b);

    let currentSourceY = 0;
    let pageCount = 0;

    while (currentSourceY < fullCanvas.height - 5) {
      pageCount++;
      if (!isFirstPageInDocument || pageCount > 1) {
        pdf.addPage();
      }

      const remainingHeightPx = fullCanvas.height - currentSourceY;
      const isSubsequentPageInTable = pageCount > 1 && currentSourceY < tableBottomPx && theadCanvas !== null;
      const headerHeightForThisPage = isSubsequentPageInTable ? theadHeightPx : 0;
      const usableContentHeightPx = maxPageHeightPx - headerHeightForThisPage;

      let sliceHeightPx: number;
      if (remainingHeightPx <= usableContentHeightPx) {
        sliceHeightPx = remainingHeightPx;
      } else {
        const targetMaxCut = currentSourceY + usableContentHeightPx;
        const validCuts = sortedBreaks.filter(
          (y) => y > currentSourceY + 80 && y <= targetMaxCut
        );

        if (validCuts.length > 0) {
          sliceHeightPx = validCuts[validCuts.length - 1] - currentSourceY;
        } else {
          sliceHeightPx = usableContentHeightPx;
        }
      }

      const totalPageSliceHeightPx = Math.round(headerHeightForThisPage + sliceHeightPx);
      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = fullCanvas.width;
      pageCanvas.height = totalPageSliceHeightPx;

      const ctx = pageCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);

        let yOffsetOnPage = 0;
        if (isSubsequentPageInTable && theadCanvas) {
          ctx.drawImage(theadCanvas, 0, 0);
          yOffsetOnPage += theadHeightPx;
        }

        ctx.drawImage(
          fullCanvas,
          0,
          Math.round(currentSourceY),
          fullCanvas.width,
          Math.round(sliceHeightPx),
          0,
          yOffsetOnPage,
          pageCanvas.width,
          Math.round(sliceHeightPx)
        );
      }

      const sliceImgData = pageCanvas.toDataURL('image/jpeg', 0.86);
      const totalSliceHeightMm = (totalPageSliceHeightPx * usableWidth) / fullCanvas.width;

      pdf.addImage(sliceImgData, 'JPEG', margin, margin, usableWidth, totalSliceHeightMm);

      currentSourceY += sliceHeightPx;
    }
  } finally {
    if (offscreenContainer.parentNode) {
      offscreenContainer.parentNode.removeChild(offscreenContainer);
    }
  }
}

export const RaporPrintPreview: React.FC<RaporPrintPreviewProps> = ({
  classData,
  students,
  semester,
  schoolYear,
  descriptors,
  characterRecords,
}) => {
  const [selectedStudentIndex, setSelectedStudentIndex] = useState(0);
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [exportScope, setExportScope] = useState<'single' | 'class'>('single');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isExportingWord, setIsExportingWord] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [pdfProgress, setPdfProgress] = useState<{ current: number; total: number; name: string } | null>(null);
  const [paperSize, setPaperSize] = useState<'a4' | 'f4'>('a4');
  const [includeKopSekolah, setIncludeKopSekolah] = useState<boolean>(false);

  const { config, subjects, subjectRecords, additionalInfo } = classData;
  const currentStudent = students[selectedStudentIndex] || students[0];

  const activeDescriptors = useMemo(() => {
    return descriptors && descriptors.length > 0
      ? descriptors
      : classData.customCharacterDescriptors && classData.customCharacterDescriptors.length > 0
      ? classData.customCharacterDescriptors
      : DEFAULT_CHARACTER_DESCRIPTORS;
  }, [descriptors, classData.customCharacterDescriptors]);

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
        exportStudentRaporToExcel(
          classData,
          currentStudent,
          activeSemester,
          activeSchoolYear,
          activeDescriptors,
          characterRecords
        );
      } else {
        exportClassRaporToExcel(
          classData,
          students,
          activeSemester,
          activeSchoolYear,
          activeDescriptors,
          characterRecords
        );
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
        await exportStudentRaporToWord(
          classData,
          currentStudent,
          activeSemester,
          activeSchoolYear,
          activeDescriptors,
          characterRecords
        );
      } else {
        await exportClassRaporToWord(
          classData,
          students,
          activeSemester,
          activeSchoolYear,
          activeDescriptors,
          characterRecords
        );
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
        format: paperSize === 'f4' ? [215, 330] : 'a4',
        compress: true,
      });

      // Render with 1cm margin & intelligent multi-page clean cut
      await addElementToPdf(pdf, element, true, paperSize);

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
        format: paperSize === 'f4' ? [215, 330] : 'a4',
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
        await addElementToPdf(pdf, element, i === 0, paperSize);
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

    // Bookman Old Style font family
    const BOOKMAN_FONT_FAMILY = "'Bookman Old Style', 'URW Bookman', 'Bookman', 'Palatino Linotype', 'Times New Roman', serif";

    const studentCharRecord =
      characterRecords?.[student.id] || classData.characterRecords?.[student.id];

    return (
      <div
        id={domId}
        key={student.id}
        className={`rapor-student-bundle mx-auto ${
          paperSize === 'f4' ? 'max-w-[880px]' : 'max-w-[850px]'
        } ${isPrintBatch ? 'page-break-after mb-12 print:mb-0' : ''}`}
        style={{ fontFamily: BOOKMAN_FONT_FAMILY }}
      >
        {/* ============================================================
            LEMBAR 1: LAPORAN PENILAIAN AKADEMIK
        ============================================================ */}
        <div
          className="rapor-page rapor-page-akademik bg-white text-black p-6 sm:p-8 mx-auto rounded-xl leading-normal print:p-0 print:m-0 print:border-none print:shadow-none mb-8 print:mb-0 flex flex-col justify-between"
          style={{
            fontFamily: BOOKMAN_FONT_FAMILY,
            backgroundColor: '#ffffff',
            color: '#000000',
            border: '1px solid #d1d5db',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            breakAfter: 'page',
            pageBreakAfter: 'always',
            minHeight: paperSize === 'f4' ? '1120px' : '1050px',
          }}
        >
          {/* Top Main Content Container */}
          <div className="flex-1 flex flex-col justify-start">
            {/* KOP SEKOLAH RESMI (OPSIONAL / TOGGLEABLE) */}
            {includeKopSekolah && (
              <div className="pb-1 mb-2.5 w-full">
                <img
                  src="/assets/Templateadmin/KOP.png"
                  alt={config.schoolName || 'SDIT AL FIKRI'}
                  className="w-full h-auto block mx-auto"
                  style={{ width: '100%', height: 'auto', display: 'block' }}
                />
              </div>
            )}

            {/* JUDUL RESMI LEMBAR 1 */}
            <div className="text-center mb-6" style={{ fontFamily: BOOKMAN_FONT_FAMILY }}>
              <h2 className="text-[13.5px] font-bold uppercase tracking-wide text-black m-0 leading-tight" style={{ fontFamily: BOOKMAN_FONT_FAMILY }}>
                LAPORAN PENILAIAN AKADEMIK
              </h2>
              <h3 className="text-[13.5px] font-bold uppercase tracking-wide text-black mt-1 mb-0 leading-tight" style={{ fontFamily: BOOKMAN_FONT_FAMILY }}>
                {semesterTitle}
              </h3>
              <h4 className="text-[13.5px] font-bold uppercase tracking-wide text-black mt-1 mb-0 leading-tight" style={{ fontFamily: BOOKMAN_FONT_FAMILY }}>
                TAHUN PELAJARAN {schoolYearTitle}
              </h4>
            </div>

          {/* IDENTITAS SISWA */}
          <div className="flex gap-x-6 text-xs mb-3 text-black font-normal" style={{ fontFamily: BOOKMAN_FONT_FAMILY }}>
            {/* Kolom Kiri: NAMA & TEMPAT, TANGGAL LAHIR (Lebar dinamis ~62% agar nama tidak terpotong) */}
            <div className="flex-1 space-y-0.5 min-w-0 pr-2">
              <div className="flex items-start">
                <span className="w-44 font-normal shrink-0">NAMA</span>
                <span className="w-3 font-normal shrink-0">:</span>
                <span className="font-bold uppercase flex-1 truncate">{student.name}</span>
              </div>
              <div className="flex items-start">
                <span className="w-44 font-normal shrink-0">TEMPAT, TANGGAL LAHIR</span>
                <span className="w-3 font-normal shrink-0">:</span>
                <span className="font-normal flex-1">
                  {formatTTL(student.tempatLahir, student.tanggalLahir)}
                </span>
              </div>
            </div>

            {/* Kolom Kanan: NIM/NISN & KELAS (Lebar 290px, presisi sejajar dengan garis kiri kolom NILAI AKHIR) */}
            <div className="w-[290px] shrink-0 space-y-0.5">
              <div className="flex items-start">
                <span className="w-20 font-normal shrink-0">NIM/NISN</span>
                <span className="w-3 font-normal shrink-0">:</span>
                <span className="font-normal flex-1">
                  {formatNimNisn(student.nim, student.nisn)}
                </span>
              </div>
              <div className="flex items-start">
                <span className="w-20 font-normal shrink-0">KELAS</span>
                <span className="w-3 font-normal shrink-0">:</span>
                <span className="font-normal flex-1">{activeClass}</span>
              </div>
            </div>
          </div>

          {/* TABEL HASIL CAPAIAN AKADEMIK (NILAI, PREDIKAT, PENGUASAAN) */}
          <div className="mb-4">
            <table
              className="w-full text-xs text-black border-collapse"
              style={{
                borderCollapse: 'collapse',
                border: '1px solid #000000',
                width: '100%',
                fontFamily: BOOKMAN_FONT_FAMILY,
                pageBreakInside: 'auto',
              }}
            >
              <thead style={{ display: 'table-header-group' }}>
                <tr style={{ backgroundColor: YELLOW_BRIGHT_BG, breakInside: 'avoid', pageBreakInside: 'avoid' }}>
                  <th
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
                    style={{
                      border: '1px solid #000000',
                      padding: '6px 8px',
                      textAlign: 'center',
                      fontWeight: 'bold',
                      color: '#000000',
                    }}
                  >
                    MATA PELAJARAN
                  </th>
                  <th
                    style={{
                      border: '1px solid #000000',
                      padding: '6px 4px',
                      width: '80px',
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
                      padding: '6px 4px',
                      width: '70px',
                      textAlign: 'center',
                      fontWeight: 'bold',
                      color: '#000000',
                    }}
                  >
                    PREDIKAT
                  </th>
                  <th
                    style={{
                      border: '1px solid #000000',
                      padding: '6px 8px',
                      width: '140px',
                      textAlign: 'center',
                      fontWeight: 'bold',
                      color: '#000000',
                    }}
                  >
                    PENGUASAAN
                  </th>
                </tr>
              </thead>

              <tbody>
                {/* I. PENDIDIKAN AGAMA */}
                <tr style={{ backgroundColor: YELLOW_BRIGHT_BG, fontWeight: 'bold', breakInside: 'avoid', pageBreakInside: 'avoid' }}>
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
                    colSpan={4}
                    style={{
                      border: '1px solid #000000',
                      padding: '4px 8px',
                      color: '#000000',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    PENDIDIKAN AGAMA
                  </td>
                </tr>

                {/* DAFTAR MAPEL AGAMA */}
                {agamaSubjects.map((subj, idx) => {
                  const scoreData: StudentScoreDetail | undefined =
                    subjectRecords[subj.id]?.scores[student.id];
                  const score = scoreData?.finalScore ?? scoreData?.stsScore ?? null;
                  const pred = getScorePredicate(score, config.passingGrade || 75);
                  const mastery = getMasteryStatusFromPredicate(pred);

                  return (
                    <tr key={subj.id} className="align-top" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
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
                          padding: '5px 8px',
                          fontWeight: 'normal',
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
                          padding: '5px 4px',
                          textAlign: 'center',
                          fontWeight: 'normal',
                          color: '#000000',
                        }}
                      >
                        {pred}
                      </td>
                      <td
                        style={{
                          border: '1px solid #000000',
                          padding: '5px 8px',
                          textAlign: 'left',
                          fontWeight: 'normal',
                          color: '#000000',
                        }}
                      >
                        {mastery}
                      </td>
                    </tr>
                  );
                })}

                {/* II. PENDIDIKAN UMUM */}
                <tr style={{ backgroundColor: YELLOW_BRIGHT_BG, fontWeight: 'bold', breakInside: 'avoid', pageBreakInside: 'avoid' }}>
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
                    colSpan={4}
                    style={{
                      border: '1px solid #000000',
                      padding: '4px 8px',
                      color: '#000000',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    PENDIDIKAN UMUM
                  </td>
                </tr>

                {/* DAFTAR MAPEL UMUM */}
                {umumSubjects.map((subj, idx) => {
                  const scoreData: StudentScoreDetail | undefined =
                    subjectRecords[subj.id]?.scores[student.id];
                  const score = scoreData?.finalScore ?? scoreData?.stsScore ?? null;
                  const pred = getScorePredicate(score, config.passingGrade || 75);
                  const mastery = getMasteryStatusFromPredicate(pred);

                  return (
                    <tr key={subj.id} className="align-top" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
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
                          padding: '5px 8px',
                          fontWeight: 'normal',
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
                          padding: '5px 4px',
                          textAlign: 'center',
                          fontWeight: 'normal',
                          color: '#000000',
                        }}
                      >
                        {pred}
                      </td>
                      <td
                        style={{
                          border: '1px solid #000000',
                          padding: '5px 8px',
                          textAlign: 'left',
                          fontWeight: 'normal',
                          color: '#000000',
                        }}
                      >
                        {mastery}
                      </td>
                    </tr>
                  );
                })}

                {/* III. MUATAN LOKAL */}
                {finalMulokSubjects.length > 0 && (
                  <>
                    <tr style={{ backgroundColor: YELLOW_BRIGHT_BG, fontWeight: 'bold', breakInside: 'avoid', pageBreakInside: 'avoid' }}>
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
                        colSpan={4}
                        style={{
                          border: '1px solid #000000',
                          padding: '4px 8px',
                          color: '#000000',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        MUATAN LOKAL
                      </td>
                    </tr>

                    {finalMulokSubjects.map((subj, idx) => {
                      const scoreData: StudentScoreDetail | undefined =
                        subjectRecords[subj.id]?.scores[student.id];
                      const score = scoreData?.finalScore ?? scoreData?.stsScore ?? null;
                      const pred = getScorePredicate(score, config.passingGrade || 75);
                      const mastery = getMasteryStatusFromPredicate(pred);

                      return (
                        <tr key={subj.id} className="align-top" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
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
                              padding: '5px 8px',
                              fontWeight: 'normal',
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
                              padding: '5px 4px',
                              textAlign: 'center',
                              fontWeight: 'normal',
                              color: '#000000',
                            }}
                          >
                            {pred}
                          </td>
                          <td
                            style={{
                              border: '1px solid #000000',
                              padding: '5px 8px',
                              textAlign: 'left',
                              fontWeight: 'normal',
                              color: '#000000',
                            }}
                          >
                            {mastery}
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
            <div className="catatan-guru-section mb-4" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
              <div className="text-xs font-bold text-black uppercase mb-1">
                CATATAN WALI KELAS:
              </div>
              <div
                style={{
                  border: '1px solid #000000',
                  padding: '6px 10px',
                  fontSize: '11px',
                  fontStyle: 'italic',
                  lineHeight: '1.45',
                }}
              >
                {displayNote}
              </div>
            </div>
          )}

          {/* TANDA TANGAN RESMI */}
          <div className="ttd-section pt-1 text-xs text-black" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
            <div className="grid grid-cols-2 gap-8 text-center mb-5">
              <div>
                {/* Spacer transparan agar teks Mengetahui sejajar vertikal dengan kolom kanan */}
                <p className="m-0 invisible select-none" aria-hidden="true">
                  {config.reportDatePlace || 'Depok, 20 Maret 2025'}
                </p>
                <p className="font-bold m-0 mb-12">Orang Tua / Wali Siswa</p>
                <p className="font-bold m-0">..................................................</p>
              </div>

              <div>
                {/* Posisi kota dan tanggal tepat berada di tengah atas teks Mengetahui */}
                <p className="m-0">
                  {config.reportDatePlace || 'Depok, 20 Maret 2025'}
                </p>
                <p className="font-bold m-0 mb-12">Guru Kelas,</p>
                <p className="font-bold underline m-0">
                  {formatPersonNameWithDegree(config.teacherName || 'Guru Kelas')}
                </p>
              </div>
            </div>

            <div className="text-center mb-4">
              <p className="m-0">Mengetahui,</p>
              <p className="font-bold m-0 mb-12">
                Kepala {config.schoolName || 'SDIT AL FIKRI'}
              </p>
              <p className="font-bold underline m-0">
                {formatPersonNameWithDegree(config.headmasterName || 'Kepala Sekolah')}
              </p>
            </div>
          </div>
          </div>

          {/* RUNNING FOOTER LEMBAR 1 (NAMA SISWA ITALIC & HALAMAN 1/2 DI PALING BAWAH HALAMAN) */}
          <div
            className="flex justify-between items-center text-[10px] text-gray-700 italic pt-2 border-t border-gray-400 mt-auto"
            style={{ fontFamily: BOOKMAN_FONT_FAMILY }}
          >
            <span>{student.name} • NISN: {formatNimNisn(student.nim, student.nisn)} • Kelas {activeClass} • {config.schoolName || 'SDIT AL FIKRI'}</span>
            <span className="font-semibold not-italic">
              {config.printOnlyPage1 ? 'Halaman 1/1' : 'Halaman 1/2'}
            </span>
          </div>
        </div>

        {!config.printOnlyPage1 && (
          <>
            {/* PEMBATAS VISUAL HALAMAN / PAGE BREAK PRINT */}
            <div className="page-break-after my-6 print:hidden border-b border-dashed border-gray-400 text-center relative">
              <span className="bg-slate-900 text-slate-400 px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider relative -top-3">
                Batas Halaman Cetak (Lembar 1 Selesai • Lanjut Lembar 2)
              </span>
            </div>

            {/* ============================================================
                LEMBAR 2: LAPORAN PENILAIAN KARAKTER (18 KARAKTER SISWA)
                (OPSI A: TANPA KOP AGAR 100% AMAN PAS 1 LEMBAR A4)
            ============================================================ */}
            <div
              className="rapor-page rapor-page-karakter bg-white text-black p-6 sm:p-8 mx-auto rounded-xl leading-normal print:p-0 print:m-0 print:border-none print:shadow-none flex flex-col justify-between"
              style={{
                fontFamily: BOOKMAN_FONT_FAMILY,
                backgroundColor: '#ffffff',
                color: '#000000',
                border: '1px solid #d1d5db',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                minHeight: paperSize === 'f4' ? '1120px' : '1050px',
              }}
            >
          {/* Top Main Content Container */}
          <div className="flex-1 flex flex-col justify-start">
            {/* JUDUL RESMI LEMBAR 2 */}
            <div className="text-center mb-6" style={{ fontFamily: BOOKMAN_FONT_FAMILY }}>
              <h2 className="text-[13.5px] font-bold uppercase tracking-wide text-black m-0 leading-tight" style={{ fontFamily: BOOKMAN_FONT_FAMILY }}>
                LAPORAN PENILAIAN KARAKTER
              </h2>
              <h3 className="text-[13.5px] font-bold uppercase tracking-wide text-black mt-1 mb-0 leading-tight" style={{ fontFamily: BOOKMAN_FONT_FAMILY }}>
                {semesterTitle}
              </h3>
              <h4 className="text-[13.5px] font-bold uppercase tracking-wide text-black mt-1 mb-0 leading-tight" style={{ fontFamily: BOOKMAN_FONT_FAMILY }}>
                TAHUN PELAJARAN {schoolYearTitle}
              </h4>
            </div>

          {/* IDENTITAS SISWA (SEJAJAR VERTIKAL PRESISI DENGAN LEMBAR 1) */}
          <div className="flex gap-x-6 text-xs mb-3 text-black font-normal" style={{ fontFamily: BOOKMAN_FONT_FAMILY }}>
            {/* Kolom Kiri: NAMA & TEMPAT, TANGGAL LAHIR */}
            <div className="flex-1 space-y-0.5 min-w-0 pr-2">
              <div className="flex items-start">
                <span className="w-44 font-normal shrink-0">NAMA</span>
                <span className="w-3 font-normal shrink-0">:</span>
                <span className="font-bold uppercase flex-1 truncate">{student.name}</span>
              </div>
              <div className="flex items-start">
                <span className="w-44 font-normal shrink-0">TEMPAT, TANGGAL LAHIR</span>
                <span className="w-3 font-normal shrink-0">:</span>
                <span className="font-normal flex-1">
                  {formatTTL(student.tempatLahir, student.tanggalLahir)}
                </span>
              </div>
            </div>

            {/* Kolom Kanan: NIM/NISN & KELAS (Lebar 290px konsisten) */}
            <div className="w-[290px] shrink-0 space-y-0.5">
              <div className="flex items-start">
                <span className="w-20 font-normal shrink-0">NIM/NISN</span>
                <span className="w-3 font-normal shrink-0">:</span>
                <span className="font-normal flex-1">
                  {formatNimNisn(student.nim, student.nisn)}
                </span>
              </div>
              <div className="flex items-start">
                <span className="w-20 font-normal shrink-0">KELAS</span>
                <span className="w-3 font-normal shrink-0">:</span>
                <span className="font-normal flex-1">{activeClass}</span>
              </div>
            </div>
          </div>

          {/* TABEL 18 ASPEK KARAKTER (NO, ASPEK KARAKTER, PREDIKAT, DESKRIPSI) */}
          <div className="mb-2">
            <table
              className="w-full text-xs text-black border-collapse"
              style={{
                borderCollapse: 'collapse',
                border: '1px solid #000000',
                width: '100%',
                fontFamily: BOOKMAN_FONT_FAMILY,
                pageBreakInside: 'auto',
              }}
            >
              <thead>
                <tr style={{ backgroundColor: YELLOW_BRIGHT_BG, breakInside: 'avoid', pageBreakInside: 'avoid' }}>
                  <th
                    style={{
                      border: '1px solid #000000',
                      padding: '4px 4px',
                      width: '32px',
                      textAlign: 'center',
                      fontWeight: 'bold',
                      color: '#000000',
                      fontFamily: BOOKMAN_FONT_FAMILY,
                    }}
                  >
                    NO
                  </th>
                  <th
                    style={{
                      border: '1px solid #000000',
                      padding: '4px 6px',
                      width: '175px',
                      textAlign: 'center',
                      fontWeight: 'bold',
                      color: '#000000',
                      fontFamily: BOOKMAN_FONT_FAMILY,
                    }}
                  >
                    ASPEK KARAKTER
                  </th>
                  <th
                    style={{
                      border: '1px solid #000000',
                      padding: '4px 4px',
                      width: '60px',
                      textAlign: 'center',
                      fontWeight: 'bold',
                      color: '#000000',
                      fontFamily: BOOKMAN_FONT_FAMILY,
                    }}
                  >
                    PREDIKAT
                  </th>
                  <th
                    style={{
                      border: '1px solid #000000',
                      padding: '4px 6px',
                      textAlign: 'center',
                      fontWeight: 'bold',
                      color: '#000000',
                      fontFamily: BOOKMAN_FONT_FAMILY,
                    }}
                  >
                    DESKRIPSI CAPAIAN PERKEMBANGAN
                  </th>
                </tr>
              </thead>

              <tbody>
                {activeDescriptors.map((desc, idx) => {
                  const charScore = studentCharRecord?.characterScores?.[desc.id];
                  const p = charScore?.predicate || '-';
                  const d =
                    charScore?.description ||
                    (charScore?.predicate ? desc.indicators[charScore.predicate] : '-');

                  return (
                    <tr key={desc.id} className="align-top" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
                      <td
                        style={{
                          border: '1px solid #000000',
                          padding: '3.5px 4px',
                          textAlign: 'center',
                          fontWeight: 'normal',
                          fontFamily: BOOKMAN_FONT_FAMILY,
                        }}
                      >
                        {idx + 1}.
                      </td>
                      <td
                        style={{
                          border: '1px solid #000000',
                          padding: '3.5px 6px',
                          fontWeight: 'normal',
                          color: '#000000',
                          fontFamily: BOOKMAN_FONT_FAMILY,
                        }}
                      >
                        {desc.name}
                      </td>
                      <td
                        style={{
                          border: '1px solid #000000',
                          padding: '3.5px 4px',
                          textAlign: 'center',
                          fontWeight: 'normal',
                          color: '#000000',
                          fontFamily: BOOKMAN_FONT_FAMILY,
                        }}
                      >
                        {p}
                      </td>
                      <td
                        style={{
                          border: '1px solid #000000',
                          padding: '3.5px 6px',
                          fontSize: '9.5px',
                          lineHeight: '1.35',
                          textAlign: 'justify',
                          color: '#000000',
                          fontWeight: 'normal',
                          fontFamily: BOOKMAN_FONT_FAMILY,
                        }}
                      >
                        {d}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* KOTAK KETERANGAN PREDIKAT */}
          <div
            style={{
              border: '1px solid #000000',
              backgroundColor: '#FEF9C3',
              padding: '3px 8px',
              marginBottom: '4px',
              fontSize: '9.5px',
              color: '#000000',
              fontFamily: BOOKMAN_FONT_FAMILY,
            }}
          >
            <strong>Keterangan Predikat: </strong>
            <span>[A] Sangat Baik</span> &nbsp;•&nbsp; <span>[B] Baik</span> &nbsp;•&nbsp; <span>[C] Cukup</span> &nbsp;•&nbsp; <span>[D] Perlu Bimbingan</span>
          </div>

          {/* CATATAN PERKEMBANGAN KARAKTER WALI KELAS */}
          {studentCharRecord?.teacherNote && (
            <div
              style={{
                border: '1px solid #000000',
                padding: '3px 8px',
                marginBottom: '5px',
                fontSize: '10px',
                color: '#000000',
                fontFamily: BOOKMAN_FONT_FAMILY,
              }}
            >
              <strong>Catatan Perkembangan Karakter: </strong>
              <span style={{ fontStyle: 'italic' }}>{studentCharRecord.teacherNote}</span>
            </div>
          )}

          {/* TANDA TANGAN RESMI LEMBAR 2 */}
          <div className="ttd-section pt-1 text-xs text-black" style={{ breakInside: 'avoid', pageBreakInside: 'avoid', fontFamily: BOOKMAN_FONT_FAMILY }}>
            <div className="grid grid-cols-2 gap-8 text-center mb-5">
              <div>
                {/* Spacer transparan agar teks Mengetahui sejajar vertikal dengan kolom kanan */}
                <p className="m-0 invisible select-none" aria-hidden="true" style={{ fontFamily: BOOKMAN_FONT_FAMILY }}>
                  {config.reportDatePlace || 'Depok, 20 Maret 2025'}
                </p>
                <p className="font-bold m-0 mb-12" style={{ fontFamily: BOOKMAN_FONT_FAMILY }}>Orang Tua / Wali Siswa</p>
                <p className="font-bold m-0" style={{ fontFamily: BOOKMAN_FONT_FAMILY }}>..................................................</p>
              </div>

              <div>
                {/* Posisi kota dan tanggal tepat berada di tengah atas teks Mengetahui */}
                <p className="m-0" style={{ fontFamily: BOOKMAN_FONT_FAMILY }}>
                  {config.reportDatePlace || 'Depok, 20 Maret 2025'}
                </p>
                <p className="font-bold m-0 mb-12" style={{ fontFamily: BOOKMAN_FONT_FAMILY }}>Guru Kelas,</p>
                <p className="font-bold underline m-0" style={{ fontFamily: BOOKMAN_FONT_FAMILY }}>
                  {formatPersonNameWithDegree(config.teacherName || 'Guru Kelas')}
                </p>
              </div>
            </div>

            <div className="text-center mb-4">
              <p className="m-0" style={{ fontFamily: BOOKMAN_FONT_FAMILY }}>Mengetahui,</p>
              <p className="font-bold m-0 mb-12" style={{ fontFamily: BOOKMAN_FONT_FAMILY }}>
                Kepala {config.schoolName || 'SDIT AL FIKRI'}
              </p>
              <p className="font-bold underline m-0" style={{ fontFamily: BOOKMAN_FONT_FAMILY }}>
                {formatPersonNameWithDegree(config.headmasterName || 'Kepala Sekolah')}
              </p>
            </div>
          </div>
          </div>

          {/* RUNNING FOOTER LEMBAR 2 (NAMA SISWA ITALIC & HALAMAN 2/2 DI PALING BAWAH HALAMAN) */}
          <div
            className="flex justify-between items-center text-[10px] text-gray-700 italic pt-2 border-t border-gray-400 mt-auto"
            style={{ fontFamily: BOOKMAN_FONT_FAMILY }}
          >
            <span>{student.name} • NISN: {formatNimNisn(student.nim, student.nisn)} • Kelas {activeClass} • {config.schoolName || 'SDIT AL FIKRI'}</span>
            <span className="font-semibold not-italic">Halaman 2/2</span>
          </div>
        </div>
      </>
    )}
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

        {/* Action Controls: Export Scope + Paper Size + Kop Toggle + 3 Symbol Export Buttons + Print */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Pilihan Kertas: A4 vs F4 / Folio */}
          <div className="flex items-center bg-slate-950/80 p-1 rounded-xl border border-slate-800" title="Pilih Ukuran Kertas Cetak">
            <button
              type="button"
              onClick={() => setPaperSize('a4')}
              disabled={isGeneratingPdf}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                paperSize === 'a4'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Kertas A4 (210 × 297 mm)"
            >
              A4
            </button>
            <button
              type="button"
              onClick={() => setPaperSize('f4')}
              disabled={isGeneratingPdf}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                paperSize === 'f4'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Kertas F4 / Folio (215 × 330 mm) - Sangat cocok untuk deskripsi capaian pembelajaran yang panjang"
            >
              F4 / Folio
            </button>
          </div>

          {/* Toggle Kop Surat Resmi */}
          <button
            type="button"
            onClick={() => setIncludeKopSekolah(!includeKopSekolah)}
            disabled={isGeneratingPdf}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              includeKopSekolah
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Tampilkan Kop Resmi Sekolah (Nama Sekolah, NPSN, & Alamat)"
          >
            {includeKopSekolah ? '✓ Kop Resmi' : '+ Kop Resmi'}
          </button>

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
          size: ${paperSize === 'f4' ? '215mm 330mm' : 'A4 portrait'};
          margin: 10mm 10mm 10mm 10mm;
        }
        @media print {
          html, body, #root {
            background-color: #ffffff !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            min-height: auto !important;
            overflow: visible !important;
          }
          header, aside, nav, .print\\:hidden {
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
          .catatan-guru-section, .ttd-section {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .rapor-page,
          .rapor-page-akademik,
          .rapor-page-karakter {
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            min-height: ${paperSize === 'f4' ? '308mm' : '276mm'} !important;
            height: ${paperSize === 'f4' ? '308mm' : '276mm'} !important;
            border: none !important;
            outline: none !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            margin: 0 auto !important;
            padding: 0 !important;
            max-width: none !important;
            width: 100% !important;
            box-sizing: border-box !important;
          }
          .rapor-student-bundle,
          .rapor-sheet {
            display: block !important;
            border: none !important;
            box-shadow: none !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
};
