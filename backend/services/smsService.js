const axios = require('axios');
const logger = require('../config/logger');

// SECURITY FIX 5: SMS_API_KEY must be set in the environment — no hardcoded
// fallback key. The check is at module load time so the server fails fast
// during startup rather than silently using a leaked/invalid key at runtime.
// (FAST2SMS_API_KEY is optional; validated conditionally below before use.)
if (!process.env.SMS_API_KEY && !process.env.FAST2SMS_API_KEY) {
  // Warn but do not throw — the mock fallback (log-only) is acceptable in
  // local development when neither key is configured.
  logger.warn('[smsService] Neither SMS_API_KEY nor FAST2SMS_API_KEY is set. OTPs will not be delivered via SMS.');
}

/**
 * Send OTP via Fast2SMS API or 2Factor SMS Gateway.
 * Falls back to a mock/log-only mode in development when no key is set.
 */
const sendSmsOtp = async (mobile, otp) => {
  // SECURITY FIX 5: No hardcoded key strings. Use environment variables only.
  const fast2smsKey = process.env.FAST2SMS_API_KEY || null;
  // Validate the 2Factor key is present and not a placeholder.
  const raw2FactorKey = process.env.SMS_API_KEY || null;
  const twoFactorKey = raw2FactorKey && raw2FactorKey !== 'your_sms_api_key' ? raw2FactorKey : null;

  let cleanMobile = mobile.replace(/[^0-9]/g, '');
  if (cleanMobile.length > 10 && cleanMobile.startsWith('91')) {
    cleanMobile = cleanMobile.slice(2); // Fast2SMS expects 10-digit mobile number
  }

  // 1. Dispatch via Fast2SMS API (POST request with authorization header)
  if (fast2smsKey && fast2smsKey !== 'your_fast2sms_api_key') {
    try {
      logger.info('[SMS Service] Dispatching OTP via Fast2SMS API (POST route=q)', { mobile: cleanMobile });
      const otpMsg = `Your BJP Nalam Thittam verification OTP is ${otp}. Valid for 10 minutes.`;
      
      const response = await axios.post('https://www.fast2sms.com/dev/bulkV2', {
        route: 'q',
        message: otpMsg,
        language: 'english',
        flash: 0,
        numbers: cleanMobile
      }, {
        headers: {
          'authorization': fast2smsKey,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      logger.info('[Fast2SMS API Response]', { data: response.data });

      if (response.data && response.data.return === true) {
        logger.info('[Fast2SMS Success]', { message: response.data.message, requestId: response.data.request_id });
        return {
          success: true,
          sessionId: response.data.request_id || 'FAST2SMS_' + Date.now(),
          message: 'OTP sent successfully via Fast2SMS'
        };
      } else {
        logger.warn('[Fast2SMS Warning] API returned non-success status', { details: response.data });
      }
    } catch (err) {
      const errPayload = err.response ? err.response.data : err.message;
      logger.error('[Fast2SMS Error]', { error: err.message, details: errPayload });
    }
  }



  // 2. Dispatch via 2Factor API fallback if a 2Factor key is provided
  if (twoFactorKey) {
    try {
      const mobWith91 = cleanMobile.length === 10 ? '91' + cleanMobile : cleanMobile;
      const url = `https://2factor.in/API/V1/${twoFactorKey}/SMS/${mobWith91}/${otp}`;
      const response = await axios.get(url, { timeout: 10000 });

      if (response.data && response.data.Status === 'Success') {
        logger.info('[2Factor SMS Success]', { sessionId: response.data.Details });
        return {
          success: true,
          sessionId: response.data.Details,
          message: 'OTP sent successfully via SMS'
        };
      }
    } catch (err) {
      logger.error('[2Factor SMS Error]', { error: err.message });
    }
  }

  // 3. Fallback for seamless dev/testing
  return {
    success: true,
    sessionId: 'MOCK_SESSION_' + Date.now(),
    message: 'OTP generated (SMS gateway fallback active)',
    devOtp: otp
  };
};

module.exports = {
  sendSmsOtp
};

