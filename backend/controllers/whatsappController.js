'use strict';
const User         = require('../models/User');
const WaSession    = require('../models/WaSession');
const SchemeApplication = require('../models/SchemeApplication');
const BoothPresidentApplication = require('../models/BoothPresidentApplication');
const { BJP_SCHEMES }  = require('../constants/schemes');
const { t }            = require('../constants/waMessages');
const { s, schemeOptions } = require('../constants/waStrings');
const { sendText, sendImage, triggerFlow, sendInteractiveButtons } = require('../services/whatsappService');
const { decryptRequest, encryptResponse } = require('../services/flowCrypto');
const { findVoterByEpic } = require('../services/voterSearchService');
const { getAssemblyMetadata } = require('../services/jurisdictionService');
const logger = require('../config/logger');

const CLOUDINARY_SCHEME_MAP = {
  "PMSBY": "https://res.cloudinary.com/dkjrdntf/image/upload/w_800,h_418,c_fill,f_jpg,q_auto/v1785563946/bjp_schemes/PMSBY.jpg",
  "PMJJBY": "https://res.cloudinary.com/dkjrdntf/image/upload/w_800,h_418,c_fill,f_jpg,q_auto/v1785563946/bjp_schemes/PMJJBY.jpg",
  "APY": "https://res.cloudinary.com/dkjrdntf/image/upload/w_800,h_418,c_fill,f_jpg,q_auto/v1785563946/bjp_schemes/APY.jpg",
  "PM SVANidhi": "https://res.cloudinary.com/dkjrdntf/image/upload/w_800,h_418,c_fill,f_jpg,q_auto/v1785563946/bjp_schemes/PM_SVANidhi.jpg",
  "PM Mudra Shishu": "https://res.cloudinary.com/dkjrdntf/image/upload/w_800,h_418,c_fill,f_jpg,q_auto/v1785563946/bjp_schemes/PM_Mudra_Shishu.jpg",
  "PM Mudra Kishor": "https://res.cloudinary.com/dkjrdntf/image/upload/w_800,h_418,c_fill,f_jpg,q_auto/v1785563946/bjp_schemes/PM_Mudra_Kishor.jpg",
  "Udyam": "https://res.cloudinary.com/dkjrdntf/image/upload/w_800,h_418,c_fill,f_jpg,q_auto/v1785563946/bjp_schemes/Udyam.jpg",
  "Stand Up India": "https://res.cloudinary.com/dkjrdntf/image/upload/w_800,h_418,c_fill,f_jpg,q_auto/v1785563946/bjp_schemes/Stand_Up_India.jpg",
  "Startup Seed Fund": "https://res.cloudinary.com/dkjrdntf/image/upload/w_800,h_418,c_fill,f_jpg,q_auto/v1785563946/bjp_schemes/Startup_Seed_Fund.jpg",
  "PM Kisan": "https://res.cloudinary.com/dkjrdntf/image/upload/w_800,h_418,c_fill,f_jpg,q_auto/v1785563946/bjp_schemes/PM_Kisan.jpg",
  "PM Fasal Bima": "https://res.cloudinary.com/dkjrdntf/image/upload/w_800,h_418,c_fill,f_jpg,q_auto/v1785563946/bjp_schemes/PM_Fasal_Bima.jpg",
  "PM Kisan Maan Dhan": "https://res.cloudinary.com/dkjrdntf/image/upload/w_800,h_418,c_fill,f_jpg,q_auto/v1785563946/bjp_schemes/PM_Kisan_Maan_Dhan.jpg",
  "Ayushman Bharat": "https://res.cloudinary.com/dkjrdntf/image/upload/w_800,h_418,c_fill,f_jpg,q_auto/v1785563946/bjp_schemes/Ayushman_Bharat.jpg",
  "ABHA": "https://res.cloudinary.com/dkjrdntf/image/upload/w_800,h_418,c_fill,f_jpg,q_auto/v1785563946/bjp_schemes/ABHA.jpg",
  "PM Ujjwala": "https://res.cloudinary.com/dkjrdntf/image/upload/w_800,h_418,c_fill,f_jpg,q_auto/v1785563946/bjp_schemes/PM_Ujjwala.jpg",
  "PM Matru Vandana": "https://res.cloudinary.com/dkjrdntf/image/upload/w_800,h_418,c_fill,f_jpg,q_auto/v1785563946/bjp_schemes/PM_Matru_Vandana.jpg",
  "Sukanya Samridhi": "https://res.cloudinary.com/dkjrdntf/image/upload/w_800,h_418,c_fill,f_jpg,q_auto/v1785563946/bjp_schemes/Sukanya_Samridhi.jpg",
  "PM Awas Yojana": "https://res.cloudinary.com/dkjrdntf/image/upload/w_800,h_418,c_fill,f_jpg,q_auto/v1785563946/bjp_schemes/PM_Awas_Yojana.jpg",
  "PMKVY": "https://res.cloudinary.com/dkjrdntf/image/upload/w_800,h_418,c_fill,f_jpg,q_auto/v1785563946/bjp_schemes/PMKVY.jpg",
  "NSP Scholarship": "https://res.cloudinary.com/dkjrdntf/image/upload/w_800,h_418,c_fill,f_jpg,q_auto/v1785563946/bjp_schemes/NSP_Scholarship.jpg",
  "PM Vishwakarma": "https://res.cloudinary.com/dkjrdntf/image/upload/w_800,h_418,c_fill,f_jpg,q_auto/v1785563946/bjp_schemes/PM_Vishwakarma.jpg",
  "Jan Dhan": "https://res.cloudinary.com/dkjrdntf/image/upload/w_800,h_418,c_fill,f_jpg,q_auto/v1785563946/bjp_schemes/Jan_Dhan.jpg",
  "e-Shram": "https://res.cloudinary.com/dkjrdntf/image/upload/w_800,h_418,c_fill,f_jpg,q_auto/v1785563946/bjp_schemes/e_Shram.jpg"
};

const SCHEME_ICON_MAP = {
  1: '🛡️', 2: '📜', 3: '👴', 4: '🏪', 5: '👶', 6: '💼', 7: '🏭', 8: '🚀',
  9: '🌱', 10: '🌾', 11: '🌧️', 12: '👨‍🌾', 13: '🏥', 14: '💳', 15: '🔥', 16: '👩',
  17: '👧', 18: '🏠', 19: '🛠️', 20: '🎓', 21: '🎨', 22: '🏦', 23: '👷'
};

