import Student from '../models/Student.js';
import Course from '../models/Course.js';
import Enrollment from '../models/Enrollment.js';
import Progress from '../models/Progress.js';
import Assessment from '../models/Assessment.js';
import Certificate from '../models/Certificate.js';
import Notification from '../models/Notification.js';
import SupportTicket from '../models/SupportTicket.js';
import mongoose from 'mongoose';

// Get student profile
export const getStudentProfile = async (req, res, next) => {
  try {
    const student = await Student.findById(req.user.id)
      .select('-password -otp -otpExpires -resetPasswordToken -resetPasswordExpire');

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    res.status(200).json({ success: true, data: student });
  } catch (error) {
    next(error);
  }
};

// Update student profile
export const updateStudentProfile = async (req, res, next) => {
  try {
    const { education, occupation, skills, interests } = req.body;

    const student = await Student.findByIdAndUpdate(
      req.user.id,
      { education, occupation, skills, interests },
      { new: true, runValidators: true }
    ).select('-password -otp -otpExpires -resetPasswordToken -resetPasswordExpire');

    res.status(200).json({ success: true, data: student });
  } catch (error) {
    next(error);
  }
};

// Enroll in a course
export const enrollInCourse = async (req, res, next) => {
  try {
    const { courseId } = req.body;

    // Check if course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    // Check if already enrolled
    const existingEnrollment = await Enrollment.findOne({
      student: req.user.id,
      course: courseId
    });

    if (existingEnrollment) {
      return res.status(400).json({ success: false, message: 'Already enrolled in this course' });
    }

    // Create enrollment
    const enrollment = await Enrollment.create({
      student: req.user.id,
      course: courseId,
      status: 'active'
    });

    // Create initial progress record
    await Progress.create({
      student: req.user.id,
      course: courseId,
      enrollment: enrollment._id,
      curriculumProgress: [],
      assessmentProgress: [],
      overallProgress: 0
    });

    // Update student's enrolled courses
    await Student.findByIdAndUpdate(req.user.id, {
      $push: {
        enrolledCourses: {
          course: courseId,
          enrollmentDate: Date.now()
        }
      }
    });

    // Update course's total students
    await Course.findByIdAndUpdate(courseId, {
      $inc: { totalStudents: 1 }
    });

    res.status(201).json({ success: true, data: enrollment });
  } catch (error) {
    next(error);
  }
};

// Get enrolled courses
export const getEnrolledCourses = async (req, res, next) => {
  try {
    const enrollments = await Enrollment.find({ student: req.user.id })
      .populate({
        path: 'course',
        select: 'title description thumbnail instructor duration price discountPrice rating totalRatings',
        populate: {
          path: 'instructor',
          select: 'firstName lastName avatar',
          model: 'User', // Fallback to User model
          match: { role: 'instructor' } // Ensure only instructors are populated
        }
      })
      .sort({ enrollmentDate: -1 });

    res.status(200).json({ success: true, data: enrollments });
  } catch (error) {
    next(error);
  }
};

// Get course progress
export const getCourseProgress = async (req, res, next) => {
  try {
    const progress = await Progress.findOne({
      student: req.user.id,
      course: req.params.courseId
    }).populate('course', 'title curriculum');

    if (!progress) {
      return res.status(404).json({ success: false, message: 'Progress not found' });
    }

    res.status(200).json({ success: true, data: progress });
  } catch (error) {
    next(error);
  }
};

