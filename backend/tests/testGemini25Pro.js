const dotenv = require('dotenv');
const path = require('path');
const axios = require('axios');

dotenv.config({ path: path.join(__dirname, '../.env') });

const apiKey = process.env.GEMINI_API_KEY;

async function testModel(modelName) {
  console.log(`Testing model: ${modelName}...`);
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
    const payload = {
      contents: [{
        parts: [{
          text: "Analyze live voter registration trends in Tamil Nadu across 38 districts and provide a 2-line strategic summary."
        }]
      }]
    };

    const response = await axios.post(url, payload);
    if (response.status === 200) {
      console.log(`✅ SUCCESS: ${modelName} responded!`);
      const responseText = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
      console.log(`[${modelName} Output]:\n${responseText}\n`);
      return true;
    }
  } catch (error) {
    console.error(`❌ ${modelName} Error:`, error.response?.data?.error?.message || error.message);
    return false;
  }
}

async function run() {
  await testModel('gemini-2.0-flash');
  await testModel('gemini-1.5-flash');
}

run();