const ONBOARDING_FLOW_ID = process.env.WA_FLOW_ID_ONBOARDING;
const PORTAL_FLOW_ID     = process.env.WA_FLOW_ID_PORTAL;
const REFERRAL_BASE      = (process.env.FRONTEND_URL_PROD || 'https://bjp-schemes.vercel.app').replace(/\/+$/, '');

// ── Helpers ───────────────────────────────────────────────────────────────────
const normalizeMobile = (wa) => {
  let m = String(wa || '').replace(/\D/g, '');
  if (m.length === 12 && m.startsWith('91')) m = m.slice(2);
  if (m.length === 11 && m.startsWith('0'))  m = m.slice(1);
  return m;
};

const getMobileVariants = (wa) => {
  const raw = String(wa || '').replace(/\D/g, '');
  const m10 = normalizeMobile(wa);
  const set = new Set([raw]);
  if (m10) {
    set.add(m10);
    set.add(`91${m10}`);
    set.add(`+91${m10}`);
    set.add(`0${m10}`);
  }
  return Array.from(set);
};

const isValidMobile = (wa) => {
  const raw = String(wa || '').replace(/\D/g, '');
  return Boolean(raw && raw.length >= 7);
};

const genReferralCode = (epicNo) => `BJP-${String(epicNo || 'MEMBER').substring(0, 4).toUpperCase()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
const statusEmoji = (st) => ({ Approved: '✅', Completed: '✅', 'Physically Delivered': '✅', 'In Progress': '🔄', Processing: '🔄', Called: '📞', Verified: '🔍', Pending: '⏳', Submitted: '⏳', Rejected: '❌', 'Documents Required': '📄' }[st] || '⏳');
const mobileFromToken = (tok) => { if (!tok) return null; const p = String(tok).split(':'); return p.length >= 2 ? p[1] : null; };

// ── GET /webhook verify ───────────────────────────────────────────────────────
const verifyWebhook = (req, res) => {
  if (req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === process.env.WHATSAPP_VERIFY_TOKEN) {
    return res.status(200).send(req.query['hub.challenge']);
  }
  return res.sendStatus(403);
};

// ── POST /webhook — messages + flow completion ────────────────────────────────
const handleWebhook = async (req, res) => {
  res.sendStatus(200);
  try {
    const value = req.body?.entry?.[0]?.changes?.[0]?.value;
    const incomingPhoneId = value?.metadata?.phone_number_id;

    if (incomingPhoneId && process.env.WHATSAPP_PHONE_NUMBER_ID && String(incomingPhoneId) !== String(process.env.WHATSAPP_PHONE_NUMBER_ID)) {
      logger.info('[WA Webhook] Ignored message for other phone_number_id', { incomingPhoneId, configuredPhoneId: process.env.WHATSAPP_PHONE_NUMBER_ID });
      return;
    }

    const msg = value?.messages?.[0];
    if (!msg) return;
    const from = msg.from;
    logger.info('[WA Webhook] Incoming message', { from, type: msg.type, body: msg.text?.body || msg.interactive?.type });

    // Flow submission reply
    if (msg.type === 'interactive' && msg.interactive?.type === 'nfm_reply') {
      let payload = {};
      try { payload = JSON.parse(msg.interactive.nfm_reply.response_json); } catch {}
      return handleFlowCompletion(from, payload);
    }

    // Language selection button tap (from single container dual button message)
    if (msg.type === 'interactive' && msg.interactive?.type === 'button_reply') {
      const btnId = msg.interactive.button_reply.id;
      const variants = getMobileVariants(from);
      const user = await User.findOne({ mobile: { $in: variants } });
      const chosenLang = btnId === 'lang_ta' ? 'ta' : 'en';

      await WaSession.findOneAndUpdate(
        { mobile: from },
        { lang: chosenLang, userId: user?._id || null, step: user ? 'MAIN_MENU' : 'EPIC_ENTRY', updatedAt: new Date() },
        { upsert: true }
      );

      const flowIdToUse = user ? PORTAL_FLOW_ID : ONBOARDING_FLOW_ID;
      const targetScreen = user ? (chosenLang === 'ta' ? 'MAIN_MENU_TA' : 'MAIN_MENU_EN') : 'LANGUAGE_SELECT';

      const ctaLabel = chosenLang === 'ta' ? 'தமிழ் போர்டல்' : 'Open Portal';
      const bannerMsg = chosenLang === 'ta'
        ? `*வணக்கம்${user?.voterName ? ' ' + user.voterName : ''}*\n\nபாஜக நலம் திட்ட போர்ட்டலை தமிழில் திறக்க கீழே உள்ள பொத்தானைத் தட்டவும்:`
        : `*Welcome back${user?.voterName ? ' ' + user.voterName : ''}*\n\nTap the button below to open your BJP Nalam Thittam Portal:`;

      return triggerFlow(from, flowIdToUse, targetScreen, {}, ctaLabel, bannerMsg);
    }

    if (msg.type === 'text' || msg.type === 'button' || msg.type === 'interactive') {
      return handleFirstContact(from);
    }
  } catch (err) { logger.error('[WA Webhook Error]', { error: err.message }); }
};

const handleFirstContact = async (from) => {
  try {
    if (!isValidMobile(from)) {
      await sendText(from, t('INVALID_MOBILE', 'en'));
      return;
    }

    const variants = getMobileVariants(from);
    const user = await User.findOne({ mobile: { $in: variants } });
    const bannerUrl = process.env.WA_BANNER_URL || 'https://res.cloudinary.com/dkjrdntf/image/upload/w_800,h_418,c_fill,f_jpg,q_auto/v1785563946/bjp_schemes/bjp_final_banner.jpg';

    const nameStr = user?.voterName ? ` ${user.voterName}` : '';
    const bodyText =
      `*Welcome / வணக்கம்${nameStr}*\n\n` +
      `Please select your language to continue:\n` +
      `தொடர உங்கள் மொழியைத் தேர்ந்தெடுக்கவும்:`;

    const buttons = [
      { id: 'lang_en', title: 'English' },
      { id: 'lang_ta', title: 'தமிழ்' }
    ];

    await sendInteractiveButtons(from, bannerUrl, bodyText, buttons);
  } catch (err) { logger.error('[WA handleFirstContact]', { error: err.message, from }); }
};

const handleFlowCompletion = async (from, payload) => {
  logger.info('[WA] Flow nfm_reply', { from, screen: payload?.screen, action: payload?.action });

  const closedScreen = payload?.screen;
  const action = payload?.action;

  // For non-terminal screens the Close button sets action:'close'
  // For terminal screens (MY_PROFILE etc.) there's no action field — they fire on complete
  // Skip if no screen at all
  if (!closedScreen) return;

  // Skip the "Apply for Schemes" footer action (go: 'apply') — not a close
  if (payload?.go === 'apply') return;

  try {
    const variants = getMobileVariants(from);
    const user = await User.findOne({ mobile: { $in: variants } });
    if (!user) return;

    // If user actually submitted a scheme application from flow, send confirmation image
    if (closedScreen === 'SCHEME_APPLIED' || closedScreen === 'APPLY_SCHEME') {
      const apps = await SchemeApplication.find({ userId: user._id }).sort({ appliedAt: -1 }).limit(1);
      if (apps.length > 0) {
        const rawVal = String(apps[0].schemeId || apps[0].schemeName || '').trim();
        const imgUrl = CLOUDINARY_SCHEME_MAP[rawVal] || CLOUDINARY_SCHEME_MAP["PM Kisan"];
        if (imgUrl) {
          const session = await WaSession.findOne({ mobile: from });
          const lang = session?.lang || 'ta';
          const cap = lang === 'ta'
            ? `✅ *விண்ணப்பம் சமர்ப்பிக்கப்பட்டது!*\n🏛️ திட்டம்: ${apps[0].schemeName}`
            : `✅ *Application Submitted Successfully!*\n🏛️ Scheme: ${apps[0].schemeName}`;
          await sendImage(from, imgUrl, cap);
        }
      }
    }

    // Automatically re-send the clean Welcome Banner card with English & Tamil buttons when user closes/completes flow screen!
    await handleFirstContact(from);
  } catch (err) {
    logger.error('[WA handleFlowCompletion Error]', { error: err.message, from });
  }
};

// ── POST /flow-endpoint (encrypted) ───────────────────────────────────────────
const handleFlowEndpoint = async (req, res) => {
  let decrypted;
  try { 
    decrypted = decryptRequest(req.body); 
  } catch (err) { 
    logger.error('❌ [WA FlowEndpoint] Decrypt failed!', { 
      error: err.message, 
      stack: err.stack,
      hint: 'Make sure WA_FLOW_PRIVATE_KEY_PEM is set in Render Environment Variables.'
    }); 
    return res.status(421).send(); 
  }

  const { decryptedBody, aesKeyBuffer, initialVectorBuffer } = decrypted;
  const { action, screen, data, flow_token, version } = decryptedBody;

  logger.info('[WA FlowEndpoint] Incoming flow exchange', { action, screen, flow_token });

  const respond = (obj) => {
    res.set('Content-Type', 'text/plain');
    return res.send(encryptResponse(obj, aesKeyBuffer, initialVectorBuffer));
  };

  try {
    if (action === 'ping') return respond({ version, data: { status: 'active' } });
    if (data && data.error) return respond({ version, data: { acknowledged: true } });
    const from = mobileFromToken(flow_token);
    if (!from) return respond({ version, screen, data: { error_msg: 'Session error.' } });
    const result = await routeScreen({ action, screen, data: data || {}, from });
    return respond({ version, ...result });
  } catch (err) {
    logger.error('❌ [WA FlowEndpoint] Routing error!', { error: err.message, stack: err.stack, screen, action, data });
    return respond({ version, screen: screen || 'MAIN_MENU_TA', data: { error_msg: 'Something went wrong. Please try again.' } });
  }
};

// ── Screen router ─────────────────────────────────────────────────────────────
const routeScreen = async ({ action, screen, data, from }) => {
  const session = await WaSession.findOne({ mobile: from });
  const lang = (data && data.lang) || session?.lang || 'ta';
  const mobile10 = normalizeMobile(from);
  const variants = getMobileVariants(from);

  const epicScreen = (error_msg) => ({
    screen: 'EPIC_ENTRY',
    data: {
      heading: s(lang, 'ep_heading'),
      body: s(lang, 'ep_body'),
      label: s(lang, 'ep_label'),
      helper: s(lang, 'ep_helper'),
      error_msg,
      btn: s(lang, 'ep_btn')
    }
  });

  switch (screen) {
    case 'LANGUAGE_SELECT': {
      const chosen = data.lang ? (data.lang === 'ta' ? 'ta' : 'en') : (session?.lang || 'ta');
      const user = await User.findOne({ mobile: { $in: variants } });
      await WaSession.findOneAndUpdate(
        { mobile: from },
        { lang: chosen, userId: user?._id || null, step: user ? 'MAIN_MENU' : 'EPIC_ENTRY', updatedAt: new Date() },
        { upsert: true }
      );
      // Registered → go straight to main menu in chosen language
      if (user) return { screen: chosen === 'ta' ? 'MAIN_MENU_TA' : 'MAIN_MENU_EN', data: {} };
      // New user -> Immediately proceed to EPIC_ENTRY in chosen language
      return {
        screen: 'EPIC_ENTRY',
        data: {
          heading: s(chosen, 'ep_heading'),
          body: s(chosen, 'ep_body'),
          label: s(chosen, 'ep_label'),
          helper: s(chosen, 'ep_helper'),
          error_msg: '',
          btn: s(chosen, 'ep_btn')
        }
      };
    }
    case 'REG_SUCCESS': {
      return { screen: lang === 'ta' ? 'MAIN_MENU_TA' : 'MAIN_MENU_EN', data: {} };
    }
    case 'LOCKED_MENU':
      return epicScreen('');
    case 'EPIC_ENTRY': {
      const epicNo = String(data.epic_no || '').trim().toUpperCase();
      if (!epicNo || epicNo.length < 5) return epicScreen(lang === 'ta' ? '❌ சரியான EPIC எண்ணை உள்ளிடவும்.' : '❌ Please enter a valid EPIC number.');
      const existingByEpic = await User.findOne({ epicNo });
      if (existingByEpic) return epicScreen(lang === 'ta' ? `❌ EPIC ${epicNo} ஏற்கனவே பதிவு செய்யப்பட்டுள்ளது.` : `❌ EPIC ${epicNo} already registered.`);
      const result = await findVoterByEpic(epicNo);
      if (!result || !result.doc) return epicScreen(lang === 'ta' ? `❌ EPIC ${epicNo} வாக்காளர் பட்டியலில் கிடைக்கவில்லை.` : `❌ EPIC ${epicNo} not found. Please recheck.`);
      const v = result.doc;
      const vd = {
        epicNo: v.EPIC_NO,
        voterName: v.VOTER_NAME,
        fatherName: v.RELATION_NAME || v.FATHER_NAME || '—',
        district: v.DISTRICT,
        assemblyNo: String(v.ASSEMBLY_NO || result.colName.replace('ass_', '')),
        assemblyName: v.ASSEMBLY_NAME || `Assembly ${v.ASSEMBLY_NO}`,
        boothNo: String(v.PART_NO || '1'),
        gender: v.GENDER || 'Unspecified',
        age: v.AGE || '—'
      };
      await WaSession.findOneAndUpdate({ mobile: from }, { tempVoterData: vd, step: 'CONFIRM_VOTER', updatedAt: new Date() });
      const details =
        `👤 ${vd.voterName}\n` +
        `👨‍👩‍👦 ${lang === 'ta' ? 'தந்தை / உறவினர்:' : 'Father/Relation:'} ${vd.fatherName}\n` +
        `🏛️ ${vd.district}\n` +
        `🗳️ ${vd.assemblyName}\n` +
        `📍 ${lang === 'ta' ? 'சாவடி எண்:' : 'Booth:'} ${vd.boothNo}\n` +
        `⚧ ${lang === 'ta' ? 'பாலினம் / வயது:' : 'Gender/Age:'} ${vd.gender} / ${vd.age}`;

      return {
        screen: 'CONFIRM_VOTER',
        data: {
          heading: s(lang, 'cv_heading'),
          question: s(lang, 'cv_question'),
          details,
          label: s(lang, 'cv_label'),
          btn: s(lang, 'cv_btn')
        }
      };
    }
    case 'CONFIRM_VOTER': {
      if (!(data.confirmed === 'yes' || data.confirmed === true)) return epicScreen('');
      const vd = session?.tempVoterData;
      if (!vd) return epicScreen('');

      // Route voter to 23 Schemes selection screen (APPLY_SCHEME)
      await WaSession.findOneAndUpdate({ mobile: from }, { step: 'APPLY_SCHEME', updatedAt: new Date() });

      return {
        screen: 'APPLY_SCHEME',
        data: {
          heading: lang === 'ta' ? '📋 திட்டதைத் தேர்ந்தெடுக்கவும் (23 திட்டங்கள்)' : '📋 Select Central Welfare Scheme (23 Schemes)',
          body: lang === 'ta' ? 'விண்ணப்பிக்க விரும்பும் பாஜக மத்திய அரசைச் சார்ந்த நலத்திட்டத்தைத் தேர்ந்தெடுக்கவும்:' : 'Choose the BJP Central Welfare Scheme you want to register for:',
          label: lang === 'ta' ? 'திட்டம் தேர்வு' : 'Select Scheme',
          btn: lang === 'ta' ? '✅ பதிவை முடித்து பரிந்துரை லிங்க் பெறவும்' : '✅ Complete Registration & Get Referral Link'
        }
      };
    }
    case 'MAIN_MENU':
    case 'MAIN_MENU_EN':
    case 'MAIN_MENU_TA': {
      const menuScreen = lang === 'ta' ? 'MAIN_MENU_TA' : 'MAIN_MENU_EN';
      const user = await User.findOne({ mobile: { $in: variants } });
      if (!user) return { screen: menuScreen, data: {} };

      let result;
      switch (data.choice || data.action) {
        case 'profile':   result = { screen: 'MY_PROFILE',  data: buildProfile(user, lang) }; break;
        case 'schemes':   result = { screen: 'MY_SCHEMES',  data: await buildSchemes(user, lang) }; break;
        case 'referral':  result = { screen: 'MY_REFERRAL', data: await buildReferral(user, lang) }; break;
        case 'referrals': result = { screen: 'MY_REFERRALS',data: await buildReferrals(user, lang) }; break;
        case 'booth_president': result = await openBoothPresident(user, lang); break;
        default: return { screen: menuScreen, data: {} };
      }

      if (result) {
        await WaSession.findOneAndUpdate({ mobile: from }, { step: result.screen, updatedAt: new Date() });
      }
      return result;
    }
    case 'MY_SCHEMES': {
      const selectedScheme = data.selected_scheme;
      if (selectedScheme) {
        let user = await User.findOne({ mobile: { $in: variants } });
        if (user) {
          const rawVal = String(selectedScheme).trim();
          const info = BJP_SCHEMES.find(x => String(x.id) === rawVal || x.name.toLowerCase() === rawVal.toLowerCase() || x.fullName.toLowerCase() === rawVal.toLowerCase());
          const schemeIdStr = info ? String(info.id) : rawVal;
          const schemeNameStr = info ? info.fullName : rawVal;

          await SchemeApplication.create({
            userId: user._id,
            schemeId: schemeIdStr,
            schemeName: schemeNameStr,
            status: 'Pending',
            appliedAt: new Date()
          });

          const imgUrl = CLOUDINARY_SCHEME_MAP[schemeIdStr] || CLOUDINARY_SCHEME_MAP[info?.name] || CLOUDINARY_SCHEME_MAP["PM Kisan"];
          if (imgUrl) {
            const cap = lang === 'ta'
              ? `✅ *விண்ணப்பம் வெற்றிகரமாக சமர்ப்பிக்கப்பட்டது!*\n🏛️ திட்டம்: ${schemeNameStr}`
              : `✅ *Application Submitted Successfully!*\n🏛️ Scheme: ${schemeNameStr}`;
            await sendImage(from, imgUrl, cap);
          }

          const bodyText = lang === 'ta'
            ? `திட்டம்: ${schemeNameStr}\nநிலை: ஆய்வில் உள்ளது ⏳\n\nஉங்கள் விண்ணப்பம் பெறப்பட்டது. எங்கள் குழு தொடர்பு கொள்ளும். 🙏`
            : `Scheme: ${schemeNameStr}\nStatus: Pending Review ⏳\n\nYour application has been received. Our team will contact you. 🙏`;

          return {
            screen: 'SCHEME_APPLIED',
            data: {
              heading: lang === 'ta' ? '✅ விண்ணப்பம் சமர்ப்பிக்கப்பட்டது!' : '✅ Application Submitted!',
              body: bodyText,
              done: s(lang, 'sc_done')
            }
          };
        }
      }
      return { screen: 'APPLY_SCHEME', data: { heading: s(lang, 'as_heading'), body: s(lang, 'as_body'), label: s(lang, 'as_label'), btn: s(lang, 'as_btn') } };
    }
    case 'APPLY_SCHEME': {
      let user = await User.findOne({ mobile: { $in: variants } });
      const vd = session?.tempVoterData;

      // If new registration via flow
      if (!user && vd) {
        user = await User.create({
          mobile: mobile10,
          epicNo: vd.epicNo,
          voterName: vd.voterName,
          district: vd.district,
          assemblyNo: vd.assemblyNo,
          assemblyName: vd.assemblyName,
          boothNo: vd.boothNo,
          gender: vd.gender,
          referralCode: genReferralCode(vd.epicNo),
          referredBy: session?.referredBy || null,
          channel: 'whatsapp'
        });
      }

      if (!user) return { screen: (lang === 'ta' ? 'MAIN_MENU_TA' : 'MAIN_MENU_EN'), data: {} };

      const selectedId = parseInt(data.selected_scheme || 1);
      const info = BJP_SCHEMES.find(x => x.id === selectedId);
      const schemeName = info ? (info.fullName || info.name) : `Scheme ${selectedId}`;
      const clusterName = info ? info.cluster : 'BJP Nalam Thittam Welfare';
      const benefit = info ? info.benefit : 'BJP Central Scheme Benefit';

      const existing = await SchemeApplication.findOne({ userId: user._id, schemeId: selectedId });
      if (!existing) {
        await SchemeApplication.create({
          userId: user._id,
          epicNo: user.epicNo,
          voterName: user.voterName,
          mobile: user.mobile,
          district: user.district,
          assemblyName: user.assemblyName,
          assemblyNo: user.assemblyNo,
          boothNo: user.boothNo,
          schemeId: selectedId,
          schemeName,
          clusterName,
          benefit,
          status: 'Submitted',
          adminRemarks: 'Applied via WhatsApp Flow',
          channel: 'whatsapp',
          statusHistory: [{ status: 'Submitted', remarks: 'Applied via WhatsApp Flow', updatedBy: `WA:${user.voterName}` }]
        });
      }

      await WaSession.findOneAndUpdate({ mobile: from }, { userId: user._id, step: 'MAIN_MENU', tempVoterData: null });

      // Send registration summary & referral link into WhatsApp chat window
      const link = `${REFERRAL_BASE}/r/${user.referralCode}`;
      sendText(from, t('REGISTRATION_SUMMARY', lang, user, schemeName, link)).catch(() => {});

      return {
        screen: 'REG_SUCCESS',
        data: {
          heading: s(lang, 'rs_heading'),
          body: s(lang, 'rs_body', user.voterName),
          btn: s(lang, 'rs_btn')
        }
      };
    }
    case 'BOOTH_PRESIDENT': {
      const user = await User.findOne({ mobile: { $in: variants } });
      if (!user) return { screen: (lang === 'ta' ? 'MAIN_MENU_TA' : 'MAIN_MENU_EN'), data: {} };
      const choice = data.bp_choice;
      if (choice === 'registered') {
        const existing = await BoothPresidentApplication.findOne({ epicNo: user.epicNo, targetAssembly: user.assemblyName, targetBoothNo: String(user.boothNo), status: 'Pending' });
        if (!existing) {
          await BoothPresidentApplication.create({
            userId: user._id, voterName: user.voterName, epicNo: user.epicNo, mobile: user.mobile,
            originalDistrict: user.district, originalAssembly: user.assemblyName, originalBoothNo: user.boothNo,
            boothType: 'registered', targetDistrict: user.district, targetAssembly: user.assemblyName, targetBoothNo: String(user.boothNo),
            status: 'Pending', appliedAt: new Date()
          });
        }
        const body = lang === 'ta'
          ? `சாவடி: ${user.boothNo}\nதொகுதி: ${user.assemblyName}\nமாவட்டம்: ${user.district}\nநிலை: ${existing ? existing.status : 'Pending Review'}\n\nஎங்கள் குழு ஆய்வு செய்து தொடர்பு கொள்ளும்.`
          : `Booth: ${user.boothNo}\nAssembly: ${user.assemblyName}\nDistrict: ${user.district}\nStatus: ${existing ? existing.status : 'Pending Review'}\n\nOur team will review and contact you.`;
        return { screen: 'BP_SUBMITTED', data: { heading: s(lang, 'bp_submitted_heading'), body, done: s(lang, 'bp_done') } };
      }
      return { screen: 'BP_DISTRICT', data: {
        heading: lang === 'ta' ? '🏛️ மாவட்டம் தேர்ந்தெடுக்கவும்' : '🏛️ Select District',
        body:    lang === 'ta' ? 'நீங்கள் சேவை செய்ய விரும்பும் மாவட்டத்தைத் தேர்ந்தெடுக்கவும்:' : 'Select the district you want to serve:',
        label:   lang === 'ta' ? 'மாவட்டம்' : 'District',
        btn:     lang === 'ta' ? 'அடுத்து' : 'Next'
      } };
    }
    case 'BP_DISTRICT': {
      const district = String(data.bp_district || '').trim();
      await WaSession.findOneAndUpdate({ mobile: from }, { tempBPDistrict: district, updatedAt: new Date() }, { upsert: true });
      const assemblies = await assembliesForDistrict(district);
      return { screen: 'BP_ASSEMBLY', data: {
        heading: lang === 'ta' ? '🗳️ தொகுதி தேர்ந்தெடுக்கவும்' : '🗳️ Select Assembly',
        body:    lang === 'ta' ? `${district} மாவட்டத்தில் உங்கள் தொகுதியைத் தேர்ந்தெடுக்கவும்:` : `Choose your assembly in ${district}:`,
        assemblies,
        label:   lang === 'ta' ? 'தொகுதி' : 'Assembly',
        btn:     lang === 'ta' ? 'அடுத்து' : 'Next'
      } };
    }
    case 'BP_ASSEMBLY': {
      const assembly = String(data.bp_assembly || '').trim();
      await WaSession.findOneAndUpdate({ mobile: from }, { tempBPAssembly: assembly, updatedAt: new Date() }, { upsert: true });
      return { screen: 'BP_BOOTH', data: {
        heading: lang === 'ta' ? '📍 சாவடி எண்ணை உள்ளிடவும்' : '📍 Enter Booth Number',
        body:    lang === 'ta' ? `${assembly} தொகுதியில் எந்த சாவடி?` : `Which booth in ${assembly}?`,
        label:   lang === 'ta' ? 'இலக்கு சாவடி எண்' : 'Target Booth Number',
        helper:  lang === 'ta' ? 'எ.கா. 20' : 'e.g. 20',
        btn:     lang === 'ta' ? 'விண்ணப்பத்தை சமர்ப்பி' : 'Submit Request'
      } };
    }
    case 'BP_BOOTH': {
      const user = await User.findOne({ mobile: { $in: variants } });
      if (!user) return { screen: (lang === 'ta' ? 'MAIN_MENU_TA' : 'MAIN_MENU_EN'), data: {} };
      const district = session?.tempBPDistrict || user.district;
      const assembly = session?.tempBPAssembly || user.assemblyName;
      const boothNo  = String(data.bp_booth || '').trim();

      let statusLabel = 'Pending Review';
      const existing = await BoothPresidentApplication.findOne({ epicNo: user.epicNo, targetAssembly: assembly, targetBoothNo: boothNo, status: 'Pending' });
      if (existing) {
        statusLabel = existing.status;
      } else if (boothNo && assembly && district) {
        await BoothPresidentApplication.create({
          userId: user._id, voterName: user.voterName, epicNo: user.epicNo, mobile: user.mobile,
          originalDistrict: user.district, originalAssembly: user.assemblyName, originalBoothNo: user.boothNo,
          boothType: 'custom', targetDistrict: district, targetAssembly: assembly, targetBoothNo: boothNo,
          status: 'Pending', appliedAt: new Date()
        });
      }
      await WaSession.findOneAndUpdate({ mobile: from }, { tempBPDistrict: null, tempBPAssembly: null });
      const body = lang === 'ta'
        ? `சாவடி: ${boothNo}\nதொகுதி: ${assembly}\nமாவட்டம்: ${district}\nநிலை: ${statusLabel}\n\nஎங்கள் குழு ஆய்வு செய்து தொடர்பு கொள்ளும்.`
        : `Booth: ${boothNo}\nAssembly: ${assembly}\nDistrict: ${district}\nStatus: ${statusLabel}\n\nOur team will review and contact you.`;
      return { screen: 'BP_SUBMITTED', data: { heading: s(lang, 'bp_submitted_heading'), body, done: s(lang, 'bp_done') } };
    }
    default:
      return { screen: screen || 'MAIN_MENU', data: {} };
  }
};

// ── Data builders ─────────────────────────────────────────────────────────────
function buildMainMenu(user, lang) {
  return { welcome: s(lang, 'mm_welcome', user.voterName || 'Member'), subtitle: s(lang, 'mm_subtitle'), label: s(lang, 'mm_label'), btn: s(lang, 'mm_btn') };
}

function buildProfile(user, lang) {
  const link = `${REFERRAL_BASE}/r/${user.referralCode}`;
  const assemblyStr = user.assemblyName ? `${user.assemblyName}${user.assemblyNo ? ' (' + user.assemblyNo + ')' : ''}` : (user.assemblyNo || '—');
  const body = lang === 'ta'
    ? `👤 *பெயர்:* ${user.voterName}\n` +
      `🪪 *EPIC எண்:* ${user.epicNo}\n` +
      `📱 *மொபைல்:* ${user.mobile}\n` +
      `🏛️ *மாவட்டம்:* ${user.district}\n` +
      `🗳️ *தொகுதி:* ${assemblyStr}\n` +
      `📍 *சாவடி எண்:* ${user.boothNo}\n` +
      `⚧ *பாலினம்:* ${user.gender || '—'}\n` +
      `🔗 *பரிந்துரை ID:* ${user.referralCode}\n` +
      `📅 *பதிவு செய்த நாள்:* ${formatDate(user.createdAt)}\n\n` +
      `🌐 *பரிந்துரை இணைப்பு:*\n${link}`
    : `👤 *Full Name:* ${user.voterName}\n` +
      `🪪 *EPIC Number:* ${user.epicNo}\n` +
      `📱 *Mobile Number:* ${user.mobile}\n` +
      `🏛️ *District:* ${user.district}\n` +
      `🗳️ *Assembly:* ${assemblyStr}\n` +
      `📍 *Booth Number:* ${user.boothNo}\n` +
      `⚧ *Gender:* ${user.gender || '—'}\n` +
      `🔗 *Referral ID:* ${user.referralCode}\n` +
      `📅 *Registration Date:* ${formatDate(user.createdAt)}\n\n` +
      `🌐 *Referral Link:*\n${link}`;
  return { heading: s(lang, 'pf_heading'), body, done: s(lang, 'pf_done') };
}

async function buildFullSchemesText(user, lang) {
  const apps = await SchemeApplication.find({ userId: user._id }).sort({ appliedAt: -1 });
  if (apps.length === 0) return null;

  const statusLabelMap = {
    Approved: { ta: 'அங்கீகரிக்கப்பட்டது ✅', en: 'Approved ✅' },
    Verified: { ta: 'சரிபார்க்கப்பட்டது 🎯', en: 'Verified 🎯' },
    Pending:  { ta: 'ஆய்வில் உள்ளது ⏳', en: 'Pending Review ⏳' },
    Rejected: { ta: 'நிராகரிக்கப்பட்டது ❌', en: 'Rejected ❌' },
    Declined: { ta: 'நிராகரிக்கப்பட்டது ❌', en: 'Declined ❌' }
  };

  const list = apps.map((a, i) => {
    const rawVal = String(a.schemeId || a.schemeName || '').trim();
    const info = BJP_SCHEMES.find(x =>
      String(x.id) === rawVal ||
      x.name.toLowerCase() === rawVal.toLowerCase() ||
      x.fullName.toLowerCase() === rawVal.toLowerCase()
    );

    const stObj = statusLabelMap[a.status] || { ta: `${statusEmoji(a.status)} ${a.status}`, en: `${statusEmoji(a.status)} ${a.status}` };
    const st = lang === 'ta' ? stObj.ta : stObj.en;
    const schemeIdNum = info ? info.id : rawVal;

    const schemeIcon = SCHEME_ICON_MAP[schemeIdNum] || '🏛️';

    if (lang === 'ta') {
      const schemeNameText = info ? (info.titleTa || info.nameTa || info.fullName) : a.schemeName;
      const schemeHeader = `திட்டம் #${schemeIdNum}: ${schemeNameText}`;
      const cluster = info ? (info.clusterTa || info.cluster) : 'பாஜக அரசு நலத்திட்டம்';
      const benefit = info ? (info.benefitTa || info.benefit) : 'மத்திய அரசு நலத்திட்ட உதவி';

      return `${i + 1}. ${schemeIcon} *${schemeHeader}*\n` +
             `   📌 வகை: ${cluster}\n` +
             `   🎁 நன்மை: ${benefit}\n` +
             `   📋 நிலை: ${st}\n` +
             `   📅 நாள்: ${formatDate(a.appliedAt)}`;
    }

    const schemeNameText = info ? (info.fullName || info.name) : a.schemeName;
    const schemeHeader = `Scheme #${schemeIdNum}: ${schemeNameText}`;
    const cluster = info ? info.cluster : 'BJP Central Scheme';
    const benefit = info ? info.benefit : 'Welfare Scheme Benefit';

    return `${i + 1}. ${schemeIcon} *${schemeHeader}*\n` +
           `   📌 Category: ${cluster}\n` +
           `   🎁 Benefit: ${benefit}\n` +
           `   📋 Status: ${st}\n` +
           `   📅 Applied: ${formatDate(a.appliedAt)}`;
  }).join('\n\n─────────────────\n\n');

  const heading = lang === 'ta' ? `📋 *உங்கள் அனைத்து விண்ணப்பித்த திட்டங்கள் (${apps.length})*` : `📋 *All Your Applied Schemes (${apps.length})*`;
  return `${heading}\n\n${list}`;
}

