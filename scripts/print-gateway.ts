import fs from 'fs';
import path from 'path';
import os from 'os';
import { exec, execFile } from 'child_process';
import { promisify } from 'util';
import http from 'http';
import https from 'https';

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);

// ==========================================
// 1. CONFIGURATION LOADING
// ==========================================
interface GatewayConfig {
  serverUrl: string;
  gatewaySecret?: string;
  pollIntervalMs: number;
  heartbeatIntervalMs: number;
  printers: {
    kyocera: {
      enabled: boolean;
      windowsPrinterName: string;
      sumatraPdfPath?: string;
    };
    epson: {
      enabled: boolean;
      mode: 'email_print' | 'windows_driver';
      windowsPrinterName?: string;
      printerEmail?: string;
      smtp?: {
        host: string;
        port: number;
        secure: boolean;
        auth: {
          user: string;
          pass: string;
        };
        fromName?: string;
      };
    };
  };
  libreOfficePath?: string;
}

const DEFAULT_CONFIG: GatewayConfig = {
  serverUrl: process.env.PRINT_SERVER_URL || 'http://localhost:3000',
  gatewaySecret: process.env.PRINT_GATEWAY_SECRET || 'sdit-print-gateway-key-2026',
  pollIntervalMs: 2500,
  heartbeatIntervalMs: 6000,
  printers: {
    kyocera: {
      enabled: true,
      windowsPrinterName: process.env.KYOCERA_PRINTER_NAME || 'KYOCERA ECOSYS M2040dn',
      sumatraPdfPath: 'C:\\Program Files\\SumatraPDF\\SumatraPDF.exe',
    },
    epson: {
      enabled: true,
      mode: 'windows_driver', // or 'email_print' if printerEmail & smtp configured
      windowsPrinterName: process.env.EPSON_PRINTER_NAME || 'EPSON L3250 Series',
      printerEmail: process.env.EPSON_PRINTER_EMAIL || '',
    },
  },
  libreOfficePath: 'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
};

function loadConfig(): GatewayConfig {
  const configFile = path.join(process.cwd(), 'scripts', 'print-gateway.config.json');
  if (fs.existsSync(configFile)) {
    try {
      const raw = fs.readFileSync(configFile, 'utf-8');
      const parsed = JSON.parse(raw);
      console.log('✓ Memuat konfigurasi lokal dari scripts/print-gateway.config.json');
      return { ...DEFAULT_CONFIG, ...parsed, printers: { ...DEFAULT_CONFIG.printers, ...parsed.printers } };
    } catch (err: any) {
      console.warn('⚠️ Gagal membaca config.json, menggunakan konfigurasi default:', err.message);
    }
  }
  return DEFAULT_CONFIG;
}

const config = loadConfig();

// Spool directory
const SPOOL_DIR = path.join(process.cwd(), '.print-spool');
if (!fs.existsSync(SPOOL_DIR)) {
  fs.mkdirSync(SPOOL_DIR, { recursive: true });
}

// ==========================================
// 2. DETECT LOCAL ENVIRONMENT & TOOLS
// ==========================================
let detectedLibreOffice: string | null = null;
let detectedSumatraPdf: string | null = null;
let detectedWindowsPrinters: string[] = [];

