This project is a Forest Fire Prediction Web App currently under development.
It includes a secure authentication system (Signup, Login, and User Verification) and a connected MongoDB backend.
The next phase will integrate the ML fire prediction model.

⚙️ Current Features

✅ User Signup & Login
✅ JWT-based Authentication
✅ Cookie-based Session Management
✅ Connected MongoDB Database
✅ Frontend-Backend Integration
✅ Error Handling and Toast Notifications

🧠 Tech Stack

Frontend:

React.js

Axios

React Router

React Toastify

react-cookie

Backend:

Node.js

Express.js

MongoDB with Mongoose

JWT Authentication

Bcrypt.js for Password Encryption

dotenv for Environment Configuration

🗂️ Current Project Structure
Forest_Fire/
├── backend/
│   ├── Controllers/
│   │   └── AuthController.js
│   ├── Models/
│   │   └── UserModel.js
│   ├── Routes/
│   │   └── AuthRoute.js
│   ├── util/
│   │   └── SecretToken.js
│   ├── server.js
│   └── .env
│
├── forest-fire-frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Signup.jsx
│   │   │   └── Home.jsx
│   │   ├── App.js
│   │   └── index.js
│   └── package.json
│
└── README.md

🧩 Installation
1️⃣ Clone the Repository
git clone https://github.com/SHRUTI-BARUA/FOREST-FIRE-PREDICTION.git
cd FOREST-FIRE-PREDICTION

2️⃣ Backend Setup
cd backend
npm install


Create a .env file in the backend folder:

PORT=4000
MONGO_URL=your_mongodb_connection_string
TOKEN_KEY=your_secret_jwt_key


Run the backend:

npm start


Server runs on http://localhost:4000

3️⃣ Frontend Setup
cd forest-fire-frontend
npm install
npm start


Frontend runs on http://localhost:3000

🧾 Current API Routes
Method	Endpoint	Description
POST	/api/auth/signup	Register a new user
POST	/api/auth/login	Log in existing user
POST	/api/auth/	Verify user from cookie
📍 Next Steps

🔹 Integrate trained ML model for fire prediction
🔹 Add a prediction form in frontend
🔹 Display fire risk results visually
