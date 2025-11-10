const express = require('express');
const { body, validationResult } = require('express-validator');
const { requireAuth, requirePermission, requireRole } = require('../middleware/auth');
const { User, Role, Department, Group } = require('../models');
const {
  idValidation,
  createUserValidation,
  updateUserValidation,
  passwordChangeValidation,
  paginationValidation,
  searchValidation
} = require('../utils/validation');

const router = express.Router();

// All user routes require authentication
router.use(requireAuth);

// @route   GET /api/users/profile
// @desc    Get current user profile
// @access  Private
router.get('/profile', async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('role', 'name permissions')
      .populate('department', 'name code')
      .populate('groups', 'name code')
      .select('-password -refreshTokens');

    res.json({
      success: true,
      data: {
        user
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user profile'
    });
  }
});

// @route   PUT /api/users/profile
// @desc    Update current user profile
// @access  Private
router.put('/profile', [
  body('fullName').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Full name must be between 2 and 100 characters'),
  body('profilePhoto').optional().isURL().withMessage('Profile photo must be a valid URL')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { fullName, profilePhoto } = req.body;
    const updateData = {};

    if (fullName) updateData.fullName = fullName;
    if (profilePhoto) updateData.profilePhoto = profilePhoto;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('role', 'name permissions')
     .populate('department', 'name code')
     .populate('groups', 'name code')
     .select('-password -refreshTokens');

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update profile'
    });
  }
});

// @route   POST /api/users/change-password
// @desc    Change user password
// @access  Private
router.post('/change-password', passwordChangeValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id).select('+password');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to change password'
    });
  }
});

// @route   GET /api/users
// @desc    Get all users with filtering and pagination (Admin only)
// @access  Private (manage_users permission)
router.get('/', requirePermission('manage_users'), [
  ...paginationValidation,
  ...searchValidation,
  body('role').optional().isIn(['Admin', 'HOD', 'Teacher', 'Student']).withMessage('Invalid role'),
  body('department').optional().isMongoId().withMessage('Invalid department ID'),
  body('isActive').optional().isBoolean().withMessage('isActive must be boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const {
      page = 1,
      limit = 10,
      search,
      role,
      department,
      isActive,
      sort = 'createdAt',
      order = 'desc'
    } = req.query;

    // Build query
    let query = {};

    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    if (role) {
      const roleDoc = await Role.findOne({ name: role });
      if (roleDoc) {
        query.role = roleDoc._id;
      }
    }

    if (department) {
      query.department = department;
    }

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    // Sort options
    const sortOptions = {};
    sortOptions[sort] = order === 'desc' ? -1 : 1;

    const users = await User.find(query)
      .populate('role', 'name')
      .populate('department', 'name code')
      .populate('groups', 'name code')
      .select('-password -refreshTokens')
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: users,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users'
    });
  }
});

// @route   POST /api/users
// @desc    Create new user (Admin only)
// @access  Private (manage_users permission)
router.post('/', requirePermission('manage_users'), createUserValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const {
      username,
      email,
      password,
      fullName,
      role,
      department,
      groups = []
    } = req.body;

    // Check if username or email already exists
    const existingUser = await User.findOne({
      $or: [{ username }, { email }]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: existingUser.username === username ? 'Username already exists' : 'Email already exists'
      });
    }

    // Get role document
    const roleDoc = await Role.findOne({ name: role });
    if (!roleDoc) {
      return res.status(400).json({
        success: false,
        error: 'Invalid role specified'
      });
    }

    // Validate department if provided
    if (department) {
      const deptDoc = await Department.findById(department);
      if (!deptDoc) {
        return res.status(400).json({
          success: false,
          error: 'Invalid department specified'
        });
      }
    }

    // Validate groups if provided
    if (groups.length > 0) {
      const validGroups = await Group.find({
        _id: { $in: groups },
        isActive: true
      });

      if (validGroups.length !== groups.length) {
        return res.status(400).json({
          success: false,
          error: 'Some groups are invalid or inactive'
        });
      }
    }

    // Create user
    const user = new User({
      username,
      email,
      password,
      fullName,
      role: roleDoc._id,
      department,
      groups
    });

    await user.save();

    // Populate user data for response
    const populatedUser = await User.findById(user._id)
      .populate('role', 'name permissions')
      .populate('department', 'name code')
      .populate('groups', 'name code')
      .select('-password -refreshTokens');

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: populatedUser
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create user'
    });
  }
});

