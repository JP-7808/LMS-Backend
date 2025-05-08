import Course from '../models/Course.js';
import Instructor from '../models/Instructor.js';
import Content from '../models/Content.js';
import User from '../models/User.js'; 


// Create a new course (Instructor only)
// export const createCourse = async (req, res, next) => {
//   try {
//     // Verify instructor exists
//     const instructor = await Instructor.findById(req.user.id);
//     if (!instructor) {
//       return res.status(404).json({
//         success: false,
//         message: 'Instructor not found'
//       });
//     }

//     const courseData = {
//       ...req.body,
//       instructor: req.user.id
//     };

//     const course = await Course.create(courseData);

//     res.status(201).json({
//       success: true,
//       data: course
//     });
//   } catch (error) {
//     next(error);
//   }
// };

export const createCourse = async (req, res, next) => {
  try {
    // Verify user is an instructor
    const user = await User.findOne({
      _id: req.user.id,
      role: 'instructor'
    });
    
    if (!user) {
      return res.status(403).json({
        success: false,
        message: 'Only instructors can create courses'
      });
    }

    const courseData = {
      ...req.body,
      instructor: req.user.id
    };

    const course = await Course.create(courseData);

    res.status(201).json({
      success: true,
      data: course
    });
  } catch (error) {
    next(error);
  }
};

// Get all published courses
// export const getPublishedCourses = async (req, res, next) => {
//   try {
//     const { category, level, search, sort } = req.query;
    
//     const query = { status: 'published' };
    
//     if (category) query.category = category;
//     if (level) query.level = level;
//     if (search) query.title = { $regex: search, $options: 'i' };

//     let sortOption = '-createdAt';
//     if (sort === 'rating') sortOption = '-rating';
//     if (sort === 'students') sortOption = '-totalStudents';
//     if (sort === 'newest') sortOption = '-createdAt';

//     const courses = await Course.find(query)
//       .populate('instructor', 'name email')
//       .sort(sortOption);

//     res.status(200).json({
//       success: true,
//       count: courses.length,
//       data: courses
//     });
//   } catch (error) {
//     next(error);
//   }
// };

export const getPublishedCourses = async (req, res, next) => {
  try {
    const { category, level, search, sort } = req.query;
    
    const query = { status: 'published' };
    
    if (category) query.category = category;
    if (level) query.level = level;
    if (search) query.title = { $regex: search, $options: 'i' };

    let sortOption = '-createdAt';
    if (sort === 'rating') sortOption = '-rating';
    if (sort === 'students') sortOption = '-totalStudents';
    if (sort === 'newest') sortOption = '-createdAt';

    const courses = await Course.find(query)
      .populate({
        path: 'instructor',
        model: 'User', // Explicitly use User model
        select: 'name email'
      })
      .sort(sortOption);

    res.status(200).json({
      success: true,
      count: courses.length,
      data: courses
    });
  } catch (error) {
    next(error);
  }
};

// Get course details
// export const getCourseDetails = async (req, res, next) => {
//   try {
//     const course = await Course.findById(req.params.id)
//       .populate('instructor', 'name email bio')
//       .populate('curriculum.lectures.content', 'url type duration');

//     if (!course) {
//       return res.status(404).json({
//         success: false,
//         message: 'Course not found'
//       });
//     }

//     // Only show published courses to non-instructors
//     if (course.status !== 'published' && 
//         (!req.user || req.user.role !== 'instructor' || req.user.id !== course.instructor._id.toString())) {
//       return res.status(403).json({
//         success: false,
//         message: 'This course is not available'
//       });
//     }

//     res.status(200).json({
//       success: true,
//       data: course
//     });
//   } catch (error) {
//     next(error);
//   }
// };

export const getCourseDetails = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate({
        path: 'instructor',
        model: 'User', // Explicitly use User model
        select: 'name email bio'
      })
      .populate('curriculum.lectures.content', 'url type duration');

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Only show published courses to non-instructors
    if (course.status !== 'published' && 
        (!req.user || req.user.role !== 'instructor' || req.user.id !== course.instructor._id.toString())) {
      return res.status(403).json({
        success: false,
        message: 'This course is not available'
      });
    }

    res.status(200).json({
      success: true,
      data: course
    });
  } catch (error) {
    next(error);
  }
};



// Update course (Instructor only)
export const updateCourse = async (req, res, next) => {
  try {
    let course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Verify instructor owns the course
    if (course.instructor.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this course'
      });
    }

    // Prevent changing some fields after publishing
    if (course.status === 'published') {
      const { status, ...updateData } = req.body;
      course = await Course.findByIdAndUpdate(req.params.id, updateData, {
        new: true,
        runValidators: true
      });
    } else {
      course = await Course.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
      });
    }

    res.status(200).json({
      success: true,
      data: course
    });
  } catch (error) {
    next(error);
  }
};

// Delete course (Instructor only)
export const deleteCourse = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Verify instructor owns the course
    if (course.instructor.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this course'
      });
    }

    await course.remove();

    res.status(200).json({
      success: true,
      message: 'Course deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Add curriculum section (Instructor only)
export const addCurriculumSection = async (req, res, next) => {
  try {
    const { sectionTitle } = req.body;

    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Verify instructor owns the course
    if (course.instructor.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to modify this course'
      });
    }

    course.curriculum.push({
      sectionTitle,
      lectures: []
    });

    await course.save();

    res.status(200).json({
      success: true,
      data: course.curriculum
    });
  } catch (error) {
    next(error);
  }
};

// Add lecture to section (Instructor only)
export const addLecture = async (req, res, next) => {
  try {
    const { sectionId } = req.params;
    const { title, description, duration, contentId, isPreview } = req.body;

    const course = await Course.findById(req.params.courseId);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Verify instructor owns the course
    if (course.instructor.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to modify this course'
      });
    }

    // Verify content exists if provided
    if (contentId) {
      const content = await Content.findById(contentId);
      if (!content) {
        return res.status(404).json({
          success: false,
          message: 'Content not found'
        });
      }
    }

    const section = course.curriculum.id(sectionId);
    if (!section) {
      return res.status(404).json({
        success: false,
        message: 'Section not found'
      });
    }

    section.lectures.push({
      title,
      description,
      duration,
      content: contentId,
      isPreview
    });

    await course.save();

    res.status(200).json({
      success: true,
      data: section.lectures
    });
  } catch (error) {
    next(error);
  }
};

// Get instructor's courses
export const getInstructorCourses = async (req, res, next) => {
  try {
    const courses = await Course.find({ instructor: req.user.id })
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

// Publish course (Instructor only)
export const publishCourse = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Verify instructor owns the course
    if (course.instructor.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to publish this course'
      });
    }

    // Basic validation before publishing
    if (!course.thumbnail || course.curriculum.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Course must have thumbnail and curriculum before publishing'
      });
    }

    course.status = 'published';
    await course.save();

    res.status(200).json({
      success: true,
      data: course
    });
  } catch (error) {
    next(error);
  }
};