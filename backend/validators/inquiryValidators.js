import { contactPreferences, inquiryStatuses } from "../models/Inquiry.js";

const manageableInquiryStatuses = ["responded", "closed"];

const validateLength = (field, maxLength) => (value) => {
  if (value.length > maxLength) {
    return `${field} must be ${maxLength} characters or fewer`;
  }

  return null;
};

const createInquirySchema = {
  property: {
    required: true,
    type: "string",
  },
  subject: {
    type: "string",
    validate: validateLength("subject", 140),
  },
  message: {
    required: true,
    type: "string",
    validate: validateLength("message", 1000),
  },
  contactPreference: {
    type: "string",
    enum: contactPreferences,
  },
};

const updateInquirySchema = {
  status: {
    required: true,
    type: "string",
    enum: manageableInquiryStatuses,
  },
  response: {
    type: "string",
    validate: validateLength("response", 1000),
  },
};

export {
  contactPreferences,
  createInquirySchema,
  inquiryStatuses,
  manageableInquiryStatuses,
  updateInquirySchema,
};
