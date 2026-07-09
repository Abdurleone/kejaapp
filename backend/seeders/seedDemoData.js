import mongoose from "mongoose";
import { pathToFileURL } from "node:url";
import connectDB, { disconnectDB } from "../config/db.js";
import AgencyVerification from "../models/AgencyVerification.js";
import Inquiry from "../models/Inquiry.js";
import Mover from "../models/Mover.js";
import Property from "../models/Property.js";
import Review from "../models/Review.js";
import User from "../models/User.js";
import ViewingRequest from "../models/ViewingRequest.js";
import { fingerprintPropertyImage } from "../services/imageFingerprintService.js";
import { generateUniqueUsername } from "../utils/usernameGenerator.js";

const users = [
  {
    name: "Demo Tenant",
    email: "tenant@example.com",
    password: "password123",
    role: "tenant",
    phone: "+254733000000",
  },
  {
    name: "Grace Tenant",
    email: "grace.tenant@example.com",
    password: "password123",
    role: "tenant",
    phone: "+254733000001",
  },
  {
    name: "James Tenant",
    email: "james.tenant@example.com",
    password: "password123",
    role: "tenant",
    phone: "+254733000002",
  },
  {
    name: "Amina Tenant",
    email: "amina.tenant@example.com",
    password: "password123",
    role: "tenant",
    phone: "+254733000003",
  },
  {
    name: "Demo Agency",
    email: "agency@example.com",
    password: "password123",
    role: "agency",
    phone: "+254700000000",
  },
  {
    name: "Urban Nest Agency",
    email: "urban.agency@example.com",
    password: "password123",
    role: "agency",
    phone: "+254700000001",
  },
  {
    name: "Rejected Realty Agency",
    email: "rejected.agency@example.com",
    password: "password123",
    role: "agency",
    phone: "+254700000002",
  },
  {
    name: "Demo Landlord",
    email: "landlord@example.com",
    password: "password123",
    role: "landlord",
    phone: "+254711000000",
  },
  {
    name: "Mary Landlord",
    email: "mary.landlord@example.com",
    password: "password123",
    role: "landlord",
    phone: "+254711000001",
  },
  {
    name: "Demo Admin",
    email: "admin@example.com",
    password: "password123",
    role: "admin",
    phone: "+254722000000",
  },
];

const movers = [
  {
    name: "SwiftMove Nairobi",
    phone: "+254722000001",
    email: "hello@swiftmove.example",
    serviceTypes: ["local", "packing", "furniture"],
    location: {
      county: "Nairobi",
      town: "Nairobi",
      areasServed: ["Kilimani", "Westlands", "Kileleshwa", "Lavington"],
    },
    basePrice: 3500,
    ratingAverage: 4.7,
    ratingCount: 38,
    verified: true,
  },
  {
    name: "Rift Relocations",
    phone: "+254733000002",
    email: "bookings@riftrelocations.example",
    serviceTypes: ["long_distance", "storage", "office"],
    location: {
      county: "Nakuru",
      town: "Nakuru",
      areasServed: ["Nakuru", "Naivasha", "Eldoret", "Nairobi"],
    },
    basePrice: 12000,
    ratingAverage: 4.4,
    ratingCount: 21,
    verified: true,
  },
  {
    name: "Coastal Movers Mombasa",
    phone: "+254744000003",
    email: "info@coastalmovers.example",
    serviceTypes: ["local", "packing", "storage"],
    location: {
      county: "Mombasa",
      town: "Mombasa",
      areasServed: ["Nyali", "Mombasa Island", "Bamburi"],
    },
    basePrice: 5000,
    ratingAverage: 4.6,
    ratingCount: 27,
    verified: true,
  },
  {
    name: "Lakeview Relocations Kisumu",
    phone: "+254755000004",
    email: "hello@lakeviewrelocations.example",
    serviceTypes: ["local", "long_distance", "furniture"],
    location: {
      county: "Kisumu",
      town: "Kisumu",
      areasServed: ["Milimani", "Kisumu Central", "Nyalenda"],
    },
    basePrice: 4500,
    ratingAverage: 4.3,
    ratingCount: 14,
    verified: false,
  },
];

