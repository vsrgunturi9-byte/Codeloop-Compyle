const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { User } = require('../models');

class AuthService {
  constructor() {
    this.accessTokenExpiry = process.env.JWT_EXPIRE || '15m';
    this.refreshTokenExpiry = process.env.JWT_REFRESH_EXPIRE || '7d';
  }

  // Generate tokens
  generateTokens(payload) {
    const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: this.accessTokenExpiry
    });

    const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
      expiresIn: this.refreshTokenExpiry
    });

    return { accessToken, refreshToken };
  }

  // Generate and store refresh token
  async generateAndStoreRefreshToken(user, device = 'unknown') {
    const { refreshToken } = this.generateTokens({
      id: user._id,
      email: user.email,
      role: user.role
    });

    // Remove old refresh tokens for this device (keep only one per device)
    user.refreshTokens = user.refreshTokens.filter(token => token.device !== device);

    // Add new refresh token
    user.refreshTokens.push({
      token: refreshToken,
      device,
      createdAt: new Date()
    });

    await user.save();

    return refreshToken;
  }

  // Verify access token
  verifyAccessToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      throw new Error('Invalid access token');
    }
  }

  // Verify refresh token
  verifyRefreshToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  // Refresh access token
  async refreshToken(refreshToken, device = 'unknown') {
    try {
      // Verify refresh token
      const decoded = this.verifyRefreshToken(refreshToken);

      // Find user
      const user = await User.findById(decoded.id).select('+refreshTokens');
      if (!user || !user.isActive) {
        throw new Error('User not found or inactive');
      }

      // Check if refresh token exists and is valid
      const tokenExists = user.refreshTokens.some(rt => rt.token === refreshToken);
      if (!tokenExists) {
        throw new Error('Refresh token not found');
      }

      // Generate new tokens
      const { accessToken, refreshToken: newRefreshToken } = this.generateTokens({
        id: user._id,
        email: user.email,
        role: user.role
      });

      // Remove old refresh token and add new one
      user.refreshTokens = user.refreshTokens.filter(rt => rt.token !== refreshToken);
      user.refreshTokens.push({
        token: newRefreshToken,
        device,
        createdAt: new Date()
      });

      await user.save();

      return { accessToken, refreshToken: newRefreshToken };
    } catch (error) {
      throw new Error('Token refresh failed: ' + error.message);
    }
  }

  // Logout user - invalidate refresh token
  async logout(userId, refreshToken = null) {
    try {
      const user = await User.findById(userId).select('+refreshTokens');
      if (!user) return;

      if (refreshToken) {
        // Remove specific refresh token
        user.refreshTokens = user.refreshTokens.filter(rt => rt.token !== refreshToken);
      } else {
        // Remove all refresh tokens
        user.refreshTokens = [];
      }

      await user.save();
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  // Logout from all devices
  async logoutAll(userId) {
    try {
      await User.findByIdAndUpdate(userId, {
        $set: { refreshTokens: [] }
      });
    } catch (error) {
      console.error('Logout all error:', error);
    }
  }

  // Clean up expired refresh tokens
  async cleanupExpiredTokens() {
    try {
      const users = await User.find({ 'refreshTokens.0': { $exists: true } }).select('+refreshTokens');

      for (const user of users) {
        let hasChanges = false;

        user.refreshTokens = user.refreshTokens.filter(rt => {
          try {
            // Verify if token is still valid
            this.verifyRefreshToken(rt.token);
            return true; // Token is still valid
          } catch (error) {
            hasChanges = true;
            return false; // Token is expired
          }
        });

        if (hasChanges) {
          await user.save();
        }
      }

      console.log('Token cleanup completed');
    } catch (error) {
      console.error('Token cleanup error:', error);
    }
  }

  // Get active sessions for user
  async getUserSessions(userId) {
    try {
      const user = await User.findById(userId).select('+refreshTokens');
      if (!user) return [];

      const sessions = user.refreshTokens.map(rt => ({
        device: rt.device,
        createdAt: rt.createdAt,
        lastUsed: rt.createdAt // We could track last used timestamp
      }));

      return sessions;
    } catch (error) {
      console.error('Get sessions error:', error);
      return [];
    }
  }

  // Generate email verification token
  generateEmailVerificationToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  // Generate password reset token
  generatePasswordResetToken() {
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

    return { resetToken, resetTokenHash };
  }

  // Verify password reset token
  async verifyPasswordResetToken(tokenHash) {
    try {
      const user = await User.findOne({
        resetPasswordToken: tokenHash,
        resetPasswordExpires: { $gt: Date.now() }
      });

      if (!user) {
        throw new Error('Invalid or expired reset token');
      }

      return user;
    } catch (error) {
      throw new Error('Password reset token verification failed');
    }
  }

  // Change password
  async changePassword(userId, currentPassword, newPassword) {
    try {
      const user = await User.findById(userId).select('+password');
      if (!user) {
        throw new Error('User not found');
      }

      // Verify current password
      const isCorrect = await user.correctPassword(currentPassword, user.password);
      if (!isCorrect) {
        throw new Error('Current password is incorrect');
      }

      // Update password
      user.password = newPassword;
      await user.save();

      // Logout from all devices after password change
      await this.logoutAll(userId);

      return true;
    } catch (error) {
      throw new Error('Password change failed: ' + error.message);
    }
  }

  // Check if user has specific permission
  async checkPermission(userId, permissionName) {
    try {
      const user = await User.findById(userId).populate('role');
      if (!user || !user.isActive) {
        return false;
      }

      return await user.hasPermission(permissionName);
    } catch (error) {
      console.error('Permission check error:', error);
      return false;
    }
  }

  // Check if user has specific role
  async checkRole(userId, roleName) {
    try {
      const user = await User.findById(userId).populate('role');
      if (!user || !user.isActive) {
        return false;
      }

      return await user.hasRole(roleName);
    } catch (error) {
      console.error('Role check error:', error);
      return false;
    }
  }

  // Get user role hierarchy
  async getUserRoleHierarchy(userId) {
    try {
      const user = await User.findById(userId).populate('role');
      if (!user || !user.isActive) {
        return null;
      }

      return await user.getRoleHierarchy();
    } catch (error) {
      console.error('Role hierarchy check error:', error);
      return null;
    }
  }
}

module.exports = new AuthService();