// @route   GET /api/users/:id
// @desc    Get user by ID (Admin only)
// @access  Private (manage_users permission)
router.get('/:id', requirePermission('manage_users'), idValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { id } = req.params;

    const user = await User.findById(id)
      .populate('role', 'name permissions')
      .populate('department', 'name code')
      .populate('groups', 'name code')
      .select('-password -refreshTokens');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user'
    });
  }
});

// @route   PUT /api/users/:id
// @desc    Update user (Admin only)
// @access  Private (manage_users permission)
router.put('/:id', requirePermission('manage_users'), idValidation, updateUserValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { id } = req.params;
    const updateData = {};

    // Build update data from request body
    const allowedFields = ['username', 'email', 'fullName', 'role', 'department', 'groups', 'isActive'];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        if (field === 'role') {
          // Handle role validation
          const roleName = req.body[field];
          const roleDoc = require('../models').Role.findOne({ name: roleName });
          if (roleDoc) {
            updateData[field] = roleDoc._id;
          }
        } else {
          updateData[field] = req.body[field];
        }
      }
    });

    // Check if user exists
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Check if username or email already exists (excluding current user)
    if (updateData.username || updateData.email) {
      const existingUser = await User.findOne({
        _id: { $ne: id },
        $or: [
          ...(updateData.username ? [{ username: updateData.username }] : []),
          ...(updateData.email ? [{ email: updateData.email }] : [])
        ]
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: updateData.username ? 'Username already exists' : 'Email already exists'
        });
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('role', 'name permissions')
     .populate('department', 'name code')
     .populate('groups', 'name code')
     .select('-password -refreshTokens');

    res.json({
      success: true,
      message: 'User updated successfully',
      data: updatedUser
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user'
    });
  }
});

// @route   DELETE /api/users/:id
// @desc    Soft delete user (Admin only)
// @access  Private (manage_users permission)
router.delete('/:id', requirePermission('manage_users'), idValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { id } = req.params;

    // Prevent self-deletion
    if (id === req.user.id) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete your own account'
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Soft delete by setting isActive to false
    user.isActive = false;
    await user.save();

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete user'
    });
  }
});

// @route   POST /api/users/bulk-action
// @desc    Bulk action on users (activate/deactivate/role change) (Admin only)
// @access  Private (manage_users permission)
router.post('/bulk-action', requirePermission('manage_users'), [
  body('action').isIn(['activate', 'deactivate', 'delete', 'changeRole']).withMessage('Invalid action'),
  body('userIds').isArray({ min: 1 }).withMessage('User IDs must be a non-empty array'),
  body('userIds.*').isMongoId().withMessage('Invalid user ID'),
  body('role').optional().isIn(['Admin', 'HOD', 'Teacher', 'Student']).withMessage('Invalid role')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { action, userIds, role } = req.body;

    // Prevent actions on self
    if (userIds.includes(req.user.id)) {
      return res.status(400).json({
        success: false,
        error: 'Cannot perform bulk action on your own account'
      });
    }

    let updateData = {};
    let message = '';

    switch (action) {
      case 'activate':
        updateData = { isActive: true };
        message = 'Users activated successfully';
        break;
      case 'deactivate':
        updateData = { isActive: false };
        message = 'Users deactivated successfully';
        break;
      case 'delete':
        updateData = { isActive: false };
        message = 'Users deleted successfully';
        break;
      case 'changeRole':
        if (!role) {
          return res.status(400).json({
            success: false,
            error: 'Role is required for role change action'
          });
        }
        const roleDoc = await Role.findOne({ name: role });
        if (!roleDoc) {
          return res.status(400).json({
            success: false,
            error: 'Invalid role specified'
          });
        }
        updateData = { role: roleDoc._id };
        message = `Users role changed to ${role} successfully`;
        break;
    }

    const result = await User.updateMany(
      { _id: { $in: userIds } },
      updateData
    );

    res.json({
      success: true,
      message,
      data: {
        modifiedCount: result.modifiedCount
      }
    });
  } catch (error) {
    console.error('Bulk action error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform bulk action'
    });
  }
});

module.exports = router;