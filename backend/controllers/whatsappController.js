'use strict';
const User         = require('../models/User');
const WaSession    = require('../models/WaSession');
const SchemeApplication = require('../models/SchemeApplication');
const BoothPresidentApplication = require('../models/BoothPresidentApplication');
const { BJP_SCHEMES }  = require('../constants/schemes');
const { t }            = require('../constants/waMessages');
const { s, schemeOptions } = require('../constants/waStrings');
const { sendText, triggerFlow } = require('../services/whatsappService');
const { decryptRequest, encryptResponse } = require('../services/flowCrypto');
const { findVoterByEpic } = require('../services/voterSearchService');
const { getAssemblyMetadata } = require('../services/jurisdictionService');
const logger = require('../config/logger');

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
  const m10 = normalizeMobile(wa);
  if (!m10) return [];
  return [m10, `91${m10}`, `+91${m10}`, `0${m10}`];
};

const isValidMobile = (wa) => {
  const m10 = normalizeMobile(wa);
  return Boolean(m10 && m10.length === 10 && /^[6-9]\d{9}$/.test(m10));
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
    const msg = value?.messages?.[0];
    if (!msg) return;
    const from = msg.from;
    if (msg.type === 'interactive' && msg.interactive?.type === 'nfm_reply') {
      let payload = {};
      try { payload = JSON.parse(msg.interactive.nfm_reply.response_json); } catch {}
      return handleFlowCompletion(from, payload);
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
    const session = await WaSession.findOne({ mobile: from });
    const lang = session?.lang || 'ta';

    if (user) {
      // User ALREADY REGISTERED (via Web or WhatsApp) -> Open portal flow directly
      await WaSession.findOneAndUpdate(
        { mobile: from },
        { userId: user._id, step: 'MAIN_MENU', updatedAt: new Date() },
        { upsert: true }
      );

      const targetFlow = PORTAL_FLOW_ID || ONBOARDING_FLOW_ID;
      const targetScreen = 'LANGUAGE_SELECT';
      const ctaLabel = 'Open Portal';
      const bannerMsg = `✅ *Welcome back, ${user.voterName}!* 👋\n\nTap below to open your BJP Nalam Thittam Portal.`;

      await triggerFlow(from, targetFlow, targetScreen, {}, ctaLabel, bannerMsg);
    } else {
      // NEW / UNREGISTERED user -> Prompt for language choice & register
      await WaSession.findOneAndUpdate(
        { mobile: from },
        { step: 'LANGUAGE_SELECT', updatedAt: new Date() },
        { upsert: true }
      );

      const bannerMsg =
        '🙏 *Welcome to BJP Nalam Thittam!*\n' +
        'பாஜக நலம் திட்டத்திற்கு வரவேற்கிறோம்!\n\n' +
        'Tap below to choose language & start registration.\n' +
        'மொழியைத் தேர்ந்தெடுத்து பதிவைத் தொடங்க கீழே தட்டவும்.';

      await triggerFlow(
        from,
        ONBOARDING_FLOW_ID,
        'LANGUAGE_SELECT',
        {},
        'Select Language / மொழி',
        bannerMsg
      );
    }
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
    const session = await WaSession.findOne({ mobile: from });
    const lang = session?.lang || 'ta';

    switch (closedScreen) {
      case 'MY_SCHEMES': {
        // Only send when user taps Close — not Apply footer
        if (action === 'close') {
          const fullSchemesText = await buildFullSchemesText(user, lang);
          if (fullSchemesText) await sendText(from, fullSchemesText);
        }
        break;
      }
      case 'MY_PROFILE': {
        // Terminal screen — always fires on Done/Close tap
        const prof = buildProfile(user, lang);
        if (prof?.body) await sendText(from, `*${prof.heading}*\n\n${prof.body}`);
        break;
      }
      case 'MY_REFERRAL': {
        const ref = await buildReferral(user, lang);
        if (ref?.body) await sendText(from, `*${ref.heading}*\n\n${ref.body}`);
        break;
      }
      case 'MY_REFERRALS': {
        const refs = await buildReferrals(user, lang);
        if (refs?.body) await sendText(from, `*${refs.heading}*\n\n${refs.body}`);
        break;
      }
      case 'BOOTH_PRESIDENT':
      case 'BP_SUBMITTED': {
        // Find most recent booth president application for this user
        const bpApp = await BoothPresidentApplication.findOne({ epicNo: user.epicNo }).sort({ appliedAt: -1 });
        if (bpApp) {
          const statusEmojiBP = { Pending: '⏳', Approved: '✅', Rejected: '❌', 'Under Review': '🔍' }[bpApp.status] || '⏳';
          const body = lang === 'ta'
            ? `🏛️ *துறை தலைவர் விண்ணப்பம்*\n\n` +
              `👤 பெயர்: ${bpApp.voterName}\n` +
              `📍 சாவடி: ${bpApp.targetBoothNo}\n` +
              `🗳️ தொகுதி: ${bpApp.targetAssembly}\n` +
              `🏛️ மாவட்டம்: ${bpApp.targetDistrict}\n` +
              `📋 நிலை: ${statusEmojiBP} ${bpApp.status}\n` +
              `📅 விண்ணப்பித்த நாள்: ${formatDate(bpApp.appliedAt)}\n\n` +
              `எங்கள் குழு ஆய்வு செய்து தொடர்பு கொள்ளும். 🙏`
            : `🏛️ *Booth President Application*\n\n` +
              `👤 Name: ${bpApp.voterName}\n` +
              `📍 Booth: ${bpApp.targetBoothNo}\n` +
              `🗳️ Assembly: ${bpApp.targetAssembly}\n` +
              `🏛️ District: ${bpApp.targetDistrict}\n` +
              `📋 Status: ${statusEmojiBP} ${bpApp.status}\n` +
              `📅 Applied: ${formatDate(bpApp.appliedAt)}\n\n` +
              `Our team will review your application and contact you. 🙏`;
          await sendText(from, body);
        }
        break;
      }
      default:
        break;
    }
  } catch (err) {
    logger.error('[WA handleFlowCompletion Error]', { error: err.message, from });
  }
};

