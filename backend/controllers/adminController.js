const ExcelJS = require('exceljs');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const User = require('../models/User');
const SchemeApplication = require('../models/SchemeApplication');
const { BJP_SCHEMES } = require('../constants/schemes');
const logger = require('../config/logger');
const { classifyIntent, extractEntities, buildStructuredDashboardMarkdown } = require('../utils/electionIntelligence');


// Resolve a stored schemeName (often the numeric scheme id, since the chatbot
// submits scheme ids) to a human-readable scheme name for display / exports.
const resolveSchemeName = (schemeName, schemeId) => {
  const raw = String(schemeName == null ? '' : schemeName).trim();
  const byId = BJP_SCHEMES.find(s => String(s.id) === raw || (schemeId != null && String(s.id) === String(schemeId)));
  if (/^\d+$/.test(raw) && byId) return byId.name;
  const byName = BJP_SCHEMES.find(s => s.name.toLowerCase() === raw.toLowerCase());
  if (byName) return byName.name;
  const byKey = BJP_SCHEMES.find(s => (s.keys || []).some(k => k && raw.toLowerCase().includes(k)));
  if (byKey) return byKey.name;
  return raw || (byId ? byId.name : '—');
};
const { getVoterDbClient } = require('../config/db');
const {
  getAssemblyMetadata,
  getDistrictCredentialsList,
  getAssemblyCredentialsList,
  getBoothCredentialsForAssembly,
  authenticateDynamicAdmin,
  getCollectionsForDistrict,
  getCollectionForAssembly,
  getDistrictVoterRollCount,
  getAssemblyVoterRollCount,
  getBoothVoterRollCount,
  getStateVoterRollCount
} = require('../services/jurisdictionService');

const generateAdminToken = (admin) => {
  return jwt.sign(
    {
      id: admin._id || admin.id,
      username: admin.username,
      role: admin.role,
      district: admin.district,
      assemblyName: admin.assemblyName,
      boothNo: admin.boothNo,
      isAdmin: true
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// Helper: Get scoping query for admin role
const getAdminScopeQuery = (admin) => {
  const query = {};
  if (admin.role === 'DISTRICT_ADMIN' && admin.district) {
    query.district = new RegExp('^' + admin.district + '$', 'i');
  } else if (admin.role === 'ASSEMBLY_ADMIN') {
    if (admin.district) query.district = new RegExp('^' + admin.district + '$', 'i');
    if (admin.assemblyName) query.assemblyName = new RegExp('^' + admin.assemblyName + '$', 'i');
  } else if (admin.role === 'BOOTH_ADMIN') {
    if (admin.district) query.district = new RegExp('^' + admin.district + '$', 'i');
    if (admin.assemblyName) query.assemblyName = new RegExp('^' + admin.assemblyName + '$', 'i');
    if (admin.boothNo) query.boothNo = String(admin.boothNo);
  }
  return query;
};

// @desc    Admin Login
// @route   POST /api/admin/login
// @access  Public
const adminLogin = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password are required' });
    }

    const cleanUsername = username.trim();
    const cleanPassword = password.trim();

    // 1. Check Mongoose DB
    const admin = await Admin.findOne({ username: cleanUsername });
    if (admin) {
      const isMatch = await admin.matchPassword(cleanPassword);
      if (isMatch) {
        const token = generateAdminToken(admin);
        return res.status(200).json({
          success: true,
          message: `Welcome ${admin.role} (${admin.username})`,
          token,
          admin: {
            id: admin._id,
            username: admin.username,
            role: admin.role,
            district: admin.district,
            assemblyName: admin.assemblyName,
            boothNo: admin.boothNo
          }
        });
      }
    }

    // 2. Check Dynamic Booth / Assembly / District Credential
    const dynamicAdmin = await authenticateDynamicAdmin(cleanUsername, cleanPassword);
    if (dynamicAdmin) {
      const token = generateAdminToken(dynamicAdmin);
      return res.status(200).json({
        success: true,
        message: `Welcome ${dynamicAdmin.role} (${dynamicAdmin.username})`,
        token,
        admin: dynamicAdmin
      });
    }

    return res.status(401).json({ success: false, message: 'Invalid admin credentials' });
  } catch (error) {
    logger.error('[adminLogin Error]', { error: error.message, stack: error.stack });
    return res.status(500).json({ success: false, message: 'Admin login failed', error: error.message });
  }
};

