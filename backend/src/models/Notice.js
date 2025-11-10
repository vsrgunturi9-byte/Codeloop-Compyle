const mongoose = require('mongoose');

const noticeReadSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  readAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const noticeSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Notice title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  content: {
    type: String,
    required: [true, 'Notice content is required'],
    trim: true
  },
  postedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Poster is required']
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department'
  },
  groups: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group'
  }],

  // Targeting
  targetType: {
    type: String,
    enum: ['all', 'department', 'group', 'role'],
    required: [true, 'Target type is required']
  },
  targetRoles: [{
    type: String,
    enum: ['Admin', 'HOD', 'Teacher', 'Student']
  }],

  // Metadata
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  expiresAt: {
    type: Date
  },

  // Tracking
  readBy: [noticeReadSchema],
  totalReads: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
noticeSchema.index({ title: 1 });
noticeSchema.index({ postedBy: 1 });
noticeSchema.index({ department: 1 });
noticeSchema.index({ groups: 1 });
noticeSchema.index({ targetType: 1 });
noticeSchema.index({ priority: 1 });
noticeSchema.index({ isActive: 1 });
noticeSchema.index({ expiresAt: 1 });
noticeSchema.index({ createdAt: -1 });

// Virtuals
noticeSchema.virtual('readCount').get(function() {
  return this.readBy.length;
});

noticeSchema.virtual('isExpired').get(function() {
  return this.expiresAt && this.expiresAt < new Date();
});

// Static method to find notices for user
noticeSchema.statics.findByUser = function(userId, options = {}) {
  const { page = 1, limit = 10, unread = false } = options;
  const User = mongoose.model('User');

  return User.findById(userId)
    .then(user => {
      const query = {
        isActive: true,
        $or: [
          { targetType: 'all' },
          { targetType: 'role', targetRoles: { $in: [user.role.name] } },
          { targetType: 'department', department: user.department },
          { targetType: 'group', groups: { $in: user.groups } }
        ],
        $or: [
          { expiresAt: { $exists: false } },
          { expiresAt: { $gt: new Date() } }
        ]
      };

      // Filter for unread notices
      if (unread) {
        query['readBy.user'] = { $ne: userId };
      }

      return this.find(query)
        .populate('postedBy', 'fullName')
        .populate('department', 'name code')
        .populate('groups', 'name code')
        .sort({ priority: -1, createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);
    });
};

// Static method to get unread count for user
noticeSchema.statics.getUnreadCount = function(userId) {
  const User = mongoose.model('User');

  return User.findById(userId)
    .then(user => {
      return this.countDocuments({
        isActive: true,
        $or: [
          { targetType: 'all' },
          { targetType: 'role', targetRoles: { $in: [user.role.name] } },
          { targetType: 'department', department: user.department },
          { targetType: 'group', groups: { $in: user.groups } }
        ],
        $and: [
          { 'readBy.user': { $ne: userId } },
          {
            $or: [
              { expiresAt: { $exists: false } },
              { expiresAt: { $gt: new Date() } }
            ]
          }
        ]
      });
    });
};

// Static method to find notices by department
noticeSchema.statics.findByDepartment = function(departmentId, options = {}) {
  const { page = 1, limit = 10 } = options;

  return this.find({
    $or: [
      { targetType: 'all' },
      { targetType: 'department', department: departmentId }
    ],
    isActive: true
  })
    .populate('postedBy', 'fullName')
    .populate('department', 'name code')
    .sort({ priority: -1, createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);
};

// Static method to find notices by group
noticeSchema.statics.findByGroup = function(groupId, options = {}) {
  const { page = 1, limit = 10 } = options;

  return this.find({
    $or: [
      { targetType: 'all' },
      { targetType: 'group', groups: groupId }
    ],
    isActive: true
  })
    .populate('postedBy', 'fullName')
    .populate('groups', 'name code')
    .sort({ priority: -1, createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);
};

// Instance method to mark as read by user
noticeSchema.methods.markAsRead = function(userId) {
  // Check if already marked as read
  const alreadyRead = this.readBy.some(readEntry =>
    readEntry.user.toString() === userId
  );

  if (!alreadyRead) {
    this.readBy.push({ user: userId });
    this.totalReads += 1;
    return this.save();
  }

  return Promise.resolve(this);
};

// Instance method to check if user has access
noticeSchema.methods.hasAccess = async function(userId) {
  const User = mongoose.model('User');
  const user = await User.findById(userId).populate('role');

  // Check if notice is active and not expired
  if (!this.isActive || (this.expiresAt && this.expiresAt < new Date())) {
    return false;
  }

  switch (this.targetType) {
    case 'all':
      return true;
    case 'role':
      return this.targetRoles.includes(user.role.name);
    case 'department':
      return this.department && user.department &&
             this.department.toString() === user.department.toString();
    case 'group':
      return this.groups.some(groupId =>
        user.groups.some(userGroupId => userGroupId.toString() === groupId.toString())
      );
    default:
      return false;
  }
};

// Instance method to get target audience description
noticeSchema.methods.getTargetAudience = function() {
  switch (this.targetType) {
    case 'all':
      return 'All Users';
    case 'role':
      return this.targetRoles.join(', ');
    case 'department':
      return this.department ? 'Department Specific' : 'No Department';
    case 'group':
      return this.groups.length > 0 ? `${this.groups.length} Group(s)` : 'No Groups';
    default:
      return 'Unknown';
  }
};

// Pre-save middleware to validate poster permissions
noticeSchema.pre('save', async function(next) {
  if (this.isNew && this.postedBy) {
    const User = mongoose.model('User');
    const poster = await User.findById(this.postedBy);

    if (!poster) {
      const error = new Error('Poster not found');
      return next(error);
    }

    // Check if poster has permission to post notices
    const hasPermission = await poster.hasPermission('post_notices');
    if (!hasPermission) {
      const error = new Error('User does not have permission to post notices');
      return next(error);
    }
  }
  next();
});

// Clean up expired notices (this would typically run as a scheduled job)
noticeSchema.statics.cleanupExpiredNotices = function() {
  return this.updateMany(
    {
      expiresAt: { $lt: new Date() },
      isActive: true
    },
    { isActive: false }
  );
};

module.exports = mongoose.model('Notice', noticeSchema);