const express = require('express');
const path = require('path');
const cors = require('cors');
const dotenv = require('dotenv');
// authMiddleware: isolated JWT/DB try-catch, dynamic admin fallback from JWT payload
// SECURITY FIX 8: import rate limiters
const rateLimit = require('express-rate-limit');
// SECURITY FIX 10: import helmet
const helmet = require('helmet');

dotenv.config();

// SECURITY FIX 3: Require JWT_SECRET — refuse to start without it.
// Must run before any require() that might reference JWT_SECRET indirectly.
if (!process.env.JWT_SECRET || !String(process.env.JWT_SECRET).trim()) {
  console.error('FATAL: JWT_SECRET is not set. Server will not start.');
  process.exit(1);
}

const { connectAppDb, getVoterDbClient } = require('./config/db');
const Admin = require('./models/Admin');
const logger = require('./config/logger');
const requestContext = require('./middleware/requestContext');
const requestLogger = require('./middleware/requestLogger');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const voterRoutes = require('./routes/voterRoutes');
const schemeRoutes = require('./routes/schemeRoutes');
const adminRoutes = require('./routes/adminRoutes');
const referralRoutes = require('./routes/referralRoutes');
const userChatRoutes = require('./routes/userChatRoutes');
const boothPresidentRoutes = require('./routes/boothPresidentRoutes');
const whatsappRoutes = require('./routes/whatsappRoutes');
const { getAssemblyMetadata } = require('./services/jurisdictionService');

// Fail fast if critical secrets are missing — no insecure hardcoded fallbacks.
// SECURITY FIX 3: JWT_SECRET already validated above; SMS_API_KEY is validated
// inside smsService.js at require() time.
const REQUIRED_ENV = ['JWT_SECRET'];
const missingEnv = REQUIRED_ENV.filter((k) => !process.env[k] || !String(process.env[k]).trim());
if (missingEnv.length) {
  logger.error('[Startup] Missing required environment variables — refusing to start', { missing: missingEnv });
  process.exit(1);
}

const app = express();

// Trust reverse proxy (Render, Vercel, Nginx) for accurate client IP identification in express-rate-limit
app.set('trust proxy', 1);

// SECURITY FIX 10: Set security-related HTTP headers with helmet.
// Content-Security-Policy, X-Frame-Options, HSTS etc. are handled automatically.
app.use(helmet());

// SECURITY FIX 9: Lock CORS to known origins only.
// Allowlisted CORS origins: local dev + deployed Vercel frontend.
// Extra origins can be added via ALLOWED_ORIGINS (comma-separated) in the env.
const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.FRONTEND_URL_PROD,
  'https://bjp-scheme.vercel.app',
  'https://bjp-schemes.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
  ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [])
]
  .filter(Boolean)
  .map((o) => o.trim().replace(/\/$/, ''));

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser clients (no Origin header) and any allowlisted origin.
    if (!origin || allowedOrigins.includes(origin.replace(/\/$/, ''))) {
      return callback(null, true);
    }
    logger.warn('[CORS] Blocked origin', { origin });
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(requestContext);        // assign a correlation id per request
// SECURITY FIX 10: Limit request body size to prevent memory-exhaustion attacks.
// Also capture raw body for WhatsApp webhook signature verification.
app.use(express.json({
  limit: '100kb',
  verify: (req, _res, buf) => { req.rawBody = buf; }
}));
app.use(requestLogger);         // structured access log (method/path/status/latency)
app.use('/assets', express.static(path.join(__dirname, 'public')));
app.use('/whatsapp_schemes', express.static(path.join(__dirname, 'public', 'whatsapp_schemes')));

// SECURITY FIX 8: Rate limiters — defined here, applied to specific routes below.
// Login: 5 attempts per 15 minutes per IP.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many login attempts. Try again in 15 minutes.' }
});

// OTP: 3 requests per 10 minutes per IP.
const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many OTP requests. Try again in 10 minutes.' }
});

