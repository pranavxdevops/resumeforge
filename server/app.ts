import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';
import { ZodError } from 'zod';
import multer from 'multer';
import path from 'node:path';
import { csrf, sessionMiddleware, requireAuth } from './security';
import { HttpError } from './resumes';
import { templates } from '../shared/resume';
import { authRouter } from './routes/auth';
import { resumeRouter } from './routes/resumes';
import { careerRouter } from './routes/career';
import { accountRouter } from './routes/account';
import { publicRouter } from './routes/public';
export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  if (process.env.TRUST_PROXY === '1') app.set('trust proxy', 1);
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          fontSrc: ["'self'", 'data:'],
          imgSrc: ["'self'", 'data:', 'blob:'],
          connectSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
          upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
        },
      },
    }),
  );
  app.use(compression());
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use('/api', (_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
  app.use(
    '/api',
    rateLimit({
      windowMs: 60000,
      limit: 300,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      message: { error: 'Too many requests. Try again in a minute.' },
    }),
    csrf,
    sessionMiddleware,
  );
  const authLimit = rateLimit({
    windowMs: 15 * 60000,
    limit: 30,
    skipSuccessfulRequests: true,
    message: { error: 'Too many authentication attempts. Try again in 15 minutes.' },
  });
  app.use(
    ['/api/auth/register', '/api/auth/forgot-password', '/api/auth/resend-verification'],
    rateLimit({
      windowMs: 15 * 60000,
      limit: 20,
      message: { error: 'Please wait before requesting another account email or registration.' },
    }),
  );
  app.use('/api/auth', authLimit, authRouter);
  app.use(
    '/api/public',
    rateLimit({
      windowMs: 60000,
      limit: 60,
      message: { error: 'Please wait before trying again.' },
    }),
  );
  app.use('/api', publicRouter);
  app.get('/api/templates', (_req, res) => res.json(templates));
  app.use('/api', requireAuth);
  app.use('/api/resumes', resumeRouter);
  app.use(
    '/api/ai',
    rateLimit({
      windowMs: 60000,
      limit: 10,
      message: { error: 'Please wait before making another AI request.' },
    }),
  );
  app.use('/api', careerRouter, accountRouter);
  app.use('/api', (_req, _res, next) => next(new HttpError(404, 'This endpoint does not exist.')));
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve('dist/client'), { maxAge: '1h' }));
    app.get('/{*path}', (_req, res) => res.sendFile(path.resolve('dist/client/index.html')));
  }
  app.use(
    (error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      if (error instanceof ZodError)
        return res
          .status(400)
          .json({ error: error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') });
      if (error instanceof HttpError)
        return res.status(error.status).json({ error: error.message });
      if (error instanceof multer.MulterError)
        return res.status(400).json({
          error:
            error.code === 'LIMIT_FILE_SIZE'
              ? 'This file exceeds the upload size limit.'
              : error.message,
        });
      if (error instanceof SyntaxError)
        return res.status(400).json({ error: 'Invalid request body.' });
      console.error('Unhandled API error:', error instanceof Error ? error.name : 'UnknownError');
      res
        .status(500)
        .json({ error: 'Something went wrong. Your saved work is safe. Please try again.' });
    },
  );
  return app;
}
