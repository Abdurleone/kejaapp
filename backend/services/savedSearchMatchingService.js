import Property from "../models/Property.js";
import SavedSearch from "../models/SavedSearch.js";
import { buildPropertyFilters } from "../utils/propertyFilters.js";
import { logError } from "../utils/logger.js";
import { notifySavedSearchMatch } from "./notificationService.js";

const notifyMatchingSavedSearches = async (property) => {
  if (property.status !== "available") {
    return;
  }

  const savedSearches = await SavedSearch.find({}).lean();

  if (savedSearches.length === 0) {
    return;
  }

  // One Property.exists() round trip per saved search doesn't scale with
  // saved-search volume - every filter is only ever tested against this
  // one already-known property, so a single $facet aggregation lets MongoDB
  // evaluate every saved search's filter (still real Mongo query semantics,
  // nothing reimplemented client-side) against that one document in one
  // round trip instead of N.
  //
  // buildPropertyFilters throws on a malformed saved search (e.g. a legacy
  // radiusKm with no lat/lng) - skip and log that one instead of letting it
  // take down matching for every other saved search on every property
  // creation from here on.
  const facets = {};

  savedSearches.forEach((savedSearch, index) => {
    try {
      facets[index] = [{ $match: buildPropertyFilters(savedSearch) }];
    } catch (err) {
      logError(`Skipping malformed saved search ${savedSearch._id}: ${err.message}`);
    }
  });

  if (Object.keys(facets).length === 0) {
    return;
  }

  const [result] = await Property.aggregate([{ $match: { _id: property._id } }, { $facet: facets }]);

  await Promise.all(
    savedSearches.map((savedSearch, index) => {
      if (!result[index]) return null;
      const isMatch = result[index].length > 0;
      return isMatch ? notifySavedSearchMatch({ savedSearch, property }) : null;
    })
  );
};

export { notifyMatchingSavedSearches };
