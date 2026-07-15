import Favorite from "../models/Favorite.js";
import Inquiry from "../models/Inquiry.js";
import MoverRequest from "../models/MoverRequest.js";
import PropertyImageFingerprint from "../models/PropertyImageFingerprint.js";
import Review from "../models/Review.js";
import UserViolation from "../models/UserViolation.js";
import ViewingRequest from "../models/ViewingRequest.js";
import { deletePropertyImage } from "./fileStorageService.js";

// Single source of truth for "every model that references a Property" - both
// deleting a property directly and deleting a user's owned properties need to
// cascade to the exact same set of models, so a newly-added Property-referencing
// model only needs to be added here once instead of in both call sites.
const propertyReferenceModels = [
  { model: Inquiry, field: "property" },
  { model: ViewingRequest, field: "property" },
  { model: Review, field: "property" },
  { model: Favorite, field: "property" },
  { model: PropertyImageFingerprint, field: "property" },
  { model: MoverRequest, field: "property" },
];

// For deleting a single property.
export const deletePropertyReferences = (propertyId) =>
  propertyReferenceModels.map(({ model, field }) => model.deleteMany({ [field]: propertyId }));

// For deleting every property a user owns (account deletion).
export const deleteOwnedPropertyReferences = (propertyIds) =>
  propertyReferenceModels.map(({ model, field }) => model.deleteMany({ [field]: { $in: propertyIds } }));

// Accepts one or more property-like objects (anything with an `images` array
// of `{ storagePath }`) so the same helper works for deleting a single
// property or every property a user owns.
export const deletePropertyImages = (properties) =>
  properties.flatMap((property) =>
    property.images.map((image) => deletePropertyImage({ storagePath: image.storagePath }))
  );

// Violation records are an audit trail (see docs/code-of-ethics.md #2.6) and
// must survive the property they were evidence against being deleted - so
// this nulls out the dangling reference rather than deleting the violation.
// Two separate updateMany calls (not one $or'd together) so a record whose
// `evidence.property` matches doesn't also lose an unrelated, still-valid
// `evidence.matchedProperty` just because both fields were touched by one
// blanket $unset.
export const clearPropertyViolationEvidence = (propertyIds) => [
  UserViolation.updateMany({ "evidence.property": { $in: propertyIds } }, { $unset: { "evidence.property": "" } }),
  UserViolation.updateMany(
    { "evidence.matchedProperty": { $in: propertyIds } },
    { $unset: { "evidence.matchedProperty": "" } }
  ),
];
