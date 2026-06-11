const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const agencyVerificationSchema = {
  agencyName: {
    required: true,
    type: "string",
    minLength: 2,
  },
  registrationNumber: {
    required: true,
    type: "string",
    minLength: 2,
  },
  businessEmail: {
    required: true,
    type: "string",
    pattern: emailPattern,
    message: "businessEmail must be a valid email address",
  },
  businessPhone: {
    required: true,
    type: "string",
    minLength: 7,
  },
  officeAddress: {
    required: true,
    type: "string",
    minLength: 5,
  },
  documents: {
    type: "array",
  },
};

export { agencyVerificationSchema };
