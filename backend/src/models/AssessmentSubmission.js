const mongoose = require('mongoose');

const testResultSchema = new mongoose.Schema({
  testCase: {
    type: Number,
    required: true
  },
  passed: {
    type: Boolean,
    required: true
  },
  actualOutput: {
    type: String,
    required: true
  },
  expectedOutput: {
    type: String,
    required: true
  },
  executionTime: {
    type: Number,
    required: true // in milliseconds
  },
  memoryUsage: {
    type: Number,
    required: true // in KB
  },
  points: {
    type: Number,
    default: 0
  }
}, { _id: false });

const codingAttemptSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true
  },
  language: {
    type: String,
    required: true,
    enum: ['python', 'java', 'c', 'cpp', 'javascript']
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  testResults: [testResultSchema],
  totalPassed: {
    type: Number,
    default: 0
  },
  totalTestCases: {
    type: Number,
    default: 0
  },
  score: {
    type: Number,
    default: 0
  },
  executionTime: {
    type: Number,
    default: 0 // total execution time in milliseconds
  },
  status: {
    type: String,
    enum: ['pending', 'running', 'completed', 'error', 'timeout'],
    default: 'pending'
  },
  errorMessage: {
    type: String
  }
}, { _id: false });

const mcqAnswerSchema = new mongoose.Schema({
  question: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    required: true
  },
  selectedAnswer: {
    type: Number,
    required: true
  },
  isCorrect: {
    type: Boolean,
    required: true
  },
  answeredAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const codingSubmissionSchema = new mongoose.Schema({
  question: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    required: true
  },
  attempts: [codingAttemptSchema],
  bestScore: {
    type: Number,
    default: 0
  },
  isCompleted: {
    type: Boolean,
    default: false
  },
  totalAttempts: {
    type: Number,
    default: 0
  }
}, { _id: false });

