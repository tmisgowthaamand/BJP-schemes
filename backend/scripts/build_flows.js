'use strict';
const fs = require('fs');
const path = require('path');
const { SCHEMES } = require('../constants/waStrings');

const banner = fs.readFileSync(path.join(__dirname, '..', 'flows', 'banner_b64.txt'), 'utf8').trim();
const ICONS = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'flows', 'menu_icons.json'), 'utf8'));
const SCHEME_ICONS = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'flows', 'scheme_icons.json'), 'utf8'));
const strField = (ex) => ({ type: 'string', __example__: ex });
const bannerImg = { type: 'Image', src: banner, height: 200, 'scale-type': 'contain' };
const form = (children) => ({ type: 'Form', name: 'flow_form', children });

// Professional menu items — icon image + title + description (like a service list)
const MENU_EN = [
  { id: 'profile',         title: 'My Profile',          description: 'View your voter details',        image: ICONS.profile },
  { id: 'schemes',         title: 'My Schemes',          description: 'Apply & track scheme requests',  image: ICONS.schemes },
  { id: 'referral',        title: 'My Referral Link',    description: 'Share and invite others',         image: ICONS.referral },
  { id: 'referrals',       title: 'My Referrals',        description: 'People who joined via you',        image: ICONS.referrals },
  { id: 'booth_president', title: 'Be a Booth President', description: 'Apply to lead your booth',         image: ICONS.booth_president }
];
const MENU_TA = [
  { id: 'profile',         title: 'என் சுயவிவரம்',        description: 'உங்கள் வாக்காளர் விவரங்கள்',      image: ICONS.profile },
  { id: 'schemes',         title: 'என் திட்டங்கள்',       description: 'திட்டங்களுக்கு விண்ணப்பிக்க',     image: ICONS.schemes },
  { id: 'referral',        title: 'என் பரிந்துரை இணைப்பு', description: 'பகிர்ந்து அழைக்கவும்',            image: ICONS.referral },
  { id: 'referrals',       title: 'என் பரிந்துரைகள்',     description: 'உங்கள் மூலம் இணைந்தவர்கள்',       image: ICONS.referrals },
  { id: 'booth_president', title: 'துறை தலைவர் விண்ணப்பம்', description: 'உங்கள் சாவடியை வழிநடத்த',        image: ICONS.booth_president }
];

const SCHEME_FILE_MAP = {
  '1': 'PMSBY.png', '2': 'PMJJBY.png', '3': 'APY.png', '4': 'PM SVANidhi.png',
  '5': 'PM Mudra Shishu.png', '6': 'PM Mudra Kishor.png', '7': 'Udyam.png',
  '8': 'Stand Up India.png', '9': 'Startup Seed Fund.png', '10': 'PM Kisan.png',
  '11': 'PM Fasal Bima.png', '12': 'PM Kisan Maan Dhan.png', '13': 'Ayushman Bharat.png',
  '14': 'ABHA.png', '15': 'PM Ujjwala.png', '16': 'PM Matru Vandana.png',
  '17': 'Sukanya Samridhi.png', '18': 'PM Awas Yojana.png', '19': 'PMKVY.png',
  '20': 'NSP Scholarship.png', '21': 'PM Vishwakarma.png', '22': 'Jan Dhan.png',
  '23': 'e-Shram.png'
};

const ALL_23_BASE64 = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'flows', 'all_23_schemes_4_5_base64.json'), 'utf8'));

const SCHEMES_EN = SCHEMES.map(s => ({
  id: s.id,
  title: s.en,
  description: `Scheme #${s.id} — BJP Central Welfare`,
  image: ALL_23_BASE64[s.id]
}));

const DISTRICTS_STATIC = [
  'ARIYALUR','CHENGALPATTU','CHENNAI','COIMBATORE','CUDDALORE','DHARMAPURI','DINDIGUL','ERODE',
  'KALLAKURICHI','KANCHEEPURAM','KANNIYAKUMARI','KARUR','KRISHNAGIRI','MADURAI','MAYILADUTHURAI',
  'NAGAPATTINAM','NAMAKKAL','NILGIRIS','PERAMBALUR','PUDUKKOTTAI','RAMANATHAPURAM','RANIPET',
  'SALEM','SIVAGANGA','TENKASI','THANJAVUR','THENI','THOOTHUKUDI','TIRUCHIRAPPALLI','TIRUNELVELI',
  'TIRUPATHUR','TIRUPPUR','TIRUVALLUR','TIRUVANNAMALAI','TIRUVARUR','VELLORE','VILUPPURAM','VIRUDHUNAGAR'
].map(d => ({ id: d, title: d }));

