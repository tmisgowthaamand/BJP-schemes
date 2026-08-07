# WhatsApp Automation Architecture
## BJP Nalam Thittam — Official Meta WhatsApp Flows

> **This uses the official Meta WhatsApp Flows API** — native UI components
> (buttons, pickers, dropdowns, forms) rendered inside WhatsApp itself.
> No "reply 1 or 2" text-based menus. Users tap native UI, not type numbers.

---

## 1. What is Meta WhatsApp Flows?

Meta WhatsApp Flows is an official Meta product that renders **native screens
inside WhatsApp** — like a mini-app. Users see real UI elements:

| Component | Used For |
|-----------|----------|
| `Button` | Language select, menu options, confirm/cancel |
| `ListPicker` | Select from 23 schemes, select district/assembly |
| `TextInput` | EPIC number entry |
| `TextBody` | Profile display, status display |
| `Image` | Banner image (our BJP banner) |
| `Footer` | Navigation / back buttons |

No external browser opens. Everything happens **inside WhatsApp**.

---

## 2. Platform Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                   BJP NALAM THITTAM PLATFORM                     │
│                                                                  │
│  WhatsApp Flows         Web Portal          Admin Dashboards     │
│  ──────────────         ──────────          ─────────────────    │
│  Native WA UI  ──┐      React SPA  ──┐      Super/State/        │
│  (Meta Flows)    ├──►  Express API  ─┼──►  District/Assembly/   │
│  No browser      │     (existing)    │      Booth Admin          │
│  No typing nums◄─┘     │             │      (unified view)       │
│                         ▼             ▼                          │
│                      MongoDB ─── ONE DB, ONE TRUTH               │
│                    bjp_nalam_thittam_db                          │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3. Banner Used in WhatsApp Flows

Same banner as the web chatbot welcome screen:

```
URL:
https://res.cloudinary.com/dkjrdntf/image/upload/
f_auto,q_auto,w_1000/v1785563946/bjp_schemes/bjp_final_banner.png

Alt text: "BJP Tamil Nadu — Nalam Thittam"

Used in:
  - Flow Screen 1: Welcome / Language Select (header image)
  - Flow Screen 2: New User Registration welcome
  - Flow Screen: Main Menu header
```

In the Flow JSON definition:
```json
{
  "type": "image",
  "src": "https://res.cloudinary.com/dkjrdntf/image/upload/f_auto,q_auto,w_1000/v1785563946/bjp_schemes/bjp_final_banner.png",
  "alt-text": "BJP Tamil Nadu — Nalam Thittam",
  "aspect-ratio": "2.8"
}
```

---

## 4. How Flows Are Triggered

User sends any message (or taps a CTA button) → backend sends a
**Flow trigger message** using the Cloud API. WhatsApp opens the Flow screen
natively inside the chat.

```
User Message / Button Tap
        │
        ▼
Backend: POST /api/whatsapp/webhook
        │
        ▼
Check WaSession → decide which Flow to open
        │
        ▼
POST to Meta Cloud API:
  /v18.0/{PHONE_NUMBER_ID}/messages
  {
    "type": "interactive",
    "interactive": {
      "type": "flow",
      "action": {
        "name": "flow",
        "parameters": {
          "flow_id": "FLOW_ID",
          "flow_cta": "Open Portal",          ← button label in chat
          "flow_action": "navigate",
          "flow_action_payload": {
            "screen": "LANGUAGE_SELECT",      ← which screen to open
            "data": { "mobile": "+91XXXXX" }  ← pass context to flow
          }
        }
      }
    }
  }
```

---

## 5. Flow Screen 1 — Language Select

**Trigger:** User sends any first message (e.g. "Hi", "நமஸ்காரம்")