async function buildSchemes(user, lang) {
  const apps = await SchemeApplication.find({ userId: user._id }).sort({ appliedAt: -1 });
  const schemesList = schemeOptions(lang).map(s => ({
    id: s.id,
    title: s.title,
    description: lang === 'ta' ? `திட்டம் #${s.id} — பாஜக மத்திய அரசு நலத்திட்டம்` : `Scheme #${s.id} — BJP Central Welfare`
  }));

  if (apps.length === 0) {
    const emptyBody = lang === 'ta'
      ? 'இன்னும் எந்த திட்டத்திற்கும் விண்ணப்பிக்கவில்லை.\n\nகீழே உள்ள பொத்தானைத் தட்டி 23 பாஜக அரசு நலத்திட்டங்களில் உங்களுக்கு தேவையானதைத் தேர்ந்தெடுத்து விண்ணப்பிக்கவும்! 🙏'
      : 'You have not applied for any welfare schemes yet.\n\nTap the button below to browse all 23 BJP Central Welfare Schemes and apply instantly! 🙏';
    return {
      heading: `${s(lang, 'sc_heading')} (0)`,
      body: emptyBody,
      label: lang === 'ta' ? '23 பாஜக திட்டங்கள் (தேர்ந்தெடுக்கவும்)' : 'Browse & Apply (23 Schemes)',
      schemes: schemesList,
      btn_apply: lang === 'ta' ? '🟢 தேர்ந்தெடுக்கப்பட்ட திட்டத்திற்கு விண்ணப்பிக்க' : '🟢 Apply for Selected Scheme',
      done: lang === 'ta' ? '❌ மூடு' : '❌ Close',
      apply: s(lang, 'sc_apply')
    };
  }

  const statusLabelMap = {
    Approved: { ta: 'அங்கீகரிக்கப்பட்டது ✅', en: 'Approved ✅' },
    Verified: { ta: 'சரிபார்க்கப்பட்டது 🎯', en: 'Verified 🎯' },
    Pending:  { ta: 'ஆய்வில் உள்ளது ⏳', en: 'Pending Review ⏳' },
    Rejected: { ta: 'நிராகரிக்கப்பட்டது ❌', en: 'Rejected ❌' },
    Declined: { ta: 'நிராகரிக்கப்பட்டது ❌', en: 'Declined ❌' }
  };

  const previewApps = apps.slice(0, 2);
  const list = previewApps.map((a, i) => {
    const rawVal = String(a.schemeId || a.schemeName || '').trim();
    const info = BJP_SCHEMES.find(x =>
      String(x.id) === rawVal ||
      x.name.toLowerCase() === rawVal.toLowerCase() ||
      x.fullName.toLowerCase() === rawVal.toLowerCase()
    );

    const stObj = statusLabelMap[a.status] || { ta: `${statusEmoji(a.status)} ${a.status}`, en: `${statusEmoji(a.status)} ${a.status}` };
    const st = lang === 'ta' ? stObj.ta : stObj.en;
    const schemeIdNum = info ? info.id : rawVal;
    const schemeIcon = SCHEME_ICON_MAP[schemeIdNum] || '🏛️';

    if (lang === 'ta') {
      const schemeNameText = info ? (info.titleTa || info.nameTa || info.fullName) : a.schemeName;
      const schemeHeader = `திட்டம் #${schemeIdNum}: ${schemeNameText}`;
      const cluster = info ? (info.clusterTa || info.cluster) : 'பாஜக அரசு நலத்திட்டம்';
      const benefit = info ? (info.benefitTa || info.benefit) : 'மத்திய அரசு நலத்திட்ட உதவி';

      return `${i + 1}. ${schemeIcon} *${schemeHeader}*\n` +
             `   📌 வகை: ${cluster}\n` +
             `   🎁 நன்மை: ${benefit}\n` +
             `   📋 நிலை: ${st}\n` +
             `   📅 நாள்: ${formatDate(a.appliedAt)}`;
    }

    const schemeNameText = info ? (info.fullName || info.name) : a.schemeName;
    const schemeHeader = `Scheme #${schemeIdNum}: ${schemeNameText}`;
    const cluster = info ? info.cluster : 'BJP Central Scheme';
    const benefit = info ? info.benefit : 'Welfare Scheme Benefit';

    return `${i + 1}. ${schemeIcon} *${schemeHeader}*\n` +
           `   📌 Category: ${cluster}\n` +
           `   🎁 Benefit: ${benefit}\n` +
           `   📋 Status: ${st}\n` +
           `   📅 Applied: ${formatDate(a.appliedAt)}`;
  }).join('\n\n─────────────────\n\n');

  const note = apps.length > 2
    ? (lang === 'ta' ? `\n\n(மேலும் ${apps.length - 2} திட்டங்கள் உள்ளன)` : `\n\n(+${apps.length - 2} more schemes)`)
    : '';

  return {
    heading: `${s(lang, 'sc_heading')} (${apps.length})`,
    body: `${list}${note}`,
    label: lang === 'ta' ? '23 பாஜக திட்டங்கள் (தேர்ந்தெடுக்கவும்)' : 'Browse & Apply (23 Schemes)',
    schemes: schemesList,
    btn_apply: lang === 'ta' ? '🟢 தேர்ந்தெடுக்கப்பட்ட திட்டத்திற்கு விண்ணப்பிக்க' : '🟢 Apply for Selected Scheme',
    done: lang === 'ta' ? '❌ மூடு' : '❌ Close',
    apply: s(lang, 'sc_apply')
  };
}

