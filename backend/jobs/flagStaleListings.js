import Property from "../models/Property.js";
import Inquiry from "../models/Inquiry.js";
import { notifyStaleListing } from "../services/notificationService.js";
import env from "../config/env.js";

const run = async () => {
  const cutoff = new Date(Date.now() - env.staleListingFreshnessMs);

  const staleCandidates = await Property.find({
    status: "available",
    createdAt: { $lte: cutoff },
    freshnessNudgeSentAt: null,
  });

  if (staleCandidates.length === 0) {
    return 0;
  }

  const propertyIds = staleCandidates.map((property) => property._id);
  const inquiryCounts = await Inquiry.aggregate([
    { $match: { property: { $in: propertyIds } } },
    { $group: { _id: "$property", count: { $sum: 1 } } },
  ]);
  const inquiryCountByProperty = new Map(
    inquiryCounts.map(({ _id, count }) => [_id.toString(), count])
  );

  await Promise.all(
    staleCandidates
      .filter((property) => !inquiryCountByProperty.get(property._id.toString()))
      .map((property) => notifyStaleListing(property))
  );

  await Property.updateMany(
    { _id: { $in: propertyIds } },
    { $set: { freshnessNudgeSentAt: new Date() } }
  );

  return staleCandidates.length;
};

export { run };