// ── POST /flow-endpoint (encrypted) ───────────────────────────────────────────
const handleFlowEndpoint = async (req, res) => {
  let decrypted;
  try { decrypted = decryptRequest(req.body); }
  catch (err) { logger.error('[WA FlowEndpoint] Decrypt failed', { error: err.message }); return res.status(421).send(); }

  const { decryptedBody, aesKeyBuffer, initialVectorBuffer } = decrypted;
  const { action, screen, data, flow_token, version } = decryptedBody;

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
    logger.error('[WA FlowEndpoint]', { error: err.message, stack: err.stack, screen });
    return respond({ version, screen: screen || 'LANGUAGE_SELECT', data: { error_msg: 'Something went wrong. Please try again.' } });
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
    case 'MY_SCHEMES':
      return { screen: 'APPLY_SCHEME', data: { heading: s(lang, 'as_heading'), body: s(lang, 'as_body'), label: s(lang, 'as_label'), btn: s(lang, 'as_btn') } };
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
const buildMainMenu = (user, lang) => ({ welcome: s(lang, 'mm_welcome', user.voterName || 'Member'), subtitle: s(lang, 'mm_subtitle'), label: s(lang, 'mm_label'), btn: s(lang, 'mm_btn') });

const buildProfile = (user, lang) => {
  const link = `${REFERRAL_BASE}/r/${user.referralCode}`;
  const body = lang === 'ta'
    ? `👤 பெயர்: ${user.voterName}\n` +
      `🪪 EPIC: ${user.epicNo}\n` +
      `📱 மொபைல்: ${user.mobile}\n` +
      `🏛️ மாவட்டம்: ${user.district}\n` +
      `🗳️ தொகுதி: ${user.assemblyName} (${user.assemblyNo || ''})\n` +
      `📍 சாவடி: ${user.boothNo}\n` +
      `⚧ பாலினம்: ${user.gender || '—'}\n` +
      `🔗 பரிந்துரை குறியீடு: ${user.referralCode}\n` +
      `🌐 பரிந்துரை லிங்க்:\n${link}\n` +
      `📅 பதிவு நாள்: ${formatDate(user.createdAt)}`
    : `👤 Name: ${user.voterName}\n` +
      `🪪 EPIC: ${user.epicNo}\n` +
      `📱 Mobile: ${user.mobile}\n` +
      `🏛️ District: ${user.district}\n` +
      `🗳️ Assembly: ${user.assemblyName} (${user.assemblyNo || ''})\n` +
      `📍 Booth: ${user.boothNo}\n` +
      `⚧ Gender: ${user.gender || '—'}\n` +
      `🔗 Referral Code: ${user.referralCode}\n` +
      `🌐 Referral Link:\n${link}\n` +
      `📅 Registered: ${formatDate(user.createdAt)}`;
  return { heading: s(lang, 'pf_heading'), body, done: s(lang, 'pf_done') };
};

const buildFullSchemesText = async (user, lang) => {
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

    if (lang === 'ta') {
      const schemeNameText = info ? (info.titleTa || info.nameTa || info.fullName) : a.schemeName;
      const schemeHeader = `திட்டம் #${schemeIdNum}: ${schemeNameText}`;
      const cluster = info ? (info.clusterTa || info.cluster) : 'பாஜக அரசு நலத்திட்டம்';
      const benefit = info ? (info.benefitTa || info.benefit) : 'மத்திய அரசு நலத்திட்ட உதவி';

      return `${i + 1}. 🏛️ *${schemeHeader}*\n` +
             `   📌 வகை: ${cluster}\n` +
             `   🎁 நன்மை: ${benefit}\n` +
             `   📋 நிலை: ${st}\n` +
             `   📅 நாள்: ${formatDate(a.appliedAt)}`;
    }

    const schemeNameText = info ? (info.fullName || info.name) : a.schemeName;
    const schemeHeader = `Scheme #${schemeIdNum}: ${schemeNameText}`;
    const cluster = info ? info.cluster : 'BJP Central Scheme';
    const benefit = info ? info.benefit : 'Welfare Scheme Benefit';

    return `${i + 1}. 🏛️ *${schemeHeader}*\n` +
           `   📌 Category: ${cluster}\n` +
           `   🎁 Benefit: ${benefit}\n` +
           `   📋 Status: ${st}\n` +
           `   📅 Applied: ${formatDate(a.appliedAt)}`;
  }).join('\n\n─────────────────\n\n');

  const heading = lang === 'ta' ? `📋 *உங்கள் அனைத்து விண்ணப்பித்த திட்டங்கள் (${apps.length})*` : `📋 *All Your Applied Schemes (${apps.length})*`;
  return `${heading}\n\n${list}`;
};

