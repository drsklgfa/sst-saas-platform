import { z } from 'zod';

const booleanFromString = z.preprocess((value) => {
  if (typeof value !== 'string') return value;
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
}, z.boolean());

const schema = z
  .object({
    DATABASE_URL: z.string().min(1),
    APP_URL: z.string().url().default('http://localhost:3000'),
    AUTH_SECRET: z.string().min(32),
    SESSION_TTL_DAYS: z.coerce.number().int().positive().max(365).default(14),

    STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
    LOCAL_STORAGE_PATH: z.string().min(1).default('.data/storage'),
    S3_ENDPOINT: z.string().url().optional(),
    S3_REGION: z.string().min(1).default('auto'),
    S3_BUCKET: z.string().min(1).optional(),
    S3_ACCESS_KEY_ID: z.string().min(1).optional(),
    S3_SECRET_ACCESS_KEY: z.string().min(1).optional(),
    S3_FORCE_PATH_STYLE: booleanFromString.default(false),

    FILE_ENCRYPTION_KEY: z.string().regex(/^[0-9a-fA-F]{64}$/, 'deve conter exatamente 64 caracteres hexadecimais'),
    WORKER_POLL_MS: z.coerce.number().int().min(250).max(60_000).default(2500),
    PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH: z.string().optional(),

    AI_PROVIDER: z.enum(['disabled', 'gemini']).default('disabled'),
    GEMINI_API_KEY: z.string().min(1).optional(),
    GEMINI_MODEL: z.string().min(1).default('gemini-2.5-flash'),

    EMAIL_PROVIDER: z.enum(['disabled', 'resend']).default('disabled'),
    RESEND_API_KEY: z.string().min(1).optional(),
    EMAIL_FROM: z.string().email().optional(),
  })
  .superRefine((value, context) => {
    if (value.STORAGE_DRIVER === 's3') {
      for (const key of ['S3_ENDPOINT', 'S3_BUCKET', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY'] as const) {
        if (!value[key]) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: [key],
            message: `${key} é obrigatório quando STORAGE_DRIVER=s3`,
          });
        }
      }
    }

    if (value.AI_PROVIDER === 'gemini' && !value.GEMINI_API_KEY) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['GEMINI_API_KEY'],
        message: 'GEMINI_API_KEY é obrigatória quando AI_PROVIDER=gemini',
      });
    }

    if (value.EMAIL_PROVIDER === 'resend') {
      if (!value.RESEND_API_KEY) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['RESEND_API_KEY'],
          message: 'RESEND_API_KEY é obrigatória quando EMAIL_PROVIDER=resend',
        });
      }
      if (!value.EMAIL_FROM) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['EMAIL_FROM'],
          message: 'EMAIL_FROM é obrigatório quando EMAIL_PROVIDER=resend',
        });
      }
    }
  });

export const env = schema.parse(process.env);
