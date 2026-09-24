import type {
  Express,
  Request,
  Response,
} from 'express';

type PrintJob = {
  id: string;
  mode: 'print' | 'preview';
  fileName: string;
  fileDataBase64: string;
  printer: string;
  paper: string;
  orientation: string;
  scale: string;
  copies: number;
  pageRange: string;
  status:
    | 'WAITING'
    | 'PROCESSING'
    | 'SENT'
    | 'READY'
    | 'FAILED';
  message: string;
  createdAt: number;
  updatedAt: number;
};

const jobs =
  new Map<string, PrintJob>();

let gatewayOnline = false;

let gatewayName =
  'Laptop Gateway SDIT';

let gatewayLastSeen:
  number | null = null;

let gatewayPrinters: any[] = [];

/*
|--------------------------------------------------------------------------
| REGISTER PRINT ROUTES
|--------------------------------------------------------------------------
*/

export function registerPrintGatewayRoutes(
  app: Express
) {
  /*
  |--------------------------------------------------------------------------
  | TEST / STATUS
  |--------------------------------------------------------------------------
  */

  app.get(
    '/api/print/gateway/status',
    (
      _req: Request,
      res: Response
    ) => {
      const online =
        gatewayLastSeen !== null &&
        Date.now() -
          gatewayLastSeen <
          20000;

      gatewayOnline =
        online;

      return res.json({
        status: 'ok',

        online,

        gatewayName,

        lastSeenAt:
          gatewayLastSeen
            ? new Date(
                gatewayLastSeen
              ).toISOString()
            : null,

        printers:
          online
            ? gatewayPrinters
            : [],
      });
    }
  );

  /*
  |--------------------------------------------------------------------------
  | CREATE PRINT JOB
  |--------------------------------------------------------------------------
  */

  app.post(
    '/api/print/jobs',
    (
      req: Request,
      res: Response
    ) => {
      try {
        const body =
          req.body || {};

        const dataBase64 =
          String(
            body.dataBase64 || ''
          );

        if (!dataBase64) {
          return res.status(400).json({
            status: 'error',
            message:
              'Data dokumen kosong.',
          });
        }

        const jobId =
          `${Date.now()}-${Math.random()
            .toString(36)
            .slice(2, 10)}`;

        const job: PrintJob = {
          id: jobId,

          mode:
            body.mode ===
            'preview'
              ? 'preview'
              : 'print',

          fileName:
            String(
              body.fileName ||
                'dokumen.pdf'
            ),

          fileDataBase64:
            dataBase64,

          printer:
            String(
              body.printer || ''
            ),

          paper:
            String(
              body.paper || 'A4'
            ),

          orientation:
            String(
              body.orientation ||
                'portrait'
            ),

          scale:
            String(
              body.scale ||
                'fit'
            ),

          copies:
            Math.max(
              1,
              Number(
                body.copies
              ) || 1
            ),

          pageRange:
            String(
              body.pageRange ||
                'Semua'
            ),

          status:
            'WAITING',

          message:
            'Menunggu laptop gateway.',

          createdAt:
            Date.now(),

          updatedAt:
            Date.now(),
        };

        jobs.set(
          jobId,
          job
        );

        console.log(
          `[PRINT] Job ${jobId} dibuat.`
        );

        return res.json({
          status: 'ok',

          jobId,

          message:
            'Print job masuk antrean.',
        });
      } catch (error: any) {
        console.error(
          '[PRINT JOB ERROR]',
          error
        );

        return res.status(500).json({
          status: 'error',

          message:
            error?.message ||
            'Gagal membuat print job.',
        });
      }
    }
  );

  /*
  |--------------------------------------------------------------------------
  | JOB STATUS
  |--------------------------------------------------------------------------
  */

  app.get(
    '/api/print/jobs/:id',
    (
      req: Request,
      res: Response
    ) => {
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

        statusJob:
          job.status,

        message:
          job.message,

        fileName:
          job.fileName,

        printer:
          job.printer,

        createdAt:
          job.createdAt,

        updatedAt:
          job.updatedAt,
      });
    }
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
      gatewayOnline =
        true;

      gatewayLastSeen =
        Date.now();

      gatewayName =
        String(
          req.body?.gatewayName ||
            'Laptop Gateway SDIT'
        );

      gatewayPrinters =
        Array.isArray(
          req.body?.printers
        )
          ? req.body.printers
          : [];

      return res.json({
        status: 'ok',

        message:
          'Gateway terhubung.',
      });
    }
  );

  /*
  |--------------------------------------------------------------------------
  | LAPTOP AMBIL JOB
  |--------------------------------------------------------------------------
  */

  app.get(
    '/api/print/gateway/pending',
    (
      _req: Request,
      res: Response
    ) => {
      const job =
        Array.from(
          jobs.values()
        )
          .filter(
            (item) =>
              item.status ===
              'WAITING'
          )
          .sort(
            (a, b) =>
              a.createdAt -
              b.createdAt
          )[0];

      if (!job) {
        return res.json({
          status: 'ok',

          jobs: [],
        });
      }

      job.status =
        'PROCESSING';

      job.message =
        'Sedang diproses oleh laptop gateway.';

      job.updatedAt =
        Date.now();

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
  | UPDATE JOB
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

      const status =
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
          status
        )
      ) {
        return res.status(400).json({
          status: 'error',

          message:
            'Status job tidak valid.',
        });
      }

      job.status =
        status as PrintJob['status'];

      job.message =
        String(
          req.body?.message ||
            job.message
        );

      job.updatedAt =
        Date.now();

      if (
        status === 'SENT' ||
        status === 'FAILED'
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