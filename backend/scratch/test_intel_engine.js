const mongoose = require('mongoose');
require('dotenv').config();
const { classifyIntent, extractEntities, buildStructuredDashboardMarkdown } = require('../utils/electionIntelligence');

async function testElectionIntelligence() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/bjp_nalam_thittam_db');
  console.log('DB Connected.');

  const testQueries = [
    'Show Gummidipoondi voters',
    'Show booth 12 voters',
    'Show Alandur analytics',
    'Which district has highest referrals?',
    'Top 10 booths',
    'Top performing telecaller',
    'Show membership count',
    'How many women voters in Cuddalore?',
    'Booth 52 age analysis',
    'Compare Gummidipoondi vs Ponneri'
  ];

  for (const q of testQueries) {
    const intent = classifyIntent(q);
    const entities = extractEntities(q, ['Gummidipoondi', 'Alandur', 'Ponneri', 'Ranipet', 'Cuddalore']);
    console.log(`\n========================================`);
    console.log(`Query: "${q}"`);
    console.log(`Intent: ${intent}`);
    console.log(`Extracted Entities:`, JSON.stringify(entities));
  }

  process.exit(0);
}

testElectionIntelligence();