async function detectTools() {
  const isWin = process.platform === 'win32';

  // 1. Detect LibreOffice
  const librePaths = [
    config.libreOfficePath,
    'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
    'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe',
    '/usr/bin/libreoffice',
    '/usr/bin/soffice',
    '/Applications/LibreOffice.app/Contents/MacOS/soffice',
  ].filter(Boolean) as string[];

  for (const p of librePaths) {
    if (fs.existsSync(p)) {
      detectedLibreOffice = p;
      break;
    }
  }

  // 2. Detect SumatraPDF
  const sumatraPaths = [
    config.printers.kyocera.sumatraPdfPath,
    'C:\\Program Files\\SumatraPDF\\SumatraPDF.exe',
    'C:\\Program Files (x86)\\SumatraPDF\\SumatraPDF.exe',
    path.join(os.homedir(), 'AppData', 'Local', 'SumatraPDF', 'SumatraPDF.exe'),
  ].filter(Boolean) as string[];

  for (const p of sumatraPaths) {
    if (fs.existsSync(p)) {
      detectedSumatraPdf = p;
      break;
    }
  }

  // 3. Detect Windows Installed Printers
  if (isWin) {
    try {
      const { stdout } = await execAsync(
        'powershell.exe -NoProfile -Command "Get-CimInstance Win32_Printer | Select-Object -ExpandProperty Name"'
      );
      detectedWindowsPrinters = stdout
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean);
    } catch {
      try {
        const { stdout } = await execAsync('wmic printer get name');
        detectedWindowsPrinters = stdout
          .split(/\r?\n/)
          .map((s) => s.trim())
          .filter((s) => s && s.toLowerCase() !== 'name');
      } catch {
        // fallback
      }
    }
  }

  console.log('--------------------------------------------------');
  console.log('🤖 SDIT AL FIKRI - PRINT GATEWAY (LAPTOP SERVICE)');
  console.log('--------------------------------------------------');
  console.log(`Server URL          : ${config.serverUrl}`);
  console.log(`LibreOffice Headless: ${detectedLibreOffice ? `✓ Terdeteksi (${detectedLibreOffice})` : '✗ Belum ditemukan (diperlukan untuk Office -> PDF)'}`);
  console.log(`SumatraPDF Engine   : ${detectedSumatraPdf ? `✓ Terdeteksi (${detectedSumatraPdf})` : '✗ Tidak ada (menggunakan Windows Print API)'}`);
  console.log(`Printer Windows     : ${detectedWindowsPrinters.length > 0 ? detectedWindowsPrinters.join(', ') : 'Belum terdeteksi atau non-Windows'}`);
  console.log('--------------------------------------------------');
}

// Determine active printer list to announce to Web App
function getAnnouncedPrinters() {
  const list: Array<{ id: string; name: string; type: string; status: string; isDefault?: boolean }> = [];

  // Kyocera
  const kyoceraFound = detectedWindowsPrinters.find((p) =>
    p.toLowerCase().includes('kyocera') || p.toLowerCase().includes('m2040')
  ) || config.printers.kyocera.windowsPrinterName;

  list.push({
    id: 'KYOCERA ECOSYS M2040dn',
    name: kyoceraFound,
    type: 'windows_lan',
    status: detectedWindowsPrinters.length === 0 || detectedWindowsPrinters.includes(kyoceraFound) ? 'READY' : 'DRIVER_NOT_FOUND',
  });

  // Epson
  const epsonFound = detectedWindowsPrinters.find((p) =>
    p.toLowerCase().includes('epson') || p.toLowerCase().includes('l3250')
  ) || (config.printers.epson.windowsPrinterName || 'EPSON L3250 SERIES');

  const epsonMode = config.printers.epson.mode === 'email_print' && config.printers.epson.printerEmail
    ? 'epson_email_print'
    : 'windows_driver';

  list.push({
    id: 'EPSON L3250 SERIES',
    name: epsonMode === 'epson_email_print' ? `EPSON L3250 SERIES (Email Print)` : epsonFound,
    type: epsonMode,
    status: 'READY',
  });

  return list;
}

// ==========================================
// 3. HTTP CLIENT HELPERS (OUTBOUND ONLY)
// ==========================================
async function requestApi(endpoint: string, method: string = 'GET', data?: any): Promise<any> {
  const fullUrl = new URL(endpoint, config.serverUrl);
  const isHttps = fullUrl.protocol === 'https:';
  const client = isHttps ? https : http;

  const payload = data ? JSON.stringify(data) : null;

  return new Promise((resolve, reject) => {
    const req = client.request(
      fullUrl,
      {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
          'User-Agent': 'SDIT-Print-Gateway/1.0',
        },
        timeout: 15000,
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            const parsed = body ? JSON.parse(body) : {};
            resolve(parsed);
          } catch {
            resolve({ raw: body, statusCode: res.statusCode });
          }
        });
      }
    );

    req.on('error', (err) => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout to server'));
    });

    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

