const dotenv = require('dotenv');
const path = require('path');
const axios = require('axios');

dotenv.config({ path: path.join(__dirname, '../.env') });

const apiKey = process.env.GEMINI_API_KEY;

async function listSupportedModels() {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const response = await axios.get(url);
    const models = response.data.models || [];
    
    console.log('Finding models supporting generateContent:');
    const genModels = models.filter(m => (m.supportedGenerationMethods || []).includes('generateContent'));
    genModels.forEach(m => console.log(`- ${m.name}`));

    for (const m of genModels) {
      const shortName = m.name.replace('models/', '');
      console.log(`\nTesting generateContent for: ${shortName}...`);
      try {
        const genUrl = `https://generativelanguage.googleapis.com/v1beta/models/${shortName}:generateContent?key=${apiKey}`;
        const res = await axios.post(genUrl, {
          contents: [{ parts: [{ text: "Hello AI" }] }]
        });
        if (res.status === 200) {
          console.log(`🎉 SUCCESS WITH MODEL: ${shortName}`);
          console.log('Response:', res.data.candidates?.[0]?.content?.parts?.[0]?.text);
          return shortName;
        }
      } catch (err) {
        console.log(`  -> Error with ${shortName}: ${err.response?.data?.error?.message || err.message}`);
      }
    }
  } catch (err) {
    console.error('Error listing models:', err.message);
  }
}

listSupportedModels();
