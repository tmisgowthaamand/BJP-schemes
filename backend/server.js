const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

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
const { getAssemblyMetadata } = require('./services/jurisdictionService');

// Fail fast if critical secrets are missing — no insecure hardcoded fallbacks.
const REQUIRED_ENV = ['JWT_SECRET'];
const missingEnv = REQUIRED_ENV.filter((k) => !process.env[k] || !String(process.env[k]).trim());
if (missingEnv.length) {
  logger.error('[Startup] Missing required environment variables — refusing to start', { missing: missingEnv });
  process.exit(1);
}

const app = express();

// Middlewares
// Allowlisted CORS origins: local dev (port 3000) + deployed Vercel frontend.
// Extra origins can be added via ALLOWED_ORIGINS (comma-separated) in the env.
const allowedOrigins = [
  process.env.FRONTEND_URL,        // e.g. http://localhost:3000
  process.env.FRONTEND_URL_PROD,   // e.g. https://bjp-schemes.vercel.app
  'http://localhost:3000',
  'https://bjp-schemes.vercel.app',
  ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [])
]
  .filter(Boolean)
  .map((o) => o.trim().replace(/\/$/, '')); // normalize (drop trailing slash)

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
app.use(express.json());
app.use(requestLogger);         // structured access log (method/path/status/latency)

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
app.use('/api', userChatRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/voter', voterRoutes);
app.use('/api/schemes', schemeRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/referrals', referralRoutes);

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'BJP Nalam Thittam API is running smoothly' });
});

// 404 + centralized error handling (must be registered after all routes)
app.use(notFound);
app.use(errorHandler);

// Seed Required Default Admin Credentials
const seedDefaultAdmins = async () => {
  try {
    // 1. Super Admin: admin / admin
    const superAdmin = await Admin.findOne({ username: 'admin' });
    if (!superAdmin) {
      await Admin.create({
        username: 'admin',
        password: 'admin',
        role: 'SUPER_ADMIN',
        createdBy: 'SYSTEM_SEED'
      });
      logger.info('[Admin Seed] Created Super Admin: admin / admin');
    }

    // 2. State Admin: BJP / BJP@2026
    const stateAdmin = await Admin.findOne({ username: 'BJP' });
    if (!stateAdmin) {
      await Admin.create({
        username: 'BJP',
        password: 'BJP@2026',
        role: 'STATE_ADMIN',
        createdBy: 'SYSTEM_SEED'
      });
      logger.info('[Admin Seed] Created State Admin: BJP / BJP@2026');
    }

    // 3. Sample District Admin (Chengalpattu)
    const distAdmin = await Admin.findOne({ username: 'district_chengalpattu' });
    if (!distAdmin) {
      await Admin.create({
        username: 'district_chengalpattu',
        password: 'BJP@2026',
        role: 'DISTRICT_ADMIN',
        district: 'CHENGALPATTU',
        createdBy: 'SYSTEM_SEED'
      });
      logger.info('[Admin Seed] Created District Admin: district_chengalpattu / BJP@2026');
    }

    // 4. Sample Assembly Admin (Thiruporur)
    const assAdmin = await Admin.findOne({ username: 'ass_thiruporur' });
    if (!assAdmin) {
      await Admin.create({
        username: 'ass_thiruporur',
        password: 'BJP@2026',
        role: 'ASSEMBLY_ADMIN',
        district: 'CHENGALPATTU',
        assemblyName: 'Thiruporur',
        createdBy: 'SYSTEM_SEED'
      });
      logger.info('[Admin Seed] Created Assembly Admin: ass_thiruporur / BJP@2026');
    }

    // 5. Sample Booth Admin (Thiruporur Booth 1)
    const boothAdmin = await Admin.findOne({ username: 'booth_thiruporur_1' });
    if (!boothAdmin) {
      await Admin.create({
        username: 'booth_thiruporur_1',
        password: 'BJP@2026',
        role: 'BOOTH_ADMIN',
        district: 'CHENGALPATTU',
        assemblyName: 'Thiruporur',
        boothNo: '1',
        createdBy: 'SYSTEM_SEED'
      });
      logger.info('[Admin Seed] Created Booth Admin: booth_thiruporur_1 / BJP@2026');
    }
  } catch (err) {
    logger.error('[Admin Seed Error]', { error: err.message });
  }
};

const PORT = process.env.PORT || 5000;

// Connect DBs and start server
const startServer = async () => {
  await connectAppDb();
  await getVoterDbClient();
  await seedDefaultAdmins();

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
