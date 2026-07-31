const axios = require('axios');
const jwt = require('jsonwebtoken');
require('dotenv').config();

async function testApiEndpoint() {
  try {
    const token = jwt.sign(
      { id: 'DYNAMIC_SUPER', username: 'superadmin', role: 'SUPER_ADMIN', isAdmin: true },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const res = await axios.post(
      'http://localhost:5000/api/admin/query-ai',
      { prompt: 'Show Alandur analytics' },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    console.log('API Status:', res.status);
    console.log('Success:', res.data.success);
    console.log('Intent:', res.data.intent);
    console.log('Scope:', res.data.jurisdictionScope);
    console.log('\n--- DASHBOARD JSON SUMMARY ---');
    console.log(res.data.dashboard.summary);
    console.log('\n--- MARKDOWN RESPONSE ---');
    console.log(res.data.aiResponse);
  } catch (err) {
    console.error('Error:', err.response?.data || err.message);
  }
}

testApiEndpoint();