const buildSchemes = async (user, lang) => {
  const apps = await SchemeApplication.find({ userId: user._id }).sort({ appliedAt: -1 });
  if (apps.length === 0) {
    const emptyBody = lang === 'ta'
      ? 'இன்னும் எந்த திட்டத்திற்கும் விண்ணப்பிக்கவில்லை.\n\nகீழே உள்ள பொத்தானைத் தட்டி 23 பாஜக அரசு நலத்திட்டங்களில் உங்களுக்கு தேவையானதைத் தேர்ந்தெடுத்து விண்ணப்பிக்கவும்! 🙏'
      : 'You have not applied for any welfare schemes yet.\n\nTap the button below to browse all 23 BJP Central Welfare Schemes and apply instantly! 🙏';
    return {
      heading: `${s(lang, 'sc_heading')} (0)`,
      body: emptyBody,
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

  // Preview up to 2 schemes in the flow screen
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

    if (lang === 'ta') {
      const schemeNameText = info ? (info.titleTa || info.nameTa || info.fullName) : a.schemeName;
      const schemeHeader = `திட்டம் #${schemeIdNum}: ${schemeNameText}`;
      const cluster = info ? (info.clusterTa || info.cluster) : 'பாஜக அரசு நலத்திட்டம்';
      const benefit = info ? (info.benefitTa || info.benefit) : 'மத்திய அரசு நலத்திட்ட உதவி';

      return `${i + 1}. 🏛️ *${schemeHeader}*\n` +
             `   📌 வகை: ${cluster}\n` +
             `   🎁 நன்மை: ${benefit}\n` +
             `   📋 நிலை: ${st}\n` +
             `   📅 நாள்: ${formatDate(a.appliedAt)}`;
    }

    const schemeNameText = info ? (info.fullName || info.name) : a.schemeName;
    const schemeHeader = `Scheme #${schemeIdNum}: ${schemeNameText}`;
    const cluster = info ? info.cluster : 'BJP Central Scheme';
    const benefit = info ? info.benefit : 'Welfare Scheme Benefit';

    return `${i + 1}. 🏛️ *${schemeHeader}*\n` +
           `   📌 Category: ${cluster}\n` +
           `   🎁 Benefit: ${benefit}\n` +
           `   📋 Status: ${st}\n` +
           `   📅 Applied: ${formatDate(a.appliedAt)}`;
  }).join('\n\n─────────────────\n\n');

  const note = apps.length > 2
    ? (lang === 'ta' ? `\n\n(மேலும் ${apps.length - 2} திட்டங்கள் உள்ளன — 'மூடு' பொத்தானைத் தட்டி அனைத்தையும் சாட்டில் பார்க்கவும்)` : `\n\n(+${apps.length - 2} more schemes — tap 'Close' to view all in chat)`)
    : '';

  return {
    heading: `${s(lang, 'sc_heading')} (${apps.length})`,
    body: `${list}${note}`,
    done: lang === 'ta' ? '❌ மூடு (அனைத்தையும் சாட்டில் பார்க்க)' : '❌ Close (View All in Chat)',
    apply: s(lang, 'sc_apply')
  };
};

