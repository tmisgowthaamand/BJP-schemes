const mongoose = require('mongoose');
require('dotenv').config();

async function checkAdmins() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/bjp_nalam_thittam_db');
  const Admin = mongoose.model('Admin', new mongoose.Schema({}, { strict: false }), 'admins');

  const admins = await Admin.find({}).lean();
  console.log('Admins count:', admins.length);
  admins.forEach(a => console.log(' -', a.username, '| role:', a.role, '| district:', a.district, '| assembly:', a.assemblyName));

  process.exit(0);
}
checkAdmins();