// Update progress
export const updateProgress = async (req, res, next) => {
  try {
    const { sectionId, lectureId, timeSpent } = req.body;

    // Validate input
    if (!sectionId || !lectureId || !timeSpent) {
      return res.status(400).json({ success: false, message: 'sectionId, lectureId, and timeSpent are required' });
    }

    // Find the course to validate section and lecture
    const course = await Course.findById(req.params.courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    // Check if section and lecture exist in the course curriculum
    const section = course.curriculum.id(sectionId);
    if (!section) {
      return res.status(404).json({ success: false, message: 'Section not found' });
    }
    const lecture = section.lectures.id(lectureId);
    if (!lecture) {
      return res.status(404).json({ success: false, message: 'Lecture not found' });
    }

    // Update or initialize progress
    const progress = await Progress.findOneAndUpdate(
      {
        student: req.user.id,
        course: req.params.courseId
      },
      [
        // Stage 1: Check if curriculumProgress entry exists
        {
          $set: {
            curriculumProgress: {
              $cond: {
                if: {
                  $in: [
                    { section: new mongoose.Types.ObjectId(sectionId), lecture: new mongoose.Types.ObjectId(lectureId) },
                    '$curriculumProgress'
                  ]
                },
                then: '$curriculumProgress', // Keep existing entries
                else: {
                  $concatArrays: [
                    '$curriculumProgress',
                    [{
                      section: new mongoose.Types.ObjectId(sectionId),
                      lecture: new mongoose.Types.ObjectId(lectureId),
                      completed: false,
                      timeSpent: 0,
                      lastAccessed: new Date()
                    }]
                  ]
                }
              }
            },
            lastAccessed: new Date()
          }
        },
        // Stage 2: Update the matching curriculumProgress entry
        {
          $set: {
            curriculumProgress: {
              $map: {
                input: '$curriculumProgress',
                as: 'entry',
                in: {
                  $cond: {
                    if: {
                      $and: [
                        { $eq: ['$$entry.section', new mongoose.Types.ObjectId(sectionId)] },
                        { $eq: ['$$entry.lecture', new mongoose.Types.ObjectId(lectureId)] }
                      ]
                    },
                    then: {
                      $mergeObjects: [
                        '$$entry',
                        {
                          timeSpent: { $add: ['$$entry.timeSpent', timeSpent] },
                          lastAccessed: new Date()
                        }
                      ]
                    },
                    else: '$$entry'
                  }
                }
              }
            }
          }
        }
      ],
      { new: true }
    );

    if (!progress) {
      return res.status(404).json({ success: false, message: 'Progress not found' });
    }

    res.status(200).json({ success: true, data: progress });
  } catch (error) {
    next(error);
  }
};




// Complete a lecture
export const completeLecture = async (req, res, next) => {
  try {
    const { courseId, lectureId } = req.params;

    // Validate input
    if (!lectureId) {
      return res.status(400).json({ success: false, message: 'lectureId is required' });
    }

    // Validate ObjectID
    if (!mongoose.Types.ObjectId.isValid(lectureId)) {
      return res.status(400).json({ success: false, message: 'Invalid lectureId' });
    }

    // Find the course to validate lecture
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    // Find the section containing the lecture
    let sectionId = null;
    for (const section of course.curriculum) {
      const lecture = section.lectures.id(lectureId);
      if (lecture) {
        sectionId = section._id;
        break;
      }
    }

    if (!sectionId) {
      return res.status(404).json({ success: false, message: 'Lecture not found in course curriculum' });
    }

    // Find the progress document
    let progress = await Progress.findOne({
      student: req.user.id,
      course: courseId
    });

    if (!progress) {
      return res.status(404).json({ success: false, message: 'Progress not found' });
    }

    // Check if curriculumProgress contains the section and lecture
    const progressEntry = progress.curriculumProgress.find(
      entry => entry.section.toString() === sectionId.toString() && entry.lecture.toString() === lectureId
    );

    if (!progressEntry) {
      // Add a new entry to curriculumProgress
      progress.curriculumProgress.push({
        section: sectionId,
        lecture: lectureId,
        completed: false,
        timeSpent: 0,
        lastAccessed: Date.now()
      });
      await progress.save();
    }

    // Update the progress entry to mark lecture as completed
    progress = await Progress.findOneAndUpdate(
      {
        student: req.user.id,
        course: courseId
      },
      {
        $set: {
          'curriculumProgress.$[elem].completed': true,
          'curriculumProgress.$[elem].completionDate': Date.now(),
          lastAccessed: Date.now()
        }
      },
      {
        arrayFilters: [
          {
            'elem.section': new mongoose.Types.ObjectId(sectionId),
            'elem.lecture': new mongoose.Types.ObjectId(lectureId)
          }
        ],
        new: true
      }
    );

    // Calculate new overall progress
    const totalLectures = course.curriculum.reduce(
      (total, section) => total + section.lectures.length,
      0
    );
    const completedLectures = progress.curriculumProgress.filter(
      item => item.completed
    ).length;
    const newProgress = Math.round((completedLectures / totalLectures) * 100);

    // Update overall progress
    progress.overallProgress = newProgress;
    await progress.save();

    // Update enrollment progress
    await Enrollment.findOneAndUpdate(
      { student: req.user.id, course: courseId },
      { progress: newProgress }
    );

    res.status(200).json({ success: true, data: progress });
  } catch (error) {
    next(error);
  }
};

// Submit assessment
export const submitAssessment = async (req, res, next) => {
  try {
    const { answers } = req.body;

    // Get assessment
    const assessment = await Assessment.findById(req.params.assessmentId);
    if (!assessment) {
      return res.status(404).json({ success: false, message: 'Assessment not found' });
    }

    // Calculate score
    let score = 0;
    assessment.questions.forEach(question => {
      if (question.questionType === 'multiple_choice') {
        const selectedOption = answers[question._id];
        const correctOption = question.options.find(opt => opt.isCorrect);
        if (selectedOption === correctOption._id.toString()) {
          score += question.points;
        }
      } else if (question.questionType === 'true_false') {
        if (answers[question._id] === question.correctAnswer) {
          score += question.points;
        }
      }
      // For other types, manual grading would be needed
    });

    // Update progress
    const progress = await Progress.findOneAndUpdate(
      {
        student: req.user.id,
        course: req.params.courseId
      },
      {
        $push: {
          assessmentProgress: {
            assessment: req.params.assessmentId,
            status: 'submitted',
            score,
            totalPoints: assessment.totalPoints,
            submissionDate: Date.now()
          }
        }
      },
      { new: true }
    );

    res.status(200).json({ success: true, data: progress });
  } catch (error) {
    next(error);
  }
};

// Get certificates
export const getCertificates = async (req, res, next) => {
  try {
    const certificates = await Certificate.find({ student: req.user.id })
      .populate('course', 'title instructor')
      .populate('instructor', 'firstName lastName');

    res.status(200).json({ success: true, data: certificates });
  } catch (error) {
    next(error);
  }
};

// Get notifications
export const getNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .limit(20);

    res.status(200).json({ success: true, data: notifications });
  } catch (error) {
    next(error);
  }
};

// Mark notification as read
export const markNotificationAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { isRead: true, readAt: Date.now() },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    res.status(200).json({ success: true, data: notification });
  } catch (error) {
    next(error);
  }
};

// Create support ticket
export const createSupportTicket = async (req, res, next) => {
  try {
    const { subject, message, category, relatedCourse } = req.body;

    const ticket = await SupportTicket.create({
      user: req.user.id,
      subject,
      message,
      category,
      relatedCourse,
      status: 'open'
    });

    res.status(201).json({ success: true, data: ticket });
  } catch (error) {
    next(error);
  }
};

// Get support tickets
export const getSupportTickets = async (req, res, next) => {
  try {
    const tickets = await SupportTicket.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .populate('relatedCourse', 'title')
      .populate('assignedTo', 'firstName lastName');

    res.status(200).json({ success: true, data: tickets });
  } catch (error) {
    next(error);
  }
};