import mongoose from "mongoose";
import connectDB, { disconnectDB } from "../config/db.js";
import Mover from "../models/Mover.js";
import Property from "../models/Property.js";
import User from "../models/User.js";

const users = [
  {
    name: "Demo Agency",
    email: "agency@example.com",
    password: "password123",
    role: "agency",
    phone: "+254700000000",
  },
  {
    name: "Demo Landlord",
    email: "landlord@example.com",
    password: "password123",
    role: "landlord",
    phone: "+254711000000",
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
    },
    bedrooms: 2,
    bathrooms: 2,
    amenities: ["parking", "wifi", "security"],
    listedBy: "agency",
    viewingType: "scheduled",
    viewingInstructions: "Viewing available by appointment after agency confirmation.",
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
    },
    bedrooms: 0,
    bathrooms: 1,
    amenities: ["security", "water", "backup power"],
    listedBy: "agency",
    viewingType: "open",
    viewingInstructions: "Open viewing on weekdays from 10 AM to 4 PM. Call the agency on arrival.",
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
    },
    bedrooms: 4,
    bathrooms: 3,
    amenities: ["garden", "parking", "water storage"],
    listedBy: "owner",
    viewingType: "scheduled",
    viewingInstructions: "Weekend viewings only after landlord confirmation.",
  },
];

const upsertUsers = async () => {
  const savedUsers = {};

  for (const userData of users) {
    let user = await User.findOne({ email: userData.email });

    if (!user) {
      user = await User.create(userData);
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
    const owner = property.listedBy === "agency" ? agency : landlord;

    await Property.findOneAndUpdate(
      { title: property.title },
      {
        ...property,
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

seedDemoData();
