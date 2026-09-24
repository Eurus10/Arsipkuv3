import crypto from 'crypto';
import path from 'path';
import type {
  Express,
  Request,
  Response,
} from 'express';

type PrintJobStatus =
  | 'WAITING'
  | 'PROCESSING'
  | 'SENT'
  | 'READY'
  | 'FAILED';

type PrintJobMode =
  | 'print'
  | 'preview';

type PrintJob = {
  id: string;
  mode: PrintJobMode;
  fileName: string;
  fileDataBase64: string;
  printer: string;
  paper: string;
  orientation: string;
  scale: string;
  copies: number;
  pageRange: string;
  status: PrintJobStatus;
  message: string;
  createdAt: number;
  updatedAt: number;
};

type GatewayState = {
  online: boolean;
  gatewayName: string;
  lastSeenAt: number | null;
  printers: Array<{
    id: string;
    name: string;
    type?: string;
    status?: string;
  }>;
};

/*
|--------------------------------------------------------------------------
| SIMPLE PRINT QUEUE
|--------------------------------------------------------------------------
*/

const jobs =
  new Map<string, PrintJob>();

const gateway: GatewayState = {
  online: false,
  gatewayName:
    'Laptop Gateway SDIT',
  lastSeenAt: null,
  printers: [],
};

const MAX_FILE_BYTES =
  20 * 1024 * 1024;

const JOB_TTL =
  30 * 60 * 1000;

const CLAIM_TIMEOUT =
  5 * 60 * 1000;

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

function normalizeBase64(
  value: unknown
) {
  if (
    typeof value !== 'string'
  ) {
    return '';
  }

  return value
    .replace(
      /^data:[^;]+;base64,/,
      ''
    )
    .trim();
}

function estimateBytes(
  base64: string
) {
  if (!base64) {
    return 0;
  }

  const padding =
    base64.endsWith('==')
      ? 2
      : base64.endsWith('=')
        ? 1
        : 0;

  return Math.max(
    0,
    Math.floor(
      (base64.length * 3) / 4
    ) - padding
  );
}

function safeFileName(
  value: unknown
) {
  const name =
    path.basename(
      String(
        value ||
          'dokumen.pdf'
      )
    );

  return (
    name
      .replace(
        /[^a-zA-Z0-9._()\- ]/g,
        '_'
      )
      .slice(0, 180) ||
    'dokumen.pdf'
  );
}

function cleanupJobs() {
  const now =
    Date.now();

  for (
    const [id, job] of jobs
  ) {
    /*
     * Job lama dibuang.
     */
    if (
      now - job.updatedAt >
      JOB_TTL
    ) {
      jobs.delete(id);
      continue;
    }

    /*
     * Jika gateway mengambil job
     * lalu mati, kembalikan ke WAITING.
     */
    if (
      job.status ===
        'PROCESSING' &&
      now - job.updatedAt >
        CLAIM_TIMEOUT
    ) {
      job.status =
        'WAITING';

      job.message =
        'Gateway sebelumnya terputus. Job dikembalikan ke antrean.';

      job.updatedAt =
        now;
    }
  }
}

setInterval(
  cleanupJobs,
  60_000
).unref();

/*
|--------------------------------------------------------------------------
| REGISTER ROUTES
|--------------------------------------------------------------------------
*/

