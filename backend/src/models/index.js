// Export all models
const User = require('./User');
const Role = require('./Role');
const ActionPermission = require('./ActionPermission');
const Department = require('./Department');
const Group = require('./Group');
const Module = require('./Module');
const Question = require('./Question');
const Assessment = require('./Assessment');
const Note = require('./Note');
const Notice = require('./Notice');
const PerformanceMetric = require('./PerformanceMetric');
const AssessmentSubmission = require('./AssessmentSubmission');

module.exports = {
  User,
  Role,
  ActionPermission,
  Department,
  Group,
  Module,
  Question,
  Assessment,
  Note,
  Notice,
  PerformanceMetric,
  AssessmentSubmission
};

// Function to initialize default data
const initializeDefaults = async () => {
  try {
    console.log('Initializing default data...');

    // Create default permissions
    await ActionPermission.createDefaultPermissions();
    console.log('✓ Default permissions created');

    // Create default roles
    await Role.createDefaultRoles();
    console.log('✓ Default roles created');

    console.log('✓ Default data initialization completed');
  } catch (error) {
    console.error('Error initializing default data:', error);
  }
};

module.exports.initializeDefaults = initializeDefaults;