const agencyVerifications = [
  {
    userEmail: "agency@example.com",
    agencyName: "Demo Homes Agency",
    registrationNumber: "BN-123456",
    businessEmail: "agency@example.com",
    businessPhone: "+254700000000",
    officeAddress: "Kilimani, Nairobi",
    documents: [
      {
        type: "business_registration",
        url: "https://example.com/demo-homes-registration.pdf",
      },
      {
        type: "tax_certificate",
        url: "https://example.com/demo-homes-tax-certificate.pdf",
      },
    ],
    status: "pending",
  },
  {
    userEmail: "urban.agency@example.com",
    agencyName: "Urban Nest Agency",
    registrationNumber: "BN-654321",
    businessEmail: "urban.agency@example.com",
    businessPhone: "+254700000001",
    officeAddress: "Westlands, Nairobi",
    documents: [
      {
        type: "business_registration",
        url: "https://example.com/urban-nest-registration.pdf",
      },
      {
        type: "license",
        url: "https://example.com/urban-nest-license.pdf",
      },
    ],
    status: "approved",
    reviewedByEmail: "admin@example.com",
  },
  {
    userEmail: "rejected.agency@example.com",
    agencyName: "Rejected Realty Agency",
    registrationNumber: "BN-000111",
    businessEmail: "rejected.agency@example.com",
    businessPhone: "+254700000002",
    officeAddress: "Upper Hill, Nairobi",
    documents: [
      {
        type: "business_registration",
        url: "https://example.com/rejected-realty-registration.pdf",
      },
    ],
    status: "rejected",
    reviewedByEmail: "admin@example.com",
    rejectionReason: "Registration document could not be verified.",
  },
];

