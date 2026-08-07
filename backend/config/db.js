const mongoose = require('mongoose');
const { MongoClient } = require('mongodb');
const logger = require('./logger');

// App Write Database Connection (Mongoose)
const connectAppDb = async () => {
  try {
    const appUrl = process.env.MONGO_APP_URL || process.env.MONGO_URI;
    if (!appUrl) {
      throw new Error('No app database URL set. Define MONGO_APP_URL (or MONGO_URI) in your .env file.');
    }
    const conn = await mongoose.connect(appUrl, {
      dbName: process.env.MONGO_DB || 'bjp_nalam_thittam_db'
    });
    logger.info('[App DB] Connected successfully to Mongoose', { host: conn.connection.host });
    return conn;
  } catch (error) {
    logger.error('[App DB Connection Error]', { error: error.message });
    process.exit(1);
  }
};

// Voter Read-Only Database Client (Native MongoDB Client for fast cross-collection queries)
let voterClient = null;

const getVoterDbClient = async () => {
  if (!voterClient) {
    const voterUrl = process.env.MONGO_VOTER_URL || process.env.MONGO_APP_URL || process.env.MONGO_URI;
    try {
      voterClient = new MongoClient(voterUrl);
      await voterClient.connect();
      logger.info('[Voter DB] Native MongoClient connected');
    } catch (err) {
      logger.error('[Voter DB Connection Error]', { error: err.message });
      // If primary Voter DB URL failed (e.g. DNS ESERVFAIL), attempt fallback to App URL
      const fallbackUrl = process.env.MONGO_APP_URL || process.env.MONGO_URI;
      if (fallbackUrl && fallbackUrl !== voterUrl) {
        logger.info('[Voter DB] Attempting fallback to MONGO_APP_URL...');
        voterClient = new MongoClient(fallbackUrl);
        await voterClient.connect();
        logger.info('[Voter DB] Fallback MongoClient connected');
      } else {
        throw err;
      }
    }
  }
  return voterClient.db(process.env.MONGO_VOTER_DB_NAME || 'voter_db');
};

module.exports = {
  connectAppDb,
  getVoterDbClient
};
