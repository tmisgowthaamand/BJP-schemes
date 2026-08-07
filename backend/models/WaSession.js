const mongoose = require('mongoose');

/**
 * WhatsApp Session — tracks each user's position in the Flow conversation.
 * TTL index auto-deletes sessions idle for 30 minutes.
 */
const waSessionSchema = new mongoose.Schema({
  mobile: { type: String, required: true, unique: true, trim: true },

  // Current step in the state machine
  step: {
    type: String,
    enum: [
      'LANGUAGE_SELECT',   // waiting for language choice
      'NEW_USER_LOCKED',   // showed locked menu, waiting for "hi" to trigger flow
      'AWAIT_EPIC',        // waiting for EPIC string (fallback text mode)
      'CONFIRM_VOTER',     // voter found, waiting for confirmation
      'MAIN_MENU',         // registered user — main menu shown
      'AWAIT_BOOTH_NO',    // booth president flow — awaiting target booth number
      'AWAIT_BOOTH_ASS',   // booth president flow — awaiting target assembly
    ],
    default: 'LANGUAGE_SELECT'
  },

  lang:          { type: String, enum: ['ta', 'en'], default: 'en' },
  userId:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

  // Temp data during registration flow
  tempEpicNo:    { type: String, default: null },
  tempVoterData: { type: mongoose.Schema.Types.Mixed, default: null },

  // Temp data for booth president application
  tempBoothNo:    { type: String, default: null },
  tempBPDistrict: { type: String, default: null },
  tempBPAssembly: { type: String, default: null },

  updatedAt: { type: Date, default: Date.now }
});

// Auto-expire session after 30 minutes of inactivity
waSessionSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 1800 });

module.exports = mongoose.model('WaSession', waSessionSchema);