```
┌─────────────────────────────────────────┐
│  [BJP Banner Image — bjp_final_banner]  │
│─────────────────────────────────────────│
│                                         │
│  🙏 Welcome to BJP Nalam Thittam        │
│  பாஜக நலம் திட்டத்திற்கு வரவேற்கிறோம் │
│                                         │
│  World's Largest. India's Biggest.      │
│  Soon to be Tamil Nadu's No. 1.         │
│                                         │
│  Select your language /                 │
│  மொழியை தேர்ந்தெடுக்கவும்:             │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  🇮🇳  தமிழ் (Tamil)           │    │ ← Button
│  └─────────────────────────────────┘    │
│  ┌─────────────────────────────────┐    │
│  │  🇮🇳  English                  │    │ ← Button
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

**Flow JSON — Screen LANGUAGE_SELECT:**
```json
{
  "id": "LANGUAGE_SELECT",
  "title": "Language / மொழி",
  "layout": {
    "type": "SingleColumnLayout",
    "children": [
      { "type": "Image",
        "src": "https://res.cloudinary.com/dkjrdntf/image/upload/f_auto,q_auto,w_1000/v1785563946/bjp_schemes/bjp_final_banner.png",
        "aspect-ratio": "2.8" },
      { "type": "TextHeading",
        "text": "🙏 BJP Nalam Thittam\nபாஜக நலம் திட்டம்" },
      { "type": "TextBody",
        "text": "World's Largest. India's Biggest.\nSoon to be Tamil Nadu's No. 1.\n\nSelect your language / மொழியை தேர்ந்தெடுக்கவும்:" },
      { "type": "Footer",
        "label": "தமிழ் (Tamil)",
        "on-click-action": {
          "name": "data_exchange",
          "payload": { "lang": "ta" }
        }
      },
      { "type": "Footer",
        "label": "English",
        "on-click-action": {
          "name": "data_exchange",
          "payload": { "lang": "en" }
        }
      }
    ]
  }
}
```

Backend receives lang → saves to WaSession → navigates to next screen.

---

## 6. Flow Screen 2A — Already Registered: Main Menu

**Trigger:** Language selected + `User.findOne({ mobile })` returns a user.

```
┌─────────────────────────────────────────┐  ← Tamil version shown
│  [BJP Banner Image]                     │
│─────────────────────────────────────────│
│                                         │
│  ✅ மீண்டும் வரவேற்கிறோம்,             │
│     [voterName]! 👋                     │
│                                         │
│  உங்கள் BJP நலம் திட்ட போர்டல்         │
│  Your BJP Nalam Thittam Portal          │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  👤  என் சுயவிவரம் / My Profile│    │ ← Button
│  └─────────────────────────────────┘    │
│  ┌─────────────────────────────────┐    │
│  │  📋  என் திட்டங்கள் / My Schemes│   │ ← Button
│  └─────────────────────────────────┘    │
│  ┌─────────────────────────────────┐    │
│  │  🔗  பரிந்துரை இணைப்பு / Referral│  │ ← Button
│  └─────────────────────────────────┘    │
│  ┌─────────────────────────────────┐    │
│  │  👥  என் பரிந்துரைகள் / Referrals│  │ ← Button
│  └─────────────────────────────────┘    │
│  ┌─────────────────────────────────┐    │
│  │  🏛️  துறை தலைவர் / Booth President│ │ ← Button
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

All 5 buttons are **active / tappable** — fully unlocked.

---

## 7. Flow Screen 2B — New User: Locked Menu

**Trigger:** Language selected + `User.findOne({ mobile })` returns null.

```
┌─────────────────────────────────────────┐
│  [BJP Banner Image]                     │
│─────────────────────────────────────────│
│                                         │
│  🙏 வரவேற்கிறோம்! / Welcome!           │
│                                         │
│  அனைத்து சேவைகளையும் பெற               │
│  முதலில் பதிவு செய்யவும்.              │
│  Register to unlock all services.       │
│                                         │
│  🔒 👤  சுயவிவரம் / My Profile         │
│  🔒 📋  திட்டங்கள் / My Schemes        │
│  🔒 🔗  பரிந்துரை / Referral Link      │
│  🔒 👥  பரிந்துரைகள் / My Referrals   │
│  🔒 🏛️  துறை தலைவர் / Booth President │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  📝  பதிவு செய்யுங்கள் /Register│   │ ← Only active button
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

Tapping **Register** navigates to Screen 3.

---

## 8. Flow Screen 3 — EPIC Entry (New User Registration)

```
┌─────────────────────────────────────────┐
│  📋 பதிவு / Registration                │
│─────────────────────────────────────────│
│                                         │
│  உங்கள் வாக்காளர் அடையாள அட்டை        │
│  எண்ணை உள்ளிடவும்.                     │
│  Enter your Voter ID Card number        │
│  (EPIC Number):                         │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  EPIC Number                    │    │ ← TextInput field
│  │  e.g. ZKF2181790                │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ℹ️ EPIC is printed on your Voter       │
│     ID card / வாக்காளர் அட்டையில்      │
│     EPIC எண் உள்ளது.                    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  🔍  தேடு / Search             │    │ ← Submit button
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