const properties = [
  {
    title: "Modern Kilimani Apartment",
    description: "Bright apartment near shops and transit.",
    type: "apartment",
    price: {
      rent: 65000,
      deposit: 65000,
      agencyFee: 5000,
    },
    location: {
      county: "Nairobi",
      town: "Nairobi",
      area: "Kilimani",
      coordinates: {
        type: "Point",
        coordinates: [36.782, -1.2921],
      },
    },
    bedrooms: 2,
    bathrooms: 2,
    amenities: ["parking", "wifi", "security"],
    images: [
      {
        url: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=900&q=70",
        alt: "Bright living room with balcony",
      },
    ],
    listedBy: "agency",
    status: "available",
    viewingType: "scheduled",
    viewingInstructions: "Viewing available by appointment after agency confirmation.",
    contact: {
      preferredMethod: "whatsapp",
      phone: "+254700000000",
      whatsapp: "+254700000000",
      email: "agency@example.com",
      availableHours: "Weekdays 9 AM to 5 PM",
      notes: "Use WhatsApp for fastest viewing confirmation.",
    },
  },
  {
    title: "Cozy Westlands Studio",
    description: "Compact studio with quick access to Westlands offices.",
    type: "studio",
    price: {
      rent: 42000,
      deposit: 42000,
      agencyFee: 3000,
    },
    location: {
      county: "Nairobi",
      town: "Nairobi",
      area: "Westlands",
      coordinates: {
        type: "Point",
        coordinates: [36.8085, -1.2676],
      },
    },
    bedrooms: 0,
    bathrooms: 1,
    amenities: ["security", "water", "backup power"],
    images: [
      {
        url: "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=900&q=70",
        alt: "Compact studio interior",
      },
    ],
    listedBy: "agency",
    status: "available",
    viewingType: "open",
    viewingInstructions: "Open viewing on weekdays from 10 AM to 4 PM. Call the agency on arrival.",
    contact: {
      preferredMethod: "phone",
      phone: "+254700000000",
      email: "agency@example.com",
      availableHours: "Weekdays 10 AM to 4 PM",
    },
  },
  {
    title: "Spacious Nakuru Maisonette",
    description: "Family home close to schools and daily amenities.",
    type: "maisonette",
    price: {
      rent: 85000,
      deposit: 85000,
      agencyFee: 0,
    },
    location: {
      county: "Nakuru",
      town: "Nakuru",
      area: "Milimani",
      coordinates: {
        type: "Point",
        coordinates: [36.08, -0.3031],
      },
    },
    bedrooms: 4,
    bathrooms: 3,
    amenities: ["garden", "parking", "water storage"],
    images: [
      {
        url: "https://images.unsplash.com/photo-1560185127-6ed189bf02f4?auto=format&fit=crop&w=900&q=70",
        alt: "Spacious living room",
      },
    ],
    listedBy: "owner",
    status: "available",
    viewingType: "scheduled",
    viewingInstructions: "Weekend viewings only after landlord confirmation.",
    contact: {
      preferredMethod: "inquiry",
      phone: "+254711000000",
      email: "landlord@example.com",
      availableHours: "Saturday and Sunday afternoons",
    },
  },
  {
    title: "Draft Kileleshwa Duplex",
    description: "Quiet duplex undergoing final paint touch-ups before public listing.",
    type: "maisonette",
    price: {
      rent: 120000,
      deposit: 120000,
      agencyFee: 0,
    },
    location: {
      county: "Nairobi",
      town: "Nairobi",
      area: "Kileleshwa",
      coordinates: {
        type: "Point",
        coordinates: [36.7878, -1.2814],
      },
    },
    bedrooms: 3,
    bathrooms: 3,
    amenities: ["parking", "garden", "water storage"],
    images: [
      {
        url: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=900&q=70",
        alt: "Living room reused from another listing",
      },
    ],
    listedBy: "owner",
    ownerEmail: "mary.landlord@example.com",
    status: "draft",
    viewingType: "scheduled",
    viewingInstructions: "Viewings will open after maintenance is complete.",
    contact: {
      preferredMethod: "email",
      phone: "+254711000001",
      email: "mary.landlord@example.com",
      availableHours: "Weekdays 2 PM to 6 PM",
    },
  },
  {
    title: "Taken Lavington Townhouse",
    description: "Recently matched townhouse kept for owner history and dashboard testing.",
    type: "house",
    price: {
      rent: 150000,
      deposit: 150000,
      agencyFee: 10000,
    },
    location: {
      county: "Nairobi",
      town: "Nairobi",
      area: "Lavington",
      coordinates: {
        type: "Point",
        coordinates: [36.7688, -1.2833],
      },
    },
    bedrooms: 4,
    bathrooms: 4,
    amenities: ["security", "garden", "parking", "backup power"],
    images: [
      {
        url: "https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=900&q=70",
        alt: "Townhouse exterior",
      },
    ],
    listedBy: "agency",
    ownerEmail: "urban.agency@example.com",
    status: "taken",
    viewingType: "scheduled",
    viewingInstructions: "This listing is taken and not open for viewing requests.",
    contact: {
      preferredMethod: "phone",
      phone: "+254700000001",
      email: "urban.agency@example.com",
      availableHours: "Weekdays 9 AM to 4 PM",
    },
  },
  {
    title: "Nyali Beach View Apartment",
    description: "Sea-breeze apartment minutes from Nyali beach and shopping malls.",
    type: "apartment",
    price: {
      rent: 68000,
      deposit: 68000,
      agencyFee: 5000,
    },
    location: {
      county: "Mombasa",
      town: "Mombasa",
      area: "Nyali",
      coordinates: {
        type: "Point",
        coordinates: [39.7124, -4.0198],
      },
    },
    bedrooms: 2,
    bathrooms: 2,
    amenities: ["parking", "security", "backup power", "borehole water"],
    images: [
      {
        url: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=900&q=70",
        alt: "Modern apartment interior",
      },
    ],
    listedBy: "agency",
    status: "available",
    viewingType: "scheduled",
    viewingInstructions: "Viewing available by appointment after agency confirmation.",
    contact: {
      preferredMethod: "whatsapp",
      phone: "+254700000000",
      whatsapp: "+254700000000",
      email: "agency@example.com",
      availableHours: "Weekdays 9 AM to 5 PM",
    },
  },
  {
    title: "Milimani Kisumu Family House",
    description: "Established family home in a leafy Kisumu neighborhood near the lakefront.",
    type: "house",
    price: {
      rent: 70000,
      deposit: 70000,
      agencyFee: 0,
    },
    location: {
      county: "Kisumu",
      town: "Kisumu",
      area: "Milimani",
      coordinates: {
        type: "Point",
        coordinates: [34.768, -0.0917],
      },
    },
    bedrooms: 3,
    bathrooms: 2,
    amenities: ["garden", "parking", "water storage"],
    images: [
      {
        url: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=900&q=70",
        alt: "Family house exterior",
      },
    ],
    listedBy: "owner",
    status: "available",
    viewingType: "scheduled",
    viewingInstructions: "Weekend viewings only after landlord confirmation.",
    contact: {
      preferredMethod: "inquiry",
      phone: "+254711000000",
      email: "landlord@example.com",
      availableHours: "Saturday and Sunday afternoons",
    },
  },
  {
    title: "Elgon View Eldoret Maisonette",
    description: "Modern maisonette in a quiet Eldoret suburb close to schools.",
    type: "maisonette",
    price: {
      rent: 60000,
      deposit: 60000,
      agencyFee: 4000,
    },
    location: {
      county: "Uasin Gishu",
      town: "Eldoret",
      area: "Elgon View",
      coordinates: {
        type: "Point",
        coordinates: [35.2698, 0.5143],
      },
    },
    bedrooms: 3,
    bathrooms: 3,
    amenities: ["parking", "security", "garden"],
    images: [
      {
        url: "https://images.unsplash.com/photo-1554995207-c18c203602cb?auto=format&fit=crop&w=900&q=70",
        alt: "Maisonette interior",
      },
    ],
    listedBy: "agency",
    ownerEmail: "urban.agency@example.com",
    status: "available",
    viewingType: "open",
    viewingInstructions: "Open viewing on weekdays from 10 AM to 4 PM. Call the agency on arrival.",
    contact: {
      preferredMethod: "phone",
      phone: "+254700000001",
      email: "urban.agency@example.com",
      availableHours: "Weekdays 10 AM to 4 PM",
    },
  },
  {
    title: "Makongeni Thika Bedsitter",
    description: "Affordable bedsitter close to Thika's industrial area and matatu routes.",
    type: "bedsitter",
    price: {
      rent: 12000,
      deposit: 12000,
      agencyFee: 0,
    },
    location: {
      county: "Kiambu",
      town: "Thika",
      area: "Makongeni",
      coordinates: {
        type: "Point",
        coordinates: [37.0693, -1.0332],
      },
    },
    bedrooms: 0,
    bathrooms: 1,
    amenities: ["water", "security"],
    images: [
      {
        url: "https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=900&q=70",
        alt: "Bedsitter room",
      },
    ],
    listedBy: "owner",
    ownerEmail: "mary.landlord@example.com",
    status: "available",
    viewingType: "scheduled",
    viewingInstructions: "Contact owner directly to arrange a viewing time.",
    contact: {
      preferredMethod: "phone",
      phone: "+254711000001",
      email: "mary.landlord@example.com",
      availableHours: "Weekdays 2 PM to 6 PM",
    },
  },
  {
    title: "Kamakwa Nyeri Bungalow",
    description: "Peaceful bungalow with mountain views on the edge of Nyeri town.",
    type: "house",
    price: {
      rent: 45000,
      deposit: 45000,
      agencyFee: 0,
    },
    location: {
      county: "Nyeri",
      town: "Nyeri",
      area: "Kamakwa",
      coordinates: {
        type: "Point",
        coordinates: [36.9476, -0.4201],
      },
    },
    bedrooms: 3,
    bathrooms: 2,
    amenities: ["garden", "parking", "water storage", "backup power"],
    images: [
      {
        url: "https://images.unsplash.com/photo-1571508601891-ca5e7a713859?auto=format&fit=crop&w=900&q=70",
        alt: "Bungalow exterior",
      },
    ],
    listedBy: "owner",
    status: "available",
    viewingType: "scheduled",
    viewingInstructions: "Weekend viewings only after landlord confirmation.",
    contact: {
      preferredMethod: "inquiry",
      phone: "+254711000000",
      email: "landlord@example.com",
      availableHours: "Saturday and Sunday afternoons",
    },
  },
  {
    title: "Naivasha Lakeside Studio",
    description: "Compact studio a short walk from Lake Naivasha and the town center.",
    type: "studio",
    price: {
      rent: 25000,
      deposit: 25000,
      agencyFee: 2000,
    },
    location: {
      county: "Nakuru",
      town: "Naivasha",
      area: "Naivasha Town",
      coordinates: {
        type: "Point",
        coordinates: [36.431, -0.7172],
      },
    },
    bedrooms: 0,
    bathrooms: 1,
    amenities: ["security", "water"],
    images: [
      {
        url: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=900&q=70",
        alt: "Lakeside studio interior",
      },
    ],
    listedBy: "agency",
    status: "available",
    viewingType: "open",
    viewingInstructions: "Open viewing on weekdays from 10 AM to 4 PM. Call the agency on arrival.",
    contact: {
      preferredMethod: "phone",
      phone: "+254700000000",
      email: "agency@example.com",
      availableHours: "Weekdays 10 AM to 4 PM",
    },
  },
  {
    title: "Machakos Town Apartment",
    description: "Convenient apartment close to Machakos bus terminus and the main market.",
    type: "apartment",
    price: {
      rent: 30000,
      deposit: 30000,
      agencyFee: 0,
    },
    location: {
      county: "Machakos",
      town: "Machakos",
      area: "Machakos Town",
      coordinates: {
        type: "Point",
        coordinates: [37.2634, -1.5177],
      },
    },
    bedrooms: 1,
    bathrooms: 1,
    amenities: ["water", "security"],
    images: [
      {
        url: "https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?auto=format&fit=crop&w=900&q=70",
        alt: "Bright apartment room",
      },
    ],
    listedBy: "owner",
    ownerEmail: "mary.landlord@example.com",
    status: "available",
    viewingType: "scheduled",
    viewingInstructions: "Contact owner directly to arrange a viewing time.",
    contact: {
      preferredMethod: "email",
      phone: "+254711000001",
      email: "mary.landlord@example.com",
      availableHours: "Weekdays 2 PM to 6 PM",
    },
  },
  {
    title: "Kakamega Green Maisonette",
    description: "Family maisonette near Kakamega Forest with a large compound.",
    type: "maisonette",
    price: {
      rent: 40000,
      deposit: 40000,
      agencyFee: 3000,
    },
    location: {
      county: "Kakamega",
      town: "Kakamega",
      area: "Kakamega Town",
      coordinates: {
        type: "Point",
        coordinates: [34.7519, 0.2827],
      },
    },
    bedrooms: 3,
    bathrooms: 2,
    amenities: ["garden", "parking", "security"],
    images: [
      {
        url: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=900&q=70",
        alt: "Maisonette with large compound",
      },
    ],
    listedBy: "agency",
    ownerEmail: "urban.agency@example.com",
    status: "available",
    viewingType: "scheduled",
    viewingInstructions: "Viewing available by appointment after agency confirmation.",
    contact: {
      preferredMethod: "whatsapp",
      phone: "+254700000001",
      whatsapp: "+254700000001",
      email: "urban.agency@example.com",
      availableHours: "Weekdays 9 AM to 5 PM",
    },
  },
];

