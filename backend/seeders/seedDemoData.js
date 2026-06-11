import mongoose from "mongoose";
import { pathToFileURL } from "node:url";
import connectDB, { disconnectDB } from "../config/db.js";
import Mover from "../models/Mover.js";
import Property from "../models/Property.js";
import User from "../models/User.js";

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
];

const upsertUsers = async () => {
  const savedUsers = {};

  for (const userData of users) {
    let user = await User.findOne({ email: userData.email });

    if (!user) {
      user = await User.create(userData);
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

const upsertProperties = async (savedUsers) => {
  const agency = savedUsers["agency@example.com"];
  const landlord = savedUsers["landlord@example.com"];

  for (const property of properties) {
    let owner = property.listedBy === "agency" ? agency : landlord;

    if (property.ownerEmail) {
      owner = savedUsers[property.ownerEmail];
    }

    const { ownerEmail, ...propertyData } = property;

    await Property.findOneAndUpdate(
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
  }
};

const seedDemoData = async () => {
  try {
    await connectDB();

    const savedUsers = await upsertUsers();
    await upsertMovers();
    await upsertProperties(savedUsers);

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

export { movers, properties, seedDemoData, users };
