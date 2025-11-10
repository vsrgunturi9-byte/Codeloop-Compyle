const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters long'],
    maxlength: [30, 'Username cannot exceed 30 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long'],
    select: false // Don't include password in queries by default
  },
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true,
    maxlength: [100, 'Full name cannot exceed 100 characters']
  },
  role: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role',
    required: [true, 'Role is required']
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department'
  },
  groups: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group'
  }],
  profilePhoto: {
    type: String,
    default: null
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: null
  },
  resetPasswordToken: {
    type: String,
    default: null
  },
  resetPasswordExpires: {
    type: Date,
    default: null
  },
  emailVerificationToken: {
    type: String,
    default: null
  },
  emailVerificationExpires: {
    type: Date,
    default: null
  },
  customPermissions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ActionPermission'
  }],
  refreshTokens: [{
    token: String,
    device: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ role: 1 });
userSchema.index({ department: 1 });
userSchema.index({ groups: 1 });

// Virtual for user's full profile
userSchema.virtual('fullProfile').get(function() {
  return {
    _id: this._id,
    username: this.username,
    email: this.email,
    fullName: this.fullName,
    role: this.role,
    department: this.department,
    groups: this.groups,
    profilePhoto: this.profilePhoto,
    isEmailVerified: this.isEmailVerified,
    isActive: this.isActive,
    lastLogin: this.lastLogin,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  // Only run this function if password was actually modified
  if (!this.isModified('password')) return next();

  // Hash the password with cost of 12
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Pre-save middleware to update lastLogin
userSchema.pre('save', function(next) {
  if (this.isNew) {
    this.lastLogin = new Date();
  }
  next();
});

// Instance method to check password
userSchema.methods.correctPassword = async function(candidatePassword, userPassword) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

// Instance method to check if user has specific permission
userSchema.methods.hasPermission = async function(permissionName) {
  const Role = mongoose.model('Role');
  const ActionPermission = mongoose.model('ActionPermission');

  // Get user's role with populated permissions
  const userRole = await Role.findById(this.role).populate('permissions');

  // Check if permission exists in role permissions
  const hasRolePermission = userRole.permissions.some(
    perm => perm.name === permissionName
  );

  // Check if permission exists in custom permissions
  const hasCustomPermission = this.customPermissions.some(
    permId => permId.toString() === permissionName
  );

  return hasRolePermission || hasCustomPermission;
};

// Instance method to check if user has specific role
userSchema.methods.hasRole = async function(roleName) {
  const Role = mongoose.model('Role');
  const role = await Role.findById(this.role);
  return role && role.name === roleName;
};

// Instance method to get user's role hierarchy level
userSchema.methods.getRoleHierarchy = async function() {
  const Role = mongoose.model('Role');
  const role = await Role.findById(this.role);
  return role ? role.hierarchy : null;
};

// Static method to find users by department
userSchema.statics.findByDepartment = function(departmentId) {
  return this.find({ department: departmentId }).populate('role', 'name hierarchy');
};

// Static method to find users by role
userSchema.statics.findByRole = function(roleName) {
  return this.populate({
    path: 'role',
    match: { name: roleName }
  }).then(users => users.filter(user => user.role));
};

module.exports = mongoose.model('User', userSchema);