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

  // Sequential, one notify-then-save per property (not a batch Promise.all
  // followed by a separate bulk updateMany): if one notification fails
  // mid-run, only the properties not yet processed stay eligible for the
  // next run - a batch-then-bulk-update approach would leave every
  // already-notified property's freshnessNudgeSentAt unset too, causing
  // them to be re-notified on every subsequent run indefinitely.
  for (const property of staleCandidates) {
    if (inquiryCountByProperty.get(property._id.toString())) {
      property.freshnessNudgeSentAt = new Date();
      await property.save();
      continue;
    }

    await notifyStaleListing(property);
    property.freshnessNudgeSentAt = new Date();
    await property.save();
  }

  return staleCandidates.length;
};

export { run };
