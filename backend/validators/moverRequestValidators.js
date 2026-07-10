import { moverRequestStatuses } from "../models/MoverRequest.js";

const manageableMoverRequestStatuses = ["accepted", "declined", "cancelled", "completed"];

const validateLength = (field, maxLength) => (value) => {
  if (value.length > maxLength) {
    return `${field} must be ${maxLength} characters or fewer`;
  }

  return null;
};

const validateLatitude = (value) => (value < -90 || value > 90 ? "pickupLat must be between -90 and 90" : null);
const validateLongitude = (value) =>
  value < -180 || value > 180 ? "pickupLng must be between -180 and 180" : null;

const createMoverRequestSchema = {
  mover: {
    required: true,
    type: "string",
  },
  property: {
    type: "string",
  },
  message: {
    type: "string",
    validate: validateLength("message", 1000),
  },
  preferredDate: {
    type: "string",
    validate(value) {
      const date = new Date(value);

      if (Number.isNaN(date.getTime())) {
        return "preferredDate must be a valid date";
      }

      return null;
    },
  },
  pickupLat: {
    type: "number",
    validate: validateLatitude,
  },
  pickupLng: {
    type: "number",
    validate: validateLongitude,
  },
};

const updateMoverRequestStatusSchema = {
  status: {
    required: true,
    type: "string",
    enum: manageableMoverRequestStatuses,
  },
  response: {
    type: "string",
    validate: validateLength("response", 1000),
  },
};

export {
  createMoverRequestSchema,
  manageableMoverRequestStatuses,
  moverRequestStatuses,
  updateMoverRequestStatusSchema,
};
