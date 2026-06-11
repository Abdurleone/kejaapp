const listingTypes = ["apartment", "bedsitter", "maisonette", "house", "studio", "other"];
const listedByTypes = ["owner", "agency"];
const viewingTypes = ["scheduled", "open"];
const imageUrlPattern = /^https?:\/\/\S+$/i;

const validateImageAlt = (value) => {
  if (value.length > 200) {
    return "alt must be 200 characters or fewer";
  }

  return null;
};

const validatePrice = (value) => {
  if (typeof value.rent !== "number") {
    return "price.rent is required and must be a number";
  }

  if (value.rent < 0) {
    return "price.rent must be greater than or equal to 0";
  }

  if (value.deposit !== undefined && (typeof value.deposit !== "number" || value.deposit < 0)) {
    return "price.deposit must be a number greater than or equal to 0";
  }

  if (value.agencyFee !== undefined && (typeof value.agencyFee !== "number" || value.agencyFee < 0)) {
    return "price.agencyFee must be a number greater than or equal to 0";
  }

  return null;
};

const validatePartialPrice = (value) => {
  if (value.rent !== undefined && (typeof value.rent !== "number" || value.rent < 0)) {
    return "price.rent must be a number greater than or equal to 0";
  }

  if (value.deposit !== undefined && (typeof value.deposit !== "number" || value.deposit < 0)) {
    return "price.deposit must be a number greater than or equal to 0";
  }

  if (value.agencyFee !== undefined && (typeof value.agencyFee !== "number" || value.agencyFee < 0)) {
    return "price.agencyFee must be a number greater than or equal to 0";
  }

  return null;
};

const createPropertySchema = {
  title: {
    required: true,
    type: "string",
    minLength: 3,
  },
  description: {
    type: "string",
  },
  type: {
    type: "string",
    enum: listingTypes,
  },
  price: {
    required: true,
    type: "object",
    validate: validatePrice,
  },
  location: {
    type: "object",
  },
  bedrooms: {
    type: "number",
  },
  bathrooms: {
    type: "number",
  },
  listedBy: {
    type: "string",
    enum: listedByTypes,
  },
  viewingType: {
    type: "string",
    enum: viewingTypes,
  },
  viewingInstructions: {
    type: "string",
    validate(value) {
      if (value.length > 1000) {
        return "viewingInstructions must be 1000 characters or fewer";
      }

      return null;
    },
  },
  isAvailable: {
    type: "boolean",
  },
};

const updatePropertySchema = {
  title: {
    type: "string",
    minLength: 3,
  },
  description: {
    type: "string",
  },
  type: {
    type: "string",
    enum: listingTypes,
  },
  price: {
    type: "object",
    validate: validatePartialPrice,
  },
  location: {
    type: "object",
  },
  bedrooms: {
    type: "number",
  },
  bathrooms: {
    type: "number",
  },
  listedBy: {
    type: "string",
    enum: listedByTypes,
  },
  viewingType: {
    type: "string",
    enum: viewingTypes,
  },
  viewingInstructions: {
    type: "string",
    validate(value) {
      if (value.length > 1000) {
        return "viewingInstructions must be 1000 characters or fewer";
      }

      return null;
    },
  },
  isAvailable: {
    type: "boolean",
  },
};

const costCalculationSchema = {
  price: {
    required: true,
    type: "object",
    validate: validatePrice,
  },
};

const propertyImageSchema = {
  url: {
    required: true,
    type: "string",
    pattern: imageUrlPattern,
    message: "url must be a valid HTTP or HTTPS URL",
  },
  alt: {
    type: "string",
    validate: validateImageAlt,
  },
};

export {
  costCalculationSchema,
  createPropertySchema,
  propertyImageSchema,
  updatePropertySchema,
  viewingTypes,
};
