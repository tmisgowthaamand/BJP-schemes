'use strict';
const BoothPresidentApplication = require('../models/BoothPresidentApplication');
const User = require('../models/User');
const logger = require('../config/logger');

// ── Helpers ────────────────────────────────────────────────────────────────
const pick = (obj, keys) => keys.reduce((acc, k) => { acc[k] = obj[k]; return acc; }, {});
const safeErr = (res, req, err, label) => {
  logger.error(`[${label}]`, { error: err.message, correlationId: req.correlationId });
  return res.status(500).json({ success: false, message: 'Something went wrong', correlationId: req.correlationId || 'unknown' });
};

// ── USER endpoints ─────────────────────────────────────────────────────────

/**
 * POST /api/booth-president/apply
 * Body: { boothType: 'registered'|'custom', targetDistrict?, targetAssembly?, targetBoothNo? }
 * Auth: protectUser (user JWT)
 */
const applyBoothPresident = async (req, res) => {
  try {
    const { boothType, targetDistrict, targetAssembly, targetBoothNo } = req.body;
    const userId = req.user._id;

    if (!['registered', 'custom'].includes(boothType)) {
      return res.status(400).json({ success: false, message: 'Invalid boothType. Use "registered" or "custom".' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Resolve target booth
    const tDistrict = boothType === 'registered' ? user.district   : (targetDistrict || '').trim();
    const tAssembly = boothType === 'registered' ? user.assemblyName : (targetAssembly  || '').trim();
    const tBooth    = boothType === 'registered' ? user.boothNo     : (targetBoothNo   || '').trim();

    if (!tDistrict || !tAssembly || !tBooth) {
      return res.status(400).json({ success: false, message: 'District, Assembly, and Booth Number are required.' });
    }

    // No duplicate pending application for the same target booth
    const queryOr = [{ userId: user._id }];
    if (user.epicNo) queryOr.push({ epicNo: user.epicNo });
    if (user.mobile) queryOr.push({ mobile: user.mobile });

    const existing = await BoothPresidentApplication.findOne({
      $or: queryOr,
      targetAssembly: tAssembly,
      targetBoothNo: tBooth,
      status: 'Pending'
    });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `You already have a pending application for Booth ${tBooth} in ${tAssembly}.`
      });
    }

    const application = await BoothPresidentApplication.create({
      userId: user._id,
      voterName:        user.voterName,
      epicNo:           user.epicNo,
      mobile:           user.mobile,
      originalDistrict: user.district,
      originalAssembly: user.assemblyName,
      originalBoothNo:  user.boothNo,
      boothType,
      targetDistrict:   tDistrict,
      targetAssembly:   tAssembly,
      targetBoothNo:    tBooth,
      status: 'Pending'
    });

    return res.status(201).json({
      success: true,
      message: `Application submitted for Booth ${tBooth}, ${tAssembly}. An admin will review it shortly.`,
      application: pick(application, ['_id', 'status', 'boothType', 'targetDistrict', 'targetAssembly', 'targetBoothNo', 'appliedAt'])
    });
  } catch (err) {
    return safeErr(res, req, err, 'applyBoothPresident');
  }
};

/**
 * GET /api/booth-president/my-applications
 * Returns all applications by the logged-in user.
 * Auth: protectUser
 */
const getMyApplications = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const queryOr = [{ userId: req.user._id }];
    if (user?.epicNo) queryOr.push({ epicNo: user.epicNo });
    if (user?.mobile) queryOr.push({ mobile: user.mobile });

    const apps = await BoothPresidentApplication.find({ $or: queryOr })
      .sort({ appliedAt: -1 })
      .lean();

    return res.status(200).json({ success: true, applications: apps });
  } catch (err) {
    return safeErr(res, req, err, 'getMyApplications');
  }
};

// ── ADMIN endpoints ────────────────────────────────────────────────────────

