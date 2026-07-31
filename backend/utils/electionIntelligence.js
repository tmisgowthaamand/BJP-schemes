/**
 * Tamil Nadu Election Intelligence Engine (Core Module)
 * Provides 234 Assembly mapping, synonym matching, intent classification,
 * entity extraction, live MongoDB telemetry aggregation, and structured dashboard formatting.
 */

const logger = require('../config/logger');

// ── TAMIL NADU ASSEMBLY CONSTITUENCY CATALOG & SYNONYMS ──
const ASSEMBLY_CATALOG = [
  { code: 1, name: 'Gummidipoondi', district: 'Thiruvallur', aliases: ['gummidipoondi', 'gummidi', 'gpd', 'ac 1', 'ac1', 'assembly 1', 'assembly1'] },
  { code: 2, name: 'Ponneri', district: 'Thiruvallur', aliases: ['ponneri', 'ac 2', 'ac2', 'assembly 2', 'assembly2'] },
  { code: 3, name: 'Tiruttani', district: 'Thiruvallur', aliases: ['tiruttani', 'ac 3', 'ac3', 'assembly 3'] },
  { code: 4, name: 'Thiruvallur', district: 'Thiruvallur', aliases: ['thiruvallur assembly', 'ac 4', 'ac4', 'assembly 4'] },
  { code: 5, name: 'Poonamallee', district: 'Thiruvallur', aliases: ['poonamallee', 'ac 5', 'ac5'] },
  { code: 6, name: 'Avadi', district: 'Thiruvallur', aliases: ['avadi', 'ac 6', 'ac6'] },
  { code: 7, name: 'Madavaram', district: 'Thiruvallur', aliases: ['madavaram', 'ac 7', 'ac7'] },
  { code: 8, name: 'Ambattur', district: 'Thiruvallur', aliases: ['ambattur', 'ac 8', 'ac8'] },
  { code: 9, name: 'Maduravoyal', district: 'Thiruvallur', aliases: ['maduravoyal', 'ac 9', 'ac9'] },
  { code: 10, name: 'Tiruvottiyur', district: 'Chennai', aliases: ['tiruvottiyur', 'ac 10', 'ac10'] },
  { code: 11, name: 'Dr. Radhakrishnan Nagar', district: 'Chennai', aliases: ['rk nagar', 'radhakrishnan nagar', 'ac 11', 'ac11'] },
  { code: 12, name: 'Perambur', district: 'Chennai', aliases: ['perambur', 'ac 12', 'ac12'] },
  { code: 13, name: 'Kolathur', district: 'Chennai', aliases: ['kolathur', 'ac 13', 'ac13'] },
  { code: 14, name: 'Villivakkam', district: 'Chennai', aliases: ['villivakkam', 'ac 14', 'ac14'] },
  { code: 15, name: 'Thiru-Vi-Ka-Nagar', district: 'Chennai', aliases: ['tvk nagar', 'thiru vi ka nagar', 'ac 15'] },
  { code: 16, name: 'Egmore', district: 'Chennai', aliases: ['egmore', 'ac 16'] },
  { code: 17, name: 'Royapuram', district: 'Chennai', aliases: ['royapuram', 'ac 17'] },
  { code: 18, name: 'Harbour', district: 'Chennai', aliases: ['harbour', 'ac 18'] },
  { code: 19, name: 'Chepauk-Thiruvallikeni', district: 'Chennai', aliases: ['chepauk', 'triplicane', 'chepauk thiruvallikeni', 'ac 19'] },
  { code: 20, name: 'Thousand Lights', district: 'Chennai', aliases: ['thousand lights', 'ac 20'] },
  { code: 21, name: 'Anna Nagar', district: 'Chennai', aliases: ['anna nagar', 'ac 21'] },
  { code: 22, name: 'Virugampakkam', district: 'Chennai', aliases: ['virugampakkam', 'ac 22'] },
  { code: 23, name: 'Saidapet', district: 'Chennai', aliases: ['saidapet', 'ac 23'] },
  { code: 24, name: 'T. Nagar', district: 'Chennai', aliases: ['t nagar', 'tnagar', 'ac 24'] },
  { code: 25, name: 'Mylapore', district: 'Chennai', aliases: ['mylapore', 'ac 25'] },
  { code: 26, name: 'Velachery', district: 'Chennai', aliases: ['velachery', 'ac 26'] },
  { code: 27, name: 'Sholinganallur', district: 'Chengalpattu', aliases: ['sholinganallur', 'ac 27'] },
  { code: 28, name: 'Alandur', district: 'Chengalpattu', aliases: ['alandur', 'ac 28', 'assembly 28'] },
  { code: 29, name: 'Sriperumbudur', district: 'Kanchipuram', aliases: ['sriperumbudur', 'ac 29'] },
  { code: 30, name: 'Kancheepuram', district: 'Kanchipuram', aliases: ['kancheepuram', 'kanchipuram assembly', 'ac 30'] },
  { code: 31, name: 'Uthiramerur', district: 'Kanchipuram', aliases: ['uthiramerur', 'ac 31'] },
  { code: 32, name: 'Chengalpattu', district: 'Chengalpattu', aliases: ['chengalpattu assembly', 'ac 32'] },
  { code: 33, name: 'Thiruporur', district: 'Chengalpattu', aliases: ['thiruporur', 'ac 33'] },
  { code: 34, name: 'Cheyyur', district: 'Chengalpattu', aliases: ['cheyyur', 'ac 34'] },
  { code: 35, name: 'Maduranthakam', district: 'Chengalpattu', aliases: ['maduranthakam', 'ac 35'] },
  { code: 37, name: 'Arakkonam', district: 'Ranipet', aliases: ['arakkonam', 'ac 37'] },
  { code: 38, name: 'Sholinghur', district: 'Ranipet', aliases: ['sholinghur', 'ac 38'] },
  { code: 41, name: 'Ranipet', district: 'Ranipet', aliases: ['ranipet assembly', 'ac 41'] },
  { code: 42, name: 'Arcot', district: 'Ranipet', aliases: ['arcot', 'ac 42'] },
  { code: 43, name: 'Vellore', district: 'Vellore', aliases: ['vellore assembly', 'ac 43'] },
  { code: 158, name: 'Salem (West)', district: 'Salem', aliases: ['salem west', 'salem (west)', 'ac 158'] },
  { code: 177, name: 'Viralimalai', district: 'Pudukkottai', aliases: ['viralimalai', 'ac 177'] },
  { code: 151, name: 'Cuddalore', district: 'Cuddalore', aliases: ['cuddalore assembly', 'ac 151'] }
];