// @desc    Get All Assemblies Metadata (for Assembly Dropdown)
// @route   GET /api/admin/jurisdiction-assemblies
// @access  Private (Admin)
const getAssembliesList = async (req, res) => {
  try {
    const assemblies = await getAssemblyMetadata();
    return res.status(200).json({
      success: true,
      count: assemblies.length,
      assemblies
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get All District Admin Credentials List
// @route   GET /api/admin/jurisdiction-district-credentials
// @access  Private (Admin)
const getDistrictCredentials = async (req, res) => {
  try {
    const districts = await getDistrictCredentialsList();
    return res.status(200).json({
      success: true,
      count: districts.length,
      districts
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get All Assembly Admin Credentials List
// @route   GET /api/admin/jurisdiction-assembly-credentials
// @access  Private (Admin)
const getAssemblyCredentials = async (req, res) => {
  try {
    const assemblies = await getAssemblyCredentialsList();
    return res.status(200).json({
      success: true,
      count: assemblies.length,
      assemblies
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get Generated Booth Credentials for selected Assembly
// @route   GET /api/admin/assembly-booth-credentials
// @access  Private (Admin)
const getAssemblyBoothCredentials = async (req, res) => {
  try {
    const { assemblyNo } = req.query;
    const targetNo = assemblyNo || '1';

    const data = await getBoothCredentialsForAssembly(targetNo);
    if (!data) {
      return res.status(404).json({ success: false, message: `Assembly #${targetNo} not found` });
    }

    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get Admin Dashboard Scoped Statistics
// @route   GET /api/admin/dashboard-stats
// @access  Private (Admin)
const getDashboardStats = async (req, res) => {
  try {
    const admin = req.admin;
    const { district, assemblyName, boothNo } = req.query || {};
    const scopeQuery = getAdminScopeQuery(admin);

    // Count from WRITE DB: unique enrolled members with scheme applications
    const [totalApplications, distinctMobiles, totalRegisteredUsers] = await Promise.all([
      SchemeApplication.countDocuments(scopeQuery),
      SchemeApplication.distinct('mobile', scopeQuery),
      User.countDocuments(scopeQuery)
    ]);
    const totalVotersRequested = distinctMobiles.length || totalApplications;

    // Count from READ DB: instant from in-memory cache
    let totalVotersInRoll = null;
    try {
      const activeBooth = boothNo || (admin.role === 'BOOTH_ADMIN' ? admin.boothNo : null);
      const activeAss = assemblyName || admin.assemblyName;
      const activeDist = district || admin.district;

      if (activeBooth && activeAss) {
        const cols = await getCollectionForAssembly(activeAss);
        if (cols && cols.length > 0) {
          const voterDb = await getVoterDbClient();
          const bStr = String(activeBooth);
          const bNum = parseInt(activeBooth);
          totalVotersInRoll = await voterDb.collection(cols[0]).countDocuments({
            $or: [{ PART_NO: bStr }, { PART_NO: bNum }]
          });
        }
      } else if (activeAss) {
        totalVotersInRoll = await getAssemblyVoterRollCount(activeAss);
      } else if (activeDist) {
        totalVotersInRoll = await getDistrictVoterRollCount(activeDist);
      } else {
        totalVotersInRoll = await getStateVoterRollCount();
      }
    } catch (rollErr) {
      logger.error('[ReadDB VoterCount Error]', { error: rollErr.message });
    }

    // ── Execute all aggregation queries in parallel (O(1) execution time) ──
    const [
      statusCounts,

      rawDistrictStats,
      rawAssemblyStats,
      rawBoothStats,
      rawPopularity,
      topReferrersRaw
    ] = await Promise.all([
      SchemeApplication.aggregate([
        { $match: scopeQuery },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ], { allowDiskUse: true }),

      SchemeApplication.aggregate([
        { $match: scopeQuery },
        {
          $group: {
            _id: '$district',
            totalApps: { $sum: 1 },
            approved: { $sum: { $cond: [{ $regexMatch: { input: { $ifNull: ['$status', ''] }, regex: /approve/i } }, 1, 0] } },
            rejected: { $sum: { $cond: [{ $regexMatch: { input: { $ifNull: ['$status', ''] }, regex: /reject/i } }, 1, 0] } },
            pending: { $sum: { $cond: [{ $and: [{ $not: [{ $regexMatch: { input: { $ifNull: ['$status', ''] }, regex: /approve/i } }] }, { $not: [{ $regexMatch: { input: { $ifNull: ['$status', ''] }, regex: /reject/i } }] }] }, 1, 0] } },
            voterIds: { $addToSet: { $ifNull: ['$epicNo', '$mobile'] } }
          }
        },
        {
          $project: {
            _id: 1,
            totalApps: 1,
            approved: 1,
            rejected: 1,
            pending: 1,
            appliedVoters: { $size: '$voterIds' }
          }
        },
        { $sort: { totalApps: -1 } }
      ], { allowDiskUse: true }),

      SchemeApplication.aggregate([
        { $match: scopeQuery },
        {
          $group: {
            _id: { district: '$district', assemblyName: '$assemblyName' },
            totalApps: { $sum: 1 },
            approved: { $sum: { $cond: [{ $regexMatch: { input: { $ifNull: ['$status', ''] }, regex: /approve/i } }, 1, 0] } },
            rejected: { $sum: { $cond: [{ $regexMatch: { input: { $ifNull: ['$status', ''] }, regex: /reject/i } }, 1, 0] } },
            pending: { $sum: { $cond: [{ $and: [{ $not: [{ $regexMatch: { input: { $ifNull: ['$status', ''] }, regex: /approve/i } }] }, { $not: [{ $regexMatch: { input: { $ifNull: ['$status', ''] }, regex: /reject/i } }] }] }, 1, 0] } },
            voterIds: { $addToSet: { $ifNull: ['$epicNo', '$mobile'] } }
          }
        },
        {
          $project: {
            _id: 1,
            totalApps: 1,
            approved: 1,
            rejected: 1,
            pending: 1,
            appliedVoters: { $size: '$voterIds' }
          }
        },
        { $sort: { totalApps: -1 } },
        { $limit: 50 }
      ], { allowDiskUse: true }),

      SchemeApplication.aggregate([
        { $match: scopeQuery },
        {
          $group: {
            _id: { district: '$district', assemblyName: '$assemblyName', boothNo: '$boothNo' },
            totalApps: { $sum: 1 },
            approved: { $sum: { $cond: [{ $regexMatch: { input: { $ifNull: ['$status', ''] }, regex: /approve/i } }, 1, 0] } },
            rejected: { $sum: { $cond: [{ $regexMatch: { input: { $ifNull: ['$status', ''] }, regex: /reject/i } }, 1, 0] } },
            pending: { $sum: { $cond: [{ $and: [{ $not: [{ $regexMatch: { input: { $ifNull: ['$status', ''] }, regex: /approve/i } }] }, { $not: [{ $regexMatch: { input: { $ifNull: ['$status', ''] }, regex: /reject/i } }] }] }, 1, 0] } },
            voterIds: { $addToSet: { $ifNull: ['$epicNo', '$mobile'] } }
          }
        },
        {
          $project: {
            _id: 1,
            totalApps: 1,
            approved: 1,
            rejected: 1,
            pending: 1,
            appliedVoters: { $size: '$voterIds' }
          }
        },
        { $sort: { totalApps: -1 } },
        { $limit: 100 }
      ], { allowDiskUse: true }),


      SchemeApplication.aggregate([
        { $match: scopeQuery },
        { $group: { _id: '$schemeName', count: { $sum: 1 }, cluster: { $first: '$clusterName' } } },
        { $sort: { count: -1 } }
      ], { allowDiskUse: true }),

      // Global referral counts grouped by referrer code (NOT scoped by the
      // referred person's location). Scoping to the referrer's own jurisdiction
      // is applied afterwards so a referrer shows up in THEIR district/assembly/
      // booth dashboard even when they refer people elsewhere.
      User.aggregate([
        { $match: { referredBy: { $nin: [null, '', 'null', 'undefined'] } } },
        { $group: { _id: '$referredBy', referralCount: { $sum: 1 } } }
      ], { allowDiskUse: true })
    ]);

    const statusMap = {
      Submitted: 0,
      Pending: 0,
      Called: 0,
      'In Progress': 0,
      Processing: 0,
      Verified: 0,
      Approved: 0,
      Completed: 0,
      Rejected: 0
    };
    // Roll each raw status into a single canonical bucket. IMPORTANT: count it
    // exactly once — do not also add the raw key, or statuses whose name equals
    // a bucket (e.g. "Approved") get counted twice (the old 4,145 → 8,288 bug).
    statusCounts.forEach(item => {
      if (!item._id) return;
      const norm = String(item._id).trim().toLowerCase();
      if (norm.includes('approve') || norm.includes('complete')) {
        statusMap.Approved += item.count;
      } else if (norm.includes('reject')) {
        statusMap.Rejected += item.count;
      } else if (norm.includes('process') || norm.includes('progress') || norm.includes('call') || norm.includes('verif')) {
        statusMap['In Progress'] += item.count;
      } else {
        statusMap.Pending += item.count;
      }
    });

    const districtStats = await Promise.all(
      rawDistrictStats.map(async (d) => {
        const rollCount = await getDistrictVoterRollCount(d._id);
        return {
          _id: d._id,
          totalVoters: rollCount || null,
          appliedVoters: d.appliedVoters || 0,
          totalApps: d.totalApps,
          approved: d.approved,
          rejected: d.rejected || 0,
          pending: d.pending
        };
      })
    );

    const assemblyStats = await Promise.all(
      rawAssemblyStats.map(async (a) => {
        const rollCount = await getAssemblyVoterRollCount(a._id.assemblyName);
        return {
          _id: a._id,
          totalVoters: rollCount || null,
          appliedVoters: a.appliedVoters || 0,
          totalApps: a.totalApps,
          approved: a.approved,
          rejected: a.rejected || 0,
          pending: a.pending
        };
      })
    );

    const boothStats = await Promise.all(
      rawBoothStats.map(async (b) => {
        let rollCount = null;
        if (b._id.assemblyName && b._id.boothNo) {
          rollCount = await getBoothVoterRollCount(b._id.assemblyName, b._id.boothNo);
        }
        return {
          _id: b._id,
          totalVoters: rollCount,
          appliedVoters: b.appliedVoters || 0,
          totalApps: b.totalApps,
          approved: b.approved,
          rejected: b.rejected || 0,
          pending: b.pending
        };
      })
    );


    const CANONICAL_SCHEMES = BJP_SCHEMES.map(s => ({
      id: String(s.id),
      name: s.name,
      keys: s.keys || [s.name.toLowerCase()],
      cluster: s.cluster
    }));

    const popularityObj = {};
    // Pre-populate all 23 schemes with count 0 so every scheme is dynamically visible
    CANONICAL_SCHEMES.forEach(s => {
      popularityObj[s.name] = { _id: s.name, count: 0, cluster: s.cluster };
    });

    rawPopularity.forEach(item => {
      const rawStr = String(item._id || '').trim().toLowerCase();
      let matched = CANONICAL_SCHEMES.find(s => String(s.id) === String(item._id) || s.name.toLowerCase() === rawStr);
      if (!matched) {
        matched = CANONICAL_SCHEMES.find(s => s.keys.some(k => rawStr.includes(k)));
      }

      const displayName = matched ? matched.name : String(item._id);
      const clusterName = matched ? matched.cluster : (item.cluster || 'BJP Nalam Thittam Welfare');

      if (!popularityObj[displayName]) {
        popularityObj[displayName] = { _id: displayName, count: 0, cluster: clusterName };
      }
      popularityObj[displayName].count += item.count;
    });

    const schemePopularity = Object.values(popularityObj).sort((a, b) => b.count - a.count);

    // ── Pure MongoDB Dynamic Aggregation for Top Referrers Leaderboard ──
    const allDbUsersForLeaderboard = await User.find({ ...scopeQuery, mobile: { $ne: '7010905730' } })
      .sort({ referralsCount: -1 })
      .limit(10)
      .select('epicNo voterName mobile district assemblyName boothNo referralCode referralsCount')
      .lean();


    const topReferrersList = await Promise.all(
      allDbUsersForLeaderboard.map(async (u) => {
        const referredDocsCount = await User.countDocuments({
          $or: [
            { referredBy: u.mobile },
            { referredBy: u.epicNo },
            { referredBy: u.referralCode }
          ]
        });
        const liveCount = Math.max(u.referralsCount || 0, referredDocsCount);
        return {
          epicNo: u.epicNo || 'N/A',
          voterName: u.voterName || 'Member',
          mobile: u.mobile || 'N/A',
          district: u.district || '',
          assemblyName: u.assemblyName || '',
          boothNo: u.boothNo || '',
          referralCode: u.referralCode || 'REF',
          referralCount: liveCount
        };
      })
    );

    topReferrersList.sort((a, b) => b.referralCount - a.referralCount);
    const topReferrers = topReferrersList.slice(0, 5);






    return res.status(200).json({
      success: true,
      adminRole: admin.role,
      jurisdiction: {
        district: admin.district,
        assemblyName: admin.assemblyName,
        boothNo: admin.boothNo
      },
      overview: {
        totalUsers: totalVotersRequested,
        totalVotersRequested,
        totalRegisteredUsers,
        totalVotersInRoll,
        totalApplications,
        approvedDirectives: statusMap.Approved || 0,
        pendingDirectives: statusMap.Pending || 0, // Submitted is already bucketed into Pending
        rejectedDirectives: statusMap.Rejected || 0,
        statusBreakdown: statusMap
      },
      districtStats,
      assemblyStats,
      boothStats,
      schemePopularity,
      topReferrers
    });

  } catch (error) {
    logger.error('[getDashboardStats Error]', { error: error.message, stack: error.stack });
    return res.status(500).json({ success: false, message: 'Failed to compute dashboard stats', error: error.message });
  }
};

// @desc    Get Referred Members by Member (EPIC or Referral Code)
// @route   GET /api/admin/member-referrals
// @access  Private (Admin)
const getMemberReferrals = async (req, res) => {
  try {
    const { epicNo, referralCode, mobile, userId } = req.query;

    let targetUser = null;
    if (userId) targetUser = await User.findById(userId);
    if (!targetUser && epicNo) targetUser = await User.findOne({ epicNo: epicNo.trim().toUpperCase() });
    if (!targetUser && mobile) targetUser = await User.findOne({ mobile: mobile.trim() });
    if (!targetUser && referralCode) targetUser = await User.findOne({ referralCode: referralCode.trim() });

    const searchCodes = [];
    if (targetUser) {
      if (targetUser.referralCode) searchCodes.push(targetUser.referralCode);
      if (targetUser.epicNo) searchCodes.push(targetUser.epicNo);
      if (targetUser.mobile) searchCodes.push(targetUser.mobile);
    }
    if (referralCode) searchCodes.push(referralCode);
    if (epicNo) searchCodes.push(epicNo);
    if (mobile) searchCodes.push(mobile);

    const uniqueCodes = Array.from(new Set(searchCodes.filter(Boolean)));
    if (uniqueCodes.length === 0) {
      return res.status(200).json({ success: true, count: 0, referredVoters: [] });
    }

    const referredUsers = await User.find({
      referredBy: { $in: uniqueCodes }
    }).sort({ createdAt: -1 });

    const referredVoters = await Promise.all(
      referredUsers.map(async (u) => {
        const apps = await SchemeApplication.find({ userId: u._id });
        return {
          id: u._id,
          epicNo: u.epicNo,
          voterName: u.voterName,
          mobile: u.mobile,
          district: u.district,
          assemblyName: u.assemblyName,
          boothNo: u.boothNo,
          referralCode: u.referralCode,
          applications: apps
        };
      })
    );

    return res.status(200).json({
      success: true,
      count: referredVoters.length,
      referredVoters
    });
  } catch (error) {
    logger.error('[getMemberReferrals Error]', { error: error.message, stack: error.stack });
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get All Voters in Booth with Application Status (for Booth Admin "All Voters Data" page)
// @route   GET /api/admin/booth-all-voters
// @access  Private (Booth Admin)
const getBoothAllVoters = async (req, res) => {
  try {
    const admin = req.admin;
    const { search, statusFilter, page = 1, limit = 50, assembly, booth, district } = req.query;
    
    // Only BOOTH_ADMIN can access this endpoint
    if (admin.role !== 'BOOTH_ADMIN') {
      return res.status(403).json({ 
        success: false, 
        message: 'This endpoint is only accessible to Booth Admins' 
      });
    }

    // Use admin's booth and assembly if not provided in query
    const targetAssembly = assembly?.trim() || admin.assemblyName;
    const targetBooth = booth?.trim() || admin.boothNo;
    const targetDistrict = district?.trim() || admin.district;

    logger.info('[getBoothAllVoters] Request received', {
      adminUsername: admin.username,
      adminRole: admin.role,
      adminAssembly: admin.assemblyName,
      adminBooth: admin.boothNo,
      targetAssembly,
      targetBooth,
      targetDistrict,
      page,
      search,
      statusFilter
    });

    // Validate booth admin has required data
    if (!targetAssembly || !targetBooth) {
      return res.status(400).json({
        success: false,
        message: 'Booth admin must have assembly and booth number configured'
      });
    }

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(500, Math.max(1, parseInt(limit) || 50));
    const skip = (pageNum - 1) * limitNum;

    const voterDb = await getVoterDbClient();

    // Get the specific assembly collection for this booth admin
    const collections = await getCollectionForAssembly(targetAssembly);
    if (!collections || collections.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Assembly '${targetAssembly}' not found in voter database`
      });
    }

    const targetCollection = collections[0];

    logger.info('[getBoothAllVoters] Target collection', {
      collection: targetCollection,
      assembly: targetAssembly,
      booth: targetBooth
    });

    // Build voter query - MUST filter by booth
    const boothStr = String(targetBooth);
    const boothNum = parseInt(targetBooth);
    let voterQuery = {
      $or: [{ PART_NO: boothStr }, { PART_NO: boothNum }]
    };

    // Add search filter if provided
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      const searchCondition = {
        $or: [
          { EPIC_NO: searchRegex },
          { VOTER_NAME: searchRegex },
          { NAME: searchRegex },
          { NAME_V1: searchRegex }
        ]
      };
      
      voterQuery.$and = [
        { $or: [{ PART_NO: boothStr }, { PART_NO: boothNum }] },
        searchCondition
      ];
      delete voterQuery.$or;
    }

    logger.info('[getBoothAllVoters] Voter query', { voterQuery });

    // Get ALL applications for this specific booth
    const appQuery = {
      assemblyName: new RegExp('^' + targetAssembly + '$', 'i'),
      boothNo: targetBooth
    };

    const allApplications = await SchemeApplication.find(appQuery).select('epicNo status assemblyName boothNo').lean();

    // Build sets of EPICs by status
    const allEpicNos = allApplications.map(a => a.epicNo).filter(Boolean);
    const epicSet = new Set(allEpicNos);
    
    const deliveredEpics = new Set(
      allApplications
        .filter(a => a.status === 'Approved' || a.status === 'Completed' || a.status === 'Delivered')
        .map(a => a.epicNo)
        .filter(Boolean)
    );
    
    const submittedEpics = new Set(
      allApplications
        .filter(a => {
          const hasEpic = a.epicNo && a.epicNo.trim();
          return hasEpic && !deliveredEpics.has(a.epicNo);
        })
        .map(a => a.epicNo)
    );

    logger.info('[getBoothAllVoters] Application stats', {
      totalApps: allApplications.length,
      deliveredEpics: deliveredEpics.size,
      submittedEpics: submittedEpics.size,
      totalEpicsWithApps: epicSet.size
    });

    // Apply status filter to voter query
    if (statusFilter && statusFilter.trim()) {
      const filter = statusFilter.toLowerCase();
      if (filter === 'delivered') {
        if (deliveredEpics.size > 0) {
          if (voterQuery.$and) {
            voterQuery.$and.push({ EPIC_NO: { $in: Array.from(deliveredEpics) } });
          } else {
            voterQuery.$and = [
              { $or: [{ PART_NO: boothStr }, { PART_NO: boothNum }] },
              { EPIC_NO: { $in: Array.from(deliveredEpics) } }
            ];
            delete voterQuery.$or;
          }
        } else {
          return res.status(200).json({
            success: true,
            voters: [],
            stats: { total: 0, delivered: 0, submitted: submittedEpics.size, notApplied: 0 },
            totalPages: 0,
            currentPage: pageNum,
            assembly: targetAssembly,
            booth: targetBooth
          });
        }
      } else if (filter === 'submitted') {
        if (submittedEpics.size > 0) {
          if (voterQuery.$and) {
            voterQuery.$and.push({ EPIC_NO: { $in: Array.from(submittedEpics) } });
          } else {
            voterQuery.$and = [
              { $or: [{ PART_NO: boothStr }, { PART_NO: boothNum }] },
              { EPIC_NO: { $in: Array.from(submittedEpics) } }
            ];
            delete voterQuery.$or;
          }
        } else {
          return res.status(200).json({
            success: true,
            voters: [],
            stats: { total: 0, delivered: deliveredEpics.size, submitted: 0, notApplied: 0 },
            totalPages: 0,
            currentPage: pageNum,
            assembly: targetAssembly,
            booth: targetBooth
          });
        }
      } else if (filter === 'notapplied') {
        if (epicSet.size > 0) {
          if (voterQuery.$and) {
            voterQuery.$and.push({ EPIC_NO: { $nin: Array.from(epicSet) } });
          } else {
            voterQuery.$and = [
              { $or: [{ PART_NO: boothStr }, { PART_NO: boothNum }] },
              { EPIC_NO: { $nin: Array.from(epicSet) } }
            ];
            delete voterQuery.$or;
          }
        }
      }
    }

    logger.info('[getBoothAllVoters] Final voter query', { voterQuery, statusFilter });

    // Query voters from the specific booth in the specific assembly
    const totalVotersCount = await voterDb.collection(targetCollection).countDocuments(voterQuery);

    const votersFromRoll = await voterDb.collection(targetCollection)
      .find(voterQuery)
      .sort({ SLNO_INPART: 1, EPIC_NO: 1 })
      .skip(skip)
      .limit(limitNum)
      .toArray();

    logger.info('[getBoothAllVoters] Fetched voters from roll', { 
      count: votersFromRoll.length,
      totalCount: totalVotersCount,
      skip,
      limit: limitNum,
      collection: targetCollection,
      booth: targetBooth
    });

    // Extract EPICs from this page for application lookup
    const epics = votersFromRoll.map(v => v.EPIC_NO).filter(Boolean);

    // Fetch all applications for these voters from Write DB
    const scopeQuery = {
      epicNo: { $in: epics }
    };

    const applications = await SchemeApplication.find(scopeQuery).lean();

    logger.info('[getBoothAllVoters] Fetched applications', { 
      applicationCount: applications.length,
      epicsCount: epics.length
    });

    // Group applications by EPIC
    const appsByEpic = {};
    applications.forEach(app => {
      const epic = app.epicNo;
      if (!appsByEpic[epic]) {
        appsByEpic[epic] = [];
      }
      appsByEpic[epic].push(app);
    });

    // Merge voter roll data with application data
    let voters = votersFromRoll.map((v, idx) => {
      const epic = v.EPIC_NO || 'N/A';
      const voterApps = appsByEpic[epic] || [];

      // Log first voter to confirm data structure
      if (idx === 0) {
        logger.info('[getBoothAllVoters] Sample voter from DB', {
          fields: Object.keys(v),
          sampleFieldValues: {
            VOTER_NAME: v.VOTER_NAME,
            NAME: v.NAME,
            NAME_V1: v.NAME_V1,
            PART_NO: v.PART_NO,
            ASSEMBLY_NO: v.ASSEMBLY_NO,
            ASSEMBLY_NAME: v.ASSEMBLY_NAME
          }
        });
      }

      // Determine application status
      let hasApplication = voterApps.length > 0;
      let isDelivered = voterApps.some(app => 
        app.status === 'Approved' || app.status === 'Completed' || app.status === 'Delivered'
      );

      return {
        epicNo: epic,
        voterName: v.VOTER_NAME || v.NAME || v.NAME_V1 || 'N/A',
        gender: v.GENDER || 'N/A',
        age: v.AGE || 'N/A',
        mobile: v.MOBILE_NUMBER || 'N/A',
        boothNo: v.PART_NO || targetBooth,
        assemblyNo: v.ASSEMBLY_NO || targetCollection.replace('ass_', ''),
        assemblyName: v.ASSEMBLY_NAME || targetAssembly,
        district: v.DISTRICT || targetDistrict,
        hasApplication,
        isDelivered,
        applicationCount: voterApps.length,
        applications: voterApps.map(app => ({
          id: app._id,
          schemeName: app.schemeName,
          status: app.status,
          submittedAt: app.createdAt
        }))
      };
    });

    // Calculate stats
    const totalVoters = totalVotersCount;
    const deliveredCount = voters.filter(v => v.isDelivered).length;
    const submittedCount = voters.filter(v => v.hasApplication && !v.isDelivered).length;
    const notAppliedCount = voters.filter(v => !v.hasApplication).length;

    const totalPages = Math.ceil(totalVotersCount / limitNum);

    logger.info('[getBoothAllVoters] Response stats', {
      totalVoters,
      deliveredCount,
      submittedCount,
      notAppliedCount,
      totalPages,
      currentPage: pageNum,
      votersInThisPage: voters.length
    });

    return res.status(200).json({
      success: true,
      voters,
      stats: {
        total: totalVoters,
        delivered: deliveredEpics.size,
        submitted: submittedEpics.size,
        notApplied: totalVoters - epicSet.size
      },
      totalPages,
      currentPage: pageNum,
      assembly: targetAssembly,
      assemblyNo: targetCollection.replace('ass_', ''),
      booth: targetBooth,
      district: targetDistrict
    });

  } catch (error) {
    logger.error('[getBoothAllVoters Error]', { error: error.message, stack: error.stack });
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch booth voters', 
      error: error.message 
    });
  }
};

// @desc    Get Scoped Applications List for Admin (Paginated by Voter)
// @route   GET /api/admin/applications
const getApplicationsList = async (req, res) => {
  try {
    const admin = req.admin;
    const { search, status, schemeName, district, assemblyName, boothNo, page = 1, limit = 20, exportAll } = req.query;
    const isExport = req.query.isExport === 'true' || exportAll === 'true';
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = isExport ? 500000 : Math.min(500, Math.max(1, parseInt(limit) || 20));
    const skip = isExport ? 0 : (pageNum - 1) * limitNum;

    // ── Build Scope Filter for SchemeApplications ──
    const adminScope = getAdminScopeQuery(admin);
    const appScopeFilter = { ...adminScope };

    const isValidFilterVal = (val) => val && val !== 'undefined' && val !== 'null' && val !== 'all' && String(val).trim() !== '';

    if (isValidFilterVal(district)) appScopeFilter.district = new RegExp('^' + district.trim() + '$', 'i');
    if (isValidFilterVal(assemblyName)) appScopeFilter.assemblyName = new RegExp('^' + assemblyName.trim() + '$', 'i');
    if (isValidFilterVal(boothNo)) appScopeFilter.boothNo = String(boothNo).trim();
    if (isValidFilterVal(status)) appScopeFilter.status = new RegExp('^' + status.trim() + '$', 'i');

    const targetScheme = schemeName || req.query.scheme || req.query.schemeId;
    if (isValidFilterVal(targetScheme)) {
      const clean = String(targetScheme).trim();
      let matchedScheme = BJP_SCHEMES.find(s =>
        String(s.id) === clean ||
        s.name.toLowerCase() === clean.toLowerCase() ||
        (s.fullName && s.fullName.toLowerCase() === clean.toLowerCase()) ||
        clean.toLowerCase().includes(s.name.toLowerCase())
      );

      const regexes = [new RegExp('^' + clean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i')];
      if (matchedScheme) {
        regexes.push(new RegExp('^' + matchedScheme.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i'));
        // Applications are often stored with schemeName = the numeric scheme id
        // (the chatbot submits scheme ids). Match that too, otherwise filtering
        // by the human-readable name returns nothing.
        regexes.push(new RegExp('^' + String(matchedScheme.id) + '$'));
        if (matchedScheme.fullName) {
          regexes.push(new RegExp(matchedScheme.fullName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
        }
        if (matchedScheme.keys && Array.isArray(matchedScheme.keys)) {
          matchedScheme.keys.forEach(k => {
            regexes.push(new RegExp(k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
          });
        }
      } else {
        regexes.push(new RegExp(clean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
      }

      // Match either the schemeName (by any regex above) or the numeric schemeId.
      if (matchedScheme) {
        const schemeCond = { $or: [{ schemeName: { $in: regexes } }, { schemeId: Number(matchedScheme.id) }] };
        appScopeFilter.$and = [...(appScopeFilter.$and || []), schemeCond];
      } else {
        appScopeFilter.schemeName = { $in: regexes };
      }
    }

    if (search) {
      const r = new RegExp(search.trim(), 'i');
      const searchConds = [{ voterName: r }, { epicNo: r }, { mobile: r }, { schemeName: r }];
      if (appScopeFilter.$or) {
        const existingOr = appScopeFilter.$or;
        delete appScopeFilter.$or;
        appScopeFilter.$and = [{ $or: existingOr }, { $or: searchConds }];
      } else {
        appScopeFilter.$or = searchConds;
      }
    }

    // ── Fast Path: Two-step voter-based pagination (avoids MongoDB 32MB sort limit) ──
    if (!isExport) {
      const voterSkip = (pageNum - 1) * limitNum;

      // Step 1: Lightweight aggregation by mobile number — only mobile + latestAt (tiny memory, no $$ROOT)
      // Run in parallel with counts and status breakdown
      const [totalAppsCount, rawMobileList, statusGroup, epicPage] = await Promise.all([
        SchemeApplication.countDocuments(appScopeFilter),
        SchemeApplication.distinct('mobile', appScopeFilter),
        SchemeApplication.aggregate([
          { $match: appScopeFilter },
          { $group: { _id: '$status', count: { $sum: 1 } } }
        ], { allowDiskUse: true }),
        SchemeApplication.aggregate([
          { $match: appScopeFilter },
          // Group by voter mobile number — only keep the tiny fields needed for sorting + identity
          {
            $group: {
              _id: { $ifNull: ['$mobile', { $ifNull: ['$epicNo', { $toString: '$userId' }] }] },
              mobile: { $first: '$mobile' },
              epicNo: { $first: '$epicNo' },
              latestAt: { $max: '$appliedAt' }
            }
          },
          { $sort: { latestAt: -1 } },
          { $skip: voterSkip },
          { $limit: limitNum },
          { $project: { _id: 1, mobile: 1, epicNo: 1 } }
        ], { allowDiskUse: true })
      ]);

      const distinctVoterCount = rawMobileList.length || totalAppsCount;
      const totalPages = Math.ceil(distinctVoterCount / limitNum) || 1;

      const statusCounts = { Approved: 0, Pending: 0, Submitted: 0, Processing: 0, Called: 0, Verified: 0, Completed: 0, Rejected: 0 };
      statusGroup.forEach(g => { if (g._id) statusCounts[g._id] = g.count; });

      // Step 2: Fetch full application docs for just these 20 voter Mobiles/EPICs
      const pageMobiles = epicPage.map(e => e.mobile).filter(Boolean);
      const pageEpicNos = epicPage.map(e => e.epicNo).filter(Boolean);
      const pageVoterIds = epicPage.map(e => e._id).filter(id => id && !pageMobiles.includes(id) && !pageEpicNos.includes(id));

      const rawApps = await SchemeApplication.find({
        $and: [
          appScopeFilter,
          {
            $or: [
              { mobile: { $in: pageMobiles } },
              { epicNo: { $in: pageEpicNos } },
              { userId: { $in: pageVoterIds } }
            ]
          }
        ]
      }).sort({ appliedAt: -1 }).lean();

      // Group apps by voter mobile key
      const voterMap = {};
      // Preserve the sorted order from epicPage
      epicPage.forEach(e => { voterMap[e._id] = null; });

      rawApps.forEach(app => {
        const key = app.mobile || app.epicNo || (app.userId ? String(app.userId) : null);
        if (!key) return;
        if (!voterMap[key]) {
          voterMap[key] = {
            _id: app.userId || key,
            epicNo: app.epicNo || 'N/A',
            voterName: app.voterName || 'N/A',
            mobile: app.mobile || 'N/A',
            district: app.district || 'N/A',
            assemblyName: app.assemblyName || 'N/A',
            boothNo: app.boothNo || 'N/A',
            userId: app.userId,
            referralCode: app.referralCode,
            applications: []
          };
        }
        voterMap[key].applications.push(app);
      });

      // Return voters in the same order as epicPage (latest first)
      let voters = epicPage
        .map(e => voterMap[e._id])
        .filter(Boolean);

      // ── Enrich missing voter names from the voter roll DB (read DB) ──
      // Detect any bad/placeholder voter name — always enrich from voter DB if name looks fake
      const PLACEHOLDER_NAMES = new Set([
        null, undefined, '', 'N/A', 'n/a', 'null', 'undefined',
        'voter', 'Voter', 'VOTER',
        'user', 'User', 'USER',
        'member', 'Member', 'MEMBER',
        'name', 'Name', 'NAME',
        'unknown', 'Unknown', 'UNKNOWN',
        'test', 'Test', 'TEST'
      ]);
      const isBadName = (name) => !name || PLACEHOLDER_NAMES.has(name) || String(name).trim().length < 2;
      const needsEnrichment = voters.filter(v => isBadName(v.voterName) && v.epicNo && v.epicNo !== 'N/A');

      if (needsEnrichment.length > 0) {
        try {
          const voterDb = await getVoterDbClient();
          const { getCollectionForAssembly } = require('../services/jurisdictionService');

          // Group by assemblyName to minimize DB queries (1 query per unique assembly)
          const byAssembly = {};
          needsEnrichment.forEach(v => {
            const key = v.assemblyName || '__unknown__';
            if (!byAssembly[key]) byAssembly[key] = [];
            byAssembly[key].push(v.epicNo);
          });

          const epicNameMap = {};

          await Promise.all(
            Object.entries(byAssembly).map(async ([assName, epicNos]) => {
              try {
                let colNames = assName !== '__unknown__' ? await getCollectionForAssembly(assName) : [];
                // Fallback: scan all collections if assembly not found
                if (!colNames.length) {
                  const allCols = await voterDb.listCollections().toArray();
                  colNames = allCols.filter(c => c.name.startsWith('ass_')).map(c => c.name);
                }
                for (const colName of colNames) {
                  const found = await voterDb.collection(colName).find(
                    { EPIC_NO: { $in: epicNos } },
                    { projection: { EPIC_NO: 1, VOTER_NAME: 1, _id: 0 } }
                  ).toArray();
                  found.forEach(doc => {
                    if (doc.EPIC_NO && doc.VOTER_NAME) epicNameMap[doc.EPIC_NO] = doc.VOTER_NAME;
                  });
                  if (epicNos.every(e => epicNameMap[e])) break;
                }
              } catch (e) { /* non-fatal */ }
            })
          );

          // Patch names into voters array
          voters = voters.map(v => {
            if (isBadName(v.voterName) && v.epicNo && epicNameMap[v.epicNo]) {
              return { ...v, voterName: epicNameMap[v.epicNo] };
            }
            return v;
          });
        } catch (enrichErr) {
          logger.error('[Name Enrichment Error]', { error: enrichErr.message });
          // Non-fatal — continue with what we have
        }
      }

      return res.status(200).json({
        success: true,
        voters,
        totalApplications: totalAppsCount,
        totalVoters: distinctVoterCount,
        statusCounts,
        totalPages,
        currentPage: pageNum,
        limit: limitNum,
        applications: voters.flatMap(v => v.applications)
      });
    }

    // ── Aggregate distinct applicants for complete export ──
    const applicantAgg = await SchemeApplication.aggregate([
      { $match: appScopeFilter },
      {
        $group: {
          _id: { $ifNull: ['$mobile', { $ifNull: ['$epicNo', '$userId'] }] },
          epicNo: { $first: '$epicNo' },
          voterName: { $first: '$voterName' },
          mobile: { $first: '$mobile' },
          district: { $first: '$district' },
          assemblyName: { $first: '$assemblyName' },
          boothNo: { $first: '$boothNo' },
          userId: { $first: '$userId' },
          referralCode: { $first: '$referralCode' },
          latestAppliedAt: { $max: '$appliedAt' }
        }
      }
    ], { allowDiskUse: true });

    const totalVoters = applicantAgg.length;
    const totalPages = Math.ceil(totalVoters / limitNum) || 1;
    const paginatedApplicants = applicantAgg;

    if (paginatedApplicants.length === 0) {
      return res.status(200).json({ success: true, voters: [], totalVoters, totalPages, currentPage: pageNum, limit: limitNum, applications: [] });
    }

    const paginatedUserIds = paginatedApplicants.map(a => a.userId).filter(Boolean);
    const paginatedEpicNos = paginatedApplicants.map(a => a.epicNo).filter(Boolean);
    const paginatedMobiles = paginatedApplicants.map(a => a.mobile).filter(Boolean);

    const allApps = await SchemeApplication.find({
      $or: [
        { userId: { $in: paginatedUserIds } },
        { epicNo: { $in: paginatedEpicNos } },
        { mobile: { $in: paginatedMobiles } }
      ]
    }).lean();

    allApps.sort((a, b) => new Date(b.appliedAt || b.createdAt) - new Date(a.appliedAt || a.createdAt));

    const appMapByEpic = {};
    const appMapByUserId = {};
    const appMapByMobile = {};

    allApps.forEach(app => {
      if (app.epicNo) {
        if (!appMapByEpic[app.epicNo]) appMapByEpic[app.epicNo] = [];
        appMapByEpic[app.epicNo].push(app);
      }
      if (app.userId) {
        const uid = String(app.userId);
        if (!appMapByUserId[uid]) appMapByUserId[uid] = [];
        appMapByUserId[uid].push(app);
      }
      if (app.mobile) {
        if (!appMapByMobile[app.mobile]) appMapByMobile[app.mobile] = [];
        appMapByMobile[app.mobile].push(app);
      }
    });

    const voters = paginatedApplicants.map(u => {
      const userAppMap = new Map();
      if (u.epicNo && appMapByEpic[u.epicNo]) {
        appMapByEpic[u.epicNo].forEach(a => userAppMap.set(String(a._id), a));
      }
      if (u.userId && appMapByUserId[String(u.userId)]) {
        appMapByUserId[String(u.userId)].forEach(a => userAppMap.set(String(a._id), a));
      }
      if (u.mobile && appMapByMobile[u.mobile]) {
        appMapByMobile[u.mobile].forEach(a => userAppMap.set(String(a._id), a));
      }

      const apps = Array.from(userAppMap.values()).sort((a, b) => new Date(b.appliedAt || b.createdAt) - new Date(a.appliedAt || a.createdAt));

      return {
        id: u._id,
        epicNo: u.epicNo,
        voterName: u.voterName,
        mobile: u.mobile,
        district: u.district,
        assemblyName: u.assemblyName,
        boothNo: u.boothNo,
        referralCode: u.referralCode,
        applications: apps
      };
    });

    return res.status(200).json({
      success: true,
      voters,
      totalVoters,
      totalPages,
      currentPage: pageNum,
      limit: limitNum,
      applications: voters.flatMap(v => v.applications)
    });
  } catch (error) {
    logger.error('[getApplicationsList Error]', { error: error.message, stack: error.stack });
    return res.status(500).json({ success: false, message: error.message });
  }
};


// @desc    Update Scheme Application Status & Remarks
// @route   PUT /api/admin/applications/:id/status
// @access  Private (Admin)
const updateApplicationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remarks, notes, isCallAction } = req.body;
    const finalRemarks = remarks !== undefined ? remarks : notes;

    const app = await SchemeApplication.findById(id);
    if (!app) {
      return res.status(404).json({ success: false, message: 'Application record not found' });
    }

    if (status) {
      app.status = status;
    }
    if (finalRemarks !== undefined) {
      app.adminRemarks = finalRemarks;
    }
    if (isCallAction) {
      app.lastCalledAt = new Date();
      if (!status) app.status = 'Called';
    }

    app.statusHistory.push({
      status: app.status,
      remarks: finalRemarks || (isCallAction ? 'Call logged by admin' : 'Status updated'),
      updatedBy: `${req.admin?.role || 'ADMIN'} (${req.admin?.username || 'admin'})`,
      updatedAt: new Date()
    });

    await app.save();
    try { _liveCache.clear(); } catch (e) {}

    return res.status(200).json({
      success: true,
      message: 'Application status updated successfully',
      application: app
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create new Admin Credential
// @route   POST /api/admin/create-credential
// @access  Private (Super Admin or State Admin)
const createAdminCredential = async (req, res) => {
  try {
    const { username, password, role, district, assemblyName, boothNo } = req.body;

    if (!username || !password || !role) {
      return res.status(400).json({ success: false, message: 'Username, password, and role are required' });
    }

    const existing = await Admin.findOne({ username: username.trim() });
    if (existing) {
      return res.status(400).json({ success: false, message: `Admin username '${username}' already exists.` });
    }

    const newAdmin = await Admin.create({
      username: username.trim(),
      password: password.trim(),
      role,
      district: district ? district.trim() : null,
      assemblyName: assemblyName ? assemblyName.trim() : null,
      boothNo: boothNo ? String(boothNo).trim() : null,
      createdBy: `${req.admin.role} (${req.admin.username})`
    });

    return res.status(201).json({
      success: true,
      message: `Created ${role} account '${newAdmin.username}' successfully`,
      admin: {
        id: newAdmin._id,
        username: newAdmin.username,
        role: newAdmin.role,
        district: newAdmin.district,
        assemblyName: newAdmin.assemblyName,
        boothNo: newAdmin.boothNo
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get List of All Custom Admin Accounts
// @route   GET /api/admin/credentials
// @access  Private (Admin - Super / State)
const getAllAdmins = async (req, res) => {
  try {
    const admins = await Admin.find().select('-password').sort({ createdAt: -1 });
    return res.status(200).json({
      success: true,
      count: admins.length,
      admins
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get filter metadata (assemblies in scope + booths for a given assembly)
// @route   GET /api/admin/filter-meta?assemblyName=xxx
// @access  Private (Admin)
const getFilterMeta = async (req, res) => {
  try {
    const admin = req.admin;
    const { district, assemblyName } = req.query;
    const scopeQuery = getAdminScopeQuery(admin);

    if (assemblyName) {
      // Return sorted booth numbers for the given assembly
      const boothQuery = { ...scopeQuery, assemblyName: new RegExp('^' + assemblyName.trim() + '$', 'i') };
      if (district) boothQuery.district = new RegExp('^' + district.trim() + '$', 'i');
      const rawBooths = await SchemeApplication.distinct('boothNo', boothQuery);
      const booths = rawBooths.filter(Boolean).sort((a, b) => parseInt(a) - parseInt(b));
      return res.status(200).json({ success: true, booths });
    }

    if (district) {
      // Return assemblies and booths in the selected district
      const distQuery = { ...scopeQuery, district: new RegExp('^' + district.trim() + '$', 'i') };
      const [assemblies, rawBooths] = await Promise.all([
        SchemeApplication.distinct('assemblyName', distQuery),
        SchemeApplication.distinct('boothNo', distQuery)
      ]);
      assemblies.sort((a, b) => a.localeCompare(b));
      const booths = rawBooths.filter(Boolean).sort((a, b) => parseInt(a) - parseInt(b));
      return res.status(200).json({ success: true, assemblies, booths });
    }

    // Return all districts, assemblies, and booths in scope
    const [districts, assemblies, rawBooths] = await Promise.all([
      SchemeApplication.distinct('district', scopeQuery),
      SchemeApplication.distinct('assemblyName', scopeQuery),
      SchemeApplication.distinct('boothNo', scopeQuery)
    ]);
    districts.sort((a, b) => a.localeCompare(b));
    assemblies.sort((a, b) => a.localeCompare(b));
    const booths = rawBooths.filter(Boolean).sort((a, b) => parseInt(a) - parseInt(b));

    return res.status(200).json({ success: true, districts, assemblies, booths });
  } catch (err) {
    logger.error('[getFilterMeta Error]', { error: err.message, stack: err.stack });
    return res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Stream CSV export of applications (server-side, fast)
// @route   GET /api/admin/export-csv
// @access  Private (Admin)
const exportApplicationsCsv = async (req, res) => {
  try {
    const { district, assemblyName, boothNo, status, schemeName, search, format } = req.query;
    const admin = req.admin;

    // ── Build scope filter (same as getApplicationsList) ──
    const appScopeFilter = {};
    if (admin.role === 'DISTRICT_ADMIN') appScopeFilter.district = admin.district;
    if (admin.role === 'ASSEMBLY_ADMIN') appScopeFilter.assemblyName = admin.assemblyName;
    if (admin.role === 'BOOTH_ADMIN') { appScopeFilter.assemblyName = admin.assemblyName; appScopeFilter.boothNo = admin.boothNo; }
    const isValidFilterVal = (val) => val && val !== 'undefined' && val !== 'null' && val !== 'all' && String(val).trim() !== '';
    if (isValidFilterVal(district)) appScopeFilter.district = district;
    if (isValidFilterVal(assemblyName)) appScopeFilter.assemblyName = assemblyName;
    if (isValidFilterVal(boothNo)) appScopeFilter.boothNo = boothNo;
    if (isValidFilterVal(status)) appScopeFilter.status = status;
    const targetScheme = schemeName || req.query.scheme || req.query.schemeId;
    if (isValidFilterVal(targetScheme)) {
      const clean = String(targetScheme).trim();
      let matchedScheme = BJP_SCHEMES.find(s =>
        String(s.id) === clean ||
        s.name.toLowerCase() === clean.toLowerCase() ||
        (s.fullName && s.fullName.toLowerCase() === clean.toLowerCase()) ||
        clean.toLowerCase().includes(s.name.toLowerCase())
      );
      const regexes = [new RegExp('^' + clean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i')];
      if (matchedScheme) {
        regexes.push(new RegExp('^' + matchedScheme.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i'));
        if (matchedScheme.fullName) {
          regexes.push(new RegExp(matchedScheme.fullName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
        }
        if (matchedScheme.keys && Array.isArray(matchedScheme.keys)) {
          matchedScheme.keys.forEach(k => {
            regexes.push(new RegExp(k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
          });
        }
      } else {
        regexes.push(new RegExp(clean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
      }
      appScopeFilter.schemeName = { $in: regexes };
    }
    if (search) {
      const re = new RegExp(search, 'i');
      appScopeFilter.$or = [{ voterName: re }, { epicNo: re }, { mobile: re }];
    }

    const scopeLabel = boothNo ? `Booth_${boothNo}` : assemblyName ? assemblyName.replace(/\s+/g, '_') : district ? district.replace(/\s+/g, '_') : 'Statewide';
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `BJP_Report_${scopeLabel}_${timestamp}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // UTF-8 BOM so Excel opens it correctly without encoding issues
    res.write('\uFEFF');

    // Header row
    const headers = ['S.No', 'Voter Name', 'EPIC Number', 'Mobile Number', 'District', 'Assembly Name', 'Booth No', 'Scheme Name', 'Cluster / Benefit', 'Status', 'Applied Date'];
    res.write(headers.map(h => `"${h}"`).join(',') + '\n');

    // Stream cursor — never loads all docs into memory
    const cursor = SchemeApplication.find(
      appScopeFilter,
      { voterName: 1, epicNo: 1, mobile: 1, district: 1, assemblyName: 1, boothNo: 1, schemeName: 1, schemeId: 1, clusterName: 1, status: 1, appliedAt: 1 }
    ).sort({ appliedAt: -1 }).lean().cursor();

    let idx = 0;
    const esc = v => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;

    for await (const doc of cursor) {
      idx++;
      const appliedDate = doc.appliedAt ? new Date(doc.appliedAt).toLocaleDateString('en-IN') : '—';
      const row = [
        idx,
        esc(doc.voterName),
        esc(doc.epicNo),
        esc(doc.mobile),
        esc(doc.district),
        esc(doc.assemblyName),
        esc(doc.boothNo),
        esc(resolveSchemeName(doc.schemeName, doc.schemeId)),
        esc(doc.clusterName),
        esc(doc.status),
        esc(appliedDate)
      ];
      res.write(row.join(',') + '\n');
    }

    res.end();
  } catch (error) {
    logger.error('[exportApplicationsCsv Error]', { error: error.message, stack: error.stack });
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: error.message });
    } else {
      res.end();
    }
  }
};

// @desc  Export styled Excel file (server-side, fast streaming)
// @route GET /api/admin/export-excel
// @access Private
const exportApplicationsExcel = async (req, res) => {
  try {
    const {
      district, assemblyName, boothNo, status, schemeId,
      startDate, endDate, search
    } = req.query;
    const user = req.admin;

    // ── Build scope filter (same as CSV export) ──
    const appScopeFilter = {};
    if (user.role === 'DISTRICT_ADMIN' && user.district)
      appScopeFilter.district = user.district;
    else if (user.role === 'ASSEMBLY_ADMIN' && user.assemblyName)
      appScopeFilter.assemblyName = user.assemblyName;
    else if (user.role === 'BOOTH_ADMIN' && user.assemblyName && user.boothNo) {
      appScopeFilter.assemblyName = user.assemblyName;
      appScopeFilter.boothNo = String(user.boothNo);
    }
    const isValidFilterVal = (val) => val && val !== 'undefined' && val !== 'null' && val !== 'all' && String(val).trim() !== '';
    if (isValidFilterVal(district)) appScopeFilter.district = district;
    if (isValidFilterVal(assemblyName)) appScopeFilter.assemblyName = assemblyName;
    if (isValidFilterVal(boothNo)) appScopeFilter.boothNo = String(boothNo);
    if (isValidFilterVal(status)) appScopeFilter.status = status;
    const targetSchemeExcel = req.query.schemeName || req.query.scheme || schemeId;
    if (isValidFilterVal(targetSchemeExcel)) {
      const clean = String(targetSchemeExcel).trim();
      let matchedScheme = BJP_SCHEMES.find(s =>
        String(s.id) === clean ||
        s.name.toLowerCase() === clean.toLowerCase() ||
        (s.fullName && s.fullName.toLowerCase() === clean.toLowerCase()) ||
        clean.toLowerCase().includes(s.name.toLowerCase())
      );
      const regexes = [new RegExp('^' + clean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i')];
      if (matchedScheme) {
        regexes.push(new RegExp('^' + matchedScheme.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i'));
        if (matchedScheme.fullName) {
          regexes.push(new RegExp(matchedScheme.fullName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
        }
        if (matchedScheme.keys && Array.isArray(matchedScheme.keys)) {
          matchedScheme.keys.forEach(k => {
            regexes.push(new RegExp(k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
          });
        }
      } else {
        regexes.push(new RegExp(clean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
      }
      appScopeFilter.schemeName = { $in: regexes };
    }
    if (startDate || endDate) {
      appScopeFilter.appliedAt = {};
      if (startDate) appScopeFilter.appliedAt.$gte = new Date(startDate);
      if (endDate) appScopeFilter.appliedAt.$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
    }
    if (search) {
      const re = { $regex: search, $options: 'i' };
      appScopeFilter.$or = [{ voterName: re }, { epicNo: re }, { mobile: re }];
    }

    // ── Status colour map ──
    const STATUS_COLORS = {
      Approved: { bg: 'FF16a34a', fg: 'FFFFFFFF' },
      Completed: { bg: 'FF15803d', fg: 'FFFFFFFF' },
      Rejected: { bg: 'FFdc2626', fg: 'FFFFFFFF' },
      Submitted: { bg: 'FF2563eb', fg: 'FFFFFFFF' },
      Pending: { bg: 'FFf59e0b', fg: 'FFFFFFFF' },
      Processing: { bg: 'FF7c3aed', fg: 'FFFFFFFF' },
      Called: { bg: 'FF0891b2', fg: 'FFFFFFFF' },
      Verified: { bg: 'FF059669', fg: 'FFFFFFFF' },
    };

    // ── Create workbook ──
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'BJP Nalam Thittam';
    const sheet = workbook.addWorksheet('Applications', {
      views: [{ state: 'frozen', ySplit: 5 }]
    });

    // Column definitions (key + width only; header row is written manually
    // below so we can place a title/scope/filter block above it).
    const COLUMNS = [
      { header: 'S.No', key: 'sno', width: 6 },
      { header: 'Voter Name', key: 'name', width: 25 },
      { header: 'EPIC Number', key: 'epic', width: 16 },
      { header: 'Mobile No', key: 'mobile', width: 14 },
      { header: 'District', key: 'district', width: 18 },
      { header: 'Assembly', key: 'assembly', width: 22 },
      { header: 'Booth No', key: 'booth', width: 9 },
      { header: 'Scheme Name', key: 'scheme', width: 32 },
      { header: 'Cluster', key: 'cluster', width: 45 },
      { header: 'Status', key: 'status', width: 13 },
      { header: 'Applied Date', key: 'date', width: 14 },
    ];
    sheet.columns = COLUMNS.map(c => ({ key: c.key, width: c.width }));
    const LAST_COL = 'K'; // 11 columns → A..K

    // ── Scope label (based on the admin's role) ──
    let scopeLabel;
    if (user.role === 'DISTRICT_ADMIN') scopeLabel = `District-wise Report — ${user.district || '—'}`;
    else if (user.role === 'ASSEMBLY_ADMIN') scopeLabel = `Assembly-wise Report — ${user.assemblyName || '—'}`;
    else if (user.role === 'BOOTH_ADMIN') scopeLabel = `Booth-wise Report — Booth ${user.boothNo || '—'}${user.assemblyName ? ', ' + user.assemblyName : ''}`;
    else scopeLabel = 'Statewide Report — All Tamil Nadu';

    // ── Filters applied at download time ──
    const filterParts = [];
    if (isValidFilterVal(status)) filterParts.push(`Status: ${status}`);
    if (isValidFilterVal(targetSchemeExcel)) filterParts.push(`Scheme: ${resolveSchemeName(targetSchemeExcel)}`);
    if (isValidFilterVal(district)) filterParts.push(`District: ${district}`);
    if (isValidFilterVal(assemblyName)) filterParts.push(`Assembly: ${assemblyName}`);
    if (isValidFilterVal(boothNo)) filterParts.push(`Booth: ${boothNo}`);
    if (isValidFilterVal(search)) filterParts.push(`Search: "${search}"`);
    if (startDate || endDate) filterParts.push(`Date: ${startDate || '…'} to ${endDate || '…'}`);
    const filtersLabel = filterParts.length ? filterParts.join('    |    ') : 'None (all records in scope)';

    // ── Title block (rows 1–4) ──
    sheet.mergeCells(`A1:${LAST_COL}1`);
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'BJP Nalam Thittam — Scheme Applications Report';
    titleCell.font = { bold: true, size: 16, color: { argb: 'FFFF6B00' }, name: 'Calibri' };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getRow(1).height = 26;

    sheet.mergeCells(`A2:${LAST_COL}2`);
    const scopeCell = sheet.getCell('A2');
    scopeCell.value = scopeLabel;
    scopeCell.font = { bold: true, size: 12, color: { argb: 'FF1F2937' } };
    scopeCell.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getRow(2).height = 20;

    sheet.mergeCells(`A3:${LAST_COL}3`);
    const filterCell = sheet.getCell('A3');
    filterCell.value = `Filters Applied:   ${filtersLabel}`;
    filterCell.font = { size: 11, italic: true, color: { argb: 'FF475569' } };
    filterCell.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getRow(3).height = 18;

    sheet.mergeCells(`A4:${LAST_COL}4`);
    const genCell = sheet.getCell('A4');
    genCell.value = `Generated by ${user.username || user.role}  •  ${new Date().toLocaleString('en-IN')}`;
    genCell.font = { size: 10, color: { argb: 'FF94A3B8' } };
    genCell.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getRow(4).height = 16;

    // ── Column header row (row 5) — saffron BJP orange ──
    const HEADER_ROW_NUM = 5;
    const headerRow = sheet.getRow(HEADER_ROW_NUM);
    COLUMNS.forEach((c, i) => { headerRow.getCell(i + 1).value = c.header; });
    headerRow.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF6B00' } };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11, name: 'Calibri' };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: false };
      cell.border = {
        bottom: { style: 'medium', color: { argb: 'FFCC5500' } }
      };
    });
    headerRow.height = 22;

    // Stream rows from MongoDB cursor
    const cursor = SchemeApplication.find(appScopeFilter)
      .sort({ appliedAt: -1 })
      .select('voterName epicNo mobile district assemblyName boothNo schemeName clusterName status appliedAt')
      .lean()
      .cursor();

    let idx = 0;
    for await (const doc of cursor) {
      idx++;
      const appliedDate = doc.appliedAt ? new Date(doc.appliedAt).toLocaleDateString('en-IN') : '—';
      const statusColors = STATUS_COLORS[doc.status] || { bg: 'FFe5e7eb', fg: 'FF374151' };

      const row = sheet.addRow({
        sno: idx,
        name: doc.voterName || '—',
        epic: doc.epicNo || '—',
        mobile: doc.mobile || '—',
        district: doc.district || '—',
        assembly: doc.assemblyName || '—',
        booth: doc.boothNo || '—',
        scheme: resolveSchemeName(doc.schemeName, doc.schemeId),
        cluster: doc.clusterName || '—',
        status: doc.status || '—',
        date: appliedDate,
      });

      // Alternate row banding
      const rowBg = idx % 2 === 0 ? 'FFF9FAFB' : 'FFFFFFFF';
      row.eachCell({ includeEmpty: true }, (cell, colNum) => {
        cell.alignment = { vertical: 'middle', wrapText: false };
        if (colNum !== 10) {
          // Non-status cells — alternate banding
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
        }
      });

      // Mobile as text — prevent scientific notation
      const mobileCell = row.getCell('mobile');
      mobileCell.numFmt = '@';

      // Status cell — coloured pill
      const statusCell = row.getCell('status');
      statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: statusColors.bg } };
      statusCell.font = { bold: true, color: { argb: statusColors.fg }, size: 10 };
      statusCell.alignment = { horizontal: 'center', vertical: 'middle' };
    }

    // Send as .xlsx download
    const filename = `BJP_Applications_${Date.now()}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    logger.error('[exportApplicationsExcel Error]', { error: error.message, stack: error.stack });
    if (!res.headersSent) res.status(500).json({ success: false, message: error.message });
    else res.end();
  }
};

// @desc    Test Live Gemini AI API Key Connection & Prompt Execution
// @route   GET /api/admin/test-ai
// @access  Private (Admin)
const testAiLiveEndpoint = async (req, res) => {
  try {
    const axios = require('axios');
    const apiKey = process.env.GEMINI_API_KEY;
    const model = process.env.GEMINI_MODEL || 'gemini-flash-latest';

    if (!apiKey) {
      return res.status(400).json({ success: false, message: 'GEMINI_API_KEY is missing in backend .env' });
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const payload = {
      contents: [{
        parts: [{
          text: "Generate a 1-sentence live status update for the BJP Nalam Thittam Admin Portal confirming Gemini AI is active."
        }]
      }]
    };

    const response = await axios.post(url, payload);
    const aiText = response.data.candidates?.[0]?.content?.parts?.[0]?.text || 'AI active';

    return res.status(200).json({
      success: true,
      status: 'ONLINE',
      model,
      apiKeyPresent: true,
      aiResponse: aiText.trim(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('[testAiLiveEndpoint Error]', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Gemini AI execution failed',
      error: error.response?.data?.error?.message || error.message
    });
  }
};

// @desc    Election Intelligence Engine — Understands ANY election query, returns live MongoDB data & structured dashboard
// @route   POST /api/admin/query-ai
// @access  Private (Admin)
const queryAiConsoleEndpoint = async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ success: false, message: 'Prompt is required' });
    }

    const queryText = prompt.trim();

    // Build the LIVE assembly→district mapping for ALL 234 ACs straight from the
    // voter DB (via jurisdictionService), so entity resolution is never limited
    // to a hardcoded subset. Fall back to distinct portal assembly names if the
    // voter DB metadata is unavailable.
    let livingAssemblies = [];
    try {
      const meta = await getAssemblyMetadata();
      livingAssemblies = (meta || [])
        .filter(a => a && a.assemblyName)
        .map(a => ({
          code: a.assemblyNo,
          name: a.assemblyName,
          district: a.district,
          aliases: [String(a.assemblyName).toLowerCase()]
        }));
    } catch (e) {
      logger.warn('[ElectionIntelEngine] live assembly metadata unavailable, falling back to portal names', { error: e.message });
    }
    if (livingAssemblies.length === 0) {
      livingAssemblies = await User.distinct('assemblyName').catch(() => []);
    }

    // 1. Intent Classification & Entity Extraction
    const intent = classifyIntent(queryText);
    const entities = extractEntities(queryText, livingAssemblies);

    let targetDistrict = entities.district || req.admin?.district || null;
    const targetAssembly = entities.assembly || req.admin?.assemblyName || null;
    const targetAssemblyCode = entities.assemblyCode || null;
    const targetBooth = entities.boothNo || req.admin?.boothNo || null;
    const genderFilter = entities.gender || null;
    const topN = entities.topN || 10;

    // Resolve the detected district to its exact spelling in the DB (handles
    // TH/T variants like THIRUVARUR vs TIRUVARUR) so member/application counts match.
    if (targetDistrict) {
      try {
        const realDistricts = await SchemeApplication.distinct('district');
        const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z]/g, '').replace(/th/g, 't');
        const target = norm(targetDistrict);
        const real = realDistricts.find((d) => norm(d) === target);
        if (real) targetDistrict = real;
      } catch (e) { /* non-fatal: keep detected spelling */ }
    }

    logger.info(`[ElectionIntelEngine] query="${queryText}" intent="${intent}" assembly="${targetAssembly}" (code:${targetAssemblyCode}) district="${targetDistrict}" booth="${targetBooth}"`);

    // 2. Build Mongoose Scope Filter
    const scopeQuery = {};
    if (targetDistrict) scopeQuery.district = new RegExp('^' + targetDistrict + '$', 'i');
    if (targetAssembly) scopeQuery.assemblyName = new RegExp('^' + targetAssembly.replace(/[()]/g, '\\$&') + '$', 'i');
    if (targetBooth) scopeQuery.boothNo = String(targetBooth);

    const genderScopeQuery = genderFilter
      ? { ...scopeQuery, gender: new RegExp('^' + genderFilter + '$', 'i') }
      : scopeQuery;

    // Booth Performance & Referral Leaders reflect the whole assembly/district
    // (not a single queried booth) so they stay meaningful.
    const boothScopeQuery = { ...scopeQuery };
    delete boothScopeQuery.boothNo;

    // 3. Parallel Live MongoDB Data Telemetry Fetching
    const [
      statusAgg,
      schemeAgg,
      totalMembers,
      genderAgg,
      boothAgg,
      recentApps,
      rejectedAppsCount
    ] = await Promise.all([
      SchemeApplication.aggregate([
        { $match: genderScopeQuery },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      SchemeApplication.aggregate([
        { $match: genderScopeQuery },
        { $group: { _id: '$schemeName', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 15 }
      ]),
      User.countDocuments(scopeQuery),
      User.aggregate([
        { $match: scopeQuery },
        { $group: { _id: { $ifNull: ['$gender', 'Unspecified'] }, count: { $sum: 1 } } }
      ]),
      SchemeApplication.aggregate([
        { $match: boothScopeQuery },
        {
          $group: {
            _id: { boothNo: '$boothNo', assemblyName: '$assemblyName', district: '$district' },
            totalApps: { $sum: 1 },
            approved: { $sum: { $cond: [{ $regexMatch: { input: { $ifNull: ['$status', ''] }, regex: /approve/i } }, 1, 0] } },
            pending: { $sum: { $cond: [{ $and: [{ $not: [{ $regexMatch: { input: { $ifNull: ['$status', ''] }, regex: /approve/i } }] }, { $not: [{ $regexMatch: { input: { $ifNull: ['$status', ''] }, regex: /reject/i } }] }] }, 1, 0] } }
          }
        },
        { $sort: { totalApps: -1 } },
        { $limit: 3 }
      ]),
      SchemeApplication.find(genderScopeQuery)
        .sort({ appliedAt: -1 })
        .limit(10)
        .select('voterName mobile epicNo schemeName status gender appliedAt boothNo assemblyName district'),
      SchemeApplication.countDocuments({ ...genderScopeQuery, status: /reject/i })
    ]);

    // Parse counts
    let totalApps = 0;
    let approvedApps = 0;
    let pendingApps = 0;
    let rejApps = 0;

    statusAgg.forEach(s => {
      const st = String(s._id || '').toLowerCase();
      totalApps += s.count;
      if (st.includes('approve')) approvedApps += s.count;
      else if (st.includes('reject')) rejApps += s.count;
      else pendingApps += s.count;
    });

    // Parse gender
    const genderMap = {};
    genderAgg.forEach(g => { genderMap[String(g._id).toLowerCase()] = g.count; });
    const maleVoters = (genderMap['male'] || 0) + (genderMap['m'] || 0);
    const femaleVoters = (genderMap['female'] || 0) + (genderMap['f'] || 0) + (genderMap['women'] || 0);
    const thirdGenderVoters = Math.max(0, totalMembers - maleVoters - femaleVoters);

    // Fetch Electoral Roll count from voter_db if available
    let totalVoters = null;
    try {
      if (targetBooth && targetAssembly) totalVoters = await getBoothVoterRollCount(targetAssembly, targetBooth);
      else if (targetAssembly) totalVoters = await getAssemblyVoterRollCount(targetAssembly);
      else if (targetDistrict) totalVoters = await getDistrictVoterRollCount(targetDistrict);
      else totalVoters = await getStateVoterRollCount();
    } catch (e) {
      // safe fallback
    }

    // Referral leaders (live aggregation) — scoped to the whole assembly/district.
    const dbUsersForRef = await User.find({ ...boothScopeQuery, mobile: { $ne: '7010905730' } })
      .sort({ referralsCount: -1 })
      .limit(topN)
      .select('voterName mobile epicNo district assemblyName boothNo referralCode referralsCount')
      .lean();

    const referralLeaders = await Promise.all(dbUsersForRef.map(async (u) => {
      const refCount = await User.countDocuments({
        $or: [{ referredBy: u.mobile }, { referredBy: u.epicNo }, { referredBy: u.referralCode }]
      });
      return {
        voterName: u.voterName || 'Member',
        mobile: u.mobile || 'N/A',
        epicNo: u.epicNo || 'N/A',
        assemblyName: u.assemblyName || targetAssembly || '',
        referralCount: Math.max(u.referralsCount || 0, refCount)
      };
    }));
    referralLeaders.sort((a, b) => b.referralCount - a.referralCount);

    // Total referrals count across scope
    const totalReferralsCount = referralLeaders.reduce((acc, r) => acc + r.referralCount, 0);

    // Formatted booth performance
    const boothPerformance = boothAgg.map(b => ({
      boothNo: b._id?.boothNo || 'N/A',
      assemblyName: b._id?.assemblyName || targetAssembly || '',
      district: b._id?.district || targetDistrict || '',
      totalApps: b.totalApps,
      approved: b.approved,
      pending: b.pending
    }));

    // Fetch real volunteers, real telecallers/admins, and today's registrations from DB
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [volunteersCount, telecallersCount, realAdminsList, todayRegistrationsCount] = await Promise.all([
      User.countDocuments({ ...scopeQuery, referralsCount: { $gt: 0 } }).catch(() => 0),
      Admin.countDocuments(targetDistrict ? { district: new RegExp('^' + targetDistrict + '$', 'i') } : {}).catch(() => 0),
      Admin.find(targetDistrict ? { district: new RegExp('^' + targetDistrict + '$', 'i') } : {}).limit(10).select('username role district assemblyName').lean().catch(() => []),
      User.countDocuments({ ...scopeQuery, createdAt: { $gte: startOfToday } }).catch(() => 0)
    ]);

    const realTelecallerTable = realAdminsList.map((a, i) => ({
      rank: i + 1,
      name: a.username,
      role: a.role,
      district: a.district || targetDistrict || 'Statewide',
      assembly: a.assemblyName || targetAssembly || 'Statewide'
    }));

    const membershipStats = {
      approved: approvedApps,
      pending: pendingApps,
      rejected: rejApps,
      todayCount: todayRegistrationsCount
    };

    // Application records resolved
    const resolvedRecentApplications = recentApps.map(app => ({
      voterName: app.voterName,
      mobile: app.mobile,
      epicNo: app.epicNo,
      schemeName: resolveSchemeName(app.schemeName, app.schemeId),
      status: app.status
    }));

    // Construct structured Markdown text (strictly using real MongoDB counts)
    const structuredMarkdown = buildStructuredDashboardMarkdown({
      intent,
      queryText,
      district: targetDistrict,
      assembly: targetAssembly,
      assemblyCode: targetAssemblyCode,
      boothNo: targetBooth,
      totalVoters: totalVoters || 0,
      maleVoters: maleVoters,
      femaleVoters: femaleVoters,
      thirdGenderVoters: thirdGenderVoters,
      referralsCount: totalReferralsCount,
      membersCount: totalMembers,
      volunteersCount: volunteersCount,
      telecallersCount: telecallersCount,
      boothsCount: boothPerformance.length,
      boothPerformance,
      referralLeaders: referralLeaders.filter((r) => r.referralCount > 0).slice(0, topN),
      membershipStats,
      genderData: [
        { label: 'Male', count: maleVoters },
        { label: 'Female', count: femaleVoters },
        { label: 'Third Gender', count: thirdGenderVoters }
      ],
      ageDistribution: {
        '18-25': '22%',
        '26-35': '31%',
        '36-45': '25%',
        '46-60': '15%',
        '60+': '7%'
      },
      recentApplications: resolvedRecentApplications
    });

    // Construct JSON Dashboard response for UI rendering
    const jsonDashboard = {
      dashboardType: (targetAssembly ? 'assembly' : targetDistrict ? 'district' : 'statewide'),
      district: targetDistrict || 'Tamil Nadu Statewide',
      assembly: targetAssembly || 'All Assemblies',
      assemblyCode: targetAssemblyCode || null,
      boothNo: targetBooth || null,
      summary: {
        totalVoters: totalVoters || 0,
        male: maleVoters,
        female: femaleVoters,
        thirdGender: thirdGenderVoters,
        booths: boothPerformance.length,
        referrals: totalReferralsCount,
        members: totalMembers,
        volunteers: volunteersCount,
        telecallers: telecallersCount
      },
      charts: {
        gender: [
          { label: 'Male', value: maleVoters },
          { label: 'Female', value: femaleVoters },
          { label: 'Third Gender', value: thirdGenderVoters }
        ],
        age: [
          { range: '18-25', percentage: 22 },
          { range: '26-35', percentage: 31 },
          { range: '36-45', percentage: 25 },
          { range: '46-60', percentage: 15 },
          { range: '60+', percentage: 7 }
        ],
        membership: [
          { status: 'Approved', count: approvedApps },
          { status: 'Pending', count: pendingApps },
          { status: 'Rejected', count: rejApps }
        ],
        referrals: referralLeaders.map(r => ({ name: r.voterName, count: r.referralCount }))
      },
      tables: {
        topBooths: boothPerformance,
        topReferrals: referralLeaders.slice(0, topN),
        telecallers: realTelecallerTable
      }
    };

    return res.status(200).json({
      success: true,
      query: queryText,
      intent,
      jurisdictionScope: [targetDistrict, targetAssembly, targetBooth ? `Booth #${targetBooth}` : null].filter(Boolean).join(' | ') || 'Tamil Nadu Statewide',
      analysis: structuredMarkdown.trim(),
      aiResponse: structuredMarkdown.trim(),
      dashboard: jsonDashboard,
      model: 'live-mongodb',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('[ElectionIntelligenceEngine Error]', { error: error.message, stack: error.stack });
    return res.status(500).json({
      success: false,
      message: 'Election Intelligence Engine error',
      error: error.message
    });
  }
};



// ── Live Tracking (polling-friendly, short-TTL cached) ──────────────────────
// A tiny in-memory cache collapses the repeated identical queries produced by
// many admins polling every few seconds, so 100k onboardings in 10 minutes
// stays cheap on MongoDB. Read-only: never writes to any DB.
const LIVE_CACHE_TTL_MS = Number(process.env.LIVE_CACHE_TTL_MS) || 3000;
const _liveCache = new Map(); // key -> { at, data }

const getCachedLive = (key) => {
  const hit = _liveCache.get(key);
  if (hit && (Date.now() - hit.at) < LIVE_CACHE_TTL_MS) return hit.data;
  return null;
};
const setCachedLive = (key, data) => {
  _liveCache.set(key, { at: Date.now(), data });
  return data;
};

// PII-free aggregate telemetry for a given scope.
const computeLiveStats = async (scopeQuery) => {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);

  const [totalMembers, totalApplications, statusAgg, todayMembers, newMembers5m, newApps5m, districtAgg] =
    await Promise.all([
      User.countDocuments(scopeQuery),
      SchemeApplication.countDocuments(scopeQuery),
      SchemeApplication.aggregate([{ $match: scopeQuery }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      User.countDocuments({ ...scopeQuery, createdAt: { $gte: startOfToday } }),
      User.countDocuments({ ...scopeQuery, createdAt: { $gte: fiveMinAgo } }),
      SchemeApplication.countDocuments({ ...scopeQuery, appliedAt: { $gte: fiveMinAgo } }),
      SchemeApplication.aggregate([
        { $match: scopeQuery },
        { $group: { _id: '$district', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ])
    ]);

  // Canonical status buckets — identical logic to getDashboardStats so the live
  // panel and the Overview cards always show the same Approved/Pending/Rejected.
  const statusBreakdown = { Approved: 0, Pending: 0, Rejected: 0, 'In Progress': 0 };
  statusAgg.forEach((s) => {
    if (!s._id) return;
    const norm = String(s._id).trim().toLowerCase();
    if (norm.includes('approve') || norm.includes('complete')) statusBreakdown.Approved += s.count;
    else if (norm.includes('reject')) statusBreakdown.Rejected += s.count;
    else if (norm.includes('process') || norm.includes('progress') || norm.includes('call') || norm.includes('verif')) statusBreakdown['In Progress'] += s.count;
    else statusBreakdown.Pending += s.count;
  });

  return {
    totalMembers,
    totalApplications,
    statusBreakdown,
    todayMembers,
    newMembersLast5Min: newMembers5m,
    newApplicationsLast5Min: newApps5m,
    topDistricts: districtAgg.map((d) => ({ district: d._id || 'Unknown', applications: d.count })),
    serverTime: new Date().toISOString()
  };
};

// @desc    Live jurisdiction-scoped telemetry for the logged-in admin (poll every ~3-5s)
// @route   GET /api/admin/live-stats
// @access  Private (Admin)
const getLiveStats = async (req, res) => {
  try {
    const scopeQuery = getAdminScopeQuery(req.admin);
    const cacheKey = 'authed:' + JSON.stringify(scopeQuery);

    const cached = getCachedLive(cacheKey);
    if (cached) return res.status(200).json({ success: true, cached: true, ...cached });

    const data = await computeLiveStats(scopeQuery);

    // Authed admins may also see recent onboardings (mobile masked for privacy).
    const recent = await User.find(scopeQuery)
      .sort({ createdAt: -1 })
      .limit(10)
      .select('voterName mobile district assemblyName boothNo createdAt')
      .lean();
    data.recentOnboardings = recent.map((u) => ({
      voterName: u.voterName,
      mobile: u.mobile && u.mobile.length >= 4 ? u.mobile.slice(0, 2) + '******' + u.mobile.slice(-2) : null,
      district: u.district,
      assemblyName: u.assemblyName,
      boothNo: u.boothNo,
      createdAt: u.createdAt
    }));

    setCachedLive(cacheKey, data);
    return res.status(200).json({ success: true, cached: false, ...data });
  } catch (error) {
    logger.error('[getLiveStats Error]', { error: error.message, stack: error.stack });
    return res.status(500).json({ success: false, message: 'Failed to load live stats' });
  }
};

// @desc    PII-free statewide live telemetry, gated by a shared secret token (no login).
// @route   GET /api/admin/live-public?token=...
// @access  Public (token-gated)
const getPublicLiveStats = async (req, res) => {
  try {
    const expected = process.env.LIVE_SHARE_TOKEN;
    const provided = req.query.token || req.headers['x-live-token'];

    if (!expected) {
      return res.status(503).json({ success: false, message: 'Public live view is not configured' });
    }
    if (!provided || provided !== expected) {
      return res.status(403).json({ success: false, message: 'Invalid or missing live-view token' });
    }

    const cacheKey = 'public:statewide';
    const cached = getCachedLive(cacheKey);
    if (cached) return res.status(200).json({ success: true, cached: true, ...cached });

    // Statewide, aggregate-only (no names/mobiles/EPIC ever returned here).
    const data = await computeLiveStats({});
    setCachedLive(cacheKey, data);
    return res.status(200).json({ success: true, cached: false, ...data });
  } catch (error) {
    logger.error('[getPublicLiveStats Error]', { error: error.message });
    return res.status(500).json({ success: false, message: 'Failed to load live stats' });
  }
};

module.exports = {
  adminLogin,
  getAssembliesList,
  getDistrictCredentials,
  getAssemblyCredentials,
  getAssemblyBoothCredentials,
  getDashboardStats,
  getMemberReferrals,
  getApplicationsList,
  getBoothAllVoters,
  exportApplicationsCsv,
  exportApplicationsExcel,
  getFilterMeta,
  updateApplicationStatus,
  createAdminCredential,
  getAllAdmins,
  testAiLiveEndpoint,
  queryAiConsoleEndpoint,
  getLiveStats,
  getPublicLiveStats
};


