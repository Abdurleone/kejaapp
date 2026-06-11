const updateViolationStatusSchema = {
  status: {
    required: true,
    type: "string",
    enum: ["open", "reviewed", "dismissed"],
  },
  notes: {
    type: "string",
    validate(value) {
      if (value.length > 1000) {
        return "notes must be 1000 characters or fewer";
      }

      return null;
    },
  },
};

export { updateViolationStatusSchema };
