import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../..');

const isProd = process.env.NODE_ENV === 'production';

export const config = {
  port: Number(process.env.PORT || (isProd ? 3000 : 8787)),
  // Em produção/Docker precisa escutar em todas as interfaces (EasyPanel)
  host: process.env.HOST || (isProd ? '0.0.0.0' : '127.0.0.1'),
  dataDir: process.env.DATA_DIR || path.join(rootDir, 'data'),
  dataFile: process.env.DATA_FILE || path.join(rootDir, 'data', 'store.json'),
  distDir: path.resolve(__dirname, '../../dist'),
  allowSimulate: process.env.ALLOW_SIMULATE === 'true' || !isProd,
  seedDemo: process.env.SEED_DEMO === 'true' ? true : process.env.SEED_DEMO === 'false' ? false : !isProd,
  adminToken: process.env.ADMIN_TOKEN || '',
  maxEvents: Number(process.env.MAX_EVENTS || 5000),
  autoBlock: {
    shortWindowMs: 15 * 60_000,
    shortThreshold: 3,
    shortBanMs: 15 * 60_000,
    longWindowMs: 24 * 60 * 60_000,
    longThreshold: 10,
    longBanMs: 7 * 24 * 60 * 60_000
  },
  defaults: {
    rateLimitPerMinute: 20,
    fallbackThreshold: 45,
    aggressiveThreshold: 25,
    domain: 'go.seudominio.com'
  }
};
