// Placeholder rates, not researched real-world figures - tune these to match
// actual business pricing.
const RATE_PER_KM = 50;
const DISTANCE_THRESHOLD_KM = 10;
const SECONDARY_WEIGHT = 0.3;

const homeSizes = ["studio", "1br", "2br", "3br", "4br_plus"];

const homeSizeRates = {
  studio: 1500,
  "1br": 2500,
  "2br": 4000,
  "3br": 5500,
  "4br_plus": 7500,
};

// Weighs distance vs. home size as primary/secondary based on a fixed
// distance threshold - short moves are dominated by how much is being
// carried, long moves by how far it's going. Returns null (rather than a
// partial/zero estimate) when either input is missing, mirroring
// attachDistanceKm's "leave untouched if inputs missing" pattern.
const calculateMoverPriceEstimate = ({ distanceKm, homeSize, basePrice }) => {
  if (distanceKm === undefined || distanceKm === null || !homeSize) {
    return null;
  }

  const distanceCost = distanceKm * RATE_PER_KM;
  const sizeCost = homeSizeRates[homeSize] ?? 0;
  const [primary, secondary] =
    distanceKm < DISTANCE_THRESHOLD_KM ? [sizeCost, distanceCost] : [distanceCost, sizeCost];

  return Math.round((basePrice || 0) + primary + secondary * SECONDARY_WEIGHT);
};

export { homeSizes, homeSizeRates, RATE_PER_KM, DISTANCE_THRESHOLD_KM, SECONDARY_WEIGHT, calculateMoverPriceEstimate };
