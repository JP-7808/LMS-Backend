import express from 'express';
import {
  createCourse,
  getPublishedCourses,
  getCourseDetails,
  updateCourse,
  deleteCourse,
  addCurriculumSection,
  addLecture,
  getInstructorCourses,
  publishCourse
} from '../controllers/courseController.js';
import { protect, authorize, checkVerified, checkApproved } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.route('/')
  .get(getPublishedCourses);

router.route('/:id')
  .get(getCourseDetails);

// Instructor routes
router.use(protect, checkVerified, authorize('instructor'), checkApproved);

router.route('/')
  .post(createCourse);

router.route('/instructor/my-courses')
  .get(getInstructorCourses);

router.route('/:id')
  .put(updateCourse)
  .delete(deleteCourse);

router.route('/:id/publish')
  .put(publishCourse);

router.route('/:id/curriculum')
  .post(addCurriculumSection);

router.route('/:courseId/curriculum/:sectionId/lectures')
  .post(addLecture);

export default router;