const inquiries = [
  {
    propertyTitle: "Modern Kilimani Apartment",
    senderEmail: "tenant@example.com",
    subject: "Viewing and availability",
    message: "Is this apartment still available, and can I view it this week?",
    contactPreference: "phone",
    status: "open",
  },
  {
    propertyTitle: "Spacious Nakuru Maisonette",
    senderEmail: "grace.tenant@example.com",
    subject: "School commute question",
    message: "How far is the home from nearby primary schools?",
    contactPreference: "email",
    status: "responded",
    response: "There are two primary schools within a short drive of the property.",
    respondedByEmail: "landlord@example.com",
  },
];

const viewingRequests = [
  {
    propertyTitle: "Modern Kilimani Apartment",
    requesterEmail: "tenant@example.com",
    requestedDate: "2026-07-01T10:00:00.000Z",
    message: "I would like to view this property in the morning.",
    status: "pending",
  },
  {
    propertyTitle: "Cozy Westlands Studio",
    requesterEmail: "grace.tenant@example.com",
    message: "I plan to attend the open viewing.",
    status: "approved",
    reviewedByEmail: "agency@example.com",
    decisionReason: "Open viewing attendance confirmed.",
  },
];

const reviews = [
  {
    propertyTitle: "Modern Kilimani Apartment",
    reviewerEmail: "tenant@example.com",
    rating: 5,
    comment: "Bright, well-located, and the agency was quick to respond.",
  },
  {
    propertyTitle: "Modern Kilimani Apartment",
    reviewerEmail: "grace.tenant@example.com",
    rating: 4,
    comment: "Great spot near shops and transit, a bit noisy at night.",
  },
  {
    propertyTitle: "Modern Kilimani Apartment",
    reviewerEmail: "james.tenant@example.com",
    rating: 5,
    comment: "Clean, secure, and exactly as advertised.",
  },
  {
    propertyTitle: "Cozy Westlands Studio",
    reviewerEmail: "grace.tenant@example.com",
    rating: 4,
    comment: "Compact but comfortable, good value for Westlands.",
  },
  {
    propertyTitle: "Cozy Westlands Studio",
    reviewerEmail: "james.tenant@example.com",
    rating: 4,
    comment: "Landlord was responsive and the studio was move-in ready.",
  },
  {
    propertyTitle: "Spacious Nakuru Maisonette",
    reviewerEmail: "tenant@example.com",
    rating: 5,
    comment: "Plenty of space for the family and a quiet neighborhood.",
  },
  {
    propertyTitle: "Spacious Nakuru Maisonette",
    reviewerEmail: "amina.tenant@example.com",
    rating: 4,
    comment: "Good schools nearby, matched the listing description well.",
  },
  {
    propertyTitle: "Nyali Beach View Apartment",
    reviewerEmail: "james.tenant@example.com",
    rating: 5,
    comment: "Stunning ocean views and a short walk to the beach.",
  },
  {
    propertyTitle: "Nyali Beach View Apartment",
    reviewerEmail: "amina.tenant@example.com",
    rating: 5,
    comment: "Best coastal rental we viewed, would recommend to anyone.",
  },
  {
    propertyTitle: "Milimani Kisumu Family House",
    reviewerEmail: "tenant@example.com",
    rating: 4,
    comment: "Solid family home with a decent-sized compound.",
  },
  {
    propertyTitle: "Elgon View Eldoret Maisonette",
    reviewerEmail: "grace.tenant@example.com",
    rating: 4,
    comment: "Quiet estate with easy access to town.",
  },
  {
    propertyTitle: "Elgon View Eldoret Maisonette",
    reviewerEmail: "amina.tenant@example.com",
    rating: 3,
    comment: "Decent place, but the water pressure could be better.",
  },
  {
    propertyTitle: "Makongeni Thika Bedsitter",
    reviewerEmail: "james.tenant@example.com",
    rating: 4,
    comment: "Affordable and close to the main road, good for commuting.",
  },
  {
    propertyTitle: "Kamakwa Nyeri Bungalow",
    reviewerEmail: "tenant@example.com",
    rating: 5,
    comment: "Peaceful bungalow with a lovely garden, great host.",
  },
  {
    propertyTitle: "Naivasha Lakeside Studio",
    reviewerEmail: "grace.tenant@example.com",
    rating: 4,
    comment: "Short walk to the lake, cozy and well-kept studio.",
  },
];

