'use strict';
/**
 * Fully localized WhatsApp Flow strings.
 * After the user picks a language, EVERY screen is shown in that language only.
 */

// ── 23 BJP Schemes — English + Tamil titles ─────────────────────────────────
const SCHEMES = [
  { id: '1',  en: 'PMSBY — Accident Insurance ₹2L',        ta: 'PMSBY — விபத்து காப்பீடு ₹2L' },
  { id: '2',  en: 'PMJJBY — Life Insurance ₹2L',           ta: 'PMJJBY — வாழ்க்கை காப்பீடு ₹2L' },
  { id: '3',  en: 'APY — Pension ₹1K-5K/month',            ta: 'APY — ஓய்வூதியம் ₹1K-5K/மாதம்' },
  { id: '4',  en: 'PM SVANidhi — Vendor Loan ₹10K-50K',    ta: 'PM SVANidhi — வியாபாரி கடன் ₹10K-50K' },
  { id: '5',  en: 'PM Mudra Shishu — Loan upto ₹50K',      ta: 'PM Mudra Shishu — கடன் ₹50K வரை' },
  { id: '6',  en: 'PM Mudra Kishor — Loan ₹50K-5L',        ta: 'PM Mudra Kishor — கடன் ₹50K-5L' },
  { id: '7',  en: 'Udyam — MSME Registration',             ta: 'Udyam — MSME பதிவு' },
  { id: '8',  en: 'Stand Up India — Loan ₹10L-1Cr',        ta: 'Stand Up India — கடன் ₹10L-1Cr' },
  { id: '9',  en: 'Startup Seed Fund',                     ta: 'Startup Seed Fund — தொடக்க நிதி' },
  { id: '10', en: 'PM Kisan — ₹6000/year',                 ta: 'PM Kisan — ₹6000/ஆண்டு' },
  { id: '11', en: 'PM Fasal Bima — Crop Insurance',        ta: 'PM Fasal Bima — பயிர் காப்பீடு' },
  { id: '12', en: 'PM Kisan Maan Dhan — Farmer Pension',   ta: 'PM Kisan Maan Dhan — விவசாயி ஓய்வூதியம்' },
  { id: '13', en: 'Ayushman Bharat — ₹5L Health Cover',    ta: 'Ayushman Bharat — ₹5L மருத்துவ காப்பீடு' },
  { id: '14', en: 'ABHA — Digital Health ID',              ta: 'ABHA — டிஜிட்டல் சுகாதார அடையாளம்' },
  { id: '15', en: 'PM Ujjwala — Free LPG Connection',      ta: 'PM Ujjwala — இலவச சமையல் எரிவாயு' },
  { id: '16', en: 'PM Matru Vandana — ₹5000 Maternity',    ta: 'PM Matru Vandana — ₹5000 தாய்மை உதவி' },
  { id: '17', en: 'Sukanya Samridhi — Girl Child Savings', ta: 'Sukanya Samridhi — பெண் குழந்தை சேமிப்பு' },
  { id: '18', en: 'PM Awas Yojana — Free Housing',         ta: 'PM Awas Yojana — இலவச வீட்டு வசதி' },
  { id: '19', en: 'PMKVY — Free Skill Training',           ta: 'PMKVY — இலவச திறன் பயிற்சி' },
  { id: '20', en: 'NSP Scholarship — Class 1 to PhD',      ta: 'NSP உதவித்தொகை — வகுப்பு 1 முதல் PhD' },
  { id: '21', en: 'PM Vishwakarma — Artisan Support',      ta: 'PM Vishwakarma — கைவினைஞர் ஆதரவு' },
  { id: '22', en: 'Jan Dhan — Zero Balance Account',       ta: 'Jan Dhan — பூஜ்ய இருப்பு கணக்கு' },
  { id: '23', en: 'e-Shram — Worker Registration',         ta: 'e-Shram — தொழிலாளர் பதிவு' }
];

const schemeOptions = (lang) => SCHEMES.map(s => ({ id: s.id, title: lang === 'ta' ? s.ta : s.en }));

