import Property from "../models/Property.js";
import SavedSearch from "../models/SavedSearch.js";
import { buildPropertyFilters } from "../utils/propertyFilters.js";
import { notifySavedSearchMatch } from "./notificationService.js";

const notifyMatchingSavedSearches = async (property) => {
  if (property.status !== "available") {
    return;
  }

  const savedSearches = await SavedSearch.find({});

  await Promise.all(
    savedSearches.map(async (savedSearch) => {
      const filters = buildPropertyFilters(savedSearch.toObject());
      const isMatch = await Property.exists({ ...filters, _id: property._id });

      if (isMatch) {
        await notifySavedSearchMatch({ savedSearch, property });
      }
    })
  );
};

export { notifyMatchingSavedSearches };
