import { createContext, useContext, useState, useCallback } from 'react'

function interpolate(str, params) {
  if (!params) return str
  return str.replace(/\{(\w+)\}/g, (m, k) => (k in params ? params[k] : m))
}

// ── Tamil translations (key = the English source string used in t("...")) ──
// Any string missing here gracefully falls back to English.
const TA = {
  // Brand / header / menu
  'BJP Nalam Thittam': 'பாஜக நலதிட்டம்',
  'BJP TAMIL NADU': 'பாஜக தமிழ்நாடு',
  'Online': 'ஆன்லைன்',
  'BJP TN Member Bot': 'பாஜக தமிழ்நாடு உறுப்பினர் பாட்',
  'Register for Central Government Schemes': 'மத்திய அரசு திட்டங்களுக்கு பதிவு செய்யுங்கள்',
  'Registration completed successfully!': 'பதிவு வெற்றிகரமாக முடிந்தது!',
  'Nation First. Party Next. Self Last.': 'தேசம் முதலில். கட்சி அடுத்து. தன்னலம் கடைசி.',

  // Sidebar / menu items
  'My Profile': 'எனது சுயவிவரம்',
  'View your registration details': 'உங்கள் பதிவு விவரங்களைக் காண்க',
  'My Schemes': 'எனது திட்டங்கள்',
  'Schemes you registered for': 'நீங்கள் பதிவு செய்த திட்டங்கள்',
  'Referral Link': 'பரிந்துரை இணைப்பு',
  'Share and invite others': 'பகிர்ந்து மற்றவர்களை அழைக்கவும்',
  'My Referrals': 'எனது பரிந்துரைகள்',
  'Members you referred': 'நீங்கள் பரிந்துரைத்த உறுப்பினர்கள்',
  'Logout': 'வெளியேறு',
  'Menu': 'மெனு',
  'Complete registration to unlock': 'திறக்க பதிவை முடிக்கவும்',

  // Welcome banner
  "World's Largest. India's Biggest. Soon to be Tamil Nadu's No. 1.":
    'உலகின் மிகப் பெரிய அமைப்பு. இந்தியாவின் மிகப் பெரிய கட்சி. விரைவில் தமிழ்நாட்டின் No.1.',
  "You are joining the world's leading political organization. Click below to register for Central Government welfare schemes.":
    'நீங்கள் உலகின் முன்னணி அரசியல் அமைப்பில் இணைகிறீர்கள். மத்திய அரசு நலத்திட்டங்களுக்கு பதிவு செய்ய கீழே கிளிக் செய்யவும்.',
  'Start': 'தொடங்கு',

  // Chat flow prompts
  '📱 Please enter your 10-digit mobile number to get started.':
    '📱 தொடங்க உங்கள் 10 இலக்க கைபேசி எண்ணை உள்ளிடவும்.',
  '❌ Please enter a valid 10-digit mobile number.': '❌ சரியான 10 இலக்க கைபேசி எண்ணை உள்ளிடவும்.',
  '❌ Please enter the 6-digit OTP sent to your number.': '❌ உங்கள் எண்ணுக்கு அனுப்பப்பட்ட 6 இலக்க OTP-ஐ உள்ளிடவும்.',
  '✅ Voter found! Please confirm your details:': '✅ வாக்காளர் கண்டறியப்பட்டார்! உங்கள் விவரங்களை உறுதிப்படுத்தவும்:',
  '🎯 Please select the Central Government schemes you are interested in applying for:':
    '🎯 நீங்கள் விண்ணப்பிக்க விரும்பும் மத்திய அரசு திட்டங்களைத் தேர்ந்தெடுக்கவும்:',
  '🎉 Your scheme registration is complete!': '🎉 உங்கள் திட்டப் பதிவு முடிந்தது!',
'Registration in progress': 'பதிவு நடைபெற்று வருகிறது',
  'Registration Successful': 'பதிவு வெற்றி',

  // Inputs / buttons
  'Enter 10-digit mobile number': '10 இலக்க கைபேசி எண்ணை உள்ளிடவும்',
  'Enter 6-digit OTP': '6 இலக்க OTP-ஐ உள்ளிடவும்',
  'EPIC Number (e.g. ABC1234567)': 'EPIC எண் (எ.கா. ABC1234567)',
  'Send': 'அனுப்பு',
  'Resend OTP': 'OTP மீண்டும் அனுப்பு',
  'Confirm Details': 'விவரங்களை உறுதிப்படுத்து',
  'Re-enter ID': 'ID-ஐ மீண்டும் உள்ளிடவும்',
  'Voter Details': 'வாக்காளர் விவரங்கள்',

  // Scheme selection
  'Select one or more schemes you are interested in': 'நீங்கள் விரும்பும் ஒன்று அல்லது அதற்கு மேற்பட்ட திட்டங்களைத் தேர்ந்தெடுக்கவும்',
  'Register & Get My Referral Link': 'பதிவு செய்து எனது பரிந்துரை இணைப்பைப் பெறுங்கள்',
  'Registering your schemes...': 'உங்கள் திட்டங்கள் பதிவு செய்யப்படுகிறது...',

  // Profile / referrals
  'State': 'மாநிலம்',
  'Tamil Nadu': 'தமிழ்நாடு',
  'Assembly': 'சட்டமன்றத் தொகுதி',
  'District': 'மாவட்டம்',
  'Polling Booth': 'வாக்குச்சாவடி',
  'Booth': 'சாவடி',
  'Total Referrals': 'மொத்த பரிந்துரைகள்',
  'EPIC Number': 'EPIC எண்',
  'Mobile Number': 'கைபேசி எண்',
  'BJP Registered Member': 'பாஜக பதிவு உறுப்பினர்',
  'BJP Volunteer Agent': 'பாஜக தன்னார்வ முகவர்',
  'Copy Link': 'இணைப்பை நகலெடு',
  'Copied!': 'நகலெடுக்கப்பட்டது!',
  'Share on WhatsApp': 'வாட்ஸ்அப்பில் பகிர்',
  'Download QR Code': 'QR குறியீட்டைப் பதிவிறக்கு',
  'No referrals yet': 'இதுவரை பரிந்துரைகள் இல்லை',
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
