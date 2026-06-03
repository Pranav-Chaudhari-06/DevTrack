const mongoose = require('mongoose');

const refreshTokenSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tokenHash: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },

  // Reuse-detection plumbing. All refresh tokens descended from one login
  // share a familyId; if a revoked token is ever presented again we know
  // someone replayed it and we nuke the whole family.
  // Not required so legacy tokens issued before this field existed still
  // load and can save (their children get a fresh familyId on rotation).
  familyId:  { type: mongoose.Schema.Types.ObjectId },
  revoked:   { type: Boolean, default: false },
});

// MongoDB TTL index — automatically deletes expired documents
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
refreshTokenSchema.index({ userId: 1 });
refreshTokenSchema.index({ familyId: 1 });

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);
