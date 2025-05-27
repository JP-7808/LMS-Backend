import express from 'express';
import { createOrder, verifyPayment } from '../controllers/paymentController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Route to create a Razorpay order
router.post('/create-order', protect, createOrder);

// Route to verify Razorpay payment
router.post('/verify', protect, verifyPayment);

export default router;