const upsertUsers = async () => {
  const savedUsers = {};

  for (const userData of users) {
    let user = await User.findOne({ email: userData.email });

    if (!user) {
      user = await User.create({ ...userData, username: await generateUniqueUsername(User) });
    } else {
      user.name = userData.name;
      user.role = userData.role;
      user.phone = userData.phone;
      await user.save();
    }

    savedUsers[user.email] = user;
  }

  return savedUsers;
};

const upsertMovers = async () => {
  for (const mover of movers) {
    await Mover.findOneAndUpdate(
      { name: mover.name },
      mover,
      {
        returnDocument: "after",
        runValidators: true,
        setDefaultsOnInsert: true,
        upsert: true,
      }
    );
  }
};

const upsertAgencyVerifications = async (savedUsers) => {
  for (const verification of agencyVerifications) {
    const user = savedUsers[verification.userEmail];
    const reviewedBy = verification.reviewedByEmail ? savedUsers[verification.reviewedByEmail] : null;
    const { reviewedByEmail, userEmail, ...verificationData } = verification;

    await AgencyVerification.findOneAndUpdate(
      { user: user._id },
      {
        ...verificationData,
        user: user._id,
        reviewedBy: reviewedBy?._id || null,
        reviewedAt: verification.status === "approved" || verification.status === "rejected" ? new Date() : null,
        rejectionReason: verification.status === "rejected" ? verification.rejectionReason : undefined,
      },
      {
        returnDocument: "after",
        runValidators: true,
        setDefaultsOnInsert: true,
        upsert: true,
      }
    );
  }
};

