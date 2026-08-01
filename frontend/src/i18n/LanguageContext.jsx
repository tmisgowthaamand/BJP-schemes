import { createContext, useContext, useState, useCallback } from 'react'

function interpolate(str, params) {
  if (!params) return str
  return str.replace(/\{(\w+)\}/g, (m, k) => (k in params ? params[k] : m))
}

// ── Tamil translations (key = the exact English source string used in t("...")) ──
// Placeholders like {mobile}, {count}, {title}, {seconds} are preserved.
// Any string missing here gracefully falls back to English.
const TA = {
  // 1. Banner & welcome
  "World's Largest. India's Biggest. Soon to be Tamil Nadu's No. 1.":
    'உலகின் மிகப் பெரிய அமைப்பு. இந்தியாவின் மிகப் பெரிய கட்சி. விரைவில் தமிழ்நாட்டின் No.1.',
  "You are joining the world's leading political organization. Click below to register for Central Government welfare schemes.":
    'நீங்கள் உலகின் முன்னணி அரசியல் அமைப்பில் இணைகிறீர்கள். மத்திய அரசு நலத்திட்டங்களுக்கு பதிவு செய்ய கீழே கிளிக் செய்யவும்.',
  'Start': 'தொடங்கு',

  // 2. Chat guidance & bot messages
  '📱 Please enter your 10-digit mobile number to get started.':
    '📱 தொடங்குவதற்கு உங்கள் 10 இலக்க மொபைல் எண்ணை உள்ளிடவும்.',
  '❌ Please enter a valid 10-digit mobile number.': '❌ சரியான 10 இலக்க மொபைல் எண்ணை உள்ளிடவும்.',
  '📱 A 6-digit OTP has been sent to {mobile}. Please enter the OTP to verify.':
    '📱 {mobile} எண்ணிற்கு 6 இலக்க OTP அனுப்பப்பட்டுள்ளது. சரிபார்க்க OTP-யை உள்ளிடவும்.',
  '❌ Could not send OTP. Please try again.': '❌ OTP அனுப்ப முடியவில்லை. மீண்டும் முயற்சிக்கவும்.',
  'Failed to send OTP. Please try again.': 'OTP அனுப்புவதில் தோல்வி. மீண்டும் முயற்சிக்கவும்.',
  '❌ Please enter the 6-digit OTP sent to your number.': '❌ உங்கள் எண்ணுக்கு அனுப்பப்பட்ட 6 இலக்க OTP-யை உள்ளிடவும்.',
  '👋 Welcome back! Mobile number verified.': '👋 மீண்டும் வரவேற்கிறோம் ! மொபைல் எண் சரிபார்க்கப்பட்டது.',
  '✅ Mobile verified! You are not registered yet — enter your EPIC Number (Voter ID) to continue.':
    '✅ மொபைல் எண் சரிபார்க்கப்பட்டது! நீங்கள் இதுவரை பதிவு செய்யவில்லை — தொடர உங்கள் EPIC எண்ணை (வாக்காளர் அடையாள அட்டை எண்) உள்ளிடவும்.',
  '📋 Format: 3 letters + 7 digits  e.g. ABC1234567':
    '📋 வடிவமைப்பு: 3 எழுத்துகள் + 7 இலக்கங்கள் எ.கா. ABC1234567',
  'Invalid OTP. Please try again.': 'தவறான OTP. மீண்டும் முயற்சிக்கவும்.',
  '📨 A new OTP has been sent to {mobile}.': '📨 {mobile} எண்ணிற்குப் புதிய OTP அனுப்பப்பட்டுள்ளது.',
  '❌ Could not resend OTP. Please try again shortly.': '❌ OTP-யை மீண்டும் அனுப்ப முடியவில்லை. சிறிது நேரத்தில் முயற்சிக்கவும்.',
  'Could not resend OTP. Please try again.': 'OTP-யை மீண்டும் அனுப்ப முடியவில்லை. மீண்டும் முயற்சிக்கவும்.',
  '❌ Invalid format. Use 3 letters + 7 digits (e.g., ABC1234567).':
    '❌ தவறான வடிவமைப்பு. 3 எழுத்துகள் + 7 இலக்கங்களைப் பயன்படுத்தவும் (எ.கா., ABC1234567).',
  'Voter data not found in response': 'உங்கள் வாக்காளர் தரவு கிடைக்கவில்லை',
  '✅ Voter found! Please confirm your details:': '✅ வாக்காளர் விவரம் கிடைத்தது! உங்கள் விவரங்களை உறுதிப்படுத்தவும்:',
  'EPIC not found in Voter DB. Please check and try again.':
    'வாக்காளர் தரவுத்தளத்தில் EPIC எண் கிடைக்கவில்லை. சரிபார்த்து மீண்டும் முயற்சிக்கவும்.',
  '📋 Please enter your EPIC Number again.': '📋 உங்கள் EPIC எண்ணை மீண்டும் உள்ளிடவும்.',
  '🎯 Please select the Central Government schemes you are interested in applying for:':
    '🎯 நீங்கள் விண்ணப்பிக்க விரும்பும் மத்திய அரசு நலத்திட்டங்களைத் தேர்ந்தெடுக்கவும்:',
  '🎉 Your scheme registration is complete!': '🎉 உங்கள் நலத்திட்ட விண்ணப்பம் வெற்றிகரமாக பதிவு செய்யப்பட்டது !',
  'Registration failed. Please try again.': 'பதிவு தோல்வியடைந்தது. மீண்டும் முயற்சிக்கவும்.',
  '🔒 You have been logged out after 30 minutes of inactivity. Tap Start to continue.':
    '🔒 30 நிமிடங்கள் செயலற்று இருந்ததால் நீங்கள் வெளியேற்றப்பட்டீர்கள். தொடர "தொடங்கு" என்பதை கிளிக் செய்யவும்.',
  '⚠️ *You are already registered!* Your schemes are active.':
    '⚠️ *நீங்கள் ஏற்கனவே பதிவு செய்துள்ளீர்கள்!* உங்கள் திட்டங்கள் செயலில் உள்ளன.',
  '👋 Welcome back to *Nalam Thittam!*': '👋 *நலத்திட்ட* பக்கத்திற்கு மீண்டும் வரவேற்கிறோம் !',
  'Your scheme application status has been updated.': 'உங்கள் நலத்திட்ட விண்ணப்ப நிலை புதுப்பிக்கப்பட்டது.',
  'Logout and start over?': 'வெளியேறி மீண்டும் தொடங்கவா?',

  // 3. Voter details card
  'Voter Details': 'வாக்காளர் விவரங்கள்',
  'Name': 'பெயர்',
  "Father's Name": 'தந்தையின் பெயர்',
  'EPIC No': 'EPIC எண்',
  'Age / Gender': 'வயது / பாலினம்',
  'Assembly': 'சட்டமன்றத் தொகுதி',
  'District': 'மாவட்டம்',
  'Part No': 'பகுதி எண்',
  'Serial No': 'வரிசை எண்',
  'Confirm Details': 'விவரங்களை உறுதிப்படுத்து',
  'Re-enter ID': 'அடையாள எண்ணை மீண்டும் உள்ளிடு',
  '✓ Confirmed': '✓ உறுதிசெய்யப்பட்டது',
  '↩ Try Again': '↩ மீண்டும் முயற்சிக்கவும்',

  // 4. Referral link & QR
  'Referral Link': 'பரிந்துரை இணைப்பு( Referral Link )',
  '🪷 Here is your referral link and QR code! Share this to invite others and build your team:':
    '🪷 உங்கள் பரிந்துரை இணைப்பு( Referral Link ) மற்றும் QR குறியீடு இதோ! மற்றவர்களை இணைக்கவும், உங்கள் குழுவை உருவாக்கவும் இதைப் பகிரவும்:',
  'Scan this QR to join BJP Tamil Nadu': 'தமிழக பாஜக-வில்  இணைய இந்த QR-ஐ ஸ்கேன் செய்யவும்',
  'Copy Link': 'இணைப்பை நகலெடு',
  'Copied!': 'நகலெடுக்கப்பட்டது!',
  'Share on WhatsApp': 'வாட்ஸ்அப்பில் பகிர்',
  'Share WhatsApp': 'வாட்ஸ்அப் பகிர்வு',
  'Download QR Code': 'QR குறியீட்டைப் பதிவிறக்கு',
  'Everyone who joins via your link or QR appears in your *My Members* list.':
    'உங்கள் இணைப்பு அல்லது QR மூலம் இணைபவர்கள் அனைவரும் உங்கள் *எனது உறுப்பினர்கள்* பட்டியலில் பார்த்துக்கொள்ளலாம்.',
  'No referral link available.': 'பரிந்துரை இணைப்பு எதுவும் இல்லை.',
  '*🪷 Join BJP Tamil Nadu!*': '*🪷 தமிழக பாஜக-வில் இணையுங்கள்!*',
  '*Generate your free Digital Member ID Card here:*': '*உங்கள் இலவச டிஜிட்டல் உறுப்பினர் அடையாள அட்டையை இங்கு உருவாக்கவும்:*',
  '🪷 Join BJP Tamil Nadu!': '🪷 தமிழக பாஜக-வில் இணையுங்கள்!',

  // 5. Scheme selection & modal
  'Select one or more schemes you are interested in': 'நீங்கள் விரும்பும் ஒன்று அல்லது அதற்கு மேற்பட்ட நலத்திட்டங்களை தேர்ந்தெடுக்கவும்',
  'scheme(s) selected': 'நலத்திட்டம்(கள்) தேர்ந்தெடுக்கப்பட்டது',
  '{count} scheme(s) selected ✓': '{count} நலத்திட்டம்(கள்) தேர்ந்தெடுக்கப்பட்டது ✓',
  'Register & Get My Referral Link': 'பதிவு செய்து தங்களின் பரிந்துரை இணைப்பைப் பெறுங்கள்',
  'Registering your schemes...': 'உங்கள் நலத்திட்டங்கள் பதிவு செய்யப்படுகின்றன...',

  // 6. My schemes dashboard & tracking
  'My Schemes Dashboard': 'எனது நலத்திட்டங்கள் டாஷ்போர்டு',
  'My Applied Schemes': 'நான் விண்ணப்பித்த நலத்திட்டங்கள்',
  'No schemes applied yet. Select from the available schemes below to apply!':
    'இதுவரை எந்தத் நலத்திட்டத்திற்கும் விண்ணப்பிக்கவில்லை. கீழே உள்ள நலத்திட்டங்களிலிருந்து தேர்ந்தெடுத்து விண்ணப்பிக்கவும்!',
  'Track Application': 'விண்ணப்பத்தை கண்காணிக்க',
  'Updated': 'புதுப்பிக்கப்பட்டது',
  'Available Central Schemes to Apply': 'விண்ணப்பிக்கக்கூடிய மத்திய அரசு நலத்திட்டங்கள்',
  '🎉 Congratulations! You have applied for all 23 Central Welfare Schemes!':
    '🎉 வாழ்த்துக்கள்! நீங்கள் அனைத்து 23 மத்திய நல திட்டங்களுக்கும் விண்ணப்பித்துவிட்டீர்கள்!',
  'View Details': 'விவரங்களை காண்க',
  'Hide Steps': 'படிநிலைகளை மறை',
  'Apply Now': 'இப்போது விண்ணப்பிக்க',
  'Eligibility & Benefits': 'தகுதி & நன்மைகள்',
  'Required Documents': 'தேவையான ஆவணங்கள்',
  'Application Submitted!': 'விண்ணப்பம் சமர்ப்பிக்கப்பட்டது!',
  'Applied for {title}': '{title}-க்கு விண்ணப்பிக்கப்பட்டது',
  'Required Documents for Verification:': 'சரிபார்ப்புக்குத் தேவையான ஆவணங்கள்:',
  'I confirm to submit application request for this scheme.':
    'இந்த நலத்திட்டத்திற்கான விண்ணப்ப கோரிக்கையைச் சமர்ப்பிக்க நான் உறுதிப்படுத்துகிறேன்.',
  'Cancel': 'ரத்துசெய்',
  'Submitting...': 'சமர்ப்பிக்கப்படுகிறது...',
  'Submit Application': 'விண்ணப்பத்தை சமர்ப்பி',
  'Application Tracking': 'விண்ணப்ப கண்காணிப்பு',
  'Applied on': 'விண்ணப்பித்த தேதி',
  'Status Timeline': 'நிலை காலவரிசை',
  'This application is being synced. Please check back shortly.':
    'இந்த விண்ணப்பம் ஒத்திசைக்கப்பட்டு வருகிறது. சிறிது நேரம் கழித்து மீண்டும் பார்க்கவும்.',
  'No updates yet. Your application is being reviewed.':
    'இதுவரை புதுப்பிப்புகள் இல்லை. உங்கள் விண்ணப்பம் ஆய்வு செய்யப்பட்டு வருகிறது.',

  // 7. My profile
  'My Profile': 'எனது சுயவிவரம்',
  'BJP Volunteer Agent': 'பாஜக தன்னார்வத் தொண்டர்',
  'BJP Registered Member': 'பாஜக பதிவு செய்யப்பட்ட உறுப்பினர்',
  'EPIC Number': 'EPIC எண்',
  'Mobile Number': 'மொபைல் எண்',
  'State': 'மாநிலம்',
  'Tamil Nadu': 'தமிழ்நாடு',
  'Polling Booth': 'வாக்குச்சாவடி',
  'Booth': 'சாவடி',
  'Total Referrals': 'மொத்த பரிந்துரைகள்',
  'No profile data available.': 'சுயவிவரத் தரவு எதுவும் இல்லை.',
  'Unable to load profile.': 'சுயவிவரத்தை ஏற்ற முடியவில்லை.',

  // 8. My referrals & members
  'My Referrals': 'எனது பரிந்துரைகள்',
  'My Members': 'எனது உறுப்பினர்கள்',
  '{count} people joined using your referral link': '{count} பேர் உங்கள் பரிந்துரை இணைப்பு மூலம் இணைந்துள்ளனர்',
  'No referrals yet': 'இதுவரை பரிந்துரைகள் இல்லை',
  'Share your referral link — everyone who registers through it will appear here.':
    'உங்கள் பரிந்துரை இணைப்பைப் பகிரவும் — அதன் மூலம் பதிவு செய்பவர்கள் அனைவரையும் இங்கே பார்த்துக்கொள்ளலாம்.',
  'No members yet. Share your referral link!': 'இதுவரை உறுப்பினர்கள் இல்லை. உங்கள் பரிந்துரை இணைப்பை பகிரவும்!',
  'Joined': 'இணைந்த தேதி',
  'No referral code available.': 'பரிந்துரை குறியீடு எதுவும் இல்லை.',
  'Unable to load referred members.': 'பரிந்துரைக்கப்பட்ட உறுப்பினர்களை ஏற்ற முடியவில்லை.',

  // 9. Header, navigation, sidebar & inputs
  'BJP Nalam Thittam': 'பாஜக நலத்திட்டம்',
  'Online': 'ஆன்லைன்',
  'Registration in progress': 'பதிவு நடைபெற்று வருகிறது',
  'BJP TN Member Bot': 'பாஜக-தமிழ்நாடு உறுப்பினர் செயலி',
  'Register for Central Government Schemes': 'மத்திய அரசு நலத்திட்டங்களுக்கு பதிவு செய்ய',
  'Registration completed successfully!': 'பதிவு வெற்றிகரமாக முடிந்தது!',
  'My Schemes': 'எனது நலத்திட்டங்கள்',
  'Schemes you registered for': 'நீங்கள் பதிவு செய்த நலத்திட்டங்கள்',
  'View your registration details': 'உங்கள் பதிவு விவரங்களைக் காண்க',
  'Share and invite others': 'பகிர்ந்து மற்றவர்களை அழைக்கவும்',
  'Members you referred': 'நீங்கள் பரிந்துரைத்த உறுப்பினர்கள்',
  'Complete registration to unlock': 'திறக்க பதிவை முடிக்கவும்',
  'Logout': 'வெளியேறு',
  'Enter 10-digit mobile number': '10 இலக்க மொபைல் எண்ணை உள்ளிடவும்',
  'Enter 6-digit OTP': '6 இலக்க OTP-யை உள்ளிடவும்',
  'EPIC Number (e.g. ABC1234567)': 'EPIC எண் (எ.கா. ABC1234567)',
  'Resend OTP in {seconds}s': '{seconds} வினாடிகளில் OTP-யை மீண்டும் அனுப்பு',
  'Resend OTP': 'OTP-யை மீண்டும் அனுப்பு',
  'Registration Successful': 'பதிவு வெற்றிகரமாக முடிந்தது',
  'Menu': 'பட்டியல்',
  'Send': 'அனுப்பு',
  'BJP TAMIL NADU': 'பாஜக தமிழ்நாடு',
  'Nation First. Party Next. Self Last.': 'நாடு முதலில். கட்சி அடுத்தது. தன்னலம் கடைசி.',
  'Bot is typing': 'செயலி தட்டச்சு செய்கிறது',
  'Back': 'பின்செல்',
  'Close sidebar': 'பக்கப்பட்டியை மூடு',

  // Scheme cluster categories (used via t(scheme.category))
  'Cluster 1 — Insurance Trinity': 'கிளஸ்டர் 1 — காப்பீட்டு மும்மை',
  'Cluster 2 — Credit & Enterprise': 'கிளஸ்டர் 2 — கடன் & தொழில்முனைவோர் மேம்பாடு',
  'Cluster 3 — Farmers Welfare': 'கிளஸ்டர் 3 — விவசாயிகள் நலன்',
  'Cluster 4 — Health & Wellness': 'கிளஸ்டர் 4 — சுகாதாரம் & நல்வாழ்வு',
  'Cluster 5 — Women & Families': 'கிளஸ்டர் 5 — பெண்கள் & குடும்பங்கள்',
  'Cluster 6 — Housing for All': 'கிளஸ்டர் 6 — அனைவருக்கும் வீடு',
  'Cluster 7 — Youth & Skills': 'கிளஸ்டர் 7 — இளைஞர்கள் & திறன்கள்',
  'Foundation Layer': 'அடித்தள அடுக்கு',
}

const DICTS = { ta: TA }
const STORAGE_KEY = 'bjp_lang'

const LanguageContext = createContext({
  lang: 'en',
  setLang: () => {},
  t: (s) => s,
})

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) || 'en' } catch { return 'en' }
  })

  const setLang = useCallback((next) => {
    setLangState(next)
    try { localStorage.setItem(STORAGE_KEY, next) } catch { /* ignore */ }
  }, [])

  const t = useCallback((en, params) => {
    const dict = DICTS[lang]
    const translated = (dict && dict[en]) ? dict[en] : en
    return interpolate(translated, params)
  }, [lang])

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLang() {
  return useContext(LanguageContext)
}
