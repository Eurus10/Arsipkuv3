import fs from 'fs';
import path from 'path';
import http from 'http';
import https from 'https';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

/*
|--------------------------------------------------------------------------
| KONFIGURASI PRINT GATEWAY LAPTOP (ZERO-CONFIG & PLUG-AND-PLAY)
|--------------------------------------------------------------------------
*/
const CONFIG = {
  serverUrl: process.env.PRINT_SERVER_URL || 'https://arsipku.sditalfikri.my.id',
  gatewayName: 'Laptop Gateway SDIT',
  kyoceraPrinter: 'KYOCERA ECOSYS M2040dn',
  epsonPrinter: 'EPSON L3250 SERIES',
  sumatraPdf: 'C:\\Program Files\\SumatraPDF\\SumatraPDF.exe',
  libreOffice: 'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
};

const SPOOL_DIR = path.join(process.cwd(), '.print-spool');
if (!fs.existsSync(SPOOL_DIR)) {
  fs.mkdirSync(SPOOL_DIR, { recursive: true });
}

function getPowerShell() {
  const candidates = [
    'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
    `${process.env.SystemRoot || 'C:\\Windows'}\\System32\\WindowsPowerShell\\v1.0\\powershell.exe`,
    'powershell.exe',
  ];
  return candidates.find((item) => item === 'powershell.exe' || fs.existsSync(item)) || 'powershell.exe';
}

const POWERSHELL = getPowerShell();