**Flow JSON — Screen EPIC_ENTRY:**
```json
{
  "id": "EPIC_ENTRY",
  "title": "பதிவு / Registration",
  "layout": {
    "type": "SingleColumnLayout",
    "children": [
      { "type": "TextHeading", "text": "📋 உங்கள் EPIC எண் / Your EPIC Number" },
      { "type": "TextBody",
        "text": "உங்கள் வாக்காளர் அட்டையில் உள்ள EPIC எண்ணை உள்ளிடவும்.\nEnter the EPIC number from your Voter ID Card." },
      { "type": "TextInput",
        "name": "epic_no",
        "label": "EPIC Number",
        "input-type": "text",
        "required": true,
        "helper-text": "Example: ZKF2181790" },
      { "type": "TextBody",
        "text": "ℹ️ EPIC is printed on your Voter ID card",
        "font-weight": "italic" },
      { "type": "Footer",
        "label": "🔍 தேடு / Search",
        "on-click-action": {
          "name": "data_exchange",
          "payload": { "epic_no": "${form.epic_no}" }
        }
      }
    ]
  }
}
```

**Backend validation on data_exchange:**
```javascript
// Query voter_db — same as web chatbot
const voter = await voterDb.collection(assemblyCollection)
  .findOne({ epic_no: epicNo.toUpperCase() });

if (!voter) {
  // Return error screen to Flow
  return { screen: "EPIC_ENTRY", data: { error: "EPIC not found. Please check and try again." } };
}

// Found → navigate to confirm screen
return { screen: "CONFIRM_VOTER", data: { voterData: voter } };
```

---

## 9. Flow Screen 4 — Confirm Voter Identity

```
┌─────────────────────────────────────────┐
│  ✅ வாக்காளர் கண்டறியப்பட்டார்         │
│  Voter Found!                           │
│─────────────────────────────────────────│
│                                         │
│  இது நீங்களா? / Is this you?            │
│                                         │
│  👤 பெயர்:      [voterName]             │
│  🏛️ மாவட்டம்:  [district]              │
│  🗳️ தொகுதி:    [assemblyName]           │
│  📍 சாவடி எண்:  Booth [boothNo]        │
│  ⚧  பாலினம்:   [gender]               │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  ✅  ஆம், நான்தான் / Yes, it's me│  │ ← Confirm button
│  └─────────────────────────────────┘    │
│  ┌─────────────────────────────────┐    │
│  │  ❌  இல்லை / No, wrong person   │    │ ← Go back button
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

**On "Yes":**
```javascript
// Create user — same as web registration
await User.create({
  mobile, epicNo, voterName, district,
  assemblyName, assemblyNo, boothNo, gender,
  referralCode: generateReferralCode(),
  channel: 'whatsapp'
});
// Navigate to REGISTRATION_SUCCESS screen
```

**On "No":** Navigate back to `EPIC_ENTRY` screen.

---

## 10. Flow Screen 5 — Registration Success + Unlocked Menu

```
┌─────────────────────────────────────────┐
│  [BJP Banner Image]                     │
│─────────────────────────────────────────│
│                                         │
│  🎉 பதிவு வெற்றிகரமாக முடிந்தது!       │
│  Registration Successful!               │
│                                         │
│  வரவேற்கிறோம், [voterName]! 🙏         │
│  Welcome, [voterName]!                  │
│                                         │
│  உங்கள் போர்டல் திறக்கப்பட்டது:       │
│  Your portal is now unlocked:           │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  👤  என் சுயவிவரம் / My Profile│    │ ← Active Button
│  └─────────────────────────────────┘    │
│  ┌─────────────────────────────────┐    │
│  │  📋  என் திட்டங்கள் / My Schemes│   │ ← Active Button
│  └─────────────────────────────────┘    │
│  ┌─────────────────────────────────┐    │
│  │  🔗  பரிந்துரை / Referral Link  │    │ ← Active Button
│  └─────────────────────────────────┘    │
│  ┌─────────────────────────────────┐    │
│  │  👥  என் பரிந்துரைகள் / Referrals│  │ ← Active Button
│  └─────────────────────────────────┘    │
│  ┌─────────────────────────────────┐    │
│  │  🏛️  துறை தலைவர் / Booth Pres. │    │ ← Active Button
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

---

## 11. Menu Option 1 — My Profile Screen

