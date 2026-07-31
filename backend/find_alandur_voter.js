const { getAssemblyMetadata, getVoterDbClient } = require('./services/jurisdictionService');

async function findAlandurEPIC() {
  try {
    const assemblies = await getAssemblyMetadata();
    const match = assemblies.find(a => a.assemblyName.toLowerCase().includes('alandur'));
    console.log('Alandur Assembly Match:', match);

    if (match) {
      const voterDb = await getVoterDbClient();
      const voters = await voterDb.collection(match.colName).find({
        PART_NO: { $in: ['3', 3, '003', '03'] }
      }).limit(5).toArray();

      console.log('=== ALANDUR BOOTH 3 VOTERS ===');
      voters.forEach((v, idx) => {
        console.log(`[Voter #${idx + 1}]`);
        console.log(`Name: ${v.VOTER_NAME || v.NAME || v.voterName}`);
        console.log(`EPIC Number: ${v.EPIC_NO || v.EPIC_NUMBER || v.epicNo}`);
        console.log(`Mobile: ${v.MOBILE_NUMBER || v.MOBILE || v.mobile}`);
        console.log(`Assembly: ${v.ASSEMBLY_NAME || v.AC_NAME || match.assemblyName}`);
        console.log(`Booth (PART_NO): ${v.PART_NO}`);
        console.log('-----------------------------------');
      });
    } else {
      console.log('Alandur Assembly not found in metadata');
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

findAlandurEPIC();