const menuScreen = (id, heading, body, opts, radioLabel, btn) => ({
  id, title: 'Portal', data: {}, layout: { type: 'SingleColumnLayout', children: [
    bannerImg, { type: 'TextHeading', text: heading }, { type: 'TextBody', text: body },
    form([
      { type: 'RadioButtonsGroup', name: 'menu_choice', label: radioLabel, required: true, 'data-source': opts },
      { type: 'Footer', label: btn, 'on-click-action': { name: 'data_exchange', payload: { screen: id, choice: '${form.menu_choice}', menu_choice: '${form.menu_choice}' } } }
    ])
  ] }
});

const displayScreen = (id, done) => ({
  id, title: id, terminal: true, data: { heading: strField('Heading'), body: strField('Body'), done: strField(done) },
  layout: { type: 'SingleColumnLayout', children: [
    { type: 'TextHeading', text: '${data.heading}' }, { type: 'TextBody', text: '${data.body}' },
    { type: 'Footer', label: '${data.done}', 'on-click-action': { name: 'complete', payload: { screen: id } } }
  ] }
});

const commonScreens = [
  menuScreen('MAIN_MENU_TA', '✅ பாஜக நலம் திட்ட போர்டல்', 'ஒரு சேவையைத் தேர்ந்தெடுக்கவும்:', MENU_TA, 'சேவையைத் தேர்ந்தெடுக்கவும்', 'தொடர்'),
  menuScreen('MAIN_MENU_EN', '✅ BJP Nalam Thittam Portal', 'Choose a service to continue:', MENU_EN, 'Select a service', 'Continue'),
  displayScreen('MY_PROFILE', 'Done'),
  { id: 'MY_SCHEMES', title: 'My Schemes', data: {
      heading: strField('Schemes'),
      body: strField('List'),
      label: strField('Browse 23 Schemes'),
      schemes: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, title: { type: 'string' }, description: { type: 'string' }, image: { type: 'string' } } }, __example__: SCHEMES_EN },
      btn_apply: strField('Apply'),
      done: strField('Close')
    }, layout: { type: 'SingleColumnLayout', children: [
    { type: 'TextHeading', text: '${data.heading}' },
    { type: 'TextBody', text: '${data.body}' },
    form([
      { type: 'RadioButtonsGroup', name: 'selected_scheme', label: '${data.label}', required: false, 'data-source': '${data.schemes}' },
      { type: 'Footer', label: '${data.btn_apply}', 'on-click-action': { name: 'data_exchange', payload: { screen: 'MY_SCHEMES', selected_scheme: '${form.selected_scheme}' } } }
    ])
  ] } },
  { id: 'APPLY_SCHEME', title: 'Apply', data: {
      heading: strField('Apply'),
      body: strField('Select'),
      label: strField('Scheme'),
      schemes: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, title: { type: 'string' }, description: { type: 'string' }, image: { type: 'string' } } }, __example__: SCHEMES_EN },
      btn: strField('Apply')
    }, layout: { type: 'SingleColumnLayout', children: [
    { type: 'TextHeading', text: '${data.heading}' }, { type: 'TextBody', text: '${data.body}' },
    form([
      { type: 'RadioButtonsGroup', name: 'selected_scheme', label: '${data.label}', required: true, 'data-source': '${data.schemes}' },
      { type: 'Footer', label: '${data.btn}', 'on-click-action': { name: 'data_exchange', payload: { screen: 'APPLY_SCHEME', selected_scheme: '${form.selected_scheme}' } } }
    ])
  ] } },
  displayScreen('SCHEME_APPLIED', 'Done'),
  displayScreen('MY_REFERRAL', 'Done'),
  displayScreen('MY_REFERRALS', 'Done'),
  { id: 'BOOTH_PRESIDENT', title: 'Booth President', data: { heading: strField('Be a Booth President'), body: strField('Info'), options: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, title: { type: 'string' } } }, __example__: [ { id: 'registered', title: 'My current booth' } ] }, label: strField('Choose'), btn: strField('Next') }, layout: { type: 'SingleColumnLayout', children: [
    { type: 'TextHeading', text: '${data.heading}' }, { type: 'TextBody', text: '${data.body}' },
    form([
      { type: 'RadioButtonsGroup', name: 'bp_choice', label: '${data.label}', required: true, 'data-source': '${data.options}' },
      { type: 'Footer', label: '${data.btn}', 'on-click-action': { name: 'data_exchange', payload: { screen: 'BOOTH_PRESIDENT', bp_choice: '${form.bp_choice}' } } }
    ])
  ] } },
  { id: 'BP_DISTRICT', title: 'Select District', data: { heading: strField('Select District'), body: strField('Choose district'), label: strField('District'), btn: strField('Next') }, layout: { type: 'SingleColumnLayout', children: [
    { type: 'TextHeading', text: '${data.heading}' }, { type: 'TextBody', text: '${data.body}' },
    form([
      { type: 'Dropdown', name: 'bp_district', label: '${data.label}', required: true, 'data-source': DISTRICTS_STATIC },
      { type: 'Footer', label: '${data.btn}', 'on-click-action': { name: 'data_exchange', payload: { screen: 'BP_DISTRICT', bp_district: '${form.bp_district}' } } }
    ])
  ] } },
  { id: 'BP_ASSEMBLY', title: 'Assembly', data: { heading: strField('Select Assembly'), body: strField('Choose your assembly'), assemblies: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, title: { type: 'string' } } }, __example__: [ { id: 'Alandur', title: '30 - Alandur' } ] }, label: strField('Assembly'), btn: strField('Next') }, layout: { type: 'SingleColumnLayout', children: [
    { type: 'TextHeading', text: '${data.heading}' }, { type: 'TextBody', text: '${data.body}' },
    form([
      { type: 'Dropdown', name: 'bp_assembly', label: '${data.label}', required: true, 'data-source': '${data.assemblies}' },
      { type: 'Footer', label: '${data.btn}', 'on-click-action': { name: 'data_exchange', payload: { screen: 'BP_ASSEMBLY', bp_assembly: '${form.bp_assembly}' } } }
    ])
  ] } },
  { id: 'BP_BOOTH', title: 'Booth Number', data: { heading: strField('Enter Booth Number'), body: strField('Which booth?'), label: strField('Target Booth Number'), helper: strField('e.g. 20'), btn: strField('Submit Request') }, layout: { type: 'SingleColumnLayout', children: [
    { type: 'TextHeading', text: '${data.heading}' }, { type: 'TextBody', text: '${data.body}' },
    form([
      { type: 'TextInput', name: 'bp_booth', label: '${data.label}', 'input-type': 'number', required: true, 'helper-text': '${data.helper}' },
      { type: 'Footer', label: '${data.btn}', 'on-click-action': { name: 'data_exchange', payload: { screen: 'BP_BOOTH', bp_booth: '${form.bp_booth}' } } }
    ])
  ] } },
  displayScreen('BP_SUBMITTED', 'Done')
];