```
┌─────────────────────────────────────────┐
│  👤 என் சுயவிவரம் / My Profile          │
│─────────────────────────────────────────│
│                                         │
│  👤  பெயர்:      [voterName]            │
│  🪪  EPIC:       [epicNo]               │
│  📱  கைபேசி:    [mobile]               │
│  🏛️  மாவட்டம்: [district]              │
│  🗳️  தொகுதி:   [assemblyName]          │
│  📍  சாவடி:    Booth [boothNo]          │
│  ✅  நிலை:     Verified Voter           │
│  🔗  குறியீடு: [referralCode]           │
│  📅  பதிவு:    [registeredDate]         │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  🏠  முகப்பு / Main Menu        │    │ ← Back to menu
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

Data source: `User.findById(session.userId)` — identical to web UserProfile page.

---

## 12. Menu Option 2 — My Schemes Screen

### 12A — Schemes List (schemes already applied)

```
┌─────────────────────────────────────────┐
│  📋 என் திட்டங்கள் / My Schemes         │
│─────────────────────────────────────────│
│                                         │
│  [count] Applications                   │
│                                         │
│  ┌──────────────────────────────────┐   │
│  │  PM Vishwakarma                  │   │
│  │  நிலை: ✅ Approved               │   │
│  │  27 Jul 2026                     │   │
│  └──────────────────────────────────┘   │
│  ┌──────────────────────────────────┐   │
│  │  Stand Up India                  │   │
│  │  நிலை: 🔄 In Progress            │   │
│  │  01 Aug 2026                     │   │
│  └──────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  ➕  மேலும் / Apply More Schemes │    │ ← Opens scheme picker
│  └─────────────────────────────────┘    │
│  ┌─────────────────────────────────┐    │
│  │  🏠  முகப்பு / Main Menu        │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

### 12B — Apply for Schemes (ListPicker — all 23 schemes)

```
┌─────────────────────────────────────────┐
│  📋 திட்டம் தேர்வு / Select Scheme      │
│─────────────────────────────────────────│
│                                         │
│  Which scheme would you like            │
│  to apply for?                          │
│                                         │
│  ┌──────────────────────────────────┐   │
│  │  🔽  Scheme தேர்ந்தெடுக்கவும்   │   │ ← Dropdown / ListPicker
│  │  ─────────────────────────────   │   │
│  │  PMSBY — Life Insurance          │   │
│  │  PMJJBY — Accidental Insurance   │   │
│  │  APY — Pension Scheme            │   │
│  │  PM SVANidhi — Street Vendor     │   │
│  │  PM Mudra Shishu — ₹50K Loan    │   │
│  │  PM Mudra Kishor — ₹5L Loan     │   │
│  │  Udyam — MSME Registration      │   │
│  │  Stand Up India — SC/ST Loan    │   │
│  │  Startup Seed Fund              │   │
│  │  PM Kisan — ₹6000/yr            │   │
│  │  PM Fasal Bima — Crop Insurance │   │
│  │  PM Kisan Maan Dhan             │   │
│  │  Ayushman Bharat — ₹5L Health  │   │
│  │  ABHA — Health ID               │   │
│  │  PM Ujjwala — Free Gas          │   │
│  │  PM Matru Vandana — ₹5000       │   │
│  │  Sukanya Samridhi               │   │
│  │  PM Awas Yojana — Free Housing  │   │
│  │  PMKVY — Skill Training         │   │
│  │  NSP Scholarship                │   │
│  │  PM Vishwakarma — Artisan       │   │
│  │  Jan Dhan — Zero Balance A/C    │   │
│  │  e-Shram — Worker ID            │   │
│  └──────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  ✅  விண்ணப்பி / Apply          │    │ ← Submit
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

Flow JSON uses `Dropdown` component:
```json
{
  "type": "Dropdown",
  "name": "selected_scheme",
  "label": "Select Scheme / திட்டம் தேர்வு",
  "required": true,
  "data-source": [
    { "id": "PMSBY", "title": "PMSBY — Life Insurance" },
    { "id": "PMJJBY", "title": "PMJJBY — Accidental Insurance" },
    { "id": "APY", "title": "APY — Pension Scheme" }
    // ... all 23
  ]
}
```

---

## 13. Menu Option 3 — My Referral Link Screen

```
┌─────────────────────────────────────────┐
│  🔗 பரிந்துரை இணைப்பு / Referral Link  │
│─────────────────────────────────────────│
│                                         │
│  உங்கள் தனிப்பட்ட இணைப்பு:            │
│  Your personal referral link:           │
│                                         │
│  https://tnbjp.org/r/[referralCode]     │
│                                         │
│  இதை நண்பர்கள் மற்றும் குடும்பத்தினரிடம்│
│  பகிர்ந்து அரசு திட்டங்கள்             │
│  பெற உதவுங்கள்! 🙏                     │
│  Share with friends & family to help    │
│  them access welfare schemes!           │
│                                         │
│  📊 Total Referrals: [count]            │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  📤  Share / பகிர்               │    │ ← Native share sheet
│  └─────────────────────────────────┘    │
│  ┌─────────────────────────────────┐    │
│  │  🏠  முகப்பு / Main Menu        │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

