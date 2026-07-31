const dotenv = require('dotenv');
const path = require('path');
const axios = require('axios');

// Load environment variables from backend/.env
dotenv.config({ path: path.join(__dirname, '../.env') });

const apiKey = process.env.GEMINI_API_KEY;

console.log('--------------------------------------------------');
console.log('Testing Gemini API Key Connection...');
console.log('API Key Present:', apiKey ? `YES (${apiKey.substring(0, 8)}...)` : 'NO');
console.log('--------------------------------------------------');

if (!apiKey) {
  console.error('❌ Error: GEMINI_API_KEY is not defined in backend/.env');
  process.exit(1);
}

// Test Gemini API REST endpoint using the API Key
async function testGeminiKey() {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const response = await axios.get(url);
    
    if (response.status === 200) {
      console.log('✅ SUCCESS: Gemini API Key is ACTIVE and VALID!');
      console.log('Available Models Count:', response.data.models ? response.data.models.length : 'N/A');
      console.log('\nSample Models Supported by Your Key:');
      const sampleModels = (response.data.models || []).slice(0, 5);
      sampleModels.forEach(m => console.log(`  - ${m.name}`));
      console.log('--------------------------------------------------');
    }
  } catch (error) {
    console.error('❌ API Key Test Failed!');
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Details:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

testGeminiKey();
