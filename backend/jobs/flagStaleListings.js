import Property from "../models/Property.js";
import Inquiry from "../models/Inquiry.js";
import { notifyStaleListing } from "../services/notificationService.js";

const freshnessWindowMs = 14 * 24 * 60 * 60 * 1000;

const run = async () => {
  const cutoff = new Date(Date.now() - freshnessWindowMs);

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