---

## 14. Menu Option 4 — My Referrals Screen

```
┌─────────────────────────────────────────┐
│  👥 என் பரிந்துரைகள் / My Referrals     │
│─────────────────────────────────────────│
│                                         │
│  நீங்கள் பரிந்துரைத்தவர்கள்: [count]  │
│  People you referred: [count]           │
│                                         │
│  ┌──────────────────────────────────┐   │
│  │  [voterName 1] — [district]      │   │
│  │  [date]                          │   │
│  └──────────────────────────────────┘   │
│  ┌──────────────────────────────────┐   │
│  │  [voterName 2] — [district]      │   │
│  │  [date]                          │   │
│  └──────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  🔗  இணைப்பை பகிர் / Share Link │    │
│  └─────────────────────────────────┘    │
│  ┌─────────────────────────────────┐    │
│  │  🏠  முகப்பு / Main Menu        │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

Data source: `User.find({ referredBy: user.referralCode })` — same as web.

---

## 15. Menu Option 5 — Be a Booth President Screen

### If not yet applied:

```
┌─────────────────────────────────────────┐
│  🏛️ துறை தலைவர் / Booth President       │
│─────────────────────────────────────────│
│                                         │
│  உங்கள் தொகுதியில் பாஜக துறை           │
│  தலைவராக சேவை செய்யுங்கள்!             │
│  Serve as official BJP Booth President! │
│                                         │
│  உங்கள் தற்போதைய சாவடி: [boothNo]     │
│  Your current booth: [boothNo]          │
│  தொகுதி: [assemblyName]                │
│                                         │
│  ┌──────────────────────────────────┐   │
│  │  🔽  இலக்கு மாவட்டம் / District │   │ ← Dropdown
│  └──────────────────────────────────┘   │
│  ┌──────────────────────────────────┐   │
│  │  🔽  இலக்கு தொகுதி / Assembly   │   │ ← Dropdown
│  └──────────────────────────────────┘   │
│  ┌──────────────────────────────────┐   │
│  │  சாவடி எண் / Target Booth No.   │   │ ← TextInput
│  └──────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  📤  விண்ணப்பி / Submit Request │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

### If already applied:

```
┌─────────────────────────────────────────┐
│  🏛️ துறை தலைவர் விண்ணப்பம்             │
│─────────────────────────────────────────│
│                                         │
│  உங்கள் விண்ணப்ப நிலை:                 │
│  Your application status:               │
│                                         │
│  நிலை:  ⏳ Pending                     │
│  இலக்கு சாவடி: Booth [targetBoothNo]  │
│  தொகுதி: [targetAssembly]              │
│  விண்ணப்பித்தது: [appliedDate]          │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  🏠  முகப்பு / Main Menu        │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

---

## 16. Complete Flow Navigation Map

```
USER OPENS WHATSAPP → sends "Hi"
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│  SCREEN: LANGUAGE_SELECT                                    │
│  [Banner Image]                                             │
│  [Button] தமிழ் (Tamil)                                    │
│  [Button] English                                           │
└──────────────┬──────────────────────────────────────────────┘
               │ tap button → backend checks User DB
         ┌─────┴──────┐
     FOUND          NOT FOUND
         │               │
         ▼               ▼
