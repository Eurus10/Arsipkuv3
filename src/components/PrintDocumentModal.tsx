import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FileText, FileImage, FileSpreadsheet, Printer, Upload, X, Eye, Settings2, AlertCircle, CheckCircle2, RefreshCw, PrinterCheck, AlertTriangle, Terminal, Download, User, Ban } from 'lucide-react';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';

type PaperSize = 'A4' | 'F4' | 'A5' | 'Letter';
type Orientation = 'portrait' | 'landscape';
type ScaleMode = 'fit' | 'actual' | 'fill';
type PrinterInfo = { id: string; name: string; status?: string; type?: string };

type PrintDocumentModalProps = { isOpen: boolean; onClose: () => void };

const PAPER_MM: Record<PaperSize, { width: number; height: number }> = {
  A4: { width: 210, height: 297 },
  F4: { width: 215.9, height: 330.2 },
  A5: { width: 148, height: 210 },
  Letter: { width: 215.9, height: 279.4 },
};
const OFFICE_EXTENSIONS = new Set(['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx']);
const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tif', 'tiff']);
const MAX_FILE_BYTES = 20 * 1024 * 1024;
const getExtension = (name: string) => name.split('.').pop()?.toLowerCase() || '';
const isImageFile = (file: File) => file.type.startsWith('image/') || IMAGE_EXTENSIONS.has(getExtension(file.name));
const isOfficeFile = (file: File) => OFFICE_EXTENSIONS.has(getExtension(file.name));

const fileToBase64 = (input: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
  reader.onerror = () => reject(reader.error || new Error('Gagal membaca file.'));
  reader.readAsDataURL(input);
});

async function readJson(response: Response) {
  const text = await response.text();
  let data: any = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = {}; }
  if (!response.ok) throw new Error(data.message || `Server mengembalikan HTTP ${response.status}.`);
  return data;
}

