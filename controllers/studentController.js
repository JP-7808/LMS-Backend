import Student from '../models/Student.js';
import Course from '../models/Course.js'; // You'll need to import this model
import Badge from '../models/Certificate.js'; // You might need this for badge operations

// Get student profile
export const getStudentProfile = async (req, res, next) => {
  try {
    const student = await Student.findById(req.user.id)
      .populate('enrolledCourses.course', 'title description instructor')
      // .populate('approvedBy', 'name email');

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    res.status(200).json({
      success: true,
      data: student
    });
  } catch (error) {
    next(error);
  }
};

// Update student profile
export const updateStudentProfile = async (req, res, next) => {
  try {
    const { education, occupation, skills, interests } = req.body;

    const updatedStudent = await Student.findByIdAndUpdate(
      req.user.id,
      {
        education,
        occupation,
        skills,
        interests
      },
      {
        new: true,
        runValidators: true
      }
    );

    res.status(200).json({
      success: true,
      data: updatedStudent
    });
  } catch (error) {
    next(error);
  }
};

// Enroll in a course
export const enrollInCourse = async (req, res, next) => {
  try {
    const { courseId } = req.params;

    // Check if course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check if already enrolled
    const student = await Student.findById(req.user.id);
    const isEnrolled = student.enrolledCourses.some(
      enrolledCourse => enrolledCourse.course.toString() === courseId
    );

    if (isEnrolled) {
      return res.status(400).json({
        success: false,
        message: 'Already enrolled in this course'
      });
    }

    // Add course to enrolledCourses
    student.enrolledCourses.push({
      course: courseId,
      progress: 0
    });

    await student.save();

    res.status(200).json({
      success: true,
      message: 'Successfully enrolled in the course',
      data: student.enrolledCourses
    });
  } catch (error) {
    next(error);
  }
};

// Update course progress
export const updateCourseProgress = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const { progress } = req.body;

    if (progress < 0 || progress > 100) {
      return res.status(400).json({
        success: false,
        message: 'Progress must be between 0 and 100'
      });
    }

    const student = await Student.findById(req.user.id);
    const enrolledCourse = student.enrolledCourses.find(
      course => course.course.toString() === courseId
    );

    if (!enrolledCourse) {
      return res.status(404).json({
        success: false,
        message: 'Not enrolled in this course'
      });
    }

    // Update progress
    enrolledCourse.progress = progress;

    // Mark as completed if progress is 100%
    if (progress === 100) {
      enrolledCourse.completed = true;
      enrolledCourse.completionDate = new Date();
    }

    await student.save();

    res.status(200).json({
      success: true,
      message: 'Course progress updated',
      data: enrolledCourse
    });
  } catch (error) {
    next(error);
  }
};

// Get enrolled courses
export const getEnrolledCourses = async (req, res, next) => {
  try {
    const student = await Student.findById(req.user.id)
      .populate('enrolledCourses.course', 'title description instructor duration');

    res.status(200).json({
      success: true,
      count: student.enrolledCourses.length,
      data: student.enrolledCourses
    });
  } catch (error) {
    next(error);
  }
};

// Add a badge to student profile
export const addBadge = async (req, res, next) => {
  try {
    const { name, icon } = req.body;

    const student = await Student.findById(req.user.id);
    student.badges.push({
      name,
      icon
    });

    await student.save();

    res.status(200).json({
      success: true,
      message: 'Badge added successfully',
      data: student.badges
    });
  } catch (error) {
    next(error);
  }
};

// Get all badges
export const getBadges = async (req, res, next) => {
  try {
    const student = await Student.findById(req.user.id);

    res.status(200).json({
      success: true,
      count: student.badges.length,
      data: student.badges
    });
  } catch (error) {
    next(error);
  }
};

// Add points to student
export const addPoints = async (req, res, next) => {
  try {
    const { points } = req.body;

    const student = await Student.findById(req.user.id);
    student.points += points;

    await student.save();

    res.status(200).json({
      success: true,
      message: 'Points added successfully',
      data: student.points
    });
  } catch (error) {
    next(error);
  }
};