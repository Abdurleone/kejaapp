const listingTypes = ["apartment", "bedsitter", "maisonette", "house", "studio", "other"];
const listedByTypes = ["owner", "agency"];

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
  isAvailable: {
    type: "boolean",
  },
};

export { createPropertySchema, updatePropertySchema };