// Export: 10 exports per hour per IP.
const exportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Export limit reached. Try again in 1 hour.' }
});

// Root API Status Endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'ONLINE',
    message: 'BJP Nalam Thittam API Server Operational',
    version: '1.0.0',
    backend_url: process.env.BACKEND_URL || 'https://bjp-schemes.onrender.com',
    frontend_url: process.env.FRONTEND_URL || 'https://bjp-schemes.vercel.app',
    database_connections: {
      app_database: 'CONNECTED (Mongoose - bjp_nalam_thittam_db)',
      voter_database: 'CONNECTED (MongoClient - voter_db)'
    },
    schemes_info: {
      total_schemes: 23,
      name: '23 Central BJP Welfare Schemes'
    },
    api_endpoints: {
      root_status: 'GET /',
      health_check: 'GET /api/health',
      user_authentication: 'POST /api/send-otp | POST /api/verify-otp',
      user_portal: 'POST /api/validate-epic | POST /api/register-schemes',
      admin_authentication: 'POST /api/admin/login',
      admin_dashboard: 'GET /api/admin/stats | GET /api/admin/applications',
      voter_search: 'POST /api/voter/search',
      schemes_catalog: 'GET /api/schemes',
      referral_system: 'GET /api/referral-link/:code'
    }
  });
});

// API Routes
// SECURITY FIX 8: Apply rate limiters to sensitive endpoints before mounting routers.
app.use('/api/admin/login', loginLimiter);
app.use('/api/send-otp', otpLimiter);
app.use('/api/verify-otp', otpLimiter);
app.use('/api/auth/send-otp', otpLimiter);
app.use('/api/auth/verify-otp', otpLimiter);
app.use('/api/admin/export-csv', exportLimiter);
app.use('/api/admin/export-excel', exportLimiter);

app.use('/api', userChatRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/voter', voterRoutes);
app.use('/api/schemes', schemeRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/referrals', referralRoutes);
app.use('/api/booth-president', boothPresidentRoutes);
app.use('/api/whatsapp', whatsappRoutes);
// Alias: also accept Meta webhook + flow-endpoint at root path, since the
// Meta dashboard callback URL may be configured as /webhook or /flow-endpoint.
app.use('/', whatsappRoutes);

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'BJP Nalam Thittam API is running smoothly' });
});

// 404 + centralized error handling (must be registered after all routes)
app.use(notFound);
app.use(errorHandler);

// SECURITY FIX 2: seedDefaultAdmins() has been removed entirely.
// Hardcoded credentials (admin/admin, BJP/BJP@2026, etc.) are a critical
// security vulnerability. Use scripts/seedAdmin.js instead, which reads
// credentials exclusively from environment variables.

const PORT = process.env.PORT || 5000;

// Connect DBs and start server
const startServer = async () => {
  await connectAppDb();
  await getVoterDbClient();
  // SECURITY FIX 2: seedDefaultAdmins() removed — no auto-seeding of hardcoded credentials.
  // Run `node scripts/seedAdmin.js` once with SUPER_ADMIN_USERNAME / SUPER_ADMIN_PASSWORD
  // set in the environment to create the initial admin securely.

  app.listen(PORT, () => {
    logger.info('BJP Nalam Thittam Backend API Server running', { port: PORT, url: `http://localhost:${PORT}` });
  });

  // Warm up jurisdiction metadata cache in background (counts all 233 assembly collections)
  // This runs ONCE after server starts so the first admin dashboard request is instant
  logger.info('[Warmup] Starting jurisdiction metadata + voter count cache in background...');
  getAssemblyMetadata()
    .then(() => logger.info('[Warmup] Jurisdiction cache ready — all voter roll counts cached'))
    .catch(err => logger.error('[Warmup] Cache warmup failed', { error: err.message }));
};

// Only auto-start when run directly (`node server.js`). When imported by tests,
// the app is exported without connecting to the DB or opening a port.
if (require.main === module) {
  startServer();
}

module.exports = app;
