const rejectAgencyVerificationSchema = {
  reason: {
    required: true,
    type: "string",
    minLength: 5,
  },
};

const updateUserStatusSchema = {
  status: {
    required: true,
    type: "string",
    enum: ["active", "suspended", "banned"],
  },
  reason: {
    type: "string",
    minLength: 5,
  },
};

export { rejectAgencyVerificationSchema, updateUserStatusSchema };
