'use strict';
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Twemoji 72x72 PNGs for each service icon
const ICONS = {
  profile:         '1f464', // 👤 bust
  schemes:         '1f4cb', // 📋 clipboard
  referral:        '1f517', // 🔗 link
  referrals:       '1f465', // 👥 busts
  booth_president: '1f3db'  // 🏛️ classical building
};
const BASE = 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/';

(async () => {
  const out = {};
  for (const [key, code] of Object.entries(ICONS)) {
    try {
      const res = await axios.get(`${BASE}${code}.png`, { responseType: 'arraybuffer', timeout: 15000 });
      out[key] = Buffer.from(res.data).toString('base64');
      console.log(`${key}: ${res.data.length} bytes`);
    } catch (e) {
      console.log(`${key}: FAILED ${e.message}`);
    }
  }
  fs.writeFileSync(path.join(__dirname, '..', 'flows', 'menu_icons.json'), JSON.stringify(out));
  console.log('Saved flows/menu_icons.json with', Object.keys(out).length, 'icons');
})();
