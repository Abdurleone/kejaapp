const roles = Object.freeze({
  tenant: "tenant",
  landlord: "landlord",
  agency: "agency",
  admin: "admin",
});

const roleGroups = Object.freeze({
  publicRegistration: [roles.tenant, roles.landlord, roles.agency],
  tenantOnly: [roles.tenant],
  listingManagers: [roles.landlord, roles.agency],
  propertyOwners: [roles.landlord, roles.agency],
  agencies: [roles.agency],
  admins: [roles.admin],
});

const roleList = Object.freeze(Object.values(roles));

export { roleGroups, roleList, roles };