// ==========================================
// 4. DOCUMENT CONVERSION PIPELINE (OFFICE -> PDF)
// ==========================================
async function convertOfficeToPdf(inputFilePath: string, outputDir: string): Promise<string> {
  if (!detectedLibreOffice) {
    throw new Error('LibreOffice headless belum terpasang di laptop untuk mengonversi file Office.');
  }

  const baseName = path.basename(inputFilePath, path.extname(inputFilePath));
  const expectedPdfPath = path.join(outputDir, `${baseName}.pdf`);

  // soffice --headless --convert-to pdf:writer_pdf_Export --outdir <dir> <file>
  const args = ['--headless', '--convert-to', 'pdf', '--outdir', outputDir, inputFilePath];
  await execFileAsync(detectedLibreOffice, args, { timeout: 35000 });

  if (!fs.existsSync(expectedPdfPath)) {
    throw new Error(`Hasil konversi PDF tidak ditemukan di ${expectedPdfPath}`);
  }

  return expectedPdfPath;
}

// ==========================================
// 5. PRINTER EXECUTORS
// ==========================================

// Send to Kyocera or Windows Driver via SumatraPDF or PowerShell
async function printViaWindows(
  printerName: string,
  pdfFilePath: string,
  settings: {
    paper?: string;
    orientation?: string;
    scale?: string;
    copies?: number;
    pageRange?: string;
  }
) {
  const copies = Math.max(1, settings.copies || 1);
  const orientation = settings.orientation || 'portrait';
  const paper = settings.paper || 'A4';
  const pageRange = settings.pageRange && settings.pageRange !== 'Semua' ? settings.pageRange : '';

  if (detectedSumatraPdf) {
    // SumatraPDF command: -print-to "printer" -print-settings "2x,portrait,A4,1-3" <file>
    const settingParts = [`${copies}x`, orientation];
    if (pageRange) settingParts.push(pageRange);
    if (settings.scale === 'fit') settingParts.push('fit');

    const printSettings = settingParts.join(',');
    const args = ['-print-to', printerName, '-print-settings', printSettings, pdfFilePath];

    console.log(`[SumatraPDF] Mencetak ke "${printerName}" dengan setting: ${printSettings}`);
    await execFileAsync(detectedSumatraPdf, args, { timeout: 45000 });
    return;
  }

  // Fallback Windows via PowerShell PrintTo
  const psCommand = `Start-Process -FilePath "${pdfFilePath.replace(/\\/g, '\\\\')}" -Verb PrintTo -ArgumentList '"${printerName}"' -PassThru | Out-Null`;
  console.log(`[PowerShell PrintTo] Mengirim dokumen ke "${printerName}"...`);
  await execAsync(`powershell.exe -NoProfile -Command "${psCommand}"`, { timeout: 40000 });
}