async function buildReferral(user, lang) {
  const count = await User.countDocuments({ referredBy: user.referralCode });
  const link = `${REFERRAL_BASE}/r/${user.referralCode}`;
  const body = lang === 'ta'
    ? `உங்கள் பரிந்துரை இணைப்பு:\n${link}\n\n📊 மொத்த பரிந்துரைகள்: ${count}\n\nநண்பர்களுடன் பகிர்ந்து அரசு திட்டங்கள் பெற உதவுங்கள்! 🙏`
    : `Your Referral Link:\n${link}\n\n📊 Total Referrals: ${count}\n\nShare with friends & family to help them access welfare schemes! 🙏`;
  return { heading: s(lang, 'rl_heading'), body, done: s(lang, 'rl_done') };
}

async function buildReferrals(user, lang) {
  const refs = await User.find({ referredBy: user.referralCode }).sort({ createdAt: -1 }).limit(20);
  if (refs.length === 0) {
    const body = lang === 'ta'
      ? 'இன்னும் யாரும் உங்கள் இணைப்பு மூலம் பதிவு செய்யவில்லை.\n\nஉங்கள் பரிந்துரை இணைப்பைப் பகிர்ந்து புதிய உறுப்பினர்களை இணையச் சொல்லுங்கள்! 🙏'
      : 'No one has registered through your link yet.\n\nShare your referral link to invite voters to join! 🙏';
    return { heading: `${s(lang, 'rf_heading')} (0)`, body, done: s(lang, 'rf_done') };
  }

  const list = refs.map((r, i) => {
    const name = r.voterName || 'Voter';
    const dist = r.district || '—';
    const date = formatDate(r.createdAt);
    return `${i + 1}. 👤 *${name}*\n   🏛️ ${dist} | 📅 ${date}`;
  }).join('\n\n');

  const footer = `\n\n📊 *${lang === 'ta' ? 'மொத்த பரிந்துரைகள்' : 'Total Referral Members'}: ${refs.length}*`;
  return { heading: `${s(lang, 'rf_heading')} (${refs.length})`, body: `${list}${footer}`, done: s(lang, 'rf_done') };
}

