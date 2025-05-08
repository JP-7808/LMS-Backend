import express from 'express';
import {
  createTicket,
  getUserTickets,
  getTicket,
  addComment,
  updateTicketStatus,
  assignTicket,
  getAllTickets
} from '../controllers/supportController.js';
import { protect, authorize, checkVerified } from '../middleware/auth.js';

const router = express.Router();

// Protect all routes
router.use(protect, checkVerified);

// User routes
router.route('/')
  .post(authorize('student', 'instructor', 'admin', 'support'), createTicket)
  .get(authorize('student', 'instructor', 'admin', 'support'), getUserTickets);

router.route('/:id')
  .get(authorize('student', 'instructor', 'admin', 'support'), getTicket);

router.route('/:id/comments')
  .post(authorize('student', 'instructor', 'admin', 'support'), addComment);

// Admin/support staff routes
router.route('/admin/all')
  .get(authorize('admin', 'support'), getAllTickets);

router.route('/admin/:id/status')
  .put(authorize('admin', 'support'), updateTicketStatus);

router.route('/admin/:id/assign')
  .put(authorize('admin'), assignTicket);

export default router;