const upsertProperties = async (savedUsers) => {
  const agency = savedUsers["agency@example.com"];
  const landlord = savedUsers["landlord@example.com"];
  const savedProperties = {};

  for (const property of properties) {
    let owner = property.listedBy === "agency" ? agency : landlord;

    if (property.ownerEmail) {
      owner = savedUsers[property.ownerEmail];
    }

    const { ownerEmail, ...propertyData } = property;

    const savedProperty = await Property.findOneAndUpdate(
      { title: property.title },
      {
        ...propertyData,
        owner: owner._id,
      },
      {
        returnDocument: "after",
        runValidators: true,
        setDefaultsOnInsert: true,
        upsert: true,
      }
    );

    savedProperties[savedProperty.title] = savedProperty;
  }

  return savedProperties;
};

const upsertInquiries = async (savedUsers, savedProperties) => {
  for (const inquiry of inquiries) {
    const property = savedProperties[inquiry.propertyTitle];
    const sender = savedUsers[inquiry.senderEmail];
    const respondedBy = inquiry.respondedByEmail ? savedUsers[inquiry.respondedByEmail] : null;
    const { propertyTitle, respondedByEmail, senderEmail, ...inquiryData } = inquiry;

    await Inquiry.findOneAndUpdate(
      {
        property: property._id,
        sender: sender._id,
        subject: inquiry.subject,
      },
      {
        ...inquiryData,
        property: property._id,
        sender: sender._id,
        owner: property.owner,
        respondedBy: respondedBy?._id || null,
        respondedAt: inquiry.status === "responded" ? new Date() : null,
      },
      {
        returnDocument: "after",
        runValidators: true,
        setDefaultsOnInsert: true,
        upsert: true,
      }
    );
  }
};