export function registerPrintGatewayRoutes(
  app: Express
) {
  /*
  |--------------------------------------------------------------------------
  | GATEWAY STATUS
  |--------------------------------------------------------------------------
  */

  const gatewayStatus = (
    _req: Request,
    res: Response
  ) => {
    const online =
      gateway.lastSeenAt !==
        null &&
      Date.now() -
        gateway.lastSeenAt <
        20_000;

    gateway.online =
      online;

    return res.json({
      status: 'ok',

      online,

      gatewayName:
        gateway.gatewayName,

      lastSeenAt:
        gateway.lastSeenAt
          ? new Date(
              gateway.lastSeenAt
            ).toISOString()
          : null,

      printers:
        online
          ? gateway.printers
          : [],

      capabilities: {
        libreOffice: true,
        sumatraPdf: true,
      },
    });
  };

  app.get(
    '/api/print/gateway/status',
    gatewayStatus
  );

  app.get(
    '/api/print/status',
    gatewayStatus
  );

  /*
  |--------------------------------------------------------------------------
  | CREATE PRINT JOB
  |--------------------------------------------------------------------------
  */

  const createPrintJob = (
    req: Request,
    res: Response
  ) => {
    try {
      const dataBase64 =
        normalizeBase64(
          req.body?.dataBase64
        );

      if (!dataBase64) {
        return res.status(400).json({
          status: 'error',
          message:
            'Data dokumen kosong.',
        });
      }

      const size =
        estimateBytes(
          dataBase64
        );

      if (
        size >
        MAX_FILE_BYTES
      ) {
        return res.status(400).json({
          status: 'error',
          message:
            'Ukuran dokumen terlalu besar. Maksimal 20 MB.',
        });
      }

      const mode: PrintJobMode =
        req.body?.mode ===
        'preview'
          ? 'preview'
          : 'print';

      const printer =
        String(
          req.body?.printer ||
            ''
        ).trim();

      if (
        mode === 'print' &&
        !printer
      ) {
        return res.status(400).json({
          status: 'error',
          message:
            'Printer belum dipilih.',
        });
      }

      const job: PrintJob = {
        id:
          crypto.randomUUID(),

        mode,

        fileName:
          safeFileName(
            req.body?.fileName
          ),

        fileDataBase64:
          dataBase64,

        printer,

        paper:
          String(
            req.body?.paper ||
              'A4'
          ),

        orientation:
          String(
            req.body
              ?.orientation ||
              'portrait'
          ),

        scale:
          String(
            req.body?.scale ||
              'fit'
          ),

        copies: Math.min(
          99,
          Math.max(
            1,
            Number(
              req.body?.copies
            ) || 1
          )
        ),

        pageRange:
          String(
            req.body
              ?.pageRange ||
              'Semua'
          ).trim() ||
          'Semua',

        status:
          'WAITING',

        message:
          mode === 'preview'
            ? 'Menunggu gateway untuk membuat preview.'
            : 'Menunggu laptop gateway.',

        createdAt:
          Date.now(),

        updatedAt:
          Date.now(),
      };

      jobs.set(
        job.id,
        job
      );

      console.log(
        `[PRINT] Job dibuat: ${job.id} - ${job.fileName}`
      );

      return res.json({
        status: 'ok',

        jobId:
          job.id,

        mode:
          job.mode,

        message:
          'Print job masuk ke antrean.',
      });
    } catch (error: any) {
      console.error(
        '[PRINT CREATE ERROR]',
        error
      );

      return res.status(500).json({
        status: 'error',

        message:
          error?.message ||
          'Gagal membuat print job.',
      });
    }
  };

  app.post(
    '/api/print/jobs',
    createPrintJob
  );

  /*
  |--------------------------------------------------------------------------
  | GET JOB STATUS
  |--------------------------------------------------------------------------
  */

  const getJob = (
    req: Request,
    res: Response
  ) => {
    cleanupJobs();

    const job =
      jobs.get(
        req.params.id
      );

    if (!job) {
      return res.status(404).json({
        status: 'error',
        message:
          'Print job tidak ditemukan.',
      });
    }

    return res.json({
      status: 'ok',

      jobId:
        job.id,

      mode:
        job.mode,

      fileName:
        job.fileName,

      printer:
        job.printer,

      statusJob:
        job.status,

      message:
        job.message,

      statusMessage:
        job.message,

      createdAt:
        job.createdAt,

      updatedAt:
        job.updatedAt,

      resultDataBase64:
        null,
    });
  };

  app.get(
    '/api/print/jobs/:id',
    getJob
  );

  /*
  |--------------------------------------------------------------------------
  | LAPTOP HEARTBEAT
  |--------------------------------------------------------------------------
  */

  app.post(
    '/api/print/gateway/heartbeat',
    (
      req: Request,
      res: Response
    ) => {
      gateway.online =
        true;

      gateway.gatewayName =
        String(
          req.body
            ?.gatewayName ||
            'Laptop Gateway SDIT'
        );

      gateway.lastSeenAt =
        Date.now();

      gateway.printers =
        Array.isArray(
          req.body?.printers
        )
          ? req.body.printers
          : [];

      console.log(
        `[GATEWAY] ${gateway.gatewayName} ONLINE`
      );

      return res.json({
        status: 'ok',

        message:
          'Gateway terhubung.',

        serverTime:
          new Date().toISOString(),
      });
    }
  );

  /*
  |--------------------------------------------------------------------------
  | LAPTOP GET PENDING JOB
  |--------------------------------------------------------------------------
  */

  app.get(
    '/api/print/gateway/pending',
    (
      _req: Request,
      res: Response
    ) => {
      cleanupJobs();

      const waiting =
        Array.from(
          jobs.values()
        )
          .filter(
            (job) =>
              job.status ===
              'WAITING'
          )
          .sort(
            (a, b) =>
              a.createdAt -
              b.createdAt
          );

      const job =
        waiting[0];

      if (!job) {
        return res.json({
          status: 'ok',
          jobs: [],
        });
      }

      job.status =
        'PROCESSING';

      job.updatedAt =
        Date.now();

      job.message =
        'Sedang diproses oleh laptop gateway.';

      console.log(
        `[GATEWAY] Mengambil job ${job.id}`
      );

      return res.json({
        status: 'ok',

        jobs: [
          {
            id:
              job.id,

            mode:
              job.mode,

            fileName:
              job.fileName,

            fileData:
              job.fileDataBase64,

            printer:
              job.printer,

            paper:
              job.paper,

            orientation:
              job.orientation,

            scale:
              job.scale,

            copies:
              job.copies,

            pageRange:
              job.pageRange,
          },
        ],
      });
    }
  );

  /*
  |--------------------------------------------------------------------------
  | LAPTOP UPDATE JOB
  |--------------------------------------------------------------------------
  */

  app.post(
    '/api/print/gateway/update-job',
    (
      req: Request,
      res: Response
    ) => {
      const job =
        jobs.get(
          String(
            req.body?.jobId ||
              ''
          )
        );

      if (!job) {
        return res.status(404).json({
          status: 'error',
          message:
            'Print job tidak ditemukan.',
        });
      }

      const nextStatus =
        String(
          req.body?.status ||
            ''
        ).toUpperCase();

      const allowed = [
        'WAITING',
        'PROCESSING',
        'SENT',
        'READY',
        'FAILED',
      ];

      if (
        !allowed.includes(
          nextStatus
        )
      ) {
        return res.status(400).json({
          status: 'error',
          message:
            'Status print job tidak valid.',
        });
      }

      job.status =
        nextStatus as PrintJobStatus;

      job.message =
        String(
          req.body?.message ||
            job.message
        );

      job.updatedAt =
        Date.now();

      /*
       * File sudah tidak dibutuhkan
       * setelah dikirim / gagal.
       */
      if (
        nextStatus ===
          'SENT' ||
        nextStatus ===
          'FAILED'
      ) {
        job.fileDataBase64 =
          '';
      }

      return res.json({
        status: 'ok',
      });
    }
  );
}