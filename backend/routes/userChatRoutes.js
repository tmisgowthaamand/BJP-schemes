const express = require('express');
const router = express.Router();
const {
  sendOtp,
  verifyOtp,
  checkMobile,
  validateEpic,
  getProfile,
  registerSchemes,
  getReferralLink,
  getMyMembers,
  getMemberStatus
} = require('../controllers/userChatController');

router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);
router.post('/check-mobile', checkMobile);
router.post('/validate-epic', validateEpic);
router.get('/profile/:epicNo', getProfile);
router.post('/register-schemes', registerSchemes);
router.get('/referral-link/:ntCode', getReferralLink);
router.get('/my-members/:ntCode', getMyMembers);
router.get('/member-status/:ntCode', getMemberStatus);

// Public assemblies list for booth president form (no auth required — read-only metadata)
router.get('/assemblies-list', async (req, res) => {
  try {
    const { getAssemblyMetadata } = require('../services/jurisdictionService');
    const assemblies = await getAssemblyMetadata();
    if (!assemblies || assemblies.length === 0) {
      return res.status(200).json({ success: true, assemblies: [], message: 'Cache warming up — try again in a few seconds' });
    }
    return res.status(200).json({ success: true, count: assemblies.length, assemblies });
  } catch (err) {
    console.error('[assemblies-list Error]', err.message);
    return res.status(500).json({ success: false, message: 'Could not load assemblies', error: err.message });
  }
});

module.exports = router;
