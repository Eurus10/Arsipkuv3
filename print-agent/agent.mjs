import fs from 'fs';
import path from 'path';
import http from 'http';
import https from 'https';
import { execFile } from 'child_process';
import { promisify } from 'util';
import crypto from 'crypto';

const execFileAsync = promisify(execFile);

const DEFAULT_INTERNAL_KEY = 'sdit-print-gateway-key-2026';

const CONFIG = {
  serverUrl:
    process.env.PRINT_GATEWAY_SERVER_URL ||
    'https://arsipku.sditalfikri.my.id',

  gatewayToken:
    process.env.PRINT_GATEWAY_TOKEN || DEFAULT_INTERNAL_KEY,

  gatewayName:
    process.env.PRINT_GATEWAY_NAME ||
    'Laptop Gateway SDIT',

  kyoceraPrinter:
    process.env.KYOCERA_PRINTER ||
    'KYOCERA ECOSYS M2040dn',

  epsonPrinter:
    process.env.EPSON_PRINTER ||
    'EPSON L3250 SERIES',

  sumatraPdf:
    process.env.SUMATRA_PDF_PATH ||
    'C:\\Program Files\\SumatraPDF\\SumatraPDF.exe',

  libreOffice:
    process.env.LIBREOFFICE_PATH ||
    'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
};

const ROOT_DIR = process.cwd();

const SPOOL_DIR = path.join(
  ROOT_DIR,
  '.print-spool'
);

const WORK_DIR = path.join(
  SPOOL_DIR,
  'work'
);

fs.mkdirSync(WORK_DIR, {
  recursive: true,
});

function getPowerShellExe() {
  const candidates = [
    `${process.env.SystemRoot || 'C:\\Windows'}\\System32\\WindowsPowerShell\\v1.0\\powershell.exe`,
    'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
    'powershell.exe',
  ];

  return (
    candidates.find(
      (candidate) =>
        candidate === 'powershell.exe' ||
        fs.existsSync(candidate)
    ) || 'powershell.exe'
  );
}

const PS_EXE = getPowerShellExe();

function requestApi(
  endpoint,
  method = 'GET',
  data = null
) {
  const fullUrl = new URL(
    endpoint,
    CONFIG.serverUrl
  );

  const client =
    fullUrl.protocol === 'https:'
      ? https
      : http;

  const payload = data
    ? JSON.stringify(data)
    : null;

  return new Promise((resolve, reject) => {
    const req = client.request(
      fullUrl,
      {
        method,
        headers: {
          Accept: 'application/json',
          'X-Print-Gateway-Token':
            CONFIG.gatewayToken,

          ...(payload
            ? {
                'Content-Type':
                  'application/json',

                'Content-Length':
                  Buffer.byteLength(payload),
              }
            : {}),
        },
        timeout: 15000,
      },
      (res) => {
        let body = '';

        res.setEncoding('utf8');

        res.on('data', (chunk) => {
          body += chunk;
        });

        res.on('end', () => {
          let parsed = {};

          try {
            parsed = body
              ? JSON.parse(body)
              : {};
          } catch {
            parsed = {
              raw: body,
            };
          }

          if (
            res.statusCode &&
            res.statusCode >= 200 &&
            res.statusCode < 300
          ) {
            resolve(parsed);
          } else {
            reject(
              new Error(
                parsed?.message ||
                  `HTTP ${res.statusCode}`
              )
            );
          }
        });
      }
    );

    req.on('timeout', () =>
      req.destroy(
        new Error(
          'Request ke Web App timeout.'
        )
      )
    );

    req.on('error', reject);

    if (payload) {
      req.write(payload);
    }

    req.end();
  });
}

async function getWindowsPrinters() {
  try {
    const { stdout } =
      await execFileAsync(
        PS_EXE,
        [
          '-NoProfile',
          '-ExecutionPolicy',
          'Bypass',
          '-Command',
          'Get-CimInstance Win32_Printer | Select-Object -ExpandProperty Name',
        ],
        {
          timeout: 15000,
        }
      );

    return stdout
      .split(/\r?\n/)
      .map((name) => name.trim())
      .filter(Boolean);
  } catch (error) {
    console.error(
      '! Gagal membaca printer Windows:',
      error.message
    );

    return [];
  }
}

