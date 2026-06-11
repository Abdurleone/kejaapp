const rejectAgencyVerificationSchema = {
  reason: {
    required: true,
    type: "string",
    minLength: 5,
  },
};

export { rejectAgencyVerificationSchema };
