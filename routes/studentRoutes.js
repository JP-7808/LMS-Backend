import express from 'express';
import {
  getStudentProfile,
  updateStudentProfile,
  enrollInCourse,
  updateCourseProgress,
  getEnrolledCourses,
  addBadge,
  getBadges,
  addPoints
} from '../controllers/studentController.js';
import { protect, authorize, checkVerified, checkApproved } from '../middleware/auth.js';

const router = express.Router();

// Apply protect, checkVerified, and authorize('student') to all routes
router.use(protect, checkVerified, authorize('student'));

// Profile routes
router.route('/profile')
  .get(getStudentProfile)
  .put(updateStudentProfile);

// Course routes
router.route('/courses/enroll/:courseId')
  .post(enrollInCourse);

router.route('/courses/progress/:courseId')
  .put(updateCourseProgress);

router.route('/courses/enrolled')
  .get(getEnrolledCourses);

// Badge routes
router.route('/badges')
  .get(getBadges)
  .post(addBadge);

// Points route
router.route('/points')
  .post(addPoints);

export default router;