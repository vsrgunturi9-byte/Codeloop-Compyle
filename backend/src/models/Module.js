const mongoose = require('mongoose');

const moduleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Module title is required'],
    trim: true,
    maxlength: [200, 'Module title cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: [true, 'Department is required']
  },
  groups: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group'
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Creator is required']
  },
  questions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question'
  }],
  notes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Note'
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  sortOrder: {
    type: Number,
    default: 0
  },
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner'
  },
  estimatedHours: {
    type: Number,
    min: [1, 'Estimated hours must be at least 1'],
    max: [200, 'Estimated hours cannot exceed 200']
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  prerequisites: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Module'
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
moduleSchema.index({ title: 1 });
moduleSchema.index({ department: 1 });
moduleSchema.index({ groups: 1 });
moduleSchema.index({ createdBy: 1 });
moduleSchema.index({ isActive: 1, sortOrder: 1 });

// Virtual for question count
moduleSchema.virtual('questionCount', {
  ref: 'Question',
  localField: 'questions',
  foreignField: '_id',
  count: true,
  match: { isActive: true }
});

// Virtual for note count
moduleSchema.virtual('noteCount', {
  ref: 'Note',
  localField: 'notes',
  foreignField: '_id',
  count: true,
  match: { isActive: true }
});

// Virtual for assessments that include this module
moduleSchema.virtual('assessments', {
  ref: 'Assessment',
  localField: '_id',
  foreignField: 'modules'
});

// Instance method to add question
moduleSchema.methods.addQuestion = function(questionId) {
  if (!this.questions.includes(questionId)) {
    this.questions.push(questionId);
  }
  return this.save();
};

// Instance method to remove question
moduleSchema.methods.removeQuestion = function(questionId) {
  this.questions = this.questions.filter(id => !id.equals(questionId));
  return this.save();
};

// Instance method to add note
moduleSchema.methods.addNote = function(noteId) {
  if (!this.notes.includes(noteId)) {
    this.notes.push(noteId);
  }
  return this.save();
};

// Instance method to remove note
moduleSchema.methods.removeNote = function(noteId) {
  this.notes = this.notes.filter(id => !id.equals(noteId));
  return this.save();
};

// Instance method to assign to groups
moduleSchema.methods.assignToGroups = function(groupIds) {
  this.groups = [...new Set([...this.groups.map(id => id.toString()), ...groupIds])];
  return this.save();
};

// Static method to find modules by department
moduleSchema.statics.findByDepartment = function(departmentId, options = {}) {
  const { includeInactive = false, page = 1, limit = 10 } = options;
  const query = includeInactive ? { department: departmentId } : { department: departmentId, isActive: true };

  return this.find(query)
    .populate('createdBy', 'fullName')
    .populate('groups', 'name code')
    .populate('questionCount')
    .populate('noteCount')
    .sort({ sortOrder: 1, createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);
};

// Static method to find modules accessible to user
moduleSchema.statics.findByUser = function(userId, options = {}) {
  const { page = 1, limit = 10, search = '' } = options;
  const User = mongoose.model('User');

  return this.find({
    isActive: true,
    $or: [
      { createdBy: userId },
      { 'groups': { $in: await User.findById(userId).select('groups') } }
    ],
    $and: search ? [
      {
        $or: [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { tags: { $in: [new RegExp(search, 'i')] } }
        ]
      }
    ] : []
  })
    .populate('department', 'name code')
    .populate('createdBy', 'fullName')
    .populate('groups', 'name code')
    .populate('questionCount')
    .populate('noteCount')
    .sort({ sortOrder: 1, createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);
};

// Static method to get module with full details
moduleSchema.statics.getWithDetails = function(moduleId) {
  return this.findById(moduleId)
    .populate('department', 'name code')
    .populate('createdBy', 'fullName email')
    .populate('groups', 'name code')
    .populate({
      path: 'questions',
      match: { isActive: true },
      populate: {
        path: 'createdBy',
        select: 'fullName'
      }
    })
    .populate({
      path: 'notes',
      match: { isActive: true },
      populate: {
        path: 'uploadedBy',
        select: 'fullName'
      }
    })
    .populate('prerequisites', 'title')
    .populate('questionCount')
    .populate('noteCount');
};

// Pre-save middleware to validate creator
moduleSchema.pre('save', async function(next) {
  if (this.isNew && this.createdBy) {
    const User = mongoose.model('User');
    const creator = await User.findById(this.createdBy);

    if (!creator) {
      const error = new Error('Module creator not found');
      return next(error);
    }

    // Check if creator has permission to create modules
    const hasPermission = await creator.hasPermission('manage_modules');
    if (!hasPermission) {
      const error = new Error('User does not have permission to create modules');
      return next(error);
    }
  }
  next();
});

// Pre-save middleware to validate department
moduleSchema.pre('save', async function(next) {
  if (this.isNew && this.department) {
    const Department = mongoose.model('Department');
    const department = await Department.findById(this.department);

    if (!department || !department.isActive) {
      const error = new Error('Department must exist and be active');
      return next(error);
    }
  }
  next();
});

module.exports = mongoose.model('Module', moduleSchema);