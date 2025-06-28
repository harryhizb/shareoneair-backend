import mongoose from 'mongoose';

const shareSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,       // Mongoose auto-creates an index for this
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
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    index: { expireAfterSeconds: 0 } // TTL index
  }
}, {
  timestamps: true
});

// Optional index for faster queries by type
shareSchema.index({ type: 1 });

// Virtual: Is file expired?
shareSchema.virtual('isExpired').get(function () {
  return this.expiresAt < new Date();
});

// Virtual: Has max views been reached?
shareSchema.virtual('isMaxViewsReached').get(function () {
  return this.views >= this.maxViews;
});

// Method: Increment view count
shareSchema.methods.incrementViews = function () {
  this.views += 1;
  return this.save();
};

// Static: Find by code
shareSchema.statics.findByCode = function (code) {
  return this.findOne({ code: code.toUpperCase() });
};

// Static: Cleanup expired files
shareSchema.statics.cleanupExpired = function () {
  return this.deleteMany({ expiresAt: { $lt: new Date() } });
};

// Pre-save: Ensure code is uppercase
shareSchema.pre('save', function (next) {
  if (this.code) {
    this.code = this.code.toUpperCase();
  }
  next();
});

export default mongoose.model('Share', shareSchema);
