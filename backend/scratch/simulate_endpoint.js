const mongoose = require('mongoose');
require('dotenv').config();

const userSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.model('User', userSchema, 'users');

async function simulateEndpoint() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/bjp_nalam_thittam_db');

  const scopeQuery = { mobile: { $ne: '7010905730' } };

  const dbUsersForAi = await User.find(scopeQuery)
    .sort({ referralsCount: -1 })
    .limit(10)
    .select('voterName mobile epicNo district assemblyName boothNo referralCode referralsCount')
    .lean();

  const liveAiReferralsList = await Promise.all(
    dbUsersForAi.map(async (u) => {
      const refCount = await User.countDocuments({
        $or: [
          { referredBy: u.mobile },
          { referredBy: u.epicNo },
          { referredBy: u.referralCode }
        ]
      });
      const finalCount = Math.max(u.referralsCount || 0, refCount);
      return {
        voterName: u.voterName || 'Member',
        mobile: u.mobile || 'N/A',
        epicNo: u.epicNo || 'N/A',
        district: u.district || '',
        assemblyName: u.assemblyName || '',
        boothNo: u.boothNo || '',
        referralCount: finalCount
      };
    })
  );

  liveAiReferralsList.sort((a, b) => b.referralCount - a.referralCount);

  const topReferralsText = liveAiReferralsList.slice(0, 5).map((ref, idx) => {
    const icon = idx === 0 ? '🥇 #1 Top Referrer: ' : idx === 1 ? '🥈 #2 Top Referrer: ' : idx === 2 ? '🥉 #3 Top Referrer: ' : `• #${idx + 1} Referrer: `;
    return `${icon}${ref.voterName} | Mobile: ${ref.mobile} | EPIC: ${ref.epicNo} — ${ref.referralCount} Member Referral${ref.referralCount !== 1 ? 's' : ''}`;
  }).join('\n');

  const groundMobilizersText = liveAiReferralsList.slice(0, 5).map((m, idx) => {
    const icon = idx === 0 ? '🥇 #1 Ground Mobilizer: ' : idx === 1 ? '🥈 #2 Ground Mobilizer: ' : idx === 2 ? '🥉 #3 Ground Mobilizer: ' : `• #${idx + 1} Ground Mobilizer: `;
    const loc = m.assemblyName && m.boothNo ? `${m.assemblyName} Booth ${m.boothNo} Field Leader` : m.district || 'Ground Field Officer';
    return `${icon}${m.voterName} | Mobile: ${m.mobile} | EPIC: ${m.epicNo} — ${m.referralCount} Referrals | Location: ${loc}`;
  }).join('\n');

  console.log('=== TOP MEMBER REFERRALS (LIVE) ===');
  console.log(topReferralsText);
  console.log('\n=== GROUND MOBILIZERS (LIVE) ===');
  console.log(groundMobilizersText);

  process.exit(0);
}
simulateEndpoint();
