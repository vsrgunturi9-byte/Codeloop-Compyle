const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = null;
    this.isConfigured = false;
    this.initializeTransporter();
  }

  initializeTransporter() {
    try {
      // Check if email configuration is available
      if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        this.transporter = nodemailer.createTransporter({
          host: process.env.SMTP_HOST,
          port: process.env.SMTP_PORT || 587,
          secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
          // Add connection pool and rate limiting
          pool: true,
          maxConnections: 5,
          maxMessages: 100,
          rateDelta: 1000,
          rateLimit: 5,
        });
        this.isConfigured = true;
        console.log('Email service configured successfully');
      } else {
        console.warn('Email service not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS environment variables.');
      }
    } catch (error) {
      console.error('Failed to initialize email service:', error);
    }
  }

  async sendVerificationEmail(email, verificationToken) {
    if (!this.isConfigured) {
      console.log('Email service not configured - skipping verification email to:', email);
      return { success: false, message: 'Email service not configured' };
    }

    try {
      const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email/${verificationToken}`;

      const mailOptions = {
        from: `"${process.env.EMAIL_FROM_NAME || 'Codeloop Platform'}" <${process.env.SMTP_USER}>`,
        to: email,
        subject: 'Verify Your Email Address - Codeloop Platform',
        html: this.getVerificationEmailTemplate(verificationUrl),
        text: this.getVerificationEmailTextTemplate(verificationUrl),
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('Verification email sent to:', email, 'Message ID:', info.messageId);

      return {
        success: true,
        messageId: info.messageId,
        message: 'Verification email sent successfully'
      };
    } catch (error) {
      console.error('Error sending verification email:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to send verification email'
      };
    }
  }

  async sendPasswordResetEmail(email, resetToken) {
    if (!this.isConfigured) {
      console.log('Email service not configured - skipping password reset email to:', email);
      return { success: false, message: 'Email service not configured' };
    }

    try {
      const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${resetToken}`;

      const mailOptions = {
        from: `"${process.env.EMAIL_FROM_NAME || 'Codeloop Platform'}" <${process.env.SMTP_USER}>`,
        to: email,
        subject: 'Reset Your Password - Codeloop Platform',
        html: this.getPasswordResetEmailTemplate(resetUrl),
        text: this.getPasswordResetEmailTextTemplate(resetUrl),
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('Password reset email sent to:', email, 'Message ID:', info.messageId);

      return {
        success: true,
        messageId: info.messageId,
        message: 'Password reset email sent successfully'
      };
    } catch (error) {
      console.error('Error sending password reset email:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to send password reset email'
      };
    }
  }

  async sendWelcomeEmail(email, fullName) {
    if (!this.isConfigured) {
      console.log('Email service not configured - skipping welcome email to:', email);
      return { success: false, message: 'Email service not configured' };
    }

    try {
      const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`;

      const mailOptions = {
        from: `"${process.env.EMAIL_FROM_NAME || 'Codeloop Platform'}" <${process.env.SMTP_USER}>`,
        to: email,
        subject: 'Welcome to Codeloop Platform!',
        html: this.getWelcomeEmailTemplate(fullName, loginUrl),
        text: this.getWelcomeEmailTextTemplate(fullName, loginUrl),
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('Welcome email sent to:', email, 'Message ID:', info.messageId);

      return {
        success: true,
        messageId: info.messageId,
        message: 'Welcome email sent successfully'
      };
    } catch (error) {
      console.error('Error sending welcome email:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to send welcome email'
      };
    }
  }

  async sendAssessmentNotificationEmail(email, assessmentTitle, startTime, duration) {
    if (!this.isConfigured) {
      console.log('Email service not configured - skipping assessment notification to:', email);
      return { success: false, message: 'Email service not configured' };
    }

    try {
      const assessmentUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/assessments`;

      const mailOptions = {
        from: `"${process.env.EMAIL_FROM_NAME || 'Codeloop Platform'}" <${process.env.SMTP_USER}>`,
        to: email,
        subject: `New Assessment: ${assessmentTitle}`,
        html: this.getAssessmentNotificationTemplate(assessmentTitle, startTime, duration, assessmentUrl),
        text: this.getAssessmentNotificationTextTemplate(assessmentTitle, startTime, duration, assessmentUrl),
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('Assessment notification sent to:', email, 'Message ID:', info.messageId);

      return {
        success: true,
        messageId: info.messageId,
        message: 'Assessment notification sent successfully'
      };
    } catch (error) {
      console.error('Error sending assessment notification:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to send assessment notification'
      };
    }
  }

  // Email Templates
  getVerificationEmailTemplate(verificationUrl) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Verification - Codeloop Platform</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Verify Your Email Address</h1>
          </div>
          <div class="content">
            <p>Thank you for registering on the Codeloop Platform! To complete your registration and activate your account, please verify your email address by clicking the button below:</p>

            <div style="text-align: center;">
              <a href="${verificationUrl}" class="button">Verify Email Address</a>
            </div>

            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background: #e9e9e9; padding: 10px; border-radius: 5px;">${verificationUrl}</p>

            <p><strong>Note:</strong> This verification link will expire in 24 hours.</p>

            <p>If you didn't create an account on Codeloop Platform, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>Best regards,<br>The Codeloop Platform Team</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getVerificationEmailTextTemplate(verificationUrl) {
    return `
Verify Your Email Address - Codeloop Platform

Thank you for registering on the Codeloop Platform! To complete your registration and activate your account, please visit this link:

${verificationUrl}

Note: This verification link will expire in 24 hours.

If you didn't create an account on Codeloop Platform, please ignore this email.

Best regards,
The Codeloop Platform Team
    `;
  }

  getPasswordResetEmailTemplate(resetUrl) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset - Codeloop Platform</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: #f5576c; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Reset Your Password</h1>
          </div>
          <div class="content">
            <p>We received a request to reset your password for your Codeloop Platform account. Click the button below to reset your password:</p>

            <div style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </div>

            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background: #e9e9e9; padding: 10px; border-radius: 5px;">${resetUrl}</p>

            <div class="warning">
              <p><strong>Important:</strong></p>
              <ul>
                <li>This password reset link will expire in 1 hour.</li>
                <li>If you didn't request a password reset, please ignore this email.</li>
                <li>For security reasons, you'll be logged out from all devices after resetting your password.</li>
              </ul>
            </div>
          </div>
          <div class="footer">
            <p>Best regards,<br>The Codeloop Platform Team</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getPasswordResetEmailTextTemplate(resetUrl) {
    return `
Reset Your Password - Codeloop Platform

We received a request to reset your password for your Codeloop Platform account. To reset your password, please visit this link:

${resetUrl}

Important:
- This password reset link will expire in 1 hour.
- If you didn't request a password reset, please ignore this email.
- For security reasons, you'll be logged out from all devices after resetting your password.

Best regards,
The Codeloop Platform Team
    `;
  }

  getWelcomeEmailTemplate(fullName, loginUrl) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Codeloop Platform</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: #00f2fe; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          .feature-list { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to Codeloop Platform! 🎉</h1>
          </div>
          <div class="content">
            <p>Hi ${fullName},</p>
            <p>Welcome to Codeloop Platform! We're excited to have you join our community of learners and educators.</p>

            <div class="feature-list">
              <h3>What you can do on Codeloop:</h3>
              <ul>
                <li>📚 Access learning modules and practice coding problems</li>
                <li>🎯 Take assessments and track your progress</li>
                <li>💻 Write and execute code in our integrated editor</li>
                <li>📊 View detailed performance analytics</li>
                <li>👥 Collaborate with peers and instructors</li>
              </ul>
            </div>

            <div style="text-align: center;">
              <a href="${loginUrl}" class="button">Get Started Now</a>
            </div>

            <p>If you have any questions or need help getting started, don't hesitate to reach out to our support team.</p>
          </div>
          <div class="footer">
            <p>Happy coding!<br>The Codeloop Platform Team</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getWelcomeEmailTextTemplate(fullName, loginUrl) {
    return `
Welcome to Codeloop Platform! 🎉

Hi ${fullName},

Welcome to Codeloop Platform! We're excited to have you join our community of learners and educators.

What you can do on Codeloop:
📚 Access learning modules and practice coding problems
🎯 Take assessments and track your progress
💻 Write and execute code in our integrated editor
📊 View detailed performance analytics
👥 Collaborate with peers and instructors

Get started here: ${loginUrl}

If you have any questions or need help getting started, don't hesitate to reach out to our support team.

Happy coding!
The Codeloop Platform Team
    `;
  }

  getAssessmentNotificationTemplate(assessmentTitle, startTime, duration, assessmentUrl) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Assessment - Codeloop Platform</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: #fa709a; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          .info-box { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #fa709a; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>New Assessment Assigned! 📝</h1>
          </div>
          <div class="content">
            <p>You have been assigned a new assessment on the Codeloop Platform.</p>

            <div class="info-box">
              <h3>Assessment Details:</h3>
              <p><strong>Title:</strong> ${assessmentTitle}</p>
              <p><strong>Start Time:</strong> ${new Date(startTime).toLocaleString()}</p>
              <p><strong>Duration:</strong> ${Math.floor(duration / 60)} hours ${duration % 60 > 0 ? duration % 60 + ' minutes' : ''}</p>
            </div>

            <div style="text-align: center;">
              <a href="${assessmentUrl}" class="button">View Assessment</a>
            </div>

            <p>Please make sure to log in before the assessment start time. You'll be able to access the assessment once it begins.</p>

            <p>Good luck! 🚀</p>
          </div>
          <div class="footer">
            <p>Best regards,<br>The Codeloop Platform Team</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getAssessmentNotificationTextTemplate(assessmentTitle, startTime, duration, assessmentUrl) {
    return `
New Assessment Assigned! 📝

You have been assigned a new assessment on the Codeloop Platform.

Assessment Details:
Title: ${assessmentTitle}
Start Time: ${new Date(startTime).toLocaleString()}
Duration: ${Math.floor(duration / 60)} hours ${duration % 60 > 0 ? duration % 60 + ' minutes' : ''}

View the assessment here: ${assessmentUrl}

Please make sure to log in before the assessment start time. You'll be able to access the assessment once it begins.

Good luck! 🚀

Best regards,
The Codeloop Platform Team
    `;
  }

  // Test email configuration
  async testEmailConfiguration() {
    if (!this.isConfigured) {
      return { success: false, message: 'Email service not configured' };
    }

    try {
      await this.transporter.verify();
      return { success: true, message: 'Email configuration is valid' };
    } catch (error) {
      return { success: false, error: error.message, message: 'Email configuration test failed' };
    }
  }
}

// Create and export singleton instance
const emailService = new EmailService();

module.exports = emailService;