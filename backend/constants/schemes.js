/**
 * Single Source of Truth — All 23 BJP Nalam Thittam Schemes
 * Includes complete English and Tamil metadata.
 */
const BJP_SCHEMES = [
  // Cluster 1: Insurance
  {
    id: 1,
    name: 'PMSBY',
    fullName: 'PMSBY — Suraksha Bima Yojana',
    nameTa: 'பிஎம்எஸ்பிஒய்',
    titleTa: 'PMSBY (பிரதம மந்திரி பாதுகாப்பு காப்பீட்டு யோஜனா)',
    cluster: 'Cluster 1 — Insurance',
    clusterTa: 'பிரிவு 1 — காப்பீடு',
    benefit: '₹2L accident insurance — ₹20/year',
    benefitTa: '₹2 லட்சம் விபத்துக் காப்பீடு — ஆண்டுக்கு ₹20',
    keys: ['pmsby', 'suraksha bima', 'accident insurance']
  },
  {
    id: 2,
    name: 'PMJJBY',
    fullName: 'PMJJBY — Jeevan Jyoti Bima',
    nameTa: 'பிஎம்ஜேஜேபிஒய்',
    titleTa: 'PMJJBY (பிரதம மந்திரி ஜீவன் ஜோதி காப்பீட்டு யோஜனா)',
    cluster: 'Cluster 1 — Insurance',
    clusterTa: 'பிரிவு 1 — காப்பீடு',
    benefit: '₹2L life insurance — ₹436/year',
    benefitTa: '₹2 லட்சம் உயிர்க் காப்பீடு — ஆண்டுக்கு ₹436',
    keys: ['pmjjby', 'jeevan jyoti', 'life insurance']
  },
  {
    id: 3,
    name: 'APY',
    fullName: 'APY — Atal Pension Yojana',
    nameTa: 'அடல் பென்ஷன் யோஜனா',
    titleTa: 'அடல் பென்ஷன் யோஜனா (APY)',
    cluster: 'Cluster 1 — Insurance',
    clusterTa: 'பிரிவு 1 — காப்பீடு',
    benefit: 'Pension ₹1K–5K/month after 60',
    benefitTa: 'மாதம் ₹5,000 வரை ஓய்வூதியம்',
    keys: ['apy', 'atal pension', 'pension yojana']
  },
  // Cluster 2: Credit
  {
    id: 4,
    name: 'PM SVANidhi',
    fullName: 'PM SVANidhi — Street Vendor Loan',
    nameTa: 'பிஎம் ஸ்வநிதி',
    titleTa: 'பிஎம் ஸ்வநிதி (தெருவோர வியாபாரிகள் கடன் திட்டம்)',
    cluster: 'Cluster 2 — Credit',
    clusterTa: 'பிரிவு 2 — வணிகக் கடன்',
    benefit: '₹10K–50K collateral-free loan (street vendors)',
    benefitTa: 'பிணையம் இல்லாத கடன் ₹50,000 வரை',
    keys: ['svanidhi', 'street vendor', 'pm svanidhi']
  },
  {
    id: 5,
    name: 'PM Mudra Shishu',
    fullName: 'PM Mudra Shishu',
    nameTa: 'பிஎம் முத்ரா — சிசு',
    titleTa: 'பிஎம் முத்ரா கடன் — சிசு பிரிவு',
    cluster: 'Cluster 2 — Credit',
    clusterTa: 'பிரிவு 2 — வணிகக் கடன்',
    benefit: 'Business loan up to ₹50,000',
    benefitTa: 'வணிகக் கடன் ₹50,000 வரை',
    keys: ['mudra shishu', 'shishu', 'mudra loan']
  },
  {
    id: 6,
    name: 'PM Mudra Kishor',
    fullName: 'PM Mudra Kishor',
    nameTa: 'பிஎம் முத்ரா — கிஷோர்',
    titleTa: 'பிஎம் முத்ரா கடன் — கிஷோர் பிரிவு',
    cluster: 'Cluster 2 — Credit',
    clusterTa: 'பிரிவு 2 — வணிகக் கடன்',
    benefit: '₹50K–5L loan',
    benefitTa: 'வணிகக் கடன் ₹50,000 முதல் ₹5 லட்சம் வரை',
    keys: ['mudra kishor', 'kishor']
  },
  {
    id: 7,
    name: 'Udyam',
    fullName: 'Udyam Registration',
    nameTa: 'உத்யம் MSME பதிவு',
    titleTa: 'உத்யம் MSME பதிவு போர்டல் (Udyam MSME Registration)',
    cluster: 'Cluster 2 — Credit',
    clusterTa: 'பிரிவு 2 — வணிகக் கடன்',
    benefit: 'Free MSME registration — all govt benefits',
    benefitTa: 'இலவச MSME சான்றிதழ் & அரசு மானியங்கள்',
    keys: ['udyam', 'msme', 'udyam registration']
  },
  {
    id: 8,
    name: 'Stand Up India',
    fullName: 'Stand Up India',
    nameTa: 'ஸ்டாண்ட் அப் இந்தியா',
    titleTa: 'ஸ்டாண்ட் அப் இந்தியா திட்டம் (Stand-Up India)',
    cluster: 'Cluster 2 — Credit',
    clusterTa: 'பிரிவு 2 — வணிகக் கடன்',
    benefit: '₹10L–1Cr loan for SC/ST & women',
    benefitTa: 'கடன்கள் ₹10 லட்சம் முதல் ₹1 கோடி வரை (SC/ST & பெண்கள்)',
    keys: ['stand up', 'standup', 'standup india']
  },
  {
    id: 9,
    name: 'Startup Seed Fund',
    fullName: 'Startup India Seed Fund',
    nameTa: 'ஸ்டார்ட்அப் சீட் ஃபண்ட்',
    titleTa: 'ஸ்டார்ட்அப் இந்தியா சீட் ஃபண்ட் திட்டம் (SISFS)',
    cluster: 'Cluster 2 — Credit',
    clusterTa: 'பிரிவு 2 — வணிகக் கடன்',
    benefit: 'Seed funding for registered startups',
    benefitTa: 'சீட் நிதி (Seed Funding) ₹50 லட்சம் வரை',
    keys: ['startup', 'seed fund', 'startup india']
  },
  // Cluster 3: Farmers
  {
    id: 10,
    name: 'PM Kisan',
    fullName: 'PM Kisan Samman Nidhi',
    nameTa: 'பிஎம் கிசான்',
    titleTa: 'பிரதம மந்திரி கிசான் சம்மான் நிதி (PM-KISAN)',
    cluster: 'Cluster 3 — Farmers',
    clusterTa: 'பிரிவு 3 — விவசாயிகள்',
    benefit: '₹6,000/year — 3 installments',
    benefitTa: 'ஆண்டுக்கு ₹6,000 நேரடிப் பண உதவி (3 தவணைகள்)',
    keys: ['pm kisan', 'kisan samman', 'kisan nidhi']
  },
  {
    id: 11,
    name: 'PM Fasal Bima',
    fullName: 'PM Fasal Bima Yojana',
    nameTa: 'பிஎம் பசல் பீமா',
    titleTa: 'பிரதம மந்திரி பசல் பீமா யோஜனா (PMFBY)',
    cluster: 'Cluster 3 — Farmers',
    clusterTa: 'பிரிவு 3 — விவசாயிகள்',
    benefit: 'Crop insurance — natural calamities & pests',
    benefitTa: 'பயிர் இழப்புக் காப்பீடு (Crop Insurance)',
    keys: ['fasal bima', 'crop insurance', 'pmfby']
  },
  {
    id: 12,
    name: 'PM Kisan Maan Dhan',
    fullName: 'PM Kisan Maan Dhan Yojana',
    nameTa: 'பிஎம் கிசான் மான் தன்',
    titleTa: 'பிரதம மந்திரி கிசான் மான் தன் யோஜனா',
    cluster: 'Cluster 3 — Farmers',
    clusterTa: 'பிரிவு 3 — விவசாயிகள்',
    benefit: 'Farmer pension ₹3,000/month after 60',
    benefitTa: 'விவசாயிகளுக்கு மாதம் ₹3,000 ஓய்வூதியம் (60 வயதிற்குப் பின்)',
    keys: ['maan dhan', 'farmer pension', 'kisan maan dhan']
  },
  // Cluster 4: Health
  {
    id: 13,
    name: 'Ayushman Bharat',
    fullName: 'Ayushman Bharat PMJAY',
    nameTa: 'ஆயுஷ்மான் பாரத் PMJAY',
    titleTa: 'ஆயுஷ்மான் பாரத் PMJAY',
    cluster: 'Cluster 4 — Health',
    clusterTa: 'பிரிவு 4 — மருத்துவம் & சுகாதாரம்',
    benefit: '₹5 lakh/year cashless hospitalisation',
    benefitTa: 'ஆண்டுக்கு ₹5 லட்சம் பணமில்லா சுகாதார காப்பீடு',
    keys: ['ayushman', 'pmjay', 'ayushman bharat', 'health insurance']
  },
  {
    id: 14,
    name: 'ABHA',
    fullName: 'ABHA — Unified Health ID',
    nameTa: 'ஆபா (ABHA)',
    titleTa: 'ABHA — டிஜிட்டல் சுகாதார அடையாள அட்டை',
    cluster: 'Cluster 4 — Health',
    clusterTa: 'பிரிவு 4 — மருத்துவம் & சுகாதாரம்',
    benefit: 'Free digital health ID — gateway to health schemes',
    benefitTa: '14-இலக்க டிஜிட்டல் சுகாதார அடையாள அட்டை (இலவசம்)',
    keys: ['abha', 'health id', 'abdm', 'digital health']
  },
  // Cluster 5: Women & Families
  {
    id: 15,
    name: 'PM Ujjwala',
    fullName: 'PM Ujjwala Yojana',
    nameTa: 'பிஎம் உஜ்வலா யோஜனா',
    titleTa: 'பிரதம மந்திரி உஜ்வலா யோஜனா (PMUY 2.0)',
    cluster: 'Cluster 5 — Women & Families',
    clusterTa: 'பிரிவு 5 — பெண்கள் & குடும்பங்கள்',
    benefit: 'Free LPG connection for BPL families',
    benefitTa: 'இலவச சமையல் எரிவாயு இணைப்பு (LPG)',
    keys: ['ujjwala', 'lpg', 'gas connection']
  },
  {
    id: 16,
    name: 'PM Matru Vandana',
    fullName: 'PM Matru Vandana Yojana',
    nameTa: 'பிஎம் மாத்ரு வந்தனா',
    titleTa: 'பிரதம மந்திரி மாத்ரு வந்தனா யோஜனா (PMMVY)',
    cluster: 'Cluster 5 — Women & Families',
    clusterTa: 'பிரிவு 5 — பெண்கள் & குடும்பங்கள்',
    benefit: '₹5,000 cash for first pregnancy',
    benefitTa: 'முதல் குழந்தை பிறப்பிற்கு ₹5,000 நேரடி பண உதவி',
    keys: ['matru vandana', 'maternity', 'pmmvy']
  },
  {
    id: 17,
    name: 'Sukanya Samridhi',
    fullName: 'Sukanya Samridhi Yojana',
    nameTa: 'சுகன்யா சம்ரிதி',
    titleTa: 'சுகன்யா சம்ரிதி யோஜனா (SSY - பெண் குழந்தை சேமிப்பு)',
    cluster: 'Cluster 5 — Women & Families',
    clusterTa: 'பிரிவு 5 — பெண்கள் & குடும்பங்கள்',
    benefit: 'High-interest savings for girl child education',
    benefitTa: 'பெண் குழந்தை சேமிப்பு — 8.2% வரி இல்லா வட்டி',
    keys: ['sukanya', 'girl child', 'sukanya samridhi']
  },
  // Cluster 6: Housing
  {
    id: 18,
    name: 'PM Awas Yojana',
    fullName: 'PM Awas Yojana (PMAY)',
    nameTa: 'பிஎம் ஆவாஸ் யோஜனா',
    titleTa: 'பிரதம மந்திரி ஆவாஸ் யோஜனா (PMAY - வீட்டு நிதி)',
    cluster: 'Cluster 6 — Housing',
    clusterTa: 'பிரிவு 6 — வீடு கட்டிடம்',
    benefit: '₹1.2–1.3L to build or upgrade home',
    benefitTa: 'வீடு கட்ட ₹1.2 லட்சம் முதல் ₹1.3 லட்சம் வரை நிதி மானியம்',
    keys: ['awas', 'pmay', 'housing', 'pm awas']
  },
  // Cluster 7: Youth & Skills
  {
    id: 19,
    name: 'PMKVY',
    fullName: 'PMKVY — Kaushal Vikas Yojana',
    nameTa: 'பிஎம்கேவிஒய் (PMKVY)',
    titleTa: 'பிரதம மந்திரி கௌசல் விகாஸ் யோஜனா (PMKVY 4.0)',
    cluster: 'Cluster 7 — Youth & Skills',
    clusterTa: 'பிரிவு 7 — இளைஞர் திறன் மேம்பாடு',
    benefit: 'Free skill training in 300+ trades',
    benefitTa: 'இலவச திறன் பயிற்சி & சான்றிதழ்',
    keys: ['pmkvy', 'kaushal vikas', 'skill training']
  },
  {
    id: 20,
    name: 'NSP Scholarship',
    fullName: 'NSP — National Scholarship Portal',
    nameTa: 'தேசிய உதவித்தொகை (NSP)',
    titleTa: 'தேசிய உதவித்தொகை போர்டல் (NSP)',
    cluster: 'Cluster 7 — Youth & Skills',
    clusterTa: 'பிரிவு 7 — இளைஞர் திறன் மேம்பாடு',
    benefit: 'Govt scholarships for Class 1 to PhD',
    benefitTa: 'மாணவர் உதவித்தொகை (1-ஆம் வகுப்பு முதல் PhD வரை)',
    keys: ['nsp', 'scholarship', 'national scholarship']
  },
  {
    id: 21,
    name: 'PM Vishwakarma',
    fullName: 'PM Vishwakarma Yojana',
    nameTa: 'பிஎம் விஸ்வகர்மா',
    titleTa: 'பிரதம மந்திரி விஸ்வகர்மா திட்டம்',
    cluster: 'Cluster 7 — Youth & Skills',
    clusterTa: 'பிரிவு 7 — இளைஞர் திறன் மேம்பாடு',
    benefit: 'Training & credit for traditional artisans',
    benefitTa: '₹15,000 கருவித் தொகுப்பு மானியம் & 5% வட்டியில் கடன்',
    keys: ['vishwakarma', 'artisan', 'pm vishwakarma']
  },
  // Foundation Layer
  {
    id: 22,
    name: 'Jan Dhan',
    fullName: 'Jan Dhan Yojana',
    nameTa: 'ஜன்தன் யோஜனா',
    titleTa: 'பிரதம மந்திரி ஜன் தன் யோஜனா (PMJDY)',
    cluster: 'Foundation Layer',
    clusterTa: 'அடிப்படை நிதிச் சேவை',
    benefit: 'Zero-balance bank account — DBT gateway',
    benefitTa: 'பூஜ்ஜிய இருப்பு வங்கிக் கணக்கு & ₹2L விபத்துக் காப்பீடு',
    keys: ['jan dhan', 'zero-balance', 'jdyojana', 'pmjdy']
  },
  {
    id: 23,
    name: 'e-Shram',
    fullName: 'e-Shram Card',
    nameTa: 'இ-ஷ்ரம் கார்டு',
    titleTa: 'இ-ஷ்ரம் அமைப்புசாரா தொழிலாளர் போர்டல்',
    cluster: 'Foundation Layer',
    clusterTa: 'அடிப்படை நிதிச் சேவை',
    benefit: 'Unorganised worker registration + PMSBY cover',
    benefitTa: 'அமைப்புசாரா தொழிலாளர் அடையாள அட்டை & இலவசக் காப்பீடு',
    keys: ['e-shram', 'eshram', 'unorganised worker', 'e shram']
  }
];

module.exports = { BJP_SCHEMES };