const assessmentSubmissionSchema = new mongoose.Schema({
  assessment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Assessment',
    required: [true, 'Assessment is required']
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Student is required']
  },

  // Timing
  startedAt: {
    type: Date,
    required: [true, 'Start time is required'],
    default: Date.now
  },
  submittedAt: {
    type: Date
  },
  timeTaken: {
    type: Number, // in seconds
    min: [0, 'Time taken cannot be negative']
  },
  endTime: {
    type: Date
  },

  // MCQ Section
  mcqAnswers: [mcqAnswerSchema],
  mcqScore: {
    type: Number,
    default: 0
  },
  mcqMaxScore: {
    type: Number,
    default: 0
  },

  // Coding Section
  codingSubmissions: [codingSubmissionSchema],
  codingScore: {
    type: Number,
    default: 0
  },
  codingMaxScore: {
    type: Number,
    default: 0
  },

  // Results
  totalScore: {
    type: Number,
    default: 0
  },
  maxScore: {
    type: Number,
    default: 0
  },
  percentage: {
    type: Number,
    default: 0
  },
  rank: {
    type: Number,
    default: null
  },
  grade: {
    type: String,
    enum: ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D', 'F'],
    default: null
  },

  // Status
  status: {
    type: String,
    enum: ['in_progress', 'submitted', 'evaluated', 'expired'],
    default: 'in_progress'
  },

  // Tracking
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  },
  tabSwitches: {
    type: Number,
    default: 0
  },
  suspiciousActivity: [{
    type: String,
    description: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],

  // Auto-save data
  currentQuestion: {
    type: Number,
    default: 0
  },
  savedProgress: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
assessmentSubmissionSchema.index({ assessment: 1 });
assessmentSubmissionSchema.index({ student: 1 });
assessmentSubmissionSchema.index({ status: 1 });
assessmentSubmissionSchema.index({ startedAt: 1 });
assessmentSubmissionSchema.index({ submittedAt: 1 });
assessmentSubmissionSchema.index({ totalScore: -1 });
assessmentSubmissionSchema.index({ percentage: -1 });

// Virtuals
assessmentSubmissionSchema.virtual('isLateSubmission').get(function() {
  if (!this.submittedAt || !this.endTime) return false;
  return this.submittedAt > this.endTime;
});

assessmentSubmissionSchema.virtual('timeRemaining').get(function() {
  if (!this.endTime) return 0;
  const now = new Date();
  return Math.max(0, Math.floor((this.endTime - now) / 1000)); // in seconds
});

assessmentSubmissionSchema.virtual('isExpired').get(function() {
  if (!this.endTime) return false;
  return new Date() > this.endTime;
});

// Pre-save middleware to calculate scores and time
assessmentSubmissionSchema.pre('save', function(next) {
  // Calculate total score
  this.totalScore = this.mcqScore + this.codingScore;
  this.maxScore = this.mcqMaxScore + this.codingMaxScore;

  // Calculate percentage
  if (this.maxScore > 0) {
    this.percentage = (this.totalScore / this.maxScore) * 100;
  }

  // Calculate grade
  if (this.percentage >= 95) this.grade = 'A+';
  else if (this.percentage >= 90) this.grade = 'A';
  else if (this.percentage >= 85) this.grade = 'B+';
  else if (this.percentage >= 80) this.grade = 'B';
  else if (this.percentage >= 75) this.grade = 'C+';
  else if (this.percentage >= 70) this.grade = 'C';
  else if (this.percentage >= 60) this.grade = 'D';
  else this.grade = 'F';

  // Calculate time taken if submitted
  if (this.submittedAt && this.startedAt) {
    this.timeTaken = Math.floor((this.submittedAt - this.startedAt) / 1000);
  }

  next();
});

// Instance methods
assessmentSubmissionSchema.methods.submitMCQAnswer = function(questionId, selectedAnswer, correctAnswer) {
  const existingAnswer = this.mcqAnswers.find(answer =>
    answer.question.toString() === questionId.toString()
  );

  if (existingAnswer) {
    existingAnswer.selectedAnswer = selectedAnswer;
    existingAnswer.isCorrect = selectedAnswer === correctAnswer;
    existingAnswer.answeredAt = new Date();
  } else {
    this.mcqAnswers.push({
      question: questionId,
      selectedAnswer,
      isCorrect: selectedAnswer === correctAnswer,
      answeredAt: new Date()
    });
  }

  // Recalculate MCQ score
  this.recalculateMCQScore();
  return this.save();
};

assessmentSubmissionSchema.methods.submitCodingAttempt = function(questionId, code, language) {
  let codingSubmission = this.codingSubmissions.find(sub =>
    sub.question.toString() === questionId.toString()
  );

  if (!codingSubmission) {
    codingSubmission = {
      question: questionId,
      attempts: [],
      bestScore: 0,
      isCompleted: false,
      totalAttempts: 0
    };
    this.codingSubmissions.push(codingSubmission);
  }

  // Add new attempt
  codingSubmission.attempts.push({
    code,
    language,
    submittedAt: new Date(),
    status: 'pending'
  });
  codingSubmission.totalAttempts += 1;

  return this.save();
};

assessmentSubmissionSchema.methods.updateCodingAttemptResults = function(questionId, attemptIndex, results) {
  const codingSubmission = this.codingSubmissions.find(sub =>
    sub.question.toString() === questionId.toString()
  );

  if (codingSubmission && codingSubmission.attempts[attemptIndex]) {
    const attempt = codingSubmission.attempts[attemptIndex];
    attempt.testResults = results.testResults;
    attempt.totalPassed = results.totalPassed;
    attempt.totalTestCases = results.totalTestCases;
    attempt.score = results.score;
    attempt.executionTime = results.executionTime;
    attempt.status = results.status;

    if (results.errorMessage) {
      attempt.errorMessage = results.errorMessage;
    }

    // Update best score if this attempt is better
    if (results.score > codingSubmission.bestScore) {
      codingSubmission.bestScore = results.score;
    }

    // Mark as completed if all test cases pass
    if (results.totalPassed === results.totalTestCases && results.totalTestCases > 0) {
      codingSubmission.isCompleted = true;
    }

    // Recalculate coding score
    this.recalculateCodingScore();
  }

  return this.save();
};

assessmentSubmissionSchema.methods.recalculateMCQScore = function() {
  // This would typically fetch the assessment and calculate scores based on points
  // For now, we'll use a simple calculation
  this.mcqScore = this.mcqAnswers.filter(answer => answer.isCorrect).length;
  return this.mcqScore;
};

assessmentSubmissionSchema.methods.recalculateCodingScore = function() {
  this.codingScore = this.codingSubmissions.reduce((sum, submission) => sum + submission.bestScore, 0);
  return this.codingScore;
};

assessmentSubmissionSchema.methods.submit = function() {
  this.submittedAt = new Date();
  this.status = 'submitted';

  // Calculate final scores
  this.recalculateMCQScore();
  this.recalculateCodingScore();

  return this.save();
};

assessmentSubmissionSchema.methods.recordSuspiciousActivity = function(type, description) {
  this.suspiciousActivity.push({
    type,
    description,
    timestamp: new Date()
  });
  return this.save();
};

// Static methods
assessmentSubmissionSchema.statics.findByAssessment = function(assessmentId, options = {}) {
  const { page = 1, limit = 10, status = null } = options;

  const query = { assessment: assessmentId };
  if (status) query.status = status;

  return this.find(query)
    .populate('student', 'fullName email profilePhoto')
    .sort({ totalScore: -1, submittedAt: 1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);
};

assessmentSubmissionSchema.statics.findByStudent = function(studentId, options = {}) {
  const { page = 1, limit = 10 } = options;

  return this.find({ student: studentId })
    .populate('assessment', 'title description startTime')
    .sort({ startedAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);
};

assessmentSubmissionSchema.statics.getSubmissionByStudentAndAssessment = function(studentId, assessmentId) {
  return this.findOne({ student: studentId, assessment: assessmentId })
    .populate('assessment')
    .populate({
      path: 'codingSubmissions.question',
      select: 'title description testCases'
    })
    .populate({
      path: 'mcqAnswers.question',
      select: 'title options correctAnswer'
    });
};

assessmentSubmissionSchema.statics.getLeaderboard = function(assessmentId, options = {}) {
  const { limit = 50 } = options;

  return this.find({ assessment: assessmentId, status: { $in: ['submitted', 'evaluated'] } })
    .populate('student', 'fullName email profilePhoto')
    .sort({ totalScore: -1, timeTaken: 1, submittedAt: 1 })
    .limit(limit);
};

assessmentSubmissionSchema.statics.updateRanks = function(assessmentId) {
  return this.find({ assessment: assessmentId, status: { $in: ['submitted', 'evaluated'] } })
    .sort({ totalScore: -1, timeTaken: 1, submittedAt: 1 })
    .then(submissions => {
      const updatePromises = submissions.map((submission, index) => {
        submission.rank = index + 1;
        return submission.save();
      });
      return Promise.all(updatePromises);
    });
};

// Static method to get assessment statistics
assessmentSubmissionSchema.statics.getAssessmentStats = function(assessmentId) {
  return this.aggregate([
    { $match: { assessment: mongoose.Types.ObjectId(assessmentId) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        avgScore: { $avg: '$totalScore' },
        maxScore: { $max: '$totalScore' },
        minScore: { $min: '$totalScore' },
        avgTime: { $avg: '$timeTaken' }
      }
    }
  ]);
};

module.exports = mongoose.model('AssessmentSubmission', assessmentSubmissionSchema);