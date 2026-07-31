// Unit tests for the district-vs-assembly resolution fix.
const test = require('node:test');
const assert = require('node:assert');

const {
  classifyIntent,
  extractEntities,
  detectDistrict,
  mentionsDistrictKeyword
} = require('../utils/electionIntelligence');

test('the reported bug: "THIRUVARUR district how many voters" resolves to the DISTRICT, not an assembly', () => {
  const q = 'THIRUVARUR disctict how many voter are there';
  const e = extractEntities(q);
  assert.strictEqual(e.district, 'TIRUVARUR', 'should resolve to the TIRUVARUR district');
  assert.strictEqual(e.assembly, null, 'must NOT fuzzy-match an assembly (e.g. Thiruporur)');
});

test('district keyword is detected despite the common "disctict" misspelling', () => {
  assert.ok(mentionsDistrictKeyword('THIRUVARUR disctict how many voter'));
  assert.ok(mentionsDistrictKeyword('show me chennai district totals'));
});

test('spelling variants (TH/T) map to the canonical district', () => {
  assert.strictEqual(detectDistrict('thiruvarur'), 'TIRUVARUR');
  assert.strictEqual(detectDistrict('tiruvarur'), 'TIRUVARUR');
  assert.strictEqual(detectDistrict('thiruvallur district'), 'TIRUVALLUR');
});

test('district aliases resolve (tuticorin → THOOTHUKUDI, trichy → TIRUCHIRAPPALLI)', () => {
  assert.strictEqual(detectDistrict('voters in tuticorin'), 'THOOTHUKUDI');
  assert.strictEqual(detectDistrict('trichy district voters'), 'TIRUCHIRAPPALLI');
});

test('an explicitly named assembly still resolves to that assembly (not district-level)', () => {
  const e = extractEntities('show me Thiruporur assembly voters');
  assert.strictEqual(e.assembly, 'Thiruporur');
  assert.strictEqual(e.district, 'Chengalpattu');
});

test('a booth query inside a district is not forced to district-level', () => {
  const e = extractEntities('booth 5 in Thiruporur');
  assert.strictEqual(e.boothNo, '5');
  assert.strictEqual(e.assembly, 'Thiruporur');
});

test('district-level intent classification', () => {
  assert.strictEqual(classifyIntent('THIRUVARUR disctict how many voter are there'), 'DISTRICT_ANALYTICS');
});

test('"ranipet assembly booth 10" extracts the exact booth number the user asked for', () => {
  const e = extractEntities('ranipet assembly booth 10');
  assert.strictEqual(e.boothNo, '10', 'must capture booth 10, not default to 1');
  assert.strictEqual(e.assembly, 'Ranipet');
  assert.strictEqual(e.assemblyCode, 41);
});

test('an assembly NOT in the static catalog resolves to its district via LIVE metadata (all 234 ACs)', () => {
  // Nilakkottai is not in the static ASSEMBLY_CATALOG. Provide it the way the
  // controller now does — as live metadata from the voter DB — and confirm the
  // district maps correctly instead of falling back to null/statewide.
  const liveMeta = [
    { code: '128', name: 'Nilakkottai', district: 'DINDIGUL', aliases: ['nilakkottai'] },
    { code: '129', name: 'Natham', district: 'DINDIGUL', aliases: ['natham'] }
  ];
  const e = extractEntities('summarize Nilakkottai assembly performance', liveMeta);
  assert.strictEqual(e.assembly, 'Nilakkottai');
  assert.strictEqual(e.district, 'DINDIGUL', 'live metadata must supply the correct district for any of the 234 ACs');
});

test('live metadata passed as plain strings still resolves the assembly (backward compatible)', () => {
  const e = extractEntities('show Sholavandan assembly voters', ['Sholavandan', 'Madurai East']);
  assert.strictEqual(e.assembly, 'Sholavandan');
});

test('the dashboard Overview shows the queried booth number (not just a booth count)', () => {
  const { buildStructuredDashboardMarkdown } = require('../utils/electionIntelligence');
  const md = buildStructuredDashboardMarkdown({
    intent: 'BOOTH_ANALYTICS', queryText: 'ranipet assembly booth 10',
    district: 'RANIPET', assembly: 'Ranipet', assemblyCode: 41, boothNo: '10',
    totalVoters: 940, maleVoters: 0, femaleVoters: 0, thirdGenderVoters: 0,
    referralsCount: 0, membersCount: 0, volunteersCount: 0, telecallersCount: 0,
    boothsCount: 1, boothPerformance: [], referralLeaders: [], membershipStats: {},
    genderData: [], ageDistribution: {}, recentApplications: []
  });
  assert.match(md, /\*\*Booth No:\*\* 10/, 'Overview must display Booth No: 10');
});
