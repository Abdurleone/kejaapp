const listingTypes = ["apartment", "bedsitter", "maisonette", "house", "studio", "other"];
const listedByTypes = ["owner", "agency"];
const propertyStatuses = ["draft", "available", "taken", "archived"];
const viewingTypes = ["scheduled", "open"];
const contactMethods = ["phone", "email", "whatsapp", "inquiry"];
const imageUrlPattern = /^https?:\/\/\S+$/i;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const coordinateType = "Point";

const isValidLongitude = (value) => typeof value === "number" && value >= -180 && value <= 180;
const isValidLatitude = (value) => typeof value === "number" && value >= -90 && value <= 90;

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

const validateLocation = (value) => {
  if (!value.coordinates) {
    return null;
  }

  if (value.coordinates.type !== coordinateType) {
    return "location.coordinates.type must be Point";
  }

  if (!Array.isArray(value.coordinates.coordinates) || value.coordinates.coordinates.length !== 2) {
    return "location.coordinates.coordinates must be [longitude, latitude]";
  }

  const [longitude, latitude] = value.coordinates.coordinates;

  if (!isValidLongitude(longitude)) {
    return "location.coordinates.coordinates[0] must be a longitude between -180 and 180";
  }

  if (!isValidLatitude(latitude)) {
    return "location.coordinates.coordinates[1] must be a latitude between -90 and 90";
  }

  return null;
};

const validateContact = (value) => {
  if (value.preferredMethod !== undefined && !contactMethods.includes(value.preferredMethod)) {
    return `contact.preferredMethod must be one of: ${contactMethods.join(", ")}`;
  }

  if (value.email !== undefined && !emailPattern.test(value.email)) {
    return "contact.email must be a valid email";
  }

  if (value.availableHours !== undefined && value.availableHours.length > 200) {
    return "contact.availableHours must be 200 characters or fewer";
  }

  if (value.notes !== undefined && value.notes.length > 500) {
    return "contact.notes must be 500 characters or fewer";
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
    validate: validateLocation,
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
  status: {
    type: "string",
    enum: propertyStatuses,
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
  contact: {
    type: "object",
    validate: validateContact,
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
    validate: validateLocation,
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
  status: {
    type: "string",
    enum: propertyStatuses,
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
  contact: {
    type: "object",
    validate: validateContact,
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

const uploadPropertyImageSchema = {
  fileName: {
    type: "string",
  },
  mimeType: {
    required: true,
    type: "string",
    enum: ["image/jpeg", "image/png", "image/webp"],
  },
  data: {
    required: true,
    type: "string",
    minLength: 8,
  },
  alt: {
    type: "string",
    validate: validateImageAlt,
  },
};

export {
  costCalculationSchema,
  createPropertySchema,
  propertyStatuses,
  propertyImageSchema,
  uploadPropertyImageSchema,
  updatePropertySchema,
};