async function openBoothPresident(user, lang) {
  const apps = await BoothPresidentApplication.find({ epicNo: user.epicNo }).sort({ appliedAt: -1 }).lean();
  const existing = apps.find(a => a.status === 'Approved')
                || apps.find(a => a.status === 'Pending')
                || apps[0] || null;

  if (existing) {
    const statusLabelMap = lang === 'ta'
      ? { Approved: 'அங்கீகரிக்கப்பட்டது ✅', Declined: 'நிராகரிக்கப்பட்டது ❌', Pending: 'ஆய்வில் உள்ளது ⏳' }
      : { Approved: 'Approved ✅', Declined: 'Declined ❌', Pending: 'Under Review ⏳' };
    const st = statusLabelMap[existing.status] || existing.status;
    const heading = lang === 'ta' ? '🏛️ துறை தலைவர் விண்ணப்ப நிலை' : '🏛️ Booth President Application Status';
    const body = lang === 'ta'
      ? `📍 *சாவடி எண்:* சாவடி #${existing.targetBoothNo}\n` +
        `🗳️ *தொகுதி:* ${existing.targetAssembly}\n` +
        `🏛️ *மாவட்டம்:* ${existing.targetDistrict}\n` +
        `📅 *விண்ணப்பித்த நாள்:* ${formatDate(existing.appliedAt)}\n` +
        `📋 *நிலை:* ${st}`
      : `📍 *Target Booth:* Booth #${existing.targetBoothNo}\n` +
        `🗳️ *Assembly:* ${existing.targetAssembly}\n` +
        `🏛️ *District:* ${existing.targetDistrict}\n` +
        `📅 *Applied Date:* ${formatDate(existing.appliedAt)}\n` +
        `📋 *Status:* ${st}`;
    return { screen: 'BP_SUBMITTED', data: { heading, body, done: s(lang, 'bp_done') } };
  }

  const body = lang === 'ta'
    ? `உங்கள் பகுதியில் அதிகாரப்பூர்வ பாஜக துறை தலைவராக சேவை செய்யுங்கள்!\n\n📍 *தற்போதைய சாவடி:* ${user.assemblyName || 'Assembly'} - சாவடி #${user.boothNo}`
    : `Serve your area as an official BJP Booth President!\n\n📍 *Current Booth:* ${user.assemblyName || 'Assembly'} - Booth #${user.boothNo}`;
  const options = lang === 'ta'
    ? [ { id: 'registered', title: `✅ என் சாவடி (சாவடி #${user.boothNo})` }, { id: 'custom', title: '🔀 வேறு சாவடியைத் தேர்ந்தெடுக்கவும்' } ]
    : [ { id: 'registered', title: `✅ My current booth (Booth #${user.boothNo})` }, { id: 'custom', title: '🔀 Choose a different booth' } ];
  return {
    screen: 'BOOTH_PRESIDENT',
    data: {
      heading: s(lang, 'bp_heading'),
      body,
      options,
      label: lang === 'ta' ? 'தேர்ந்தெடுக்கவும்' : 'Choose an option',
      btn:   lang === 'ta' ? 'அடுத்து' : 'Next'
    }
  };
}