function findConfiguredPrinter(
  detected,
  configuredName
) {
  const normalizedTarget =
    configuredName
      .trim()
      .toLowerCase();

  return (
    detected.find(
      (name) =>
        name.trim().toLowerCase() ===
        normalizedTarget
    ) ||
    detected.find(
      (name) =>
        name.trim()
          .toLowerCase()
          .includes(normalizedTarget)
    ) ||
    detected.find(
      (name) =>
        normalizedTarget.includes(
          name.trim().toLowerCase()
        )
    )
  );
}

async function buildPrinterStatus() {
  const detected =
    await getWindowsPrinters();

  const printers = [];

  const kyocera =
    findConfiguredPrinter(
      detected,
      CONFIG.kyoceraPrinter
    );

  if (kyocera) {
    printers.push({
      id: CONFIG.kyoceraPrinter,
      name: CONFIG.kyoceraPrinter,
      windowsName: kyocera,
      type: 'windows_lan',
      status: 'READY',
    });
  }

  const epson =
    findConfiguredPrinter(
      detected,
      CONFIG.epsonPrinter
    );

  if (epson) {
    printers.push({
      id: CONFIG.epsonPrinter,
      name: CONFIG.epsonPrinter,
      windowsName: epson,
      type: 'windows_driver',
      status: 'READY',
    });
  }

  return {
    detected,
    printers,
  };
}

async function sendHeartbeat() {
  try {
    const {
      detected,
      printers,
    } = await buildPrinterStatus();

    const result = await requestApi(
      '/api/print/gateway/heartbeat',
      'POST',
      {
        gatewayName:
          CONFIG.gatewayName,

        printers,
      }
    );

    console.log(
      `[HEARTBEAT] Online | Printer Windows: ${detected.length} | Target siap: ${printers.length}`
    );

    if (result?.status !== 'ok') {
      console.warn(
        '! Heartbeat ditolak server.'
      );
    }
  } catch (error) {
    console.error(
      `[HEARTBEAT ERROR] ${error.message}`
    );
  }
}

function extensionOf(fileName) {
  return path
    .extname(fileName)
    .toLowerCase();
}

function isOffice(fileName) {
  return [
    '.doc',
    '.docx',
    '.xls',
    '.xlsx',
    '.ppt',
    '.pptx',
  ].includes(
    extensionOf(fileName)
  );
}

function isPdf(fileName) {
  return extensionOf(fileName) === '.pdf';
}

function isImage(fileName) {
  return [
    '.jpg',
    '.jpeg',
    '.png',
    '.gif',
    '.webp',
    '.bmp',
    '.tif',
    '.tiff',
  ].includes(
    extensionOf(fileName)
  );
}

function safeName(fileName) {
  return (
    path
      .basename(fileName)
      .replace(
        /[^a-zA-Z0-9._()\-\s]/g,
        '_'
      )
      .slice(0, 180) ||
    'dokumen'
  );
}

async function convertOfficeToPdf(
  inputPath,
  workDir
) {
  if (!fs.existsSync(CONFIG.libreOffice)) {
    throw new Error(
      `LibreOffice tidak ditemukan: ${CONFIG.libreOffice}`
    );
  }

  fs.mkdirSync(workDir, {
    recursive: true,
  });

  await execFileAsync(
    CONFIG.libreOffice,
    [
      '--headless',
      '--convert-to',
      'pdf',
      '--outdir',
      workDir,
      inputPath,
    ],
    {
      timeout: 120000,
      windowsHide: true,
    }
  );

  const expected = path.join(
    workDir,
    `${path.basename(
      inputPath,
      path.extname(inputPath)
    )}.pdf`
  );

  if (fs.existsSync(expected)) {
    return expected;
  }

  const generated =
    fs.readdirSync(workDir).find(
      (name) =>
        name.toLowerCase().endsWith('.pdf')
    );

  if (!generated) {
    throw new Error(
      'LibreOffice tidak menghasilkan file PDF.'
    );
  }

  return path.join(
    workDir,
    generated
  );
}