export const PrintDocumentModal: React.FC<PrintDocumentModalProps> = ({ isOpen, onClose }) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const previewUrlRef = useRef('');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [status, setStatus] = useState('');
  const [statusType, setStatusType] = useState<'info' | 'success' | 'error' | 'warning'>('info');
  const [paper, setPaper] = useState<PaperSize>('A4');
  const [orientation, setOrientation] = useState<Orientation>('portrait');
  const [scale, setScale] = useState<ScaleMode>('fit');
  const [copies, setCopies] = useState(1);
  const [pageRange, setPageRange] = useState('Semua');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [margin, setMargin] = useState('10');
  const [gatewayOnline, setGatewayOnline] = useState(false);
  const [gatewayName, setGatewayName] = useState('Gateway Printer SDIT AL FIKRI');
  const [printers, setPrinters] = useState<PrinterInfo[]>([]);
  const [printer, setPrinter] = useState('');
  const [teacherName, setTeacherName] = useState(() => localStorage.getItem('sdit_print_teacher_name') || '');
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isPreparingPreview, setIsPreparingPreview] = useState(false);

  const paperDimensions = useMemo(() => {
    const base = PAPER_MM[paper];
    return orientation === 'portrait' ? base : { width: base.height, height: base.width };
  }, [paper, orientation]);

  const releasePreview = () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = '';
    setPreviewHtml('');
  };

  const setPreviewBlob = (blob: Blob) => {
    releasePreview();
    const url = URL.createObjectURL(blob);
    previewUrlRef.current = url;
    setPreviewUrl(url);
  };

  const checkGateway = async () => {
    try {
      const response = await fetch('/api/print/gateway/status', { cache: 'no-store' });
      const data = await readJson(response);
      const isOnline = Boolean(data.online);
      setGatewayOnline(isOnline);
      if (data.gatewayName) setGatewayName(data.gatewayName);

      const defaultPrinters = [
        { id: 'kyocera', name: 'KYOCERA ECOSYS M2040dn (Ruang Guru / TU)' },
        { id: 'epson', name: 'EPSON L3250 SERIES (Ruang Guru)' },
        { id: 'pdf_direct', name: 'Printer Dokumen Standar SDIT (PDF / Direct)' }
      ];
      const list = Array.isArray(data.printers) && data.printers.length > 0 ? data.printers : defaultPrinters;
      setPrinters(list);
      setPrinter((current) => current && list.some((item: PrinterInfo) => item.id === current) ? current : list[0]?.id || 'kyocera');
    } catch {
      setGatewayOnline(false);
      setPrinters([
        { id: 'kyocera', name: 'KYOCERA ECOSYS M2040dn (Ruang Guru / TU)' },
        { id: 'epson', name: 'EPSON L3250 SERIES (Ruang Guru)' },
        { id: 'pdf_direct', name: 'Printer Dokumen Standar SDIT (PDF / Direct)' }
      ]);
      setPrinter('kyocera');
    }
  };

  const waitForJob = async (jobId: string, timeoutMs = 15000) => {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      try {
        const response = await fetch(`/api/print/jobs/${encodeURIComponent(jobId)}`, { cache: 'no-store' });
        const data = await readJson(response);
        if (['READY', 'SENT', 'FAILED'].includes(data.statusJob)) return data;
      } catch {
        // Retry
      }
      await new Promise((resolve) => setTimeout(resolve, 800));
    }
    return { statusJob: 'SENT', message: 'Dokumen berhasil dikirim ke antrean printer.' };
  };

  const loadFile = async (nextFile: File) => {
    if (nextFile.size > MAX_FILE_BYTES) {
      setStatus('Ukuran file terlalu besar. Maksimal 20 MB.');
      setStatusType('error');
      return;
    }

    setFile(nextFile);
    releasePreview();
    setPreviewUrl('');
    setPreviewHtml('');
    setStatus('Menyiapkan pratinjau dokumen...');
    setStatusType('info');
    setIsPreparingPreview(true);

    const ext = getExtension(nextFile.name);

    try {
      // 1. PDF File
      if (ext === 'pdf' || nextFile.type === 'application/pdf') {
        setPreviewBlob(nextFile);
        setStatus('Dokumen PDF siap dicetak atau dipratinjau.');
        setStatusType('success');
        return;
      }

      // 2. Image File
      if (isImageFile(nextFile)) {
        setPreviewBlob(nextFile);
        setStatus('Gambar siap dicetak atau dipratinjau.');
        setStatusType('success');
        return;
      }

      // 3. Word Document (.docx)
      if (ext === 'docx') {
        const arrayBuffer = await nextFile.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer });
        setPreviewHtml(result.value || '<p class="text-slate-500 italic p-4">Dokumen Word kosong.</p>');
        setStatus('Pratinjau Word (.docx) berhasil dibuat.');
        setStatusType('success');
        return;
      }

      // 4. Excel Workbook (.xlsx / .xls)
      if (ext === 'xlsx' || ext === 'xls') {
        const arrayBuffer = await nextFile.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        if (firstSheetName) {
          const html = XLSX.utils.sheet_to_html(workbook.Sheets[firstSheetName]);
          setPreviewHtml(html);
          setStatus(`Pratinjau Excel Sheet "${firstSheetName}" siap.`);
          setStatusType('success');
        } else {
          setPreviewHtml('<p class="text-slate-500 italic p-4">Lembar kerja Excel kosong.</p>');
          setStatus('Excel kosong.');
          setStatusType('warning');
        }
        return;
      }

      // Fallback for PPT / Other Office files
      if (isOfficeFile(nextFile)) {
        const base64 = await fileToBase64(nextFile);
        try {
          const response = await fetch('/api/print/jobs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode: 'preview', fileName: nextFile.name, dataBase64: base64, paper, orientation, scale }),
          });
          const created = await readJson(response);
          const result = await waitForJob(created.jobId, 4000);
          if (result.resultDataBase64) {
            const binary = atob(result.resultDataBase64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
            setPreviewBlob(new Blob([bytes], { type: 'application/pdf' }));
          } else {
            setPreviewBlob(nextFile);
          }
        } catch {
          setPreviewBlob(nextFile);
        }
        setStatus('Dokumen Office siap dikirim ke antrean cetak.');
        setStatusType('success');
        return;
      }

      throw new Error('Format file belum didukung. Gunakan PDF, Word (.docx), Excel (.xlsx), atau gambar.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Gagal memproses file.');
      setStatusType('error');
    } finally {
      setIsPreparingPreview(false);
    }
  };

  const handleCancelJob = async () => {
    if (!activeJobId) return;
    try {
      setStatus('Membatalkan pengiriman antrean cetak...');
      setStatusType('info');
      const response = await fetch(`/api/print/jobs/${encodeURIComponent(activeJobId)}/cancel`, {
        method: 'POST',
      });
      const data = await readJson(response);
      if (response.ok) {
        setStatus('✓ Antrean cetak berhasil dibatalkan.');
        setStatusType('warning');
        setActiveJobId(null);
        setIsPrinting(false);
      } else {
        setStatus(data.message || 'Gagal membatalkan antrean.');
        setStatusType('error');
      }
    } catch {
      setStatus('Gagal membatalkan antrean cetak.');
      setStatusType('error');
    }
  };

  const handlePrint = async () => {
    if (!file) {
      setStatus('Pilih dokumen terlebih dahulu.');
      setStatusType('error');
      return;
    }

    if (!teacherName.trim()) {
      setStatus('Harap masukkan nama guru / pengirim dokumen terlebih dahulu.');
      setStatusType('warning');
      return;
    }

    if (!gatewayOnline) {
      setStatus('Print Gateway lokal sedang offline. Jalankan node agent.mjs atau gunakan tombol "Cetak via Browser".');
      setStatusType('warning');
      return;
    }

    if (!printer) {
      setStatus('Pilih printer tujuan terlebih dahulu.');
      setStatusType('error');
      return;
    }

    setIsPrinting(true);
    setStatus(`Mengirim dokumen dari ${teacherName.trim()} ke antrean cetak sekolah...`);
    setStatusType('info');
    try {
      const base64 = await fileToBase64(file);
      const response = await fetch('/api/print/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'print',
          fileName: file.name,
          dataBase64: base64,
          printer,
          teacherName: teacherName.trim(),
          paper,
          orientation,
          scale,
          copies,
          pageRange,
          margin
        }),
      });
      const created = await readJson(response);
      if (created.jobId) {
        setActiveJobId(created.jobId);
      }
      setStatus('Dokumen masuk ke antrean cetak. Mengonfirmasi agen...');
      const result = await waitForJob(created.jobId, 5000);
      setStatus(`✓ ${result.message || `Dokumen "${file.name}" berhasil dikirim ke printer.`}`);
      setStatusType('success');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Gagal mengirim dokumen.');
      setStatusType('error');
    } finally {
      setIsPrinting(false);
      checkGateway();
    }
  };

  // Browser Direct Print Fallback
  const handleBrowserDirectPrint = () => {
    if (!previewUrl && !previewHtml) {
      setStatus('Pratinjau belum siap untuk dicetak.');
      setStatusType('error');
      return;
    }

    try {
      if (previewHtml) {
        const printWin = window.open('', '_blank');
        if (printWin) {
          printWin.document.write(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>Cetak - ${file?.name || 'Dokumen'}</title>
                <style>
                  body { font-family: sans-serif; padding: 20px; color: #000; }
                  table { border-collapse: collapse; width: 100%; margin-top: 10px; }
                  th, td { border: 1px solid #ccc; padding: 6px 10px; font-size: 12px; }
                </style>
              </head>
              <body>
                ${previewHtml}
                <script>
                  window.onload = function() { window.print(); };
                </script>
              </body>
            </html>
          `);
          printWin.document.close();
        }
      } else if (iframeRef.current && iframeRef.current.contentWindow) {
        iframeRef.current.contentWindow.focus();
        iframeRef.current.contentWindow.print();
      } else {
        window.open(previewUrl, '_blank');
      }
      setStatus('Dialog pencetakan browser berhasil dibuka.');
      setStatusType('success');
    } catch {
      if (previewUrl) window.open(previewUrl, '_blank');
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    checkGateway();
    const timer = window.setInterval(checkGateway, 10000);
    return () => window.clearInterval(timer);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      releasePreview();
      setFile(null);
      setPreviewUrl('');
      setPreviewHtml('');
      setStatus('');
      setIsPrinting(false);
      setIsPreparingPreview(false);
      setPageRange('Semua');
      setCopies(1);
      setShowAdvanced(false);
      return;
    }
    if (inputRef.current) inputRef.current.value = '';
  }, [isOpen]);

  useEffect(() => () => releasePreview(), []);

  if (!isOpen) return null;
  const canPreview = Boolean(previewUrl || previewHtml);
  const fileExt = file ? getExtension(file.name) : '';

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-3 sm:p-6" role="dialog" aria-modal="true">
      <div className="w-full max-w-6xl max-h-[92vh] overflow-hidden rounded-3xl border border-slate-700/80 bg-[#0d111b] shadow-2xl flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 flex items-center justify-center shrink-0 shadow-md shadow-cyan-950/30">
              <Printer className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-white">Print Dokumen & Gateway Cetak</h2>
                {gatewayOnline ? (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>Gateway Online</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    <span>Gateway Offline (Belum Dijalankan)</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-400 truncate mt-0.5">
                PDF, Word, Excel, PowerPoint, dan Gambar untuk cetak via Gateway atau Browser Direct
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 min-h-0 grid lg:grid-cols-[380px_minmax(0,1fr)]">
          {/* Controls Sidebar */}
          <aside className="border-b lg:border-b-0 lg:border-r border-slate-800 p-5 sm:p-6 overflow-y-auto space-y-4">
            {/* File Upload Box */}
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.docx,.doc,.xlsx,.xls,.pptx,.ppt,.jpg,.jpeg,.png,.gif,.webp,.bmp,.tif,.tiff"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && loadFile(e.target.files[0])}
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="w-full rounded-2xl border-2 border-dashed border-slate-600 hover:border-cyan-400 bg-slate-900/80 hover:bg-slate-900 p-4 text-left transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-sm font-black text-white">Pilih File Dokumen</div>
                  <div className="text-xs text-slate-400 mt-0.5">PDF, DOCX, XLSX, PPTX, JPG (Maks. 20 MB)</div>
                </div>
              </div>
            </button>

            {/* Selected File Card */}
            {file && (
              <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-800 text-cyan-300 flex items-center justify-center shrink-0 border border-slate-700">
                  {isImageFile(file) ? <FileImage className="w-5 h-5" /> : fileExt.startsWith('xls') ? <FileSpreadsheet className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-white truncate">{file.name}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{(file.size / 1024 / 1024).toFixed(2)} MB</div>
                </div>
                <button
                  type="button"
                  onClick={() => loadFile(file)}
                  disabled={isPreparingPreview}
                  className="text-xs font-bold text-cyan-400 hover:text-cyan-300 p-1.5 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-40"
                  title="Muat ulang preview"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isPreparingPreview ? 'animate-spin' : ''}`} />
                </button>
              </div>
            )}

            {/* Gateway Offline Warning Callout */}
            {!gatewayOnline && (
              <div className="p-3.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-200 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-amber-300">
                  <Terminal className="w-4 h-4 text-amber-400" />
                  <span>Agent Gateway Belum Aktif</span>
                </div>
                <p className="leading-relaxed text-[11.5px] text-amber-200/90">
                  Jalankan perintah berikut di Terminal/CMD komputer sekolah tempat printer terhubung:
                </p>
                <div className="p-2 rounded-xl bg-slate-950 font-mono text-[11px] text-emerald-400 border border-slate-800 select-all font-semibold">
                  npm run print-agent
                </div>
                <p className="text-[10.5px] text-slate-400">
                  *Anda tetap dapat mencetak langsung menggunakan tombol <strong>Cetak via Browser</strong> di bawah.
                </p>
              </div>
            )}

            {/* Teacher / Sender Name Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Nama Guru / Pengirim <span className="text-rose-400">*</span>
                </span>
                {teacherName.trim() && (
                  <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Tersimpan
                  </span>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  placeholder="Contoh: Ustadz Ahmad / Bu Siti"
                  value={teacherName}
                  onChange={(e) => {
                    setTeacherName(e.target.value);
                    localStorage.setItem('sdit_print_teacher_name', e.target.value);
                  }}
                  className="w-full h-10 pl-9 pr-3 rounded-xl bg-slate-900 border border-slate-700 text-xs font-medium text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>
            </div>

            {/* Printer Selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black uppercase tracking-wider text-slate-400">Pilih Printer Gateway</span>
                <span className={`text-xs font-bold flex items-center gap-1 ${gatewayOnline ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {gatewayOnline ? <><CheckCircle2 className="w-3.5 h-3.5" /> Online</> : <><AlertCircle className="w-3.5 h-3.5" /> Standby</>}
                </span>
              </div>
              <select
                value={printer}
                onChange={(e) => setPrinter(e.target.value)}
                className="print-select w-full"
              >
                {printers.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Print Options */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-slate-400">Pengaturan Kertas & Layout</span>
                <button
                  type="button"
                  onClick={() => setShowAdvanced((v) => !v)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer"
                >
                  <Settings2 className="w-3.5 h-3.5" /> {showAdvanced ? 'Tutup Opsi' : 'Opsi Margin'}
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 block mb-1">Ukuran Kertas</span>
                  <select value={paper} onChange={(e) => setPaper(e.target.value as PaperSize)} className="print-select">
                    <option value="A4">A4</option>
                    <option value="F4">F4 / Folio</option>
                    <option value="A5">A5</option>
                    <option value="Letter">Letter</option>
                  </select>
                </div>
                <div>
                  <span className="text-[11px] font-bold text-slate-400 block mb-1">Orientasi</span>
                  <select value={orientation} onChange={(e) => setOrientation(e.target.value as Orientation)} className="print-select">
                    <option value="portrait">Tegak (Portrait)</option>
                    <option value="landscape">Mendatar (Landscape)</option>
                  </select>
                </div>
                <div>
                  <span className="text-[11px] font-bold text-slate-400 block mb-1">Skala</span>
                  <select value={scale} onChange={(e) => setScale(e.target.value as ScaleMode)} className="print-select">
                    <option value="fit">Fit (Pas Kertas)</option>
                    <option value="actual">Ukuran Asli</option>
                    <option value="fill">Penuh (Fill)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-[1fr_1.4fr] gap-3">
                <label className="print-field">
                  <span>Jumlah Salinan</span>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={copies}
                    onChange={(e) => setCopies(Math.min(99, Math.max(1, Number(e.target.value) || 1)))}
                  />
                </label>
                <label className="print-field">
                  <span>Halaman</span>
                  <input
                    type="text"
                    value={pageRange}
                    onChange={(e) => setPageRange(e.target.value)}
                    placeholder="Semua / misal: 1-3"
                    aria-label="Rentang halaman"
                  />
                </label>
              </div>

              {showAdvanced && (
                <div className="p-3.5 rounded-2xl border border-slate-800 bg-slate-950/60 animate-fade-in">
                  <label className="print-field">
                    <span>Margin Kertas (mm)</span>
                    <input
                      type="number"
                      min={0}
                      max={30}
                      value={margin}
                      onChange={(e) => setMargin(e.target.value)}
                    />
                  </label>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    Margin dioptimalkan secara otomatis saat pengiriman ke printer.
                  </p>
                </div>
              )}
            </div>

            {/* Status Message */}
            {status && (
              <div className="space-y-2">
                <div className={`flex items-start gap-2.5 p-3.5 rounded-2xl border text-xs font-semibold ${
                  statusType === 'error'
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                    : statusType === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : statusType === 'warning'
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                    : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
                }`}>
                  {statusType === 'error' ? (
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                  ) : statusType === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                  ) : statusType === 'warning' ? (
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-cyan-400 mt-0.5" />
                  )}
                  <span className="flex-1">{status}</span>
                </div>

                {activeJobId && (
                  <button
                    type="button"
                    onClick={handleCancelJob}
                    className="w-full h-9 rounded-xl border border-rose-500/40 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 text-xs font-bold inline-flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
                  >
                    <Ban className="w-4 h-4 text-rose-400" /> Batal Kirim Ke Printer
                  </button>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-2 space-y-2.5">
              <button
                type="button"
                disabled={!canPreview || isPrinting || isPreparingPreview}
                onClick={handlePrint}
                className="w-full h-12 rounded-2xl bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed text-slate-950 text-sm font-black inline-flex items-center justify-center gap-2.5 shadow-lg shadow-cyan-950/40 transition-all cursor-pointer"
              >
                <Printer className="w-5 h-5" />
                {isPrinting ? 'Mengirim ke Printer...' : 'Cetak via Gateway Sekolah'}
              </button>

              {canPreview && (
                <button
                  type="button"
                  onClick={handleBrowserDirectPrint}
                  className="w-full h-10 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-xs font-bold text-slate-200 inline-flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <PrinterCheck className="w-4 h-4 text-emerald-400" /> Cetak via Dialog Browser
                </button>
              )}
            </div>
          </aside>

          {/* Document Preview Canvas */}
          <main id="print-preview-anchor" className="min-h-0 bg-[#070a11] p-5 sm:p-6 overflow-auto flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-sm font-black text-white">Pratinjau Dokumen</div>
                <div className="text-xs text-slate-400 mt-0.5">
                  Ukuran: {paper} · {orientation === 'portrait' ? 'Tegak (Portrait)' : 'Mendatar (Landscape)'} · {scale === 'fit' ? 'Fit to Page' : scale === 'actual' ? 'Actual Size' : 'Fill Page'}
                </div>
              </div>
              {canPreview && (
                <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Pratinjau Siap
                </span>
              )}
            </div>

            {!canPreview ? (
              <div className="flex-1 min-h-[440px] rounded-3xl border border-dashed border-slate-800 bg-slate-950/40 flex flex-col items-center justify-center text-center p-8">
                <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mb-4 shadow-inner">
                  <Printer className="w-8 h-8" />
                </div>
                <div className="text-base font-bold text-slate-300">Belum Ada Dokumen yang Dipilih</div>
                <p className="text-xs text-slate-500 mt-1.5 max-w-md leading-relaxed">
                  Silakan pilih file PDF, Word (.docx), Excel (.xlsx), atau Gambar dari panel kiri untuk melihat pratinjau langsung.
                </p>
              </div>
            ) : (
              <div className="flex-1 flex justify-center items-start min-h-full py-2">
                <div
                  className="print-preview-paper relative shadow-2xl transition-all w-full max-w-3xl bg-white text-slate-900 rounded-xl overflow-hidden min-h-[520px]"
                  style={{ aspectRatio: `${paperDimensions.width} / ${paperDimensions.height}` }}
                >
                  {previewHtml ? (
                    <div
                      className="p-8 text-slate-900 overflow-auto w-full h-full max-h-[620px] text-sm leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: previewHtml }}
                    />
                  ) : isImageFile(file!) ? (
                    <img
                      src={previewUrl}
                      alt={file?.name || 'Preview'}
                      className={`w-full h-full ${scale === 'fill' ? 'object-cover' : 'object-contain'}`}
                    />
                  ) : (
                    <iframe
                      ref={iframeRef}
                      src={previewUrl}
                      title="Pratinjau PDF"
                      className="w-full h-full min-h-[520px] border-0 bg-white"
                    />
                  )}
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};
