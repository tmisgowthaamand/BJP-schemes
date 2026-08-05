import fs from 'fs';

const files = [
  'src/pages/admin/DistrictAdminDashboard.jsx',
  'src/pages/admin/StateAdminDashboard.jsx',
  'src/pages/admin/BoothAdminDashboard.jsx',
  'src/pages/admin/SuperAdminDashboard.jsx'
];

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  // Check if it has flex-row container and only 1 closing div at end
  const pattern = /(\s*<\/main>\s*<\/div>\s*;\s*\}\s*;?\s*export default)/;
  if (pattern.test(content)) {
    content = content.replace(pattern, '\n      </main>\n    </div>\n  </div>\n);\n};\n\nexport default');
    fs.writeFileSync(f, content, 'utf8');
    console.log(`Added closing div to ${f}`);
  }
});