┌────────────────┐  ┌────────────────────────────────────────┐
│ MAIN_MENU      │  │ LOCKED_MENU                            │
│ [Banner]       │  │ [Banner]                               │
│ ✅ Welcome back│  │ 🔒 My Profile                          │
│ [5 buttons     │  │ 🔒 My Schemes                          │
│  all active]   │  │ 🔒 Referral Link                       │
└───────┬────────┘  │ 🔒 My Referrals                        │
        │           │ 🔒 Booth President                     │
        │           │ [Button] 📝 Register                   │
        │           └──────────────┬─────────────────────────┘
        │                          │ tap Register
        │                 ┌────────▼────────┐
        │                 │ EPIC_ENTRY       │
        │                 │ [TextInput]      │
        │                 │ [Button] Search  │
        │                 └────────┬─────────┘
        │                          │ submit → voter_db lookup
        │                 ┌────────▼────────┐
        │                 │ CONFIRM_VOTER    │
        │                 │ Show voter data  │
        │                 │ [Button] Yes ✅  │
        │                 │ [Button] No ❌   │
        │                 └────────┬─────────┘
        │                          │ tap Yes → User.create()
        │                 ┌────────▼────────┐
        │                 │ REG_SUCCESS      │
        │                 │ [Banner]         │
        │                 │ 🎉 Welcome!      │
        │                 │ [5 buttons       │
        │                 │  all unlocked]   │
        │                 └────────┬─────────┘
        └──────────────────────────┘
                   │
         ┌─────────┴───────────────────────────────────┐
    tap  1         2            3           4           5
         │         │            │           │           │
         ▼         ▼            ▼           ▼           ▼
    MY_PROFILE  MY_SCHEMES  MY_REFERRAL MY_REFERRALS BOOTH_PRES
                    │
               ┌────┴──────────┐
           tap "Apply More"    │
                    │          │
               SCHEME_PICKER   │
               [Dropdown 23]   │
               [Button Apply]──┘
```

---

## 17. Backend Webhook → Flow Data Exchange

Meta Flows uses a **data_exchange** webhook call for every screen interaction:

```javascript
// routes/whatsappRoutes.js
// POST /api/whatsapp/webhook  — handles both regular msgs AND Flow data_exchange

router.post('/webhook', verifySignature, async (req, res) => {
  const body = req.body;

  // Flow data_exchange event
  if (body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.type === 'interactive') {
    const nfm = body.entry[0].changes[0].value.messages[0].interactive.nfm_reply;
    const flowData = JSON.parse(nfm.response_json);
    const from = body.entry[0].changes[0].value.messages[0].from;
    return handleFlowDataExchange(from, flowData, res);
  }

  // Regular first message → trigger language select flow
  if (body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.type === 'text') {
    const from = body.entry[0].changes[0].value.messages[0].from;
    const session = await WaSession.findOne({ mobile: from });
    if (!session) {
      await triggerFlow(from, 'LANGUAGE_FLOW', 'LANGUAGE_SELECT', {});
    }
  }

  res.sendStatus(200); // Always ACK within 20s
});

// Flow data_exchange handler — returns next screen
async function handleFlowDataExchange(from, data, res) {
  const session = await WaSession.findOne({ mobile: from });

  switch (data.screen) {
    case 'LANGUAGE_SELECT':
      await WaSession.findOneAndUpdate(
        { mobile: from },
        { lang: data.lang, step: 'CHECK_REGISTERED' },
        { upsert: true }
      );
      const user = await User.findOne({ mobile: from });
      if (user) {
        return res.json({ screen: 'MAIN_MENU', data: { voterName: user.voterName } });
      }
      return res.json({ screen: 'LOCKED_MENU', data: {} });

    case 'EPIC_ENTRY':
      const voter = await lookupEpicInVoterDb(data.epic_no);
      if (!voter) {
        return res.json({ screen: 'EPIC_ENTRY', data: { error: 'EPIC not found' } });
      }
      await WaSession.findOneAndUpdate({ mobile: from }, { tempVoterData: voter });
      return res.json({ screen: 'CONFIRM_VOTER', data: { voter } });

    case 'CONFIRM_VOTER':
      if (data.confirmed) {
        const newUser = await User.create({ mobile: from, ...session.tempVoterData, channel: 'whatsapp' });
        return res.json({ screen: 'REG_SUCCESS', data: { voterName: newUser.voterName } });
      }
      return res.json({ screen: 'EPIC_ENTRY', data: {} });

    case 'SCHEME_APPLY':
      await SchemeApplication.create({ ...userFields, schemeName: data.selected_scheme, channel: 'whatsapp' });
      return res.json({ screen: 'MY_SCHEMES', data: { applications: await getSchemes(from) } });

    // ... other screens
  }
}
```

---

## 18. Status Push Notification (Admin → Voter)

When admin updates status in dashboard → WhatsApp template sent to voter:

```javascript
// adminController.js — after saving status
if (voter.channel === 'whatsapp') {
  await sendWhatsAppTemplate(voter.mobile, 'bjp_status_update_ta', [
    { type: 'text', text: voter.voterName },     // {{1}}
    { type: 'text', text: app.schemeName },      // {{2}}
    { type: 'text', text: app.status }           // {{3}}
  ]);
}
```

**Template message shown to voter:**
```
📢 BJP Nalam Thittam

வணக்கம் [voterName],

உங்கள் [schemeName] திட்ட விண்ணப்பம்
புதுப்பிக்கப்பட்டது.