// Portal Flow — for registered voters (starts directly with MAIN_MENU_TA or MAIN_MENU_EN)
const portalFlow = {
  version: '6.1', data_api_version: '3.0',
  routing_model: {
    MAIN_MENU_TA: ['MY_PROFILE', 'MY_SCHEMES', 'MY_REFERRAL', 'MY_REFERRALS', 'BOOTH_PRESIDENT', 'BP_SUBMITTED'],
    MAIN_MENU_EN: ['MY_PROFILE', 'MY_SCHEMES', 'MY_REFERRAL', 'MY_REFERRALS', 'BOOTH_PRESIDENT', 'BP_SUBMITTED'],
    MY_PROFILE: [], MY_SCHEMES: ['APPLY_SCHEME'], APPLY_SCHEME: ['SCHEME_APPLIED'], SCHEME_APPLIED: [],
    MY_REFERRAL: [], MY_REFERRALS: [],
    BOOTH_PRESIDENT: ['BP_DISTRICT', 'BP_SUBMITTED'], BP_DISTRICT: ['BP_ASSEMBLY'],
    BP_ASSEMBLY: ['BP_BOOTH'], BP_BOOTH: ['BP_SUBMITTED'], BP_SUBMITTED: []
  },
  screens: commonScreens
};

// Onboarding Flow — for unregistered voters
const onboardingFlow = {
  version: '6.1', data_api_version: '3.0',
  routing_model: {
    LANGUAGE_SELECT: ['MAIN_MENU_EN', 'MAIN_MENU_TA', 'LOCKED_MENU'],
    LOCKED_MENU: ['EPIC_ENTRY'],
    EPIC_ENTRY: ['CONFIRM_VOTER'],
    CONFIRM_VOTER: ['REG_SUCCESS'],
    REG_SUCCESS: ['MAIN_MENU_EN', 'MAIN_MENU_TA'],
    MAIN_MENU_EN: ['MY_PROFILE', 'MY_SCHEMES', 'MY_REFERRAL', 'MY_REFERRALS', 'BOOTH_PRESIDENT', 'BP_SUBMITTED'],
    MAIN_MENU_TA: ['MY_PROFILE', 'MY_SCHEMES', 'MY_REFERRAL', 'MY_REFERRALS', 'BOOTH_PRESIDENT', 'BP_SUBMITTED'],
    MY_PROFILE: [], MY_SCHEMES: ['APPLY_SCHEME'], APPLY_SCHEME: ['SCHEME_APPLIED'], SCHEME_APPLIED: [],
    MY_REFERRAL: [], MY_REFERRALS: [],
    BOOTH_PRESIDENT: ['BP_DISTRICT', 'BP_SUBMITTED'], BP_DISTRICT: ['BP_ASSEMBLY'],
    BP_ASSEMBLY: ['BP_BOOTH'], BP_BOOTH: ['BP_SUBMITTED'], BP_SUBMITTED: []
  },
  screens: [
    { id: 'LANGUAGE_SELECT', title: 'Language / மொழி', data: {}, layout: { type: 'SingleColumnLayout', children: [
      bannerImg,
      { type: 'TextHeading', text: '🙏 BJP Nalam Thittam / பாஜக நலம் திட்டம்' },
      { type: 'TextBody', text: 'Select your language to continue.\nதொடர உங்கள் மொழியைத் தேர்ந்தெடுக்கவும்.' },
      form([
        { type: 'RadioButtonsGroup', name: 'lang_choice', label: 'Language / மொழி', required: true, 'data-source': [ { id: 'ta', title: 'தமிழ் (Tamil)' }, { id: 'en', title: 'English' } ] },
        { type: 'Footer', label: 'Continue / தொடர்', 'on-click-action': { name: 'data_exchange', payload: { screen: 'LANGUAGE_SELECT', lang: '${form.lang_choice}' } } }
      ])
    ] } },
    { id: 'LOCKED_MENU', title: 'Register', data: { heading: strField('Welcome'), body: strField('Register'), services: strField('Services'), btn: strField('Register') }, layout: { type: 'SingleColumnLayout', children: [
      bannerImg, { type: 'TextHeading', text: '${data.heading}' }, { type: 'TextBody', text: '${data.body}' }, { type: 'TextBody', text: '${data.services}' },
      { type: 'Footer', label: '${data.btn}', 'on-click-action': { name: 'data_exchange', payload: { screen: 'LOCKED_MENU', go: 'register' } } }
    ] } },
    { id: 'EPIC_ENTRY', title: 'Registration', data: { heading: strField('Voter Registration'), body: strField('Enter EPIC'), label: strField('EPIC Number'), helper: strField('Example: ZKF2181790'), error_msg: strField(''), btn: strField('Search') }, layout: { type: 'SingleColumnLayout', children: [
      bannerImg,
      { type: 'TextHeading', text: '${data.heading}' }, { type: 'TextBody', text: '${data.body}' }, { type: 'TextBody', text: '${data.error_msg}' },
      form([
        { type: 'TextInput', name: 'epic_no', label: '${data.label}', 'input-type': 'text', required: true, 'helper-text': '${data.helper}' },
        { type: 'Footer', label: '${data.btn}', 'on-click-action': { name: 'data_exchange', payload: { screen: 'EPIC_ENTRY', epic_no: '${form.epic_no}' } } }
      ])
    ] } },
    { id: 'CONFIRM_VOTER', title: 'Confirm', data: { heading: strField('Voter Found'), question: strField('Confirm'), details: strField('Name'), label: strField('Confirm'), btn: strField('Continue'), yes: strField("Yes, that's me"), no: strField('No') }, layout: { type: 'SingleColumnLayout', children: [
      bannerImg,
      { type: 'TextHeading', text: '${data.heading}' }, { type: 'TextBody', text: '${data.question}' }, { type: 'TextBody', text: '${data.details}' },
      form([
        { type: 'RadioButtonsGroup', name: 'confirm_choice', label: '${data.label}', required: true, 'data-source': [ { id: 'yes', title: "✅ Yes, that's me / ஆம்" }, { id: 'no', title: '❌ No / இல்லை' } ] },
        { type: 'Footer', label: '${data.btn}', 'on-click-action': { name: 'data_exchange', payload: { screen: 'CONFIRM_VOTER', confirmed: '${form.confirm_choice}' } } }
      ])
    ] } },
    { id: 'REG_SUCCESS', title: 'Welcome!', data: { heading: strField('Success!'), body: strField('Welcome!'), btn: strField('Open Portal') }, layout: { type: 'SingleColumnLayout', children: [
      bannerImg, { type: 'TextHeading', text: '${data.heading}' }, { type: 'TextBody', text: '${data.body}' },
      { type: 'Footer', label: '${data.btn}', 'on-click-action': { name: 'data_exchange', payload: { screen: 'REG_SUCCESS', go: 'menu' } } }
    ] } },
    ...commonScreens
  ]
};

fs.writeFileSync(path.join(__dirname, '..', 'flows', 'onboardingFlow.json'), JSON.stringify(onboardingFlow, null, 2));
fs.writeFileSync(path.join(__dirname, '..', 'flows', 'portalFlow.json'), JSON.stringify(portalFlow, null, 2));
console.log('Built onboardingFlow screens:', onboardingFlow.screens.length, '| portalFlow screens:', portalFlow.screens.length);