// Send to Epson Connect via SMTP
async function sendToEpsonEmailPrint(pdfFilePath: string, fileName: string) {
  const epsonConfig = config.printers.epson;
  const printerEmail = epsonConfig.printerEmail;

  if (!printerEmail) {
    throw new Error('Alamat email printer Epson belum dikonfigurasi di config/env laptop gateway.');
  }

  const smtp = epsonConfig.smtp;
  if (!smtp || !smtp.auth?.user || !smtp.auth?.pass) {
    throw new Error('Konfigurasi SMTP pengiriman email printer Epson belum lengkap.');
  }

  console.log(`[Epson Connect] Mengirim dokumen ${fileName} ke email printer: ${printerEmail}...`);

  // Dynamic import without breaking TypeScript compilation if nodemailer is optional
  let nodemailerModule: any = null;
  try {
    const importDynamic = new Function('modulePath', 'return import(modulePath)');
    nodemailerModule = await importDynamic('nodemailer');
  } catch {
    nodemailerModule = null;
  }
  if (nodemailerModule) {
    const transporter = nodemailerModule.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: {
        user: smtp.auth.user,
        pass: smtp.auth.pass,
      },
    });

    await transporter.sendMail({
      from: `"${smtp.fromName || 'Print Gateway'}" <${smtp.auth.user}>`,
      to: printerEmail,
      subject: `Print Job: ${fileName}`,
      text: `Dokumen dicetak dari Web Arsip SDIT Al Fikri.`,
      attachments: [
        {
          filename: fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`,
          path: pdfFilePath,
        },
      ],
    });
    console.log('✓ Dokumen berhasil dikirim ke antrean email printer Epson.');
  } else {
    throw new Error('Modul nodemailer belum terpasang di gateway untuk mode email_print.');
  }
}

// ==========================================
// 6. PROCESS PRINT JOB
// ==========================================
async function processJob(job: any) {
  const jobId = job.id;
  const jobFileName = job.fileName || 'dokumen.pdf';
  console.log(`\n📄 [JOB BARU DITERIMA] #${jobId}: ${jobFileName} -> Target: ${job.printer}`);

  // 1. Set status PROCESSING
  await requestApi('/api/print/gateway/update-job', 'POST', {
    jobId,
    status: 'PROCESSING',
    message: 'Print Gateway di laptop sedang memproses dokumen...',
  });

  const jobDir = path.join(SPOOL_DIR, `job_${Date.now()}`);
  fs.mkdirSync(jobDir, { recursive: true });

  try {
    const ext = path.extname(jobFileName).toLowerCase().replace('.', '');
    const isOffice = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext);

    // Save base64 payload to file
    const rawFilePath = path.join(jobDir, jobFileName);
    const buffer = Buffer.from(job.fileData, 'base64');
    fs.writeFileSync(rawFilePath, buffer);

    let printablePdfPath = rawFilePath;

    // Convert Office to PDF if needed
    if (isOffice) {
      console.log(`🔄 Mengonversi file Office (${ext}) ke PDF standar via LibreOffice...`);
      printablePdfPath = await convertOfficeToPdf(rawFilePath, jobDir);
      console.log(`✓ Konversi sukses: ${printablePdfPath}`);
    }

    const targetPrinter = String(job.printer || '');
    const isEpson = targetPrinter.toLowerCase().includes('epson');

    if (isEpson && config.printers.epson.mode === 'email_print' && config.printers.epson.printerEmail) {
      await sendToEpsonEmailPrint(printablePdfPath, jobFileName);
      await requestApi('/api/print/gateway/update-job', 'POST', {
        jobId,
        status: 'SENT',
        message: `Dokumen berhasil diteruskan ke Epson Connect (${config.printers.epson.printerEmail}).`,
      });
      console.log(`✓ [SUKSES] Job #${jobId} berhasil dikirim ke printer Epson.`);
    } else {
      // Kyocera or Windows Direct Driver
      const printerName = isEpson
        ? (config.printers.epson.windowsPrinterName || 'EPSON L3250 Series')
        : (config.printers.kyocera.windowsPrinterName || 'KYOCERA ECOSYS M2040dn');

      await printViaWindows(printerName, printablePdfPath, {
        paper: job.paper,
        orientation: job.orientation,
        scale: job.scale,
        copies: job.copies,
        pageRange: job.pageRange,
      });

      await requestApi('/api/print/gateway/update-job', 'POST', {
        jobId,
        status: 'SENT',
        message: `Print job berhasil dikirim ke antrean printer Windows: ${printerName}.`,
      });
      console.log(`✓ [SUKSES] Job #${jobId} berhasil dikirim ke printer Windows (${printerName}).`);
    }
  } catch (err: any) {
    console.error(`✗ [GAGAL] Gagal memproses job #${jobId}:`, err.message);
    await requestApi('/api/print/gateway/update-job', 'POST', {
      jobId,
      status: 'FAILED',
      message: `Print Gateway gagal memproses dokumen: ${err.message}`,
    });
  } finally {
    // Cleanup temporary spool files after 3 minutes
    setTimeout(() => {
      try {
        fs.rmSync(jobDir, { recursive: true, force: true });
      } catch {
        // ignore
      }
    }, 180000);
  }
}

// Process preview conversion request from teacher
async function processConversion(conv: any) {
  const convId = conv.id;
  const fileName = conv.fileName || 'dokumen.docx';
  console.log(`\n👁️ [KONVERSI PREVIEW DITERIMA] #${convId}: ${fileName}`);

  const tempDir = path.join(SPOOL_DIR, `conv_${Date.now()}`);
  fs.mkdirSync(tempDir, { recursive: true });

  try {
    const rawFilePath = path.join(tempDir, fileName);
    fs.writeFileSync(rawFilePath, Buffer.from(conv.fileData, 'base64'));

    const pdfPath = await convertOfficeToPdf(rawFilePath, tempDir);
    const pdfBuffer = fs.readFileSync(pdfPath);
    const pdfBase64 = pdfBuffer.toString('base64');

    await requestApi('/api/print/gateway/update-conversion', 'POST', {
      conversionId: convId,
      status: 'DONE',
      pdfData: pdfBase64,
    });
    console.log(`✓ [SUKSES] Preview PDF #${convId} berhasil dikembalikan ke Web App.`);
  } catch (err: any) {
    console.error(`✗ Gagal konversi preview #${convId}:`, err.message);
    await requestApi('/api/print/gateway/update-conversion', 'POST', {
      conversionId: convId,
      status: 'FAILED',
      error: err.message,
    });
  } finally {
    setTimeout(() => {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch {}
    }, 60000);
  }
}

// ==========================================
// 7. BACKGROUND LOOPS (HEARTBEAT & POLL)
// ==========================================
async function sendHeartbeat() {
  try {
    const printers = getAnnouncedPrinters();
    await requestApi('/api/print/gateway/heartbeat', 'POST', {
      gatewayName: `Laptop Gateway (${os.hostname()})`,
      printers,
      capabilities: {
        libreOffice: Boolean(detectedLibreOffice),
        sumatraPdf: Boolean(detectedSumatraPdf),
      },
    });
  } catch (err: any) {
    // If server unreachable, print concise warning once
    // console.warn('Koneksi ke Web App terputus:', err.message);
  }
}

async function pollQueue() {
  try {
    const res = await requestApi('/api/print/gateway/pending', 'GET');
    if (res && res.status === 'ok') {
      const jobs = Array.isArray(res.jobs) ? res.jobs : [];
      const conversions = Array.isArray(res.conversions) ? res.conversions : [];

      for (const conv of conversions) {
        await processConversion(conv);
      }

      for (const job of jobs) {
        await processJob(job);
      }
    }
  } catch (err: any) {
    // Retry silently
  }
}

// ==========================================
// 8. START GATEWAY
// ==========================================
async function main() {
  await detectTools();
  console.log('🚀 Menghubungkan ke Web App dan memulai outbound polling...');

  // Immediate heartbeat
  await sendHeartbeat();

  // Heartbeat interval
  setInterval(sendHeartbeat, config.heartbeatIntervalMs);

  // Polling interval
  setInterval(pollQueue, config.pollIntervalMs);

  console.log('✓ Print Gateway aktif! Siap menerima dokumen dari guru via Web App.');
  console.log('Tekan Ctrl+C untuk menghentikan service.');
}

main().catch((err) => {
  console.error('Fatal gateway error:', err);
  process.exit(1);
});
