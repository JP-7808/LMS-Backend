import mongoose from 'mongoose';
import Instructor from '../models/Instructor.js';
import Course from '../models/Course.js';

// Get instructor profile
export const getInstructorProfile = async (req, res, next) => {
  try {
    const instructor = await Instructor.findById(req.user.id)
      .select('-password -__v');

    if (!instructor) {
      return res.status(404).json({
        success: false,
        message: 'Instructor not found'
      });
    }

    res.status(200).json({
      success: true,
      data: instructor
    });
  } catch (error) {
    next(error);
  }
};

// Update instructor profile
export const updateInstructorProfile = async (req, res, next) => {
  try {
    const { bio, expertise, socialLinks } = req.body;

    const updatedInstructor = await Instructor.findByIdAndUpdate(
      req.user.id,
      {
        bio,
        expertise,
        socialLinks
      },
      {
        new: true,
        runValidators: true
      }
    ).select('-password -__v');

    res.status(200).json({
      success: true,
      data: updatedInstructor
    });
  } catch (error) {
    next(error);
  }
};

// Get instructor's courses
export const getInstructorCourses = async (req, res, next) => {
  try {
    const courses = await Course.find({ instructor: req.user.id })
      .select('title description price rating totalStudents')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: courses.length,
      data: courses
    });
  } catch (error) {
    next(error);
  }
};

// Get instructor's dashboard stats
export const getDashboardStats = async (req, res, next) => {
  try {
    const instructor = await Instructor.findById(req.user.id)
      .select('totalStudents totalCourses earnings rating');

    const courses = await Course.find({ instructor: req.user.id })
      .select('title totalStudents rating');

    const recentEnrollments = await Course.aggregate([
      { $match: { instructor: new mongoose.Types.ObjectId(req.user.id) } },
      { $unwind: '$enrolledStudents' },
      { $sort: { 'enrolledStudents.enrollmentDate': -1 } },
      { $limit: 5 },
      { $project: { 
          courseTitle: '$title',
          studentId: '$enrolledStudents.student',
          enrollmentDate: '$enrolledStudents.enrollmentDate'
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        stats: instructor,
        courses,
        recentEnrollments
      }
    });
  } catch (error) {
    next(error);
  }
};

// Admin: Get all instructors
export const getAllInstructors = async (req, res, next) => {
  try {
    const instructors = await Instructor.find({ role: 'instructor' })
      .select('name email approved totalCourses rating')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: instructors.length,
      data: instructors
    });
  } catch (error) {
    next(error);
  }
};

// Admin: Approve instructor
export const approveInstructor = async (req, res, next) => {
  try {
    const instructor = await Instructor.findByIdAndUpdate(
      req.params.id,
      {
        approved: true,
        approvedBy: req.user.id,
        approvalDate: Date.now()
      },
      { new: true }
    );

    if (!instructor) {
      return res.status(404).json({
        success: false,
        message: 'Instructor not found'
      });
    }

    res.status(200).json({
      success: true,
      data: instructor
    });
  } catch (error) {
    next(error);
  }
};