நிலை: [status]

[Button] போர்டல் திற / Open Portal
```

Tapping "Open Portal" button → triggers the Flow → opens MAIN_MENU screen.

---

## 19. Exact Backend Folder Placement

Everything goes inside the **existing** `backend/` folder.
No new repo, no separate service, no Docker container.

```
backend/                              ← EXISTING folder (no change to structure)
│
├── server.js                         ← ADD 2 lines (route registration)
│
├── .env                              ← ADD 4 WhatsApp env vars
│
├── routes/                           ← EXISTING folder
│   ├── authRoutes.js                 (existing — untouched)
│   ├── adminRoutes.js                (existing — untouched)
│   ├── schemeRoutes.js               (existing — untouched)
│   ├── voterRoutes.js                (existing — untouched)
│   ├── referralRoutes.js             (existing — untouched)
│   ├── userChatRoutes.js             (existing — untouched)
│   ├── boothPresidentRoutes.js       (existing — untouched)
│   └── whatsappRoutes.js             ← NEW FILE
│
├── controllers/                      ← EXISTING folder
│   ├── authController.js             (existing — untouched)
│   ├── adminController.js            (existing — ADD ~10 lines for status push)
│   ├── schemeController.js           (existing — untouched)
│   ├── voterController.js            (existing — untouched)
│   ├── referralController.js         (existing — untouched)
│   ├── boothPresidentController.js   (existing — untouched)
│   └── whatsappController.js         ← NEW FILE
│
├── models/                           ← EXISTING folder
│   ├── User.js                       (existing — ADD 1 field: channel)
│   ├── SchemeApplication.js          (existing — ADD 1 field: channel)
│   ├── Admin.js                      (existing — untouched)
│   ├── OtpSession.js                 (existing — untouched)
│   ├── BoothPresidentApplication.js  (existing — untouched)
│   └── WaSession.js                  ← NEW FILE
│
├── services/                         ← EXISTING folder
│   ├── jurisdictionService.js        (existing — untouched)
│   └── whatsappService.js            ← NEW FILE
│
├── constants/                        ← EXISTING folder
│   ├── schemes.js                    (existing — untouched)
│   └── waMessages.js                 ← NEW FILE (Tamil + English strings)
│
└── flows/                            ← NEW FOLDER (Flow JSON definitions)
    ├── languageFlow.json             ← NEW FILE
    ├── registrationFlow.json         ← NEW FILE
    └── mainMenuFlow.json             ← NEW FILE
```

### Summary — exact file count

| Action | Count |
|--------|-------|
| New files created | 7 |
| Existing files modified | 3 (`server.js`, `User.js`, `SchemeApplication.js`) |
| New folder created | 1 (`flows/`) |
| Existing files untouched | Everything else |

### .env additions (already added to `backend/.env`)

```env
# ── WhatsApp Business API (Meta Cloud API) ─────────────────────────
WHATSAPP_TOKEN=EAAMybsyZChV4BR...            # ✅ Added
WHATSAPP_PHONE_NUMBER_ID=1031666070027518    # ✅ Added
WHATSAPP_BUSINESS_ACCOUNT_ID=1489660795854064 # ✅ Added
WHATSAPP_VERIFY_TOKEN=bjp_nalam_thittam_webhook_2026  # ✅ Added
NGROK_URL=https://blackheartedly-irenic-adeline.ngrok-free.dev  # ✅ Added (local dev)

# ── WhatsApp Flow IDs — 2 flows cover everything ───────────────────
#
# FLOW 1: bjp_nalam_thittam_onboarding  (Status: DRAFT)
#   Screens: Language Select → Check Registered →
#            Locked Menu → EPIC Entry → Confirm Voter →
#            Registration Success → Main Menu (unlocked)
WA_FLOW_ID_ONBOARDING=1376685027895712      # ✅ Created

# FLOW 2: bjp_nalam_thittam_portal  (Status: DRAFT)
#   Screens: My Profile · My Schemes · Apply Scheme (23 dropdown) ·
#            Referral Link · My Referrals · Booth President
WA_FLOW_ID_PORTAL=2221325705299484          # ✅ Created
```

---

## 20. Model Changes (Zero Breaking Changes)

```javascript
// User model — add one field:
channel: { type: String, enum: ['web','whatsapp'], default: 'web' }

// SchemeApplication model — add one field:
channel: { type: String, enum: ['web','whatsapp'], default: 'web' }

// All existing records → default 'web'. No migration needed.
```

---

## 21. Why Meta Flows (Not Text Menus)

| Text-Based ("Reply 1 or 2") | Meta WhatsApp Flows |
|----------------------------|---------------------|
| User types numbers | User taps native buttons |
| Error-prone (typos) | No typos possible |
| Not accessible | Native accessible UI |
| No form validation | Built-in required fields |
| No dropdowns | Native Dropdown component |
| Hacky / not official | Official Meta product |
| Session gets confused | Structured screen navigation |
| No banner/image support | Full image + branding support |

---

## 22. Implementation Phases

| Phase | What | Effort |
|-------|------|--------|
| 1 | Meta Business verification + Flow IDs created in Meta Business Manager | 2 days |
| 2 | `WaSession` model + webhook route + Flow trigger service | 2 days |
| 3 | Language Select Flow + registered check + MAIN_MENU screen | 2 days |
| 4 | Registration Flow: LOCKED_MENU → EPIC → CONFIRM → SUCCESS | 2 days |
| 5 | My Profile + My Schemes screens (view + apply 23 via Dropdown) | 2 days |
| 6 | My Referral Link + My Referrals screens | 1 day |
| 7 | Booth President application screen | 1 day |
| 8 | `channel` field + admin dashboard filter + channel stats | 1 day |
| 9 | Status push template notifications on admin action | 1 day |
| 10 | Full Tamil translations + Meta template approval (7 days review) | 2 days |
| **Total** | | **~16 days** |

---

*BJP Nalam Thittam — Official Meta WhatsApp Flows Architecture | August 2026*

---

## 23. Build Status — What's Done ✅

| Item | Status |
|------|--------|
| `models/WaSession.js` (TTL session) | ✅ Created |
| `models/User.js` + `channel` field | ✅ Added |
| `models/SchemeApplication.js` + `channel` field | ✅ Added |
| `constants/waMessages.js` (Tamil + English) | ✅ Created |
| `services/whatsappService.js` (send/trigger/template) | ✅ Created |
| `services/flowCrypto.js` (RSA+AES per Meta spec) | ✅ Created + round-trip tested |
| `controllers/whatsappController.js` (webhook + encrypted endpoint + state machine) | ✅ Created |
| `routes/whatsappRoutes.js` (webhook + flow-endpoint) | ✅ Created |
| `server.js` route registration + rawBody | ✅ Wired |
| `adminController.js` status push to WhatsApp | ✅ Wired |
| `flows/onboardingFlow.json` | ✅ Created + uploaded clean |
| `flows/portalFlow.json` | ✅ Created + uploaded clean |
| RSA keypair (`flow_private.pem` / `flow_public.pem`) | ✅ Generated + gitignored |
| Public key registered with Meta | ✅ success:true |
| Flow endpoint_uri set on both flows | ✅ success:true |
| `.env` all WhatsApp vars + Flow IDs | ✅ Added |

## 24. Go-Live Checklist — Final Runtime Steps

These require the server running + ngrok tunnel active:

1. **Start the backend**
   ```
   cd backend && node server.js
   ```
   (runs on PORT from .env — currently 5000)

2. **Point ngrok to the backend port**
   ```
   ngrok http 5000 --domain=blackheartedly-irenic-adeline.ngrok-free.dev
   ```

3. **Publish both flows** (Meta health-checks the endpoint — server + ngrok must be live)
   ```
   node scripts/publish_wa_flows.js
   ```
   (or via the publish API call — will succeed once endpoint responds to ping)

4. **Configure the webhook in Meta App Dashboard → WhatsApp → Configuration**
   - Callback URL: `https://blackheartedly-irenic-adeline.ngrok-free.dev/api/whatsapp/webhook`
   - Verify token: `bjp_nalam_thittam_webhook_2026`
   - Subscribe to the **messages** field

5. **Test**: send "Hi" to the WhatsApp Business number → language picker flow opens.

## 25. End-to-End Verification Flow

```
Send "Hi"           → Onboarding flow opens (banner + Tamil/English)
Pick English        → Locked menu (🔒 5 services) + Register button
Tap Register        → EPIC entry screen
Enter EPIC          → Voter confirm screen (name/booth from voter_db)
Tap "Yes"           → User.create(channel:'whatsapp') → Success screen
Tap "Open Portal"   → Portal flow main menu (5 unlocked options)
Tap "My Schemes"    → Apply dropdown (23 schemes) → SchemeApplication created
                    → Appears in Admin Dashboard with 💬 WA badge
Admin sets Approved → WhatsApp push: "Your PMSBY is Approved"
```