function normalizePageRange(value) {
  const raw = String(
    value || ''
  ).trim();

  if (
    !raw ||
    /^(semua|all|all pages)$/i.test(raw)
  ) {
    return '';
  }

  if (!/^[0-9,\s-]+$/.test(raw)) {
    throw new Error(
      'Rentang halaman tidak valid. Gunakan contoh: 1-3 atau 1,3,5.'
    );
  }

  return raw.replace(/\s+/g, '');
}

function paperToken(paper) {
  switch (
    String(paper).toUpperCase()
  ) {
    case 'A4':
      return 'paper=A4';

    case 'A5':
      return 'paper=A5';

    case 'LETTER':
      return 'paper=letter';

    case 'F4':
      return 'paper=215.9mm x 330.2mm';

    default:
      return 'paper=A4';
  }
}

function scaleToken(scale) {
  switch (
    String(scale).toLowerCase()
  ) {
    case 'actual':
      return 'noscale';

    case 'fill':
      return 'stretch';

    default:
      return 'fit';
  }
}

function buildPrintSettings(job) {
  const settings = [
    paperToken(job.paper),

    String(job.orientation).toLowerCase() ===
    'landscape'
      ? 'landscape'
      : 'portrait',

    scaleToken(job.scale),

    `${Math.min(
      99,
      Math.max(1, Number(job.copies) || 1)
    )}x`,

    'ignore-pdf-print-settings',
  ];

  const pageRange =
    normalizePageRange(
      job.pageRange
    );

  if (pageRange) {
    settings.unshift(pageRange);
  }

  return settings.join(',');
}

async function resolveTargetPrinter(
  requestedName
) {
  const { detected } =
    await buildPrinterStatus();

  const configured =
    [
      CONFIG.kyoceraPrinter,
      CONFIG.epsonPrinter,
    ].find(
      (name) =>
        name.toLowerCase() ===
        String(requestedName || '')
          .trim()
          .toLowerCase()
    );

  if (!configured) {
    throw new Error(
      `Printer tidak diizinkan: ${
        requestedName || '(kosong)'
      }`
    );
  }

  const windowsName =
    findConfiguredPrinter(
      detected,
      configured
    );

  if (!windowsName) {
    throw new Error(
      `Printer ${configured} tidak ditemukan pada Windows laptop gateway.`
    );
  }

  return windowsName;
}