// ── UI string tables ─────────────────────────────────────────────────────────
const UI = {
  en: {
    // WELCOME_BACK
    wb_heading:  '✅ Welcome back!',
    wb_body:     (name) => `Great to see you again, ${name}! 👋\n\nYour BJP Nalam Thittam portal is ready. Tap below to open it.`,
    wb_btn:      'Open My Portal',
    // LOCKED_MENU
    lm_heading:  '🙏 Welcome to BJP Nalam Thittam',
    lm_body:     'Register once to unlock all services below:',
    lm_services: '🔒 My Profile\n🔒 My Schemes\n🔒 My Referral Link\n🔒 My Referrals\n🔒 Be a Booth President',
    lm_btn:      '📝 Register Now',
    // EPIC_ENTRY
    ep_heading:  '📋 Voter Registration',
    ep_body:     'Enter the EPIC number printed on your Voter ID card.',
    ep_label:    'EPIC Number',
    ep_helper:   'Example: ZKF2181790',
    ep_btn:      '🔍 Search',
    // CONFIRM_VOTER
    cv_heading:  '✅ Voter Found',
    cv_question: 'Please confirm your details:',
    cv_yes:      "Yes, that's me",
    cv_no:       'No, wrong details',
    cv_label:    'Confirm identity',
    cv_btn:      'Continue',
    // REG_SUCCESS
    rs_heading:  '🎉 Registration Successful!',
    rs_body:     (name) => `Welcome, ${name}! Your portal is now unlocked:\n\n✅ My Profile\n✅ My Schemes\n✅ My Referral Link\n✅ My Referrals\n✅ Be a Booth President`,
    rs_btn:      '🏠 Open Portal',
    // MAIN_MENU
    mm_welcome:  (name) => `✅ Welcome, ${name}!`,
    mm_subtitle: 'BJP Nalam Thittam Portal — choose a service:',
    mm_label:    'Select a service',
    mm_btn:      'Continue',
    mm_profile:  '👤 My Profile',
    mm_schemes:  '📋 My Schemes',
    mm_referral: '🔗 My Referral Link',
    mm_referrals:'👥 My Referrals',
    mm_booth:    '🏛️ Be a Booth President',
    // MY_PROFILE
    pf_heading:  '👤 My Profile',
    pf_done:     '✅ Done',
    // MY_SCHEMES
    sc_heading:  '📋 My Schemes',
    sc_apply:    '➕ Apply for More Schemes →',
    // APPLY_SCHEME
    as_heading:  '📋 Apply for a Scheme',
    as_body:     'Select the scheme you want to apply for:',
    as_label:    'Select Scheme',
    as_btn:      '✅ Apply',
    // SCHEME_APPLIED
    sa_heading:  '🎉 Application Submitted!',
    sa_body:     (scheme, status) => `Scheme: ${scheme}\nStatus: ${status}\n\nWe will notify you on WhatsApp once it is reviewed.`,
    sa_done:     '✅ Done',
    // MY_REFERRAL
    rl_heading:  '🔗 My Referral Link',
    rl_done:     '✅ Done',
    // MY_REFERRALS
    rf_heading:  '👥 My Referrals',
    rf_done:     '✅ Done',
    // BOOTH_PRESIDENT
    bp_heading:  '🏛️ Be a Booth President',
    bp_body:     (booth, ass) => `Serve your area as an official BJP Booth President!\n\nYour current booth: ${booth}\nAssembly: ${ass}`,
    bp_booth_label: 'Target Booth Number',
    bp_ass_label:   'Target Assembly Name',
    bp_btn:      '📤 Submit Request',
    bp_submitted_heading: '✅ Request Submitted!',
    bp_submitted_body: (booth, ass, status) => `Booth: ${booth}\nAssembly: ${ass}\nStatus: ${status}\n\nOur team will review and contact you.`,
    bp_done:     '✅ Done',
    lang_label:  'Select Language / மொழி'
  },
  ta: {
    wb_heading:  '✅ மீண்டும் வரவேற்கிறோம்!',
    wb_body:     (name) => `மீண்டும் சந்தித்ததில் மகிழ்ச்சி, ${name}! 👋\n\nஉங்கள் BJP நலம் திட்ட போர்டல் தயார். திறக்க கீழே தட்டவும்.`,
    wb_btn:      'என் போர்டலை திற',
    lm_heading:  '🙏 பாஜக நலம் திட்டம்',
    lm_body:     'அனைத்து சேவைகளையும் பெற ஒருமுறை பதிவு செய்யவும்:',
    lm_services: '🔒 என் சுயவிவரம்\n🔒 என் திட்டங்கள்\n🔒 என் பரிந்துரை இணைப்பு\n🔒 என் பரிந்துரைகள்\n🔒 துறை தலைவர் விண்ணப்பம்',
    lm_btn:      '📝 இப்போது பதிவு செய்யுங்கள்',
    ep_heading:  '📋 வாக்காளர் பதிவு',
    ep_body:     'உங்கள் வாக்காளர் அட்டையில் உள்ள EPIC எண்ணை உள்ளிடவும்.',
    ep_label:    'EPIC எண்',
    ep_helper:   'எடுத்துக்காட்டு: ZKF2181790',
    ep_btn:      '🔍 தேடு',
    cv_heading:  '✅ வாக்காளர் கண்டறியப்பட்டார்',
    cv_question: 'உங்கள் விவரங்களை உறுதிப்படுத்தவும்:',
    cv_yes:      'ஆம், நான்தான்',
    cv_no:       'இல்லை, தவறான விவரம்',
    cv_label:    'அடையாளத்தை உறுதிப்படுத்தவும்',
    cv_btn:      'தொடர்',
    rs_heading:  '🎉 பதிவு வெற்றிகரமாக முடிந்தது!',
    rs_body:     (name) => `வரவேற்கிறோம், ${name}! உங்கள் போர்டல் இப்போது திறக்கப்பட்டது:\n\n✅ என் சுயவிவரம்\n✅ என் திட்டங்கள்\n✅ என் பரிந்துரை இணைப்பு\n✅ என் பரிந்துரைகள்\n✅ துறை தலைவர் விண்ணப்பம்`,
    rs_btn:      '🏠 போர்டலை திற',
    mm_welcome:  (name) => `✅ வரவேற்கிறோம், ${name}!`,
    mm_subtitle: 'பாஜக நலம் திட்ட போர்டல் — ஒரு சேவையை தேர்ந்தெடுக்கவும்:',
    mm_label:    'சேவையை தேர்ந்தெடுக்கவும்',
    mm_btn:      'தொடர்',
    mm_profile:  '👤 என் சுயவிவரம்',
    mm_schemes:  '📋 என் திட்டங்கள்',
    mm_referral: '🔗 என் பரிந்துரை இணைப்பு',
    mm_referrals:'👥 என் பரிந்துரைகள்',
    mm_booth:    '🏛️ துறை தலைவர் விண்ணப்பம்',
    pf_heading:  '👤 என் சுயவிவரம்',
    pf_done:     '✅ முடிந்தது',
    sc_heading:  '📋 என் திட்டங்கள்',
    sc_apply:    '➕ புதிய திட்டத்திற்கு விண்ணப்பிக்க →',
    as_heading:  '📋 திட்டத்திற்கு விண்ணப்பிக்க',
    as_body:     'விண்ணப்பிக்க விரும்பும் திட்டத்தை தேர்ந்தெடுக்கவும்:',
    as_label:    'திட்டம் தேர்வு',
    as_btn:      '✅ விண்ணப்பி',
    sa_heading:  '🎉 விண்ணப்பம் சமர்ப்பிக்கப்பட்டது!',
    sa_body:     (scheme, status) => `திட்டம்: ${scheme}\nநிலை: ${status}\n\nஆய்வு முடிந்ததும் WhatsApp-ல் தெரிவிப்போம்.`,
    sa_done:     '✅ முடிந்தது',
    rl_heading:  '🔗 என் பரிந்துரை இணைப்பு',
    rl_done:     '✅ முடிந்தது',
    rf_heading:  '👥 என் பரிந்துரைகள்',
    rf_done:     '✅ முடிந்தது',
    bp_heading:  '🏛️ துறை தலைவர் ஆகுங்கள்',
    bp_body:     (booth, ass) => `உங்கள் பகுதியில் அதிகாரப்பூர்வ பாஜக துறை தலைவராக சேவை செய்யுங்கள்!\n\nஉங்கள் தற்போதைய சாவடி: ${booth}\nதொகுதி: ${ass}`,
    bp_booth_label: 'இலக்கு சாவடி எண்',
    bp_ass_label:   'இலக்கு தொகுதி பெயர்',
    bp_btn:      '📤 விண்ணப்பத்தை சமர்ப்பி',
    bp_submitted_heading: '✅ விண்ணப்பம் சமர்ப்பிக்கப்பட்டது!',
    bp_submitted_body: (booth, ass, status) => `சாவடி: ${booth}\nதொகுதி: ${ass}\nநிலை: ${status}\n\nஎங்கள் குழு ஆய்வு செய்து தொடர்பு கொள்ளும்.`,
    bp_done:     '✅ முடிந்தது',
    lang_label:  'மொழியை தேர்ந்தெடுக்கவும் / Language'
  }
};

const s = (lang, key, ...args) => {
  const table = UI[lang] || UI.en;
  const val = table[key] !== undefined ? table[key] : UI.en[key];
  return typeof val === 'function' ? val(...args) : val;
};

module.exports = { UI, SCHEMES, schemeOptions, s };
