import { validationResult, body, param } from "express-validator";
import { AppError } from "./error.middleware.js";

// Middleware to check for validation errors
export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError(
      errors
        .array()
        .map((error) => error.msg)
        .join(", "),
      400
    );
  }
  next();
};

// Registration validation rules
export const registerValidation = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ min: 2, max: 50 })
    .withMessage("Name must be between 2 and 50 characters"),

  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please provide a valid email address"),

  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),

  body("address.street")
    .trim()
    .notEmpty()
    .withMessage("Street address is required"),

  body("address.state").trim().notEmpty().withMessage("State is required"),

  body("address.zipCode")
    .trim()
    .notEmpty()
    .withMessage("Zip code is required")
    .matches(/^\d{5}(-\d{4})?$/)
    .withMessage("Please enter a valid ZIP code (12345 or 12345-6789)"),

  validate,
];

// Login validation rules
export const loginValidation = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please provide a valid email address"),

  body("password").notEmpty().withMessage("Password is required"),

  validate,
];

// Opportunity creation validation rules
export const opportunityValidation = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Job title is required")
    .isLength({ min: 3, max: 100 })
    .withMessage("Title must be between 3 and 100 characters"),

  body("description")
    .trim()
    .notEmpty()
    .withMessage("Job description is required"),

  body("availableSlots")
    .notEmpty()
    .withMessage("Number of available slots is required")
    .isInt({ min: 1 })
    .withMessage("Available slots must be at least 1"),

  body("departureDateTime")
    .notEmpty()
    .withMessage("Departure date and time are required")
    .isISO8601()
    .withMessage("Please provide a valid date and time"),

  body("payRate")
    .notEmpty()
    .withMessage("Pay rate is required")
    .isFloat({ min: 0 })
    .withMessage("Pay rate must be a positive number"),

  validate,
];

// Message validation rules
export const messageValidation = [
  body("content")
    .trim()
    .notEmpty()
    .withMessage("Message content is required")
    .isLength({ max: 2000 })
    .withMessage("Message cannot exceed 2000 characters"),

  validate,
];

// User approval validation rules
export const approvalValidation = [
  body("approve").isBoolean().withMessage("Approve must be a boolean value"),

  validate,
];

// User ID validation
export const userIdValidation = [
  param("id").isMongoId().withMessage("Invalid user ID"),

  validate,
];

// Opportunity ID validation
export const opportunityIdValidation = [
  param("id").isMongoId().withMessage("Invalid opportunity ID"),

  validate,
];

// Event ID validation
export const eventIdValidation = [
  param("id").isMongoId().withMessage("Invalid event ID"),

  validate,
];
