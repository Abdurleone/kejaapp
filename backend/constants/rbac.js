const roles = Object.freeze({
  tenant: "tenant",
  landlord: "landlord",
  agency: "agency",
  mover: "mover",
  admin: "admin",
});

const roleGroups = Object.freeze({
  publicRegistration: [roles.tenant, roles.landlord, roles.agency, roles.mover],
  tenantOnly: [roles.tenant],
  listingManagers: [roles.landlord, roles.agency],
  propertyOwners: [roles.landlord, roles.agency],
  agencies: [roles.agency],
  movers: [roles.mover],
});

const roleList = Object.freeze(Object.values(roles));

export { roleGroups, roleList, roles };
