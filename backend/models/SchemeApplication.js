const mongoose = require('mongoose');

const statusHistorySchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ['Pending', 'Submitted', 'Processing', 'Completed', 'In Progress', 'Called', 'Verified', 'Approved', 'Rejected', 'Physically Delivered', 'Documents Required'],
    default: 'Pending'
  },
  remarks: {
    type: String,
    default: ''
  },
  updatedBy: {
    type: String, // admin username or role
    default: 'System'
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

const schemeApplicationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  epicNo: {
    type: String,
    required: true
  },
  voterName: {
    type: String,
    required: true
  },
  mobile: {
    type: String,
    required: true
  },
  district: {
    type: String,
    required: true
  },
  assemblyName: {
    type: String,
    required: true
  },
  assemblyNo: {
    type: String,
    default: ''
  },
  boothNo: {
    type: String,
    required: true
  },
  schemeId: {
    type: Number,
    default: 1
  },
  schemeName: {
    type: String,
    required: true
  },
  clusterName: {
    type: String,
    default: 'BJP Nalam Thittam Welfare'
  },
  benefit: {
    type: String,
    default: 'BJP Central Scheme Welfare Benefit'
  },
  status: {
    type: String,
    enum: ['Pending', 'Submitted', 'Processing', 'Completed', 'In Progress', 'Called', 'Verified', 'Approved', 'Rejected', 'Physically Delivered', 'Documents Required'],
    default: 'Pending'
  },
  adminRemarks: {
    type: String,
    default: 'Application submitted and pending verification.'
  },
  lastCalledAt: {
    type: Date,
    default: null
  },
  // NEW: Delivery tracking details
  deliveryDetails: {
    deliveredBy: {
      type: String,
      default: null
    },
    deliveredByName: {
      type: String,
      default: null
    },
    deliveredAt: {
      type: Date,
      default: null
    },
    deliveryMethod: {
      type: String,
      enum: ['Hand Delivery', 'Post', 'Courier', 'Email', 'Online Portal', 'Camp', 'Other'],
      default: null
    },
    deliveryLocation: {
      type: String,
      enum: ['Voter Home', 'Booth Office', 'Assembly Office', 'Camp', 'Other'],
      default: null
    },
    remarks: {
      type: String,
      default: ''
    }
  },
  // NEW: Performance metrics
  metrics: {
    daysToDeliver: {
      type: Number,
      default: null
    },
    adminTouchpoints: {
      type: Number,
      default: 0
    }
  },
  statusHistory: [statusHistorySchema],
  appliedAt: {
    type: Date,
    default: Date.now
  }
});

// Pre-save hook to auto-calculate metrics
schemeApplicationSchema.pre('save', function(next) {
  // Calculate days to deliver if status is delivered
  if ((this.status === 'Physically Delivered' || this.status === 'Approved' || this.status === 'Completed') && 
      this.deliveryDetails.deliveredAt && !this.metrics.daysToDeliver) {
    const msPerDay = 1000 * 60 * 60 * 24;
    this.metrics.daysToDeliver = Math.floor((this.deliveryDetails.deliveredAt - this.appliedAt) / msPerDay);
  }
  
  // Count admin touchpoints
  this.metrics.adminTouchpoints = this.statusHistory.length;
  
  next();
});

module.exports = mongoose.model('SchemeApplication', schemeApplicationSchema);
