# Forest Fire Prediction

This is a **Team Project** aimed at predicting forest fire risks using a hybrid Machine Learning approach. It features a robust web application for monitoring and early detection.
---
## ⚙️ Key Features

* ✅ **Real-Time ML Prediction**: Integrated Flask-based ML service using a pre-trained model.
* ✅ **Hybrid Data Sources**: Fetches live weather (OpenWeather), NDVI (AgroMonitoring), and Terrain (Open-Elevation) data.
* ✅ **Odisha Focused**: Specifically optimized for the geographical and climatic conditions of Odisha.
* ✅ **Risk Classification**: Classifies fire risk into LOW, MODERATE, and HIGH categories with real-time probability scores.
* ✅ **Secure Authentication**: JWT-based login, signup, and session management.
* ✅ **Database Integration**: Saves history and predictions to MongoDB for logged-in users.
* ✅ **Responsive Dashboard**: Beautifully designed UI with real-time feedback and notifications.

---

## 📊 Dataset & Model

* 🔹 **Made from Absolute Scratch**: The dataset used for this project was custom-built by our team. We gathered raw data from satellite imagery, climate records, and historical fire incidents to create a unique, high-quality feature set.
* 🔹 **Feature Engineering**: Includes Temperature, Humidity, Wind Speed, NDVI (Vegetation Index), Slope, Aspect, and custom features like **veg_dryness** and **LST_C**.
* 🔹 **Advanced Logic**: Incorporates **Monotonic Logic** to boost risk assessment based on extreme environmental conditions.

---

🧠 Tech Stack

**Frontend:**
- React.js with Vite
- Tailwind CSS (for modern aesthetics)
- React Toastify & SweetAlert2

**Backend:**
- Node.js & Express.js (User & Data management)
- MongoDB with Mongoose
- JWT & Bcrypt.js (Security)

**Machine Learning:**
- Python & Flask
- Scikit-learn (Model training & prediction)
- Joblib (Model serialization)
- Pandas & NumPy

🗂️ Project Structure

```text
FOREST-FIRE-PREDICTION/
├── fireguard-ai/       # React Frontend (Vite)
├── server/             # Express Backend (Node.js)
│   ├── Controllers/
│   ├── Models/
│   ├── Routes/
│   ├── index.js        # Backend Entry Point
│   └── model/          # ML Flask Service
│       ├── app.py      # Flask Predict API
│       ├── final_fire_model.pkl
│       └── Odisha_Fire_Features_FINAL_ML_READY.csv
└── venv/               # Python Virtual Environment
```

🧩 Installation & Setup

1️⃣ **Clone the Repository**
```bash
git clone https://github.com/SHRUTI-BARUA/FOREST-FIRE-PREDICTION.git
cd FOREST-FIRE-PREDICTION
```

2️⃣ **Machine Learning Setup (Flask)**
```bash
cd server/model
# Activate your venv and install dependencies
pip install -r requirements.txt
python app.py
```
*Server runs on http://localhost:5000*

3️⃣ **Backend Setup (Express)**
```bash
cd server
npm install
# Create a .env file with:
# PORT=4000
# MONGO_URL=your_mongodb_uri
# TOKEN_KEY=your_jwt_secret
npm start
```
*Server runs on http://localhost:4000*

4️⃣ **Frontend Setup (Vite)**
```bash
cd fireguard-ai
npm install
npm run dev
```
*Frontend runs locally via Vite*

🧾 API Routes

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| POST | `/api/auth/signup` | Register a new user |
| POST | `/api/auth/login` | Log in existing user |
| POST | `/predict` | **(ML Flask)** Get fire probability for a location |

👥 Team Project
# 🌲 Forest Fire Prediction

A **team-built machine learning project** designed to predict forest fire risk using a hybrid data-driven approach. The system combines real-time environmental data with a trained ML model and delivers predictions through a full-stack web application for monitoring and early warning.

---




## 🧠 Tech Stack

### Frontend

* React.js (Vite)
* Tailwind CSS
* React Toastify
* SweetAlert2

### Backend

* Node.js & Express.js
* MongoDB & Mongoose
* JWT & Bcrypt.js

### Machine Learning

* Python & Flask
* Scikit-learn
* Pandas & NumPy
* Joblib

---

## 🗂️ Project Structure

```text
FOREST-FIRE-PREDICTION/
├── fireguard-ai/        # React Frontend (Vite)
├── server/              # Express Backend
│   ├── Controllers/
│   ├── Models/
│   ├── Routes/
│   ├── index.js         # Backend entry point
│   └── model/           # Flask ML service
│       ├── app.py
│       ├── final_fire_model.pkl
│       └── dataset.csv
└── venv/                # Python virtual environment (optional)
```

---

## 🧩 Installation & Setup

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/SHRUTI-BARUA/FOREST-FIRE-PREDICTION.git
cd FOREST-FIRE-PREDICTION
```

---

### 2️⃣ Machine Learning Service (Flask)

```bash
cd server/model
pip install -r requirements.txt
python app.py
```

Runs on: **[http://localhost:5000](http://localhost:5000)**

---

### 3️⃣ Backend (Express)

```bash
cd server
npm install
```

Create a `.env` file:

```env
PORT=4000
MONGO_URL=your_mongodb_uri
TOKEN_KEY=your_jwt_secret
```

Start server:

```bash
npm start
```

Runs on: **[http://localhost:4000](http://localhost:4000)**

---

### 4️⃣ Frontend (Vite)

```bash
cd fireguard-ai
npm install
npm run dev
```

---

## 🧾 API Routes

| Method | Endpoint         | Description                         |
| ------ | ---------------- | ----------------------------------- |
| POST   | /api/auth/signup | Register a new user                 |
| POST   | /api/auth/login  | Login user                          |
| POST   | /predict         | Get fire risk prediction (Flask ML) |

---

## 👥 Team Project

Developed as a collaborative effort to address **forest fire risks in Odisha**. The project spans data collection, model development, backend engineering, and frontend design to deliver a complete end-to-end solution.

---

## ⭐ Future Improvements

* Add map-based visualization (GIS integration)
* Improve model accuracy with larger datasets
* Deploy using Docker & cloud services
* Add alert system (SMS/Email)

---

## 📜 License

This project is for academic and research purposes.

This project was developed as a team effort to address the critical issue of forest fires in Odisha. Every aspect, from the data collection to the final interface, was crafted to ensure reliability and impact.
