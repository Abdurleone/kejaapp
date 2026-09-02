const createReviewSchema = {
  property: {
    required: true,
    type: "string",
  },
  rating: {
    required: true,
    type: "number",
    validate(value) {
      if (!Number.isInteger(value) || value < 1 || value > 5) {
        return "rating must be an integer between 1 and 5";
      }

      return null;
    },
  },
  comment: {
    type: "string",
    validate(value) {
      if (value.length > 1000) {
        return "comment must be 1000 characters or fewer";
      }

      return null;
    },
  },
};

const updateReviewResponseSchema = {
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

const reportReviewSchema = {
  reason: {
    required: true,
    type: "string",
    validate(value) {
      if (value.trim().length === 0) {
        return "reason is required";
      }

      if (value.length > 500) {
        return "reason must be 500 characters or fewer";
      }

      return null;
    },
  },
};

export { createReviewSchema, reportReviewSchema, updateReviewResponseSchema };
