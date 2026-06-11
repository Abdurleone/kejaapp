const toAmount = (value) => {
  const amount = Number(value ?? 0);

  return Number.isFinite(amount) ? amount : 0;
};

const calculatePropertyCosts = (price = {}) => {
  const rent = toAmount(price.rent);
  const deposit = toAmount(price.deposit);
  const agencyFee = toAmount(price.agencyFee);

  return {
    rent,
    deposit,
    agencyFee,
    firstMonthTotal: rent + agencyFee,
    upfrontTotal: rent + deposit + agencyFee,
    recurringMonthlyTotal: rent,
  };
};

const toPlainProperty = (property) => {
  if (property?.toObject) {
    return property.toObject();
  }

  return { ...property };
};

const attachCostSummary = (property) => {
  const plainProperty = toPlainProperty(property);

  return {
    ...plainProperty,
    costSummary: calculatePropertyCosts(plainProperty.price),
  };
};

const attachCostSummaries = (properties) => properties.map((property) => attachCostSummary(property));

const attachFavoritePropertyCostSummary = (favorite) => {
  const plainFavorite = favorite?.toObject ? favorite.toObject() : { ...favorite };

  return {
    ...plainFavorite,
    property: plainFavorite.property ? attachCostSummary(plainFavorite.property) : plainFavorite.property,
  };
};

const attachFavoritePropertyCostSummaries = (favorites) =>
  favorites.map((favorite) => attachFavoritePropertyCostSummary(favorite));

export {
  attachFavoritePropertyCostSummaries,
  attachFavoritePropertyCostSummary,
  attachCostSummaries,
  attachCostSummary,
  calculatePropertyCosts,
};