const buildReferral = async (user, lang) => {
  const count = await User.countDocuments({ referredBy: user.referralCode });
  const link = `${REFERRAL_BASE}/r/${user.referralCode}`;
  const body = lang === 'ta'
    ? `உங்கள் இணைப்பு:\n${link}\n\n📊 மொத்த பரிந்துரைகள்: ${count}\n\nநண்பர்களுடன் பகிர்ந்து அரசு திட்டங்கள் பெற உதவுங்கள்! 🙏`
    : `Your referral link:\n${link}\n\n📊 Total referrals: ${count}\n\nShare with friends & family to help them access welfare schemes! 🙏`;
  return { heading: s(lang, 'rl_heading'), body, done: s(lang, 'rl_done') };
};

const buildReferrals = async (user, lang) => {
  const refs = await User.find({ referredBy: user.referralCode }).sort({ createdAt: -1 }).limit(20);
  const body = refs.length === 0
    ? (lang === 'ta' ? 'இன்னும் யாரும் பதிவு செய்யவில்லை.' : 'No one has registered through your link yet.')
    : refs.map((r, i) => `${i + 1}. ${r.voterName} — ${r.district} — ${formatDate(r.createdAt)}`).join('\n');
  return { heading: `${s(lang, 'rf_heading')} (${refs.length})`, body, done: s(lang, 'rf_done') };
};

const openBoothPresident = async (user, lang) => {
  const apps = await BoothPresidentApplication.find({ epicNo: user.epicNo }).sort({ appliedAt: -1 }).lean();
  const existing = apps.find(a => a.status === 'Approved')
                || apps.find(a => a.status === 'Pending')
                || apps[0] || null;

  if (existing) {
    const statusLabelMap = lang === 'ta'
      ? { Approved: 'அங்கீகரிக்கப்பட்டது ✅', Declined: 'நிராகரிக்கப்பட்டது ❌', Pending: 'ஆய்வில் உள்ளது ⏳' }
      : { Approved: 'Approved ✅', Declined: 'Declined ❌', Pending: 'Under Review ⏳' };
    const st = statusLabelMap[existing.status] || existing.status;
    const heading = lang === 'ta' ? '🏛️ துறை தலைவர் விண்ணப்பம்' : '🏛️ Booth President Application';
    const body = lang === 'ta'
      ? `உங்கள் விண்ணப்ப விவரங்கள்:\n\n📍 சாவடி: ${existing.targetBoothNo}\n🗳️ தொகுதி: ${existing.targetAssembly}\n🏛️ மாவட்டம்: ${existing.targetDistrict}\n📅 விண்ணப்பித்த தேதி: ${formatDate(existing.appliedAt)}\n\n📋 நிலை: ${st}`
      : `Your application details:\n\n📍 Booth: ${existing.targetBoothNo}\n🗳️ Assembly: ${existing.targetAssembly}\n🏛️ District: ${existing.targetDistrict}\n📅 Applied: ${formatDate(existing.appliedAt)}\n\n📋 Status: ${st}`;
    return { screen: 'BP_SUBMITTED', data: { heading, body, done: s(lang, 'bp_done') } };
  }

  const body = lang === 'ta'
    ? `உங்கள் பகுதியில் அதிகாரப்பூர்வ பாஜக துறை தலைவராக சேவை செய்யுங்கள்!\n\nஉங்கள் தற்போதைய சாவடி: ${user.assemblyName} - சாவடி ${user.boothNo}`
    : `Serve your area as an official BJP Booth President!\n\nYour current booth: ${user.assemblyName} - Booth ${user.boothNo}`;
  const options = lang === 'ta'
    ? [ { id: 'registered', title: `✅ என் சாவடி (சாவடி ${user.boothNo})` }, { id: 'custom', title: '🔀 வேறு சாவடியைத் தேர்ந்தெடு' } ]
    : [ { id: 'registered', title: `✅ My current booth (Booth ${user.boothNo})` }, { id: 'custom', title: '🔀 Choose a different booth' } ];
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
};

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
