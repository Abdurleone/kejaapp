import { propertyTypes } from "../models/Property.js";

const createSavedSearchSchema = {
  lat: {
    type: "number",
  },
  lng: {
    type: "number",
  },
  radiusKm: {
    type: "number",
    validate(value) {
      if (value <= 0) {
        return "radiusKm must be greater than 0";
      }

      return null;
    },
  },
  minRent: {
    type: "number",
    validate(value) {
      if (value < 0) {
        return "minRent must be 0 or greater";
      }

      return null;
    },
  },
  maxRent: {
    type: "number",
    validate(value) {
      if (value < 0) {
        return "maxRent must be 0 or greater";
      }

      return null;
    },
  },
  county: {
    type: "string",
  },
  town: {
    type: "string",
  },
  type: {
    type: "string",
    enum: propertyTypes,
  },
  bedrooms: {
    type: "number",
    validate(value) {
      if (!Number.isInteger(value) || value < 0) {
        return "bedrooms must be a whole number 0 or greater";
      }

      return null;
    },
  },
};

export { createSavedSearchSchema };
