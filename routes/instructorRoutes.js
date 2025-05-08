import express from 'express';
import {
  getInstructorProfile,
  updateInstructorProfile,
  getInstructorCourses,
  getDashboardStats,
  getAllInstructors,
  approveInstructor
} from '../controllers/instructorController.js';
import { protect, authorize, checkVerified, checkApproved } from '../middleware/auth.js';

const router = express.Router();

// Instructor routes
router.use(protect, checkVerified, authorize('instructor'));

router.route('/profile')
  .get(getInstructorProfile)
  .put(updateInstructorProfile);

router.route('/courses')
  .get(getInstructorCourses);

router.route('/dashboard')
  .get(
    // checkApproved, 
    getDashboardStats);

// Admin routes
// router.use(authorize('admin'));

// router.route('/')
//   .get(getAllInstructors);

// router.route('/:id/approve')
//   .put(approveInstructor);


router.route('/')
  .get(protect, authorize('admin'), getAllInstructors);

router.route('/:id/approve')
  .put(protect, authorize('admin'), approveInstructor);
export default router;