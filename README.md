🏠 KejaApp

KejaApp is a location-first rental platform that connects tenants, landlords, and agencies in a trusted, transparent ecosystem.

🚀 Features
📍 Map-based property discovery
🏘️ Property listings (Owner vs Agency)
🔍 Advanced search & filters
⭐ Reviews & ratings
💰 Transparent pricing system
🔔 Notifications
🚚 Movers & relocation services
🧱 Tech Stack

Frontend

React (Web)
React Native (Planned)

Backend

Node.js (Express)

Database

MongoDB Atlas

Deployment

Backend: Render / Railway
Frontend: Vercel
📁 Project Structure
backend/
│
├── controllers/
├── models/
├── routes/
├── services/
├── middlewares/
├── config/
└── server.js
🔐 Authentication

JWT-based authentication.

Authorization: Bearer <token>
🔌 API Endpoints
Auth
POST   /api/auth/register
POST   /api/auth/login
Properties
POST   /api/properties
GET    /api/properties
GET    /api/properties/:id
PUT    /api/properties/:id
DELETE /api/properties/:id
Reviews
POST   /api/reviews
GET    /api/properties/:id/reviews
Notifications
GET    /api/notifications
PUT    /api/notifications/:id/read
Agencies
POST   /api/agencies/verify
GET    /api/agencies/status
Movers
GET    /api/movers
🧠 Business Logic
Cost calculation (rent, deposit, fees)
Review aggregation
Notification triggers
🔒 Security
JWT authentication
Password hashing
Validation middleware
⚙️ Getting Started
git clone https://github.com/your-username/kejaapp.git
cd kejaapp/backend
npm install
npm run dev
📊 Roadmap
✅ POC Complete
🚧 MVP
📈 Payments + Mobile App
📄 License

MIT License