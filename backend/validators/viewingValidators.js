import { viewingStatuses } from "../models/ViewingRequest.js";

const actionableViewingStatuses = ["approved", "rejected", "cancelled", "completed"];

const createViewingRequestSchema = {
  property: {
    required: true,
    type: "string",
  },
  requestedDate: {
    type: "string",
    validate(value) {
      const date = new Date(value);

      if (Number.isNaN(date.getTime())) {
        return "requestedDate must be a valid date";
      }

      if (date <= new Date()) {
        return "requestedDate must be in the future";
      }

      return null;
    },
  },
  message: {
    type: "string",
    validate(value) {
      if (value.length > 1000) {
        return "message must be 1000 characters or fewer";
      }

      return null;
    },
  },
};

const updateViewingStatusSchema = {
  status: {
    required: true,
    type: "string",
    enum: actionableViewingStatuses,
  },
  reason: {
    type: "string",
    validate(value) {
      if (value.length > 1000) {
        return "reason must be 1000 characters or fewer";
      }

      return null;
    },
  },
};

export {
  createViewingRequestSchema,
  updateViewingStatusSchema,
  viewingStatuses,
};
