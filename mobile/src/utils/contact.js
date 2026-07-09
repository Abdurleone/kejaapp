// Builds native intent URIs for reaching a property's owner directly,
// bypassing the in-app inquiry flow when they've shared other contact info.
export const buildPhoneUrl = (phone) => (phone ? `tel:${phone.replace(/[^+\d]/g, "")}` : null);

export const buildEmailUrl = (email) => (email ? `mailto:${email}` : null);

export const buildWhatsAppUrl = (phone) => (phone ? `https://wa.me/${phone.replace(/\D/g, "")}` : null);

export const getPreferredContactUrl = (contact) => {
  if (!contact) return null;

  switch (contact.preferredMethod) {
    case "phone":
      return buildPhoneUrl(contact.phone);
    case "email":
      return buildEmailUrl(contact.email);
    case "whatsapp":
      return buildWhatsAppUrl(contact.whatsapp || contact.phone);
    default:
      return null;
  }
};