function requestApi(endpoint, method = 'GET', data = null) {
  const url = new URL(endpoint, CONFIG.serverUrl);
  const client = url.protocol === 'https:' ? https : http;
  const body = data ? JSON.stringify(data) : null;

  return new Promise((resolve, reject) => {
    const req = client.request(
      url,
      {
        method,
        headers: {
          Accept: 'application/json',
          ...(body
            ? {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body),
              }
            : {}),
        },
        timeout: 15000,
      },
      (res) => {
        let text = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => (text += chunk));
        res.on('end', () => {
          let json = {};
          try {
            json = text ? JSON.parse(text) : {};
          } catch {
            json = { raw: text };
          }
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(json);
          } else {
            reject(new Error(json?.message || `HTTP ${res.statusCode} ${text.slice(0, 100)}`));
          }
        });
      }
    );

    req.on('timeout', () => {
      req.destroy(new Error('Request ke server timeout (15 detik).'));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

/*
|--------------------------------------------------------------------------
| CEK DAFTAR PRINTER WINDOWS
|--------------------------------------------------------------------------
*/
async function getWindowsPrinters() {
  try {
    const result = await execFileAsync(POWERSHELL, [
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-Command',
      'Get-CimInstance Win32_Printer | Select-Object -ExpandProperty Name',
    ]);
    return result.stdout
      .split(/\r?\n/)
      .map((name) => name.trim())
      .filter(Boolean);
  } catch (error) {
    console.error('[PRINTER ERROR]', error.message);
    return [];
  }
}

function findPrinter(detected, configured) {
  const target = configured.trim().toLowerCase();
  return (
    detected.find((name) => name.trim().toLowerCase() === target) ||
    detected.find((name) => name.trim().toLowerCase().includes(target)) ||
    detected.find((name) => target.includes(name.trim().toLowerCase()))
  );
}

/*
|--------------------------------------------------------------------------
| HEARTBEAT KE SERVER
|--------------------------------------------------------------------------
*/
let firstConnected = false;

async function heartbeat() {
  try {
    const detected = await getWindowsPrinters();
    const printers = [];

    const kyocera = findPrinter(detected, CONFIG.kyoceraPrinter);
    if (kyocera) {
      printers.push({
        id: CONFIG.kyoceraPrinter,
        name: CONFIG.kyoceraPrinter,
        windowsName: kyocera,
        type: 'windows_lan',
        status: 'READY',
      });
    }

    const epson = findPrinter(detected, CONFIG.epsonPrinter);
    if (epson) {
      printers.push({
        id: CONFIG.epsonPrinter,
        name: CONFIG.epsonPrinter,
        windowsName: epson,
        type: 'windows_driver',
        status: 'READY',
      });
    }

    const res = await requestApi('/api/print/gateway/heartbeat', 'POST', {
      gatewayName: CONFIG.gatewayName,
      printers,
    });

    if (res?.status === 'ok' && !firstConnected) {
      console.log('====================================================');
      console.log('✓ KONEKSI BERHASIL! Laptop Anda terhubung ke Web App.');
      console.log(`✓ Status Server: ONLINE (HTTP 200)`);
      console.log(`✓ Terdeteksi ${detected.length} printer di Windows (${printers.length} siap digunakan):`);
      for (const p of printers) {
        console.log(`  → [${p.name}] siap menerima tugas cetak.`);
      }
      console.log('✓ Menunggu dokumen dari Guru / Operator...');
      console.log('====================================================\n');
      firstConnected = true;
    }
  } catch (error) {
    console.error(`[SERVER ERROR] ${error.message}`);
  }
}

/*
|--------------------------------------------------------------------------
| FORMAT FILE & KONVERSI
|--------------------------------------------------------------------------
*/
function extension(fileName) {
  return path.extname(fileName).toLowerCase();
}

function isOffice(fileName) {
  return ['.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'].includes(extension(fileName));
}

async function convertOfficeToPdf(inputFile, outputDir) {
  if (!fs.existsSync(CONFIG.libreOffice)) {
    throw new Error(`LibreOffice tidak ditemukan di: ${CONFIG.libreOffice}`);
  }
  fs.mkdirSync(outputDir, { recursive: true });
  console.log(`  → Mengonversi dokumen Office ke PDF via LibreOffice...`);

  await execFileAsync(
    CONFIG.libreOffice,
    ['--headless', '--convert-to', 'pdf', '--outdir', outputDir, inputFile],
    { timeout: 120000 }
  );

  const expected = path.join(outputDir, `${path.basename(inputFile, path.extname(inputFile))}.pdf`);
  if (fs.existsSync(expected)) return expected;

  const generated = fs.readdirSync(outputDir).find((name) => name.toLowerCase().endsWith('.pdf'));
  if (!generated) {
    throw new Error('LibreOffice tidak menghasilkan file PDF.');
  }
  return path.join(outputDir, generated);
}

/*
|--------------------------------------------------------------------------
| SUMATRAPDF PRINT SETTINGS
|--------------------------------------------------------------------------
*/
function buildPrintSettings(job) {
  const settings = [];
  if (job.pageRange && !/^semua$/i.test(job.pageRange)) {
    settings.push(job.pageRange.replace(/\s+/g, ''));
  }

  const copies = Math.min(99, Math.max(1, Number(job.copies) || 1));
  settings.push(`${copies}x`);

  if (String(job.orientation).toLowerCase() === 'landscape') {
    settings.push('landscape');
  }

  settings.push('fit');
  return settings.join(',');
}

async function printPdf(pdfPath, printerName, job) {
  if (!fs.existsSync(CONFIG.sumatraPdf)) {
    throw new Error(`SumatraPDF tidak ditemukan di: ${CONFIG.sumatraPdf}`);
  }

  const settings = buildPrintSettings(job);
  console.log(`  → Mengirim PDF ke "${printerName}" via SumatraPDF...`);
  console.log(`  → Parameter: ${settings}`);

  await execFileAsync(
    CONFIG.sumatraPdf,
    ['-silent', '-print-to', printerName, '-print-settings', settings, pdfPath],
    { timeout: 120000, windowsHide: true }
  );
}

async function updateJob(jobId, status, message, resultDataBase64 = null) {
  await requestApi('/api/print/gateway/update-job', 'POST', {
    jobId,
    status,
    message,
    ...(resultDataBase64 ? { resultDataBase64 } : {}),
  });
}

/*
|--------------------------------------------------------------------------
| PROSES TUGAS CETAK
|--------------------------------------------------------------------------
*/
async function processJob(job) {
  const jobFolder = path.join(SPOOL_DIR, `${Date.now()}-${job.id}`);
  fs.mkdirSync(jobFolder, { recursive: true });

  try {
    const originalFile = path.join(jobFolder, path.basename(job.fileName));
    fs.writeFileSync(originalFile, Buffer.from(job.fileData, 'base64'));

    console.log(`\n====================================================`);
    console.log(`[JOB BARU] ${job.fileName}`);
    console.log(`Target Printer: ${job.printer || '-'}`);
    console.log(`Mode: ${job.mode || 'print'}`);

    let pdfFile = originalFile;
    if (isOffice(job.fileName)) {
      pdfFile = await convertOfficeToPdf(originalFile, path.join(jobFolder, 'pdf'));
    }

    if (job.mode === 'preview') {
      const pdfBase64 = fs.readFileSync(pdfFile).toString('base64');
      await updateJob(job.id, 'READY', 'Preview PDF siap.', pdfBase64);
      console.log('  ✓ Preview selesai disiapkan.');
      return;
    }

    const detected = await getWindowsPrinters();
    const requested = String(job.printer || '').trim();
    let printerName = '';

    if (requested.toLowerCase().includes('kyocera')) {
      printerName = findPrinter(detected, CONFIG.kyoceraPrinter) || '';
    } else if (requested.toLowerCase().includes('epson')) {
      printerName = findPrinter(detected, CONFIG.epsonPrinter) || '';
    } else {
      printerName = findPrinter(detected, requested) || '';
    }

    if (!printerName) {
      throw new Error(`Printer "${requested}" tidak ditemukan pada daftar printer Windows di laptop.`);
    }

    await printPdf(pdfFile, printerName, job);
    await updateJob(job.id, 'SENT', `Dokumen berhasil dikirim ke antrean printer ${printerName}.`);
    console.log(`  ✓ SUKSES: Dokumen terkirim ke printer ${printerName}`);
    console.log(`====================================================\n`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`  ✗ GAGAL: ${message}`);
    try {
      await updateJob(job.id, 'FAILED', message);
    } catch (updateError) {
      console.error('  ✗ Gagal update status job:', updateError.message);
    }
  } finally {
    try {
      fs.rmSync(jobFolder, { recursive: true, force: true });
    } catch {}
  }
}

/*
|--------------------------------------------------------------------------
| POLLING ANTREAN
|--------------------------------------------------------------------------
*/
let polling = false;

async function pollQueue() {
  if (polling) return;
  polling = true;

  try {
    const result = await requestApi('/api/print/gateway/pending', 'GET');
    if (result && Array.isArray(result.jobs) && result.jobs.length > 0) {
      for (const job of result.jobs) {
        await processJob(job);
      }
    }
  } catch (error) {
    // Log hanya bila bukan connection retry biasa
  } finally {
    polling = false;
  }
}

/*
|--------------------------------------------------------------------------
| INISIALISASI
|--------------------------------------------------------------------------
*/
console.log('\n====================================================');
console.log('      SDIT AL FIKRI PRINT GATEWAY (Vercel Ready)');
console.log('====================================================');
console.log(`Target Server : ${CONFIG.serverUrl}`);
console.log(`Kyocera       : ${CONFIG.kyoceraPrinter}`);
console.log(`Epson         : ${CONFIG.epsonPrinter}`);
console.log('====================================================\n');

await heartbeat();
await pollQueue();

setInterval(heartbeat, 10000);
setInterval(pollQueue, 2500);