/**
 * GET /api/booth-president/admin/applications
 * Query: ?status=Pending|Approved|Declined&district=&assembly=&search=&page=&limit=
 * Auth: protectAdmin
 */
const adminGetApplications = async (req, res) => {
  try {
    const { status, district, assembly, search, page = 1, limit = 20 } = req.query;
    const admin = req.admin;

    // Scope: district/assembly admins can only see their own jurisdiction
    const filter = {};
    if (admin.role === 'DISTRICT_ADMIN' && admin.district) {
      filter.targetDistrict = new RegExp('^' + admin.district + '$', 'i');
    } else if (admin.role === 'ASSEMBLY_ADMIN' && admin.assemblyName) {
      filter.targetAssembly = new RegExp('^' + admin.assemblyName + '$', 'i');
    } else if (admin.role === 'BOOTH_ADMIN' && admin.assemblyName && admin.boothNo) {
      filter.targetAssembly = new RegExp('^' + admin.assemblyName + '$', 'i');
      filter.targetBoothNo  = String(admin.boothNo);
    }

    // Optional query filters
    if (status && ['Pending', 'Approved', 'Declined'].includes(status)) filter.status = status;
    if (district && admin.role === 'SUPER_ADMIN') filter.targetDistrict = new RegExp('^' + district.trim() + '$', 'i');
    if (assembly)  filter.targetAssembly = new RegExp('^' + assembly.trim() + '$', 'i');
    if (search) {
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const r = new RegExp(escaped, 'i');
      filter.$or = [{ voterName: r }, { epicNo: r }, { mobile: r }, { targetBoothNo: r }];
    }

    const pageNum  = Math.max(1, parseInt(page)  || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const skip     = (pageNum - 1) * limitNum;

    const [total, applications] = await Promise.all([
      BoothPresidentApplication.countDocuments(filter),
      BoothPresidentApplication.find(filter).sort({ appliedAt: -1 }).skip(skip).limit(limitNum).lean()
    ]);

    // Summary counts
    const [pending, approved, declined] = await Promise.all([
      BoothPresidentApplication.countDocuments({ ...filter, status: 'Pending' }),
      BoothPresidentApplication.countDocuments({ ...filter, status: 'Approved' }),
      BoothPresidentApplication.countDocuments({ ...filter, status: 'Declined' })
    ]);

    return res.status(200).json({
      success: true,
      total, pending, approved, declined,
      totalPages: Math.ceil(total / limitNum) || 1,
      currentPage: pageNum,
      applications
    });
  } catch (err) {
    return safeErr(res, req, err, 'adminGetApplications');
  }
};

/**
 * PUT /api/booth-president/admin/applications/:id
 * Body: { status: 'Approved'|'Declined', adminNotes? }
 * Auth: protectAdmin
 */
const adminUpdateApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body;

    if (!['Approved', 'Declined'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be "Approved" or "Declined".' });
    }

    const app = await BoothPresidentApplication.findById(id);
    if (!app) return res.status(404).json({ success: false, message: 'Application not found' });

    // Scope check — admin can only update records in their jurisdiction
    const admin = req.admin;
    if (admin.role === 'DISTRICT_ADMIN' && admin.district) {
      if (app.targetDistrict.toLowerCase() !== admin.district.toLowerCase()) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    } else if (admin.role === 'ASSEMBLY_ADMIN' && admin.assemblyName) {
      if (app.targetAssembly.toLowerCase() !== admin.assemblyName.toLowerCase()) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    }

    app.status     = status;
    app.reviewedBy = `${admin.role} (${admin.username})`;
    app.reviewedAt = new Date();
    if (adminNotes !== undefined) app.adminNotes = adminNotes;
    await app.save();

    return res.status(200).json({ success: true, message: `Application ${status}.`, application: app });
  } catch (err) {
    return safeErr(res, req, err, 'adminUpdateApplication');
  }
};

module.exports = {
  applyBoothPresident,
  getMyApplications,
  adminGetApplications,
  adminUpdateApplication
};