async function printWithSumatra(
  pdfPath,
  printerName,
  job
) {
  if (fs.existsSync(CONFIG.sumatraPdf)) {
    try {
      const settings =
        buildPrintSettings(job);

      const result =
        await execFileAsync(
          CONFIG.sumatraPdf,
          [
            '-silent',
            '-print-to',
            printerName,
            '-print-settings',
            settings,
            pdfPath,
          ],
          {
            timeout: 120000,
            windowsHide: true,
          }
        );

      if (result.stderr?.trim()) {
        console.log(
          `[SUMATRA] ${result.stderr.trim()}`
        );
      }
      return;
    } catch (sumatraErr) {
      console.warn(`[SUMATRA] Gagal menggunakan SumatraPDF: ${sumatraErr.message}. Beralih ke Windows Native Print.`);
    }
  }

  // Windows Native Printing Fallback
  console.log(`[PRINT] Mencetak via Windows PowerShell ke printer "${printerName}"...`);
  const escapedFile = pdfPath.replace(/'/g, "''");
  const escapedPrinter = printerName.replace(/'/g, "''");
  const script = `
    $file = '${escapedFile}'
    $printer = '${escapedPrinter}'
    Start-Process -FilePath $file -Verb PrintTo -ArgumentList ('"' + $printer + '"') -WindowStyle Hidden -PassThru | Wait-Process -Timeout 30 -ErrorAction SilentlyContinue
  `;
  await runPowerShell(script);
}

async function processJob(job) {
  const jobDir = path.join(
    WORK_DIR,
    `${Date.now()}-${crypto.randomUUID()}`
  );

  fs.mkdirSync(jobDir, {
    recursive: true,
  });

  const originalPath = path.join(
    jobDir,
    safeName(job.fileName)
  );

  fs.writeFileSync(
    originalPath,
    Buffer.from(
      job.fileData,
      'base64'
    )
  );

  try {
    let printablePath =
      originalPath;

    if (isOffice(job.fileName)) {
      console.log(
        `  → Konversi Office ke PDF: ${job.fileName}`
      );

      printablePath =
        await convertOfficeToPdf(
          originalPath,
          path.join(
            jobDir,
            'pdf'
          )
        );
    }

    if (job.mode === 'preview') {
      if (!isPdf(printablePath)) {
        throw new Error(
          'Preview server-side hanya dikembalikan sebagai PDF.'
        );
      }

      const resultDataBase64 =
        fs.readFileSync(
          printablePath
        ).toString('base64');

      await requestApi(
        '/api/print/gateway/update-job',
        'POST',
        {
          jobId: job.id,
          status: 'READY',
          message:
            'PDF preview siap.',
          resultDataBase64,
        }
      );

      console.log(
        `✓ Preview siap: ${job.fileName}`
      );

      return;
    }

    const printerName =
      await resolveTargetPrinter(
        job.printer
      );

    if (isPdf(printablePath)) {
      await printWithSumatra(
        printablePath,
        printerName,
        job
      );
    } else if (
      isImage(job.fileName)
    ) {
      await printWithSumatra(
        originalPath,
        printerName,
        job
      );
    } else {
      throw new Error(
        `Format ${extensionOf(
          job.fileName
        )} belum memiliki jalur print.`
      );
    }

    await requestApi(
      '/api/print/gateway/update-job',
      'POST',
      {
        jobId: job.id,
        status: 'SENT',
        message:
          `Dokumen dikirim ke printer ${job.printer}.`,
      }
    );

    console.log(
      `✓ SENT → ${job.printer} | ${job.fileName}`
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    console.error(
      `✗ FAILED → ${job.fileName}: ${message}`
    );

    try {
      await requestApi(
        '/api/print/gateway/update-job',
        'POST',
        {
          jobId: job.id,
          status: 'FAILED',
          message,
        }
      );
    } catch (updateError) {
      console.error(
        `✗ Gagal mengirim status FAILED: ${updateError.message}`
      );
    }
  } finally {
    fs.rmSync(jobDir, {
      recursive: true,
      force: true,
    });
  }
}

let polling = false;

async function pollQueue() {
  if (polling) return;

  polling = true;

  try {
    const result =
      await requestApi(
        '/api/print/gateway/pending'
      );

    if (
      result?.status !== 'ok' ||
      !Array.isArray(result.jobs) ||
      result.jobs.length === 0
    ) {
      return;
    }

    for (const job of result.jobs) {
      console.log(
        `\n[JOB] ${
          job.mode?.toUpperCase()
        } | ${job.fileName} | ${
          job.printer || '-'
        }`
      );

      await processJob(job);
    }
  } catch (error) {
    console.error(
      `[QUEUE ERROR] ${error.message}`
    );
  } finally {
    polling = false;
  }
}

console.log(
  '============================================================'
);
console.log(
  ' PRINT GATEWAY SDIT AL FIKRI'
);
console.log(
  '============================================================'
);
console.log(
  `Server : ${CONFIG.serverUrl}`
);
console.log(
  `Kyocera: ${CONFIG.kyoceraPrinter}`
);
console.log(
  `Epson  : ${CONFIG.epsonPrinter}`
);
console.log(
  'Gateway berjalan sebagai koneksi keluar ke Web App.'
);
console.log(
  '============================================================'
);

await sendHeartbeat();
await pollQueue();

setInterval(
  sendHeartbeat,
  10_000
);

setInterval(
  pollQueue,
  2_000
);