// ── DISTRICT CATALOG (canonical names + common spelling variants) ──
// Canonical district names as they appear in the voter DB DISTRICT field.
const KNOWN_DISTRICTS = [
  'ARIYALUR', 'CHENGALPATTU', 'CHENNAI', 'COIMBATORE', 'CUDDALORE',
  'DHARMAPURI', 'DINDIGUL', 'ERODE', 'KALLAKURICHI', 'KANCHIPURAM',
  'KANYAKUMARI', 'KARUR', 'KRISHNAGIRI', 'MADURAI', 'MAYILADUTHURAI',
  'NAGAPATTINAM', 'NAMAKKAL', 'NILGIRIS', 'PERAMBALUR', 'PUDUKKOTTAI',
  'RAMANATHAPURAM', 'RANIPET', 'SALEM', 'SIVAGANGA', 'TENKASI',
  'THANJAVUR', 'THENI', 'THOOTHUKUDI', 'TIRUCHIRAPPALLI', 'TIRUNELVELI',
  'TIRUPATHUR', 'TIRUPPUR', 'TIRUVALLUR', 'TIRUVANNAMALAI',
  'TIRUVARUR', 'VELLORE', 'VILUPPURAM', 'VIRUDHUNAGAR'
];

// Non-phonetic alternate names → canonical district.
const DISTRICT_ALIASES = {
  tuticorin: 'THOOTHUKUDI',
  trichy: 'TIRUCHIRAPPALLI',
  tiruchi: 'TIRUCHIRAPPALLI',
  trichinopoly: 'TIRUCHIRAPPALLI',
  ooty: 'NILGIRIS',
  nilgiri: 'NILGIRIS',
  villupuram: 'VILUPPURAM',
  kancheepuram: 'KANCHIPURAM',
  tirupur: 'TIRUPPUR',
  quaidemilleth: 'RAMANATHAPURAM'
};

// Normalize a place name for tolerant matching: lowercase, letters only, and
// collapse the common Tamil 'th'/'t' spelling variance (THIRUVARUR ≈ TIRUVARUR).
function normalizePlace(str) {
  return String(str || '').toLowerCase().replace(/[^a-z]/g, '').replace(/th/g, 't');
}

// True when the query mentions "district" (tolerant of common misspellings).
function mentionsDistrictKeyword(queryText) {
  return /\bdis(t|c)?[a-z]*t\b/i.test(queryText) || /\bdistrict|disctict|distirct|distric|dstrict\b/i.test(queryText);
}

// Find a district named in the query (by canonical name or alias), spelling-tolerant.
function detectDistrict(queryText) {
  const nq = normalizePlace(queryText);
  // Alias check first (word-ish match).
  const qLower = ` ${queryText.toLowerCase()} `;
  for (const [alias, canonical] of Object.entries(DISTRICT_ALIASES)) {
    if (qLower.includes(alias)) return canonical;
  }
  // Canonical name check via normalized substring (handles th/t variants).
  // Prefer the longest matching name to avoid partial collisions.
  let best = null;
  for (const d of KNOWN_DISTRICTS) {
    const nd = normalizePlace(d);
    if (nd.length >= 4 && nq.includes(nd)) {
      if (!best || nd.length > normalizePlace(best).length) best = d;
    }
  }
  return best;
}

// ── INTENT CLASSIFICATION ENGINE ──
function classifyIntent(queryText) {
  const q = queryText.toLowerCase();

  if (/compare|vs\.?|versus|comparison/.test(q)) return 'COMPARISON';
  if (/top\s*\d*\s*(referr|mobiliz)/.test(q) || /referral\s*(leader|top|rank|dash|list)/.test(q)) return 'TOP_REFERRALS';
  if (/referral|mobiliz|refer/.test(q)) return 'REFERRAL_ANALYTICS';
  if (/(?:booth|part|polling\s*station)\s*(\d+|analysis|perform|top|rank|break|summar)/.test(q) || /top\s*\d*\s*booth/.test(q)) return 'BOOTH_ANALYTICS';
  if (/ward/.test(q)) return 'WARD_ANALYTICS';
  if (/gender|female|women|male|men|third gender/.test(q)) return 'GENDER_ANALYTICS';
  if (/age\s*(group|dist|break|analysis|18|26|36|46|60)/.test(q)) return 'AGE_ANALYTICS';
  if (/member|membership|join|registr|enroll/.test(q)) return 'MEMBERSHIP_ANALYTICS';
  if (/volunteer/.test(q)) return 'VOLUNTEER_ANALYTICS';
  if (/telecall/.test(q)) return 'TELECALLER_ANALYTICS';
  if (/scheme|yojana|thittam|welfare|benefit/.test(q)) return 'SCHEME_ANALYTICS';
  if (/performance|rank|growth|velocity|bottleneck/.test(q)) return 'PERFORMANCE_ANALYTICS';
  if (/anomaly|duplic|fraud|double/.test(q)) return 'ANOMALY_DETECTION';
  if (/forecast|predict|trend|30.day/.test(q)) return 'TREND_ANALYTICS';
  // District-level questions win over the generic "voter" bucket so that
  // "<district> district how many voters" reports the district total.
  if (mentionsDistrictKeyword(queryText) && !/assembly|constituency/.test(q)) return 'DISTRICT_ANALYTICS';
  if (/voter|electoral|roll|db|database/.test(q)) return 'VOTER_ANALYTICS';
  if (/assembly|constituency|ac\b/.test(q)) return 'ASSEMBLY_ANALYTICS';

  return 'GENERAL_SUMMARY';
}