const upsertViewingRequests = async (savedUsers, savedProperties) => {
  for (const viewingRequest of viewingRequests) {
    const property = savedProperties[viewingRequest.propertyTitle];
    const requester = savedUsers[viewingRequest.requesterEmail];
    const reviewedBy = viewingRequest.reviewedByEmail ? savedUsers[viewingRequest.reviewedByEmail] : null;
    const { propertyTitle, requesterEmail, reviewedByEmail, ...viewingRequestData } = viewingRequest;

    await ViewingRequest.findOneAndUpdate(
      {
        property: property._id,
        requester: requester._id,
        status: viewingRequest.status,
      },
      {
        ...viewingRequestData,
        property: property._id,
        requester: requester._id,
        owner: property.owner,
        reviewedBy: reviewedBy?._id || null,
        reviewedAt: reviewedBy ? new Date() : null,
      },
      {
        returnDocument: "after",
        runValidators: true,
        setDefaultsOnInsert: true,
        upsert: true,
      }
    );
  }
};

const upsertReviews = async (savedUsers, savedProperties) => {
  const reviewedPropertyIds = new Map();

  for (const review of reviews) {
    const property = savedProperties[review.propertyTitle];
    const reviewer = savedUsers[review.reviewerEmail];
    const { propertyTitle, reviewerEmail, ...reviewData } = review;

    await Review.findOneAndUpdate(
      {
        property: property._id,
        user: reviewer._id,
      },
      {
        ...reviewData,
        property: property._id,
        user: reviewer._id,
      },
      {
        returnDocument: "after",
        runValidators: true,
        setDefaultsOnInsert: true,
        upsert: true,
      }
    );

    reviewedPropertyIds.set(property._id.toString(), property._id);
  }

  for (const propertyId of reviewedPropertyIds.values()) {
    await Review.updatePropertyRating(propertyId);
  }
};

const upsertImageFingerprints = async (savedProperties) => {
  for (const property of Object.values(savedProperties)) {
    for (const image of property.images) {
      await fingerprintPropertyImage({
        image,
        property,
        uploadedBy: property.owner,
      });
    }
  }
};

const seedDemoData = async () => {
  try {
    await connectDB();

    const savedUsers = await upsertUsers();
    await upsertMovers();
    await upsertAgencyVerifications(savedUsers);
    const savedProperties = await upsertProperties(savedUsers);
    await upsertInquiries(savedUsers, savedProperties);
    await upsertViewingRequests(savedUsers, savedProperties);
    await upsertReviews(savedUsers, savedProperties);
    await upsertImageFingerprints(savedProperties);

    console.log("Demo data seeded successfully");
  } catch (error) {
    console.error(`Demo seed failed: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await disconnectDB();
    await mongoose.disconnect();
  }
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  seedDemoData();
}

export {
  agencyVerifications,
  inquiries,
  movers,
  properties,
  seedDemoData,
  users,
  viewingRequests,
};
