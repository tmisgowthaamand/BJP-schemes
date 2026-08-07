'use strict';
/**
 * All WhatsApp message strings — Tamil (ta) + English (en).
 * Every key returns either a string or a function(data) => string.
 */

const MSG = {
  // ── Language select ─────────────────────────────────────────────
  LANGUAGE_SELECT: {
    en: `🙏 *Welcome to BJP Nalam Thittam!*\n_23 Central Government Welfare Schemes_\n\n_World's Largest. India's Biggest. Soon to be Tamil Nadu's No. 1._\n\nPlease tap *Open Portal* to select your language and get started.`,
    ta: `🙏 *பாஜக நலம் திட்டத்திற்கு வரவேற்கிறோம்!*\n_23 மத்திய அரசு நல திட்டங்கள்_\n\n_உலகின் மிகப்பெரியது. இந்தியாவின் மிகப்பெரியது. விரைவில் தமிழ்நாட்டின் நம்பர் 1._\n\nமொழி தேர்வு செய்ய *Open Portal* என்பதை தட்டவும்.`
  },

  // ── Returning user main menu ─────────────────────────────────────
  MAIN_MENU: {
    en: (name) => `✅ *Welcome back, ${name}!* 👋\n\nYour BJP Nalam Thittam Portal is ready.\nTap *Open Portal* to access your services.`,
    ta: (name) => `✅ *மீண்டும் வரவேற்கிறோம், ${name}!* 👋\n\nஉங்கள் BJP நலம் திட்ட போர்டல் தயாராக உள்ளது.\n*Open Portal* என்பதை தட்டி சேவைகளை அணுகவும்.`
  },

  // ── New user locked menu ─────────────────────────────────────────
  LOCKED_MENU: {
    en: `🙏 *Welcome to BJP Nalam Thittam!*\n\nRegister once to unlock all services:\n\n🔒 👤 My Profile\n🔒 📋 My Schemes\n🔒 🔗 My Referral Link\n🔒 👥 My Referrals\n🔒 🏛️ Be a Booth President\n\nTap *Open Portal* to register now.`,
    ta: `🙏 *பாஜக நலம் திட்டத்திற்கு வரவேற்கிறோம்!*\n\nஒருமுறை பதிவு செய்து அனைத்து சேவைகளையும் திறக்கவும்:\n\n🔒 👤 என் சுயவிவரம்\n🔒 📋 என் திட்டங்கள்\n🔒 🔗 என் பரிந்துரை இணைப்பு\n🔒 👥 என் பரிந்துரைகள்\n🔒 🏛️ துறை தலைவர் விண்ணப்பம்\n\nபதிவு செய்ய *Open Portal* தட்டவும்.`
  },

  // ── Registration complete ────────────────────────────────────────
  REG_SUCCESS: {
    en: (name) => `🎉 *Registration Successful!*\n\nWelcome to BJP Nalam Thittam, *${name}*! 🙏\n\nAll your services are now unlocked. Tap *Open Portal* to explore.`,
    ta: (name) => `🎉 *பதிவு வெற்றிகரமாக முடிந்தது!*\n\nபாஜக நலம் திட்டத்திற்கு வரவேற்கிறோம், *${name}*! 🙏\n\nஉங்கள் அனைத்து சேவைகளும் திறக்கப்பட்டன. *Open Portal* தட்டவும்.`
  },

  // ── Returning user profile summary (matches Web Chatbot sidebar) ──
  WELCOME_REGISTERED: {
    en: (u, link) =>
      `✅ *Welcome back, ${u.voterName}!* 👋\n\n` +
      `*YOUR BJP MEMBER PROFILE*\n` +
      `━━━━━━━━━━━━━━━━━━━\n` +
      `👤 *Name:* ${u.voterName}\n` +
      `🪪 *EPIC No:* ${u.epicNo}\n` +
      `📱 *Mobile:* ${u.mobile}\n` +
      `🏛️ *District:* ${u.district}\n` +
      `🗳️ *Assembly:* ${u.assemblyName} (${u.assemblyNo || ''})\n` +
      `📍 *Booth No:* ${u.boothNo}\n` +
      `⚧ *Gender:* ${u.gender || 'Unspecified'}\n` +
      `🔗 *Referral Link:*\n${link}\n\n` +
      `Tap *Open Portal* below to view your schemes, referral count, and Booth President status.`,
    ta: (u, link) =>
      `✅ *மீண்டும் வரவேற்கிறோம், ${u.voterName}!* 👋\n\n` +
      `*உங்கள் பாஜக உறுப்பினர் சுயவிவரம்*\n` +
      `━━━━━━━━━━━━━━━━━━━\n` +
      `👤 *பெயர்:* ${u.voterName}\n` +
      `🪪 *EPIC எண்:* ${u.epicNo}\n` +
      `📱 *மொபைல்:* ${u.mobile}\n` +
      `🏛️ *மாவட்டம்:* ${u.district}\n` +
      `🗳️ *தொகுதி:* ${u.assemblyName} (${u.assemblyNo || ''})\n` +
      `📍 *சாவடி எண்:* ${u.boothNo}\n` +
      `⚧ *பாலினம்:* ${u.gender || '—'}\n` +
      `🔗 *பரிந்துரை இணைப்பு:*\n${link}\n\n` +
      `உங்கள் திட்டங்கள், பரிந்துரைகள் மற்றும் சாவடி தலைவர் நிலையை பார்க்க கீழே உள்ள *Open Portal* தட்டவும்.`
  },

  // ── Registration summary + Referral link dispatched into chat ──
  REGISTRATION_SUMMARY: {
    en: (u, schemeName, link) =>
      `🎉 *Registration Successful!* 🙏\n\n` +
      `Welcome, *${u.voterName}*! Your voter registration and scheme selection are confirmed.\n\n` +
      `📋 *Registered Scheme:* ${schemeName}\n` +
      `🪪 *EPIC No:* ${u.epicNo}\n` +
      `🗳️ *Assembly:* ${u.assemblyName} | *Booth:* ${u.boothNo}\n\n` +
      `🔗 *YOUR PERSONAL REFERRAL LINK:*\n${link}\n\n` +
      `Share this link with your friends & family to help them access 23 Central Welfare Schemes!`,
    ta: (u, schemeName, link) =>
      `🎉 *பதிவு வெற்றிகரமாக முடிந்தது!* 🙏\n\n` +
      `வரவேற்கிறோம், *${u.voterName}*! உங்கள் வாக்காளர் பதிவு மற்றும் திட்ட தேர்வு உறுதி செய்யப்பட்டது.\n\n` +
      `📋 *தேர்ந்தெடுக்கப்பட்ட திட்டம்:* ${schemeName}\n` +
      `🪪 *EPIC எண்:* ${u.epicNo}\n` +
      `🗳️ *தொகுதி:* ${u.assemblyName} | *சாவடி:* ${u.boothNo}\n\n` +
      `🔗 *உங்கள் தனிப்பட்ட பரிந்துரை இணைப்பு:*\n${link}\n\n` +
      `உங்கள் நண்பர்கள் மற்றும் குடும்பத்தினருடன் இந்த இணைப்பைப் பகிர்ந்து 23 மத்திய அரசு திட்டங்களைப் பெற உதவுங்கள்!`
  },

  // ── Invalid Mobile Error ─────────────────────────────────────────
  INVALID_MOBILE: {
    en: `⚠️ *Invalid Mobile Number*\n\nPlease send your message from a valid 10-digit mobile number.`,
    ta: `⚠️ *தவறான மொபைல் எண்*\n\nதயவுசெய்து செல்லுபடியாகும் 10 இலக்க மொபைல் எண்ணிலிருந்து அனுப்பவும்.`
  },

  // ── Status push notification (from admin action) ─────────────────
  STATUS_UPDATE: {
    en: (name, scheme, status) =>
      `📢 *BJP Nalam Thittam Update*\n\nHello *${name}*,\n\nYour application for *${scheme}* has been updated.\n\nNew Status: *${status}*\n\nTap Open Portal to view details.`,
    ta: (name, scheme, status) =>
      `📢 *பாஜக நலம் திட்ட புதுப்பிப்பு*\n\nவணக்கம் *${name}*,\n\n*${scheme}* திட்டத்திற்கான உங்கள் விண்ணப்பம் புதுப்பிக்கப்பட்டது.\n\nபுதிய நிலை: *${status}*\n\nவிவரங்களுக்கு Open Portal தட்டவும்.`
  },

  // ── Generic errors ───────────────────────────────────────────────
  ERROR_GENERIC: {
    en: `⚠️ Something went wrong. Please try again or tap *Open Portal* to restart.`,
    ta: `⚠️ ஏதோ தவறு நடந்தது. மீண்டும் முயற்சிக்கவும் அல்லது *Open Portal* தட்டி மீண்டும் தொடங்கவும்.`
  }
};

/**
 * Get a message string for the given key and language.
 * @param {string} key   - Key from MSG object
 * @param {string} lang  - 'en' or 'ta'
 * @param {...any} args  - Arguments passed to function templates
 */
const t = (key, lang = 'en', ...args) => {
  const entry = MSG[key];
  if (!entry) return MSG.ERROR_GENERIC[lang] || MSG.ERROR_GENERIC.en;
  const template = entry[lang] || entry.en;
  return typeof template === 'function' ? template(...args) : template;
};

module.exports = { t, MSG };
