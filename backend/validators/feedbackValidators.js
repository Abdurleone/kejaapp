const createFeedbackSchema = {
  message: {
    required: true,
    type: "string",
    validate(value) {
      if (value.trim().length === 0) {
        return "message is required";
      }

      if (value.length > 1000) {
        return "message must be 1000 characters or fewer";
      }

      return null;
    },
  },
  allowPublicSharing: {
    type: "boolean",
  },
};

const respondToFeedbackSchema = {
  message: {
    required: true,
    type: "string",
    validate(value) {
      if (value.trim().length === 0) {
        return "message is required";
      }

      if (value.length > 1000) {
        return "message must be 1000 characters or fewer";
      }

      return null;
    },
  },
};

export { createFeedbackSchema, respondToFeedbackSchema };
