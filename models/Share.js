import mongoose from 'mongoose';

const shareSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    length: 6
  },
  type: {
    type: String,
    required: true,
    enum: ['text', 'file']
  },
  content: {
    type: String,
    required: function () {
      return this.type === 'text';
    }
  },
  filePath: {
    type: String,
    required: function () {
      return this.type === 'file';
    }
  },
  fileName: {
    type: String,
    required: function () {
      return this.type === 'file';
    }
  },
  fileSize: {
    type: Number,
    required: function () {
      return this.type === 'file';
    }
  },
  views: {
    type: Number,
    default: 0
  },
  maxViews: {
    type: Number,
    default: 100
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    index: { expireAfterSeconds: 0 } // ✅ This already creates the index
  }
}, {
  timestamps: true
});

// ✅ Only keep unique/important indexes
shareSchema.index({ code: 1 }); // keep this
shareSchema.index({ type: 1 }); // optional: for faster queries by type

// 🚫 Removed duplicate `expiresAt` index

// Virtuals
shareSchema.virtual('isExpired').get(function () {
  return this.expiresAt < new Date();
});

shareSchema.virtual('isMaxViewsReached').get(function () {
  return this.views >= this.maxViews;
});

// Methods
shareSchema.methods.incrementViews = function () {
  this.views += 1;
  return this.save();
};

shareSchema.statics.findByCode = function (code) {
  return this.findOne({ code: code.toUpperCase() });
};

shareSchema.statics.cleanupExpired = function () {
  return this.deleteMany({ expiresAt: { $lt: new Date() } });
};

// Middleware
shareSchema.pre('save', function (next) {
  if (this.code) {
    this.code = this.code.toUpperCase();
  }
  next();
});

export default mongoose.model('Share', shareSchema);