const assembliesForDistrict = async (district) => {
  try {
    const all = await getAssemblyMetadata();
    const norm = String(district || '').toUpperCase().trim();
    const filtered = all
      .filter(a => String(a.district || '').toUpperCase().trim() === norm)
      .sort((x, y) => parseInt(x.assemblyNo || 0) - parseInt(y.assemblyNo || 0));
    const list = (filtered.length ? filtered : all).map(a => ({
      id: a.assemblyName,
      title: `${a.assemblyNo} - ${a.assemblyName}`
    }));
    return list.slice(0, 200);
  } catch (err) {
    logger.error('[WA assembliesForDistrict]', { error: err.message });
    return [];
  }
};

// ── Status push from admin ────────────────────────────────────────────────────
const pushStatusUpdate = async (userDoc, schemeName, newStatus) => {
  if (!userDoc || !userDoc.mobile) return;
  try {
    const waNumber = userDoc.mobile.length === 10 ? '91' + userDoc.mobile : userDoc.mobile;
    const session = await WaSession.findOne({ mobile: waNumber });
    await sendText(waNumber, t('STATUS_UPDATE', session?.lang || 'en', userDoc.voterName, schemeName, newStatus));
  } catch (err) { logger.error('[WA pushStatusUpdate]', { error: err.message }); }
};

module.exports = {
  normalizeMobile,
  getMobileVariants,
  isValidMobile,
  verifyWebhook,
  handleWebhook,
  handleFlowEndpoint,
  pushStatusUpdate
};
