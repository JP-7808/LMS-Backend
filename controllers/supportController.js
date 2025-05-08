import SupportTicket from '../models/SupportTicket.js';
import User from '../models/User.js';
import Course from '../models/Course.js';

// Create a new support ticket
export const createTicket = async (req, res, next) => {
  try {
    const { subject, message, category, priority, relatedCourse, attachments } = req.body;

    // Validate related course if provided
    if (relatedCourse) {
      const course = await Course.findById(relatedCourse);
      if (!course) {
        return res.status(404).json({
          success: false,
          message: 'Related course not found'
        });
      }
    }

    // Validate attachments if provided
    if (req.body.attachments) {
      if (!Array.isArray(req.body.attachments)) {
        return res.status(400).json({
          success: false,
          message: 'Attachments must be an array'
        });
      }

      for (const attachment of req.body.attachments) {
        if (!attachment.url || !attachment.name) {
          return res.status(400).json({
            success: false,
            message: 'Each attachment must have url and name'
          });
        }
      }
    }

    const ticket = await SupportTicket.create({
      user: req.user.id,
      subject,
      message,
      category,
      priority,
      relatedCourse,
      attachments
    });


    

    

    res.status(201).json({
      success: true,
      data: ticket
    });
  } catch (error) {
    next(error);
  }
};

// Get all tickets for a user
export const getUserTickets = async (req, res, next) => {
  try {
    const tickets = await SupportTicket.find({ user: req.user.id })
      .populate('assignedTo', 'name email')
      .populate('relatedCourse', 'title')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: tickets.length,
      data: tickets
    });
  } catch (error) {
    next(error);
  }
};

// Get single ticket
export const getTicket = async (req, res, next) => {
  try {
    const ticket = await SupportTicket.findById(req.params.id)
      .populate('user', 'name email role')
      .populate('assignedTo', 'name email')
      .populate('relatedCourse', 'title')
      .populate('comments.user', 'name email role');

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    // Check if user owns the ticket or is admin/support staff
    if (ticket.user._id.toString() !== req.user.id && 
        req.user.role !== 'admin' && 
        req.user.role !== 'support') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this ticket'
      });
    }

    res.status(200).json({
      success: true,
      data: ticket
    });
  } catch (error) {
    next(error);
  }
};

// Add comment to ticket
export const addComment = async (req, res, next) => {
  try {
    const { message } = req.body;

    const ticket = await SupportTicket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    // Check if user is involved with the ticket
    if (ticket.user.toString() !== req.user.id && 
        (!ticket.assignedTo || ticket.assignedTo.toString() !== req.user.id) &&
        req.user.role !== 'admin' && 
        req.user.role !== 'support') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to comment on this ticket'
      });
    }

    ticket.comments.push({
      user: req.user.id,
      message
    });

    await ticket.save();

    res.status(200).json({
      success: true,
      data: ticket.comments
    });
  } catch (error) {
    next(error);
  }
};

// Update ticket status (for admins/support staff)
export const updateTicketStatus = async (req, res, next) => {
  try {
    const { status, resolution } = req.body;

    const ticket = await SupportTicket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    // Only allow admins/support staff to update status
    if (req.user.role !== 'admin' && req.user.role !== 'support') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update ticket status'
      });
    }

    ticket.status = status;
    
    if (status === 'resolved' || status === 'closed') {
      ticket.resolution = resolution;
      ticket.resolvedBy = req.user.id;
      ticket.resolvedAt = new Date();
    }

    await ticket.save();

    res.status(200).json({
      success: true,
      data: ticket
    });
  } catch (error) {
    next(error);
  }
};

// Assign ticket to support staff (admin only)
export const assignTicket = async (req, res, next) => {
  try {
    const { assignedTo } = req.body;

    const ticket = await SupportTicket.findById(req.params.id);
    const supportUser = await User.findById(assignedTo);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    if (!supportUser || (supportUser.role !== 'admin' && supportUser.role !== 'support')) {
      return res.status(400).json({
        success: false,
        message: 'Can only assign to admin or support staff'
      });
    }

    // Only allow admins to assign tickets
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to assign tickets'
      });
    }

    ticket.assignedTo = assignedTo;
    ticket.status = 'in_progress';
    await ticket.save();

    res.status(200).json({
      success: true,
      data: ticket
    });
  } catch (error) {
    next(error);
  }
};

// Get all tickets (admin/support staff only)
export const getAllTickets = async (req, res, next) => {
  try {
    // Only allow admins and support staff to access all tickets
    if (req.user.role !== 'admin' && req.user.role !== 'support') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view all tickets'
      });
    }

    let query = {};
    const { status, category, assignedTo } = req.query;

    if (status) query.status = status;
    if (category) query.category = category;
    if (assignedTo) query.assignedTo = assignedTo;

    const tickets = await SupportTicket.find(query)
      .populate('user', 'name email role')
      .populate('assignedTo', 'name email')
      .populate('relatedCourse', 'title')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: tickets.length,
      data: tickets
    });
  } catch (error) {
    next(error);
  }
};