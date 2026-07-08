import httpStatus from "../constants/httpStatus.js";
import ApiError from "./apiError.js";

const adjectives = [
  "amber", "bold", "brave", "bright", "calm", "clever", "cool", "crimson",
  "cheerful", "curious", "dawn", "eager", "earnest", "fair", "fresh", "gentle",
  "golden", "graceful", "happy", "honest", "humble", "jolly", "keen", "kind",
  "lively", "lucky", "mellow", "merry", "mighty", "misty", "noble", "nimble",
  "plucky", "prime", "quiet", "quick", "rapid", "royal", "rustic", "sharp",
  "shiny", "silent", "sleek", "smart", "sunny", "swift", "steady", "tidy",
  "vivid", "warm",
];

const nouns = [
  "acacia", "antelope", "baobab", "breeze", "canyon", "cheetah", "cliff",
  "cloud", "comet", "coral", "crane", "creek", "delta", "dune", "eagle",
  "ember", "falcon", "fern", "forest", "galaxy", "garden", "glacier",
  "harbor", "hawk", "hill", "horizon", "island", "ivory", "jasper", "jungle",
  "lagoon", "lake", "leopard", "maple", "meadow", "mountain", "oasis",
  "orchid", "panther", "peak", "pebble", "plains", "prairie", "quartz",
  "reef", "ridge", "river", "safari", "savanna", "shore", "sky", "spring",
  "stream", "summit", "thunder", "tundra", "valley", "willow", "zebra",
];

const randomItem = (list) => list[Math.floor(Math.random() * list.length)];

const randomDigits = () => String(Math.floor(100 + Math.random() * 9900));

const buildUsername = () => `${randomItem(adjectives)}${randomItem(nouns)}${randomDigits()}`;

const maxGenerationAttempts = 5;

const generateUniqueUsername = async (UserModel) => {
  for (let attempt = 0; attempt < maxGenerationAttempts; attempt += 1) {
    const candidate = buildUsername();
    const exists = await UserModel.exists({ username: candidate });

    if (!exists) {
      return candidate;
    }
  }

  throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, "Could not generate a unique username");
};

const maxSuggestionAttempts = 15;

const suggestUsernames = async (UserModel, base, count = 3) => {
  const normalizedBase = base.trim().toLowerCase();
  const suggestions = [];

  for (let attempt = 0; attempt < maxSuggestionAttempts && suggestions.length < count; attempt += 1) {
    const candidate = `${normalizedBase}${randomDigits()}`;

    if (suggestions.includes(candidate)) {
      continue;
    }

    const exists = await UserModel.exists({ username: candidate });

    if (!exists) {
      suggestions.push(candidate);
    }
  }

  return suggestions;
};

export { buildUsername, generateUniqueUsername, suggestUsernames };
