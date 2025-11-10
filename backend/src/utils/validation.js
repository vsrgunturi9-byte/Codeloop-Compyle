const { param, body } = require('express-validator');

// Common validation middleware
const idValidation = [
  param('id').isMongoId().withMessage('Invalid ID format')
];

const idValidationWithBody = [
  body('id').isMongoId().withMessage('Invalid ID format')
];

const bulkIdValidation = [
  body('ids').isArray().withMessage('IDs must be an array'),
  body('ids.*').isMongoId().withMessage('Invalid ID format')
];

const paginationValidation = [
  body('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  body('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  body('sort').optional().isString().withMessage('Sort field must be a string'),
  body('order').optional().isIn(['asc', 'desc']).withMessage('Order must be asc or desc')
];

const searchValidation = [
  body('search').optional().isString().trim().isLength({ min: 1, max: 100 }).withMessage('Search term must be between 1 and 100 characters')
];

const dateRangeValidation = [
  body('startDate').optional().isISO8601().withMessage('Invalid start date format'),
  body('endDate').optional().isISO8601().withMessage('Invalid end date format')
];

// User specific validations
const createUserValidation = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('fullName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters'),
  body('role')
    .isIn(['Admin', 'HOD', 'Teacher', 'Student'])
    .withMessage('Invalid role specified'),
  body('department')
    .optional()
    .isMongoId()
    .withMessage('Invalid department ID'),
  body('groups')
    .optional()
    .isArray()
    .withMessage('Groups must be an array'),
  body('groups.*')
    .optional()
    .isMongoId()
    .withMessage('Invalid group ID')
];

const updateUserValidation = [
  body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('fullName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters'),
  body('role')
    .optional()
    .isIn(['Admin', 'HOD', 'Teacher', 'Student'])
    .withMessage('Invalid role specified'),
  body('department')
    .optional()
    .isMongoId()
    .withMessage('Invalid department ID'),
  body('groups')
    .optional()
    .isArray()
    .withMessage('Groups must be an array'),
  body('groups.*')
    .optional()
    .isMongoId()
    .withMessage('Invalid group ID'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean')
];

const passwordChangeValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number')
];

// File upload validation
const fileUploadValidation = [
  body('fileName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('File name must be between 1 and 255 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters')
];

// Department validations
const createDepartmentValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Department name must be between 2 and 100 characters'),
  body('code')
    .trim()
    .isLength({ min: 2, max: 10 })
    .withMessage('Department code must be between 2 and 10 characters')
    .matches(/^[A-Z0-9_]+$/)
    .withMessage('Department code can only contain uppercase letters, numbers, and underscores'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters'),
  body('hod')
    .optional()
    .isMongoId()
    .withMessage('Invalid HOD ID')
];

// Group validations
const createGroupValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Group name must be between 2 and 100 characters'),
  body('code')
    .trim()
    .isLength({ min: 2, max: 20 })
    .withMessage('Group code must be between 2 and 20 characters')
    .matches(/^[A-Za-z0-9_-]+$/)
    .withMessage('Group code can only contain letters, numbers, underscores, and hyphens'),
  body('department')
    .isMongoId()
    .withMessage('Invalid department ID'),
  body('teacher')
    .optional()
    .isMongoId()
    .withMessage('Invalid teacher ID'),
  body('students')
    .optional()
    .isArray()
    .withMessage('Students must be an array'),
  body('students.*')
    .optional()
    .isMongoId()
    .withMessage('Invalid student ID'),
  body('maxCapacity')
    .optional()
    .isInt({ min: 1, max: 200 })
    .withMessage('Max capacity must be between 1 and 200')
];

// Question validations
const createQuestionValidation = [
  body('title')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Question title must be between 5 and 200 characters'),
  body('description')
    .trim()
    .isLength({ min: 10, max: 5000 })
    .withMessage('Question description must be between 10 and 5000 characters'),
  body('type')
    .isIn(['coding', 'mcq'])
    .withMessage('Question type must be either coding or mcq'),
  body('difficulty')
    .isIn(['easy', 'medium', 'hard'])
    .withMessage('Difficulty must be easy, medium, or hard'),
  body('department')
    .optional()
    .isMongoId()
    .withMessage('Invalid department ID'),
  body('language')
    .optional()
    .isIn(['python', 'java', 'c', 'cpp', 'javascript'])
    .withMessage('Invalid programming language'),
  body('testCases')
    .optional()
    .isArray()
    .withMessage('Test cases must be an array'),
  body('testCases.*.input')
    .optional()
    .trim()
    .withMessage('Test case input cannot be empty'),
  body('testCases.*.expectedOutput')
    .optional()
    .trim()
    .withMessage('Test case expected output cannot be empty'),
  body('options')
    .optional()
    .isArray({ min: 2, max: 6 })
    .withMessage('MCQ options must be an array with 2-6 options'),
  body('options.*')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('MCQ options cannot be empty'),
  body('correctAnswer')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Correct answer must be a non-negative integer'),
  body('explanation')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Explanation cannot exceed 2000 characters'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('tags.*')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Each tag must be between 1 and 50 characters')
];

// Assessment validations
const createAssessmentValidation = [
  body('title')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Assessment title must be between 5 and 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description cannot exceed 2000 characters'),
  body('department')
    .isMongoId()
    .withMessage('Invalid department ID'),
  body('groups')
    .isArray({ min: 1 })
    .withMessage('At least one group must be assigned'),
  body('groups.*')
    .isMongoId()
    .withMessage('Invalid group ID'),
  body('startTime')
    .isISO8601()
    .withMessage('Invalid start time format'),
  body('duration')
    .isInt({ min: 15, max: 480 })
    .withMessage('Duration must be between 15 and 480 minutes'),
  body('codingQuestions')
    .optional()
    .isArray()
    .withMessage('Coding questions must be an array'),
  body('codingQuestions.*.question')
    .optional()
    .isMongoId()
    .withMessage('Invalid coding question ID'),
  body('codingQuestions.*.points')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Coding question points must be between 1 and 100'),
  body('mcqQuestions')
    .optional()
    .isArray()
    .withMessage('MCQ questions must be an array'),
  body('mcqQuestions.*.question')
    .optional()
    .isMongoId()
    .withMessage('Invalid MCQ question ID'),
  body('mcqQuestions.*.points')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('MCQ question points must be between 1 and 50'),
  body('shuffleQuestions')
    .optional()
    .isBoolean()
    .withMessage('shuffleQuestions must be a boolean'),
  body('showResultsImmediately')
    .optional()
    .isBoolean()
    .withMessage('showResultsImmediately must be a boolean'),
  body('allowLateSubmission')
    .optional()
    .isBoolean()
    .withMessage('allowLateSubmission must be a boolean'),
  body('passingScore')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('Passing score must be between 0 and 100')
];

module.exports = {
  idValidation,
  idValidationWithBody,
  bulkIdValidation,
  paginationValidation,
  searchValidation,
  dateRangeValidation,
  createUserValidation,
  updateUserValidation,
  passwordChangeValidation,
  fileUploadValidation,
  createDepartmentValidation,
  createGroupValidation,
  createQuestionValidation,
  createAssessmentValidation
};