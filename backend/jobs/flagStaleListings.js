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

  for (const property of staleCandidates) {
    const inquiryCount = await Inquiry.countDocuments({ property: property._id });

    if (inquiryCount === 0) {
      await notifyStaleListing(property);
    }

    property.freshnessNudgeSentAt = new Date();
    await property.save();
  }

  return staleCandidates.length;
};

export { run };
