🏠 Keja App

Kejaapp is a location-first rental platform that helps users discover, evaluate, and move into properties with full pricing transparency and verified listings.

📁 Project Structure

Here’s a realistic structure based on your architecture (React + Node + mongoDB):

kejaapp/
│
├── backend/
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── config/
│   ├── middleware/
│   ├── server.js
│   └── package.json
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── context/
│   │   ├── api/
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
│
├── docs/
│   └── KejaHub_Full_Documentation.pdf
│
├── .env
├── .gitignore
└── README.md
⚙️ Tech Stack
Frontend
React (Vite or CRA)
JavaScript / JSX
Map integration (Google Maps / Leaflet)
Backend
Node.js
Express
Database
PostgreSQL
🚀 Features
📍 Map-based property discovery
🏘️ Property listings (owner vs agency)
🔍 Advanced search & filters
⭐ Reviews & ratings
💰 Transparent pricing breakdown
🚚 Optional moving services
🔌 Backend Overview
Key Modules
Models
Users
Properties
Reviews
Movers
Additional Charges

Routes

/api/properties
/api/reviews
/api/users
/api/movers
Core Logic
Property CRUD
Review system
Pricing calculation
Map coordinates handling
🎨 Frontend Overview
Main Sections
Home (Map + Listings)
Property Details Page
Search & Filters
Reviews Section
Movers / Relocation Page
State Management
Context API or similar
🧮 Pricing Logic
Deposit = Rent × Deposit Months

Total Move-in Cost =
Deposit + First Month Rent + Service Charge + Additional Fees
🧪 Running the Project
1. Clone the repo
git clone https://github.com/abdurleone/kejaapp.git
cd kejahub
2. Setup Backend
cd backend
npm install
npm run dev
3. Setup Frontend
cd frontend
npm install
npm run dev
🔐 Environment Variables

Create a .env file in the backend:

PORT=5000
DATABASE_URL=your_postgres_connection
MAP_API_KEY=your_map_key
📊 Roadmap
✅ POC (Completed)
🚧 MVP (Auth + DB)
📈 Payments + Mobile App
💼 Monetization
Featured listings
Agency subscriptions
Verified badges
Rental commissions (future)
⚠️ Risks & Mitigation
Fake listings → Verification + reviews
Hidden costs → Full pricing breakdown
Adoption → UX + trust-first design
🤝 Contributing
Fork the repo
Create a branch
Submit a PR
📄 License
