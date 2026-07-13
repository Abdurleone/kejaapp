import Property from "../models/Property.js";
import SavedSearch from "../models/SavedSearch.js";
import { buildPropertyFilters } from "../utils/propertyFilters.js";
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
  const facets = savedSearches.reduce((byIndex, savedSearch, index) => {
    byIndex[index] = [{ $match: buildPropertyFilters(savedSearch) }];
    return byIndex;
  }, {});

  const [result] = await Property.aggregate([{ $match: { _id: property._id } }, { $facet: facets }]);

  await Promise.all(
    savedSearches.map((savedSearch, index) => {
      const isMatch = result[index].length > 0;
      return isMatch ? notifySavedSearchMatch({ savedSearch, property }) : null;
    })
  );
};

export { notifyMatchingSavedSearches };