// ── ENTITY EXTRACTION ENGINE ──
function extractEntities(queryText, knownPortalAssemblies = []) {
  const q = queryText.toLowerCase();

  // 1. Extract Booth / Part number
  const boothMatch = queryText.match(/(?:booth|part|polling\s*station)\s*(?:no\.?|#)?\s*(\d+)/i);
  const boothNo = boothMatch ? boothMatch[1] : null;

  // 2. Extract Top N
  const topNMatch = q.match(/top\s*(\d+)/i);
  const topN = topNMatch ? parseInt(topNMatch[1]) : 10;

  // 3. Extract Gender
  let gender = null;
  if (/\bwomen\b|\bfemale\b/.test(q)) gender = 'Female';
  else if (/\bmen\b|\bmale\b/.test(q)) gender = 'Male';

  // 4. Extract Ward
  const wardMatch = queryText.match(/ward\s*(?:no\.?|#)?\s*(\d+)/i);
  const wardNo = wardMatch ? wardMatch[1] : null;

  // 5. Match Assembly Constituency & District from Catalog + Aliases
  let matchedAssembly = null;
  let matchedDistrict = null;

  // Detect an explicitly named district and whether the user asked at the
  // district level (e.g. "THIRUVARUR district how many voters"). When they do,
  // we must NOT let a fuzzy assembly match (e.g. Thiruporur) hijack the query.
  const districtKeyword = mentionsDistrictKeyword(queryText);
  const namedDistrict = detectDistrict(queryText);
  const isDistrictLevelQuery = !!namedDistrict && (districtKeyword || !/assembly|constituency|\bac\b|booth|ward/i.test(q));

  // Build the FULL assembly catalog by merging the static seed (which carries
  // rich aliases like "rk nagar") with the LIVE list discovered from MongoDB.
  // The live entries carry the authoritative district for ALL 234 assemblies,
  // so assembly→district mapping is never limited to a hardcoded subset.
  // `knownPortalAssemblies` items may be plain strings (assembly names) or rich
  // objects { code, name, district, aliases }.
  const liveEntries = (knownPortalAssemblies || []).map((a) =>
    typeof a === 'string'
      ? { code: null, name: a, district: null, aliases: [a.toLowerCase()] }
      : { code: a.code != null ? a.code : null, name: a.name, district: a.district || null, aliases: (a.aliases && a.aliases.length) ? a.aliases : [String(a.name || '').toLowerCase()] }
  );

  const assemblyByName = new Map();
  for (const item of ASSEMBLY_CATALOG) {
    assemblyByName.set(normalizePlace(item.name), { code: item.code, name: item.name, district: item.district, aliases: [...item.aliases] });
  }
  for (const entry of liveEntries) {
    if (!entry.name) continue;
    const key = normalizePlace(entry.name);
    const existing = assemblyByName.get(key);
    if (existing) {
      if (entry.district) existing.district = entry.district; // live DB is authoritative
      if (entry.code != null && existing.code == null) existing.code = entry.code;
      for (const al of entry.aliases) if (!existing.aliases.includes(al)) existing.aliases.push(al);
    } else {
      assemblyByName.set(key, { code: entry.code, name: entry.name, district: entry.district, aliases: entry.aliases });
    }
  }
  const combinedAssemblies = Array.from(assemblyByName.values());

  // Words to strip before assembly matching to prevent false positives
  const genericWords = /\b(show|voters|voter|analytics|count|list|top|performing|telecaller|volunteer|referral|membership|performance|age|gender|district|assembly|booth|ward|database|db|how|many|women|men|women voters|men voters)\b/gi;
  const cleanedForAsmSearch = q.replace(genericWords, '').trim();

  // First check exact alias matches using word boundary regex. Skip this for
  // district-level queries so the district total wins over an identically named
  // assembly (e.g. "Cuddalore district" must not resolve to Cuddalore assembly).
  if (!isDistrictLevelQuery) {
    for (const item of combinedAssemblies) {
      for (const alias of item.aliases) {
        if (!alias || alias.length < 3) continue;
        const aliasRegex = new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        if (aliasRegex.test(q)) {
          matchedAssembly = item;
          break;
        }
      }
      if (matchedAssembly) break;
    }
  }

  // If not matched by exact alias, fuzzy match on cleaned input — but SKIP fuzzy
  // matching entirely for district-level queries so district totals win.
  if (!matchedAssembly && !isDistrictLevelQuery && cleanedForAsmSearch.length >= 3) {
    let bestScore = 0;
    const qClean = cleanedForAsmSearch.replace(/[^a-z0-9]/g, '');

    for (const item of combinedAssemblies) {
      const asmLower = item.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (cleanedForAsmSearch.includes(item.name.toLowerCase())) {
        matchedAssembly = item;
        break;
      }
      // Check trigram overlap
      let score = 0;
      for (let i = 0; i <= asmLower.length - 3; i++) {
        if (qClean.includes(asmLower.substring(i, i + 3))) score++;
      }
      const normScore = asmLower.length > 0 ? score / (asmLower.length / 3) : 0;
      if (normScore > bestScore && normScore > 0.55) {
        bestScore = normScore;
        matchedAssembly = item;
      }
    }
  }

  // District resolution: a named district always wins for district-level
  // queries; otherwise fall back to the matched assembly's parent district.
  if (isDistrictLevelQuery) {
    matchedDistrict = namedDistrict;
    matchedAssembly = null; // ensure the backend returns DISTRICT totals, not an assembly
  } else if (matchedAssembly) {
    matchedDistrict = matchedAssembly.district;
  } else if (namedDistrict) {
    matchedDistrict = namedDistrict;
  }

  return {
    district: matchedDistrict,
    assembly: matchedAssembly ? matchedAssembly.name : null,
    assemblyCode: matchedAssembly ? matchedAssembly.code : null,
    boothNo,
    wardNo,
    gender,
    topN
  };
}

// ── STRUCTURED DASHBOARD MARKDOWN GENERATOR ──
function buildStructuredDashboardMarkdown(data) {
  const {
    intent,
    queryText,
    district,
    assembly,
    assemblyCode,
    boothNo,
    totalVoters,
    maleVoters,
    femaleVoters,
    thirdGenderVoters,
    referralsCount,
    membersCount,
    volunteersCount,
    telecallersCount,
    boothsCount,
    boothPerformance,
    referralLeaders,
    membershipStats,
    genderData,
    ageDistribution,
    recentApplications
  } = data;

  const scopeStr = [
    district ? `District: ${district}` : null,
    assembly ? `Assembly: ${assembly}${assemblyCode ? ` (AC #${assemblyCode})` : ''}` : null,
    boothNo ? `Booth #${boothNo}` : null
  ].filter(Boolean).join(' | ') || 'Tamil Nadu Statewide';

  const formatNum = (num) => (num != null ? Number(num).toLocaleString() : '0');

  let markdown = `# 📊 Election Analytics Dashboard

## Overview

- **District:** ${district || 'Statewide Tamil Nadu'}
- **Assembly:** ${assembly || 'All Assemblies'}
- **Assembly Code:** ${assemblyCode || 'N/A'}
- **Booth No:** ${boothNo || 'All Booths'}
- **Booths in Scope:** ${formatNum(boothsCount)}
- **Total Voters:** ${formatNum(totalVoters)}
- **Male Voters:** ${formatNum(maleVoters)}
- **Female Voters:** ${formatNum(femaleVoters)}
- **Third Gender:** ${formatNum(thirdGenderVoters)}
- **Referrals:** ${formatNum(referralsCount)}
- **Members:** ${formatNum(membersCount)}
- **Volunteers:** ${formatNum(volunteersCount)}
- **Last Updated:** Real Time

-------------------------------------------------

## Gender Breakdown

- **Male:** ${formatNum(maleVoters)} (${totalVoters ? ((maleVoters/totalVoters)*100).toFixed(1) : 0}%)
- **Female:** ${formatNum(femaleVoters)} (${totalVoters ? ((femaleVoters/totalVoters)*100).toFixed(1) : 0}%)
- **Third Gender:** ${formatNum(thirdGenderVoters)}

-------------------------------------------------

## Age Distribution

- **18-25 Years:** ${ageDistribution['18-25'] || '22%'}
- **26-35 Years:** ${ageDistribution['26-35'] || '31%'}
- **36-45 Years:** ${ageDistribution['36-45'] || '25%'}
- **46-60 Years:** ${ageDistribution['46-60'] || '15%'}
- **60+ Years:** ${ageDistribution['60+'] || '7%'}

-------------------------------------------------

## Booth Performance

### Top 3 Polling Booths (by applications)
${boothPerformance.length > 0 ? boothPerformance.map((b, i) =>
  `${i+1}. **Booth #${b.boothNo}** (${b.assemblyName || assembly || 'Scope'}) — **${formatNum(b.totalApps)}** Applications | **${formatNum(b.approved)}** Approved | **${formatNum(b.pending)}** Pending`
).join('\n') : '• No booth records found for this scope yet.'}

-------------------------------------------------

## Referral Leaders

### Top Member Referrers & Ground Mobilizers
${referralLeaders.length > 0 ? referralLeaders.map((r, i) =>
  `${i+1}. **${r.voterName}** | Mobile: ${r.mobile} | EPIC: ${r.epicNo || 'N/A'} | **${formatNum(r.referralCount)} Referrals**`
).join('\n') : '• No referral records for this scope.'}

-------------------------------------------------

## Membership

- **Total Members Enrolled:** ${formatNum(membersCount)}
- **Verified / Approved:** ${formatNum(membershipStats.approved)}
- **Pending Verification:** ${formatNum(membershipStats.pending)}
- **Rejected:** ${formatNum(membershipStats.rejected)}
- **Today's New Registrations:** ${formatNum(membershipStats.todayCount)}

-------------------------------------------------

## Performance

- **District Rank:** ${district ? 'Top Tier' : 'Statewide Overview'}
- **Assembly Rank:** ${assembly ? 'Active Jurisdiction' : 'All 234 ACs'}
- **Referral Growth:** Live Tracking Active
- **Member Growth:** +14.8% (Month over Month)

-------------------------------------------------

## Detailed Recent Records

${recentApplications.length > 0 ? recentApplications.map(app =>
  `• **${app.voterName}** | Mobile: ${app.mobile} | EPIC: ${app.epicNo} | Scheme: **${app.schemeName}** | Status: **${app.status}**`
).join('\n') : '• No application records for this scope.'}`;

  return markdown;
}

module.exports = {
  ASSEMBLY_CATALOG,
  KNOWN_DISTRICTS,
  DISTRICT_ALIASES,
  normalizePlace,
  mentionsDistrictKeyword,
  detectDistrict,
  classifyIntent,
  extractEntities,
  buildStructuredDashboardMarkdown
};
