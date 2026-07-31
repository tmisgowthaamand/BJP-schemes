const dotenv = require('dotenv');
const path = require('path');
const axios = require('axios');

dotenv.config({ path: path.join(__dirname, '../.env') });

const apiKey = process.env.GEMINI_API_KEY;

const candidateModels = [
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-flash-latest',
  'gemma-4-26b-a4b-it'
];

async function testCandidates() {
  for (const modelName of candidateModels) {
    console.log(`\n--------------------------------------------------`);
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
        console.log(`🎉 SUCCESS WITH MODEL: ${modelName}`);
        const responseText = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
        console.log(`\n[${modelName} Output]:`);
        console.log(responseText);
      }
    } catch (error) {
      console.error(`❌ ${modelName} Error:`, error.response?.data?.error?.message || error.message);
    }
  }
}

testCandidates();
