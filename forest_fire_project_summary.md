# Project Summary: Forest Fire Prediction & Simulation Engine

**Shruti Barua**  
*3rd-Year B.Tech in Computer Science and Artificial Intelligence*  
*Banasthali Vidyapith, Rajasthan*  
**GitHub Repository:** [https://github.com/SHRUTI-BARUA/FOREST-FIRE-PREDICTION](https://github.com/SHRUTI-BARUA/FOREST-FIRE-PREDICTION)

---

## 🌍 Overview
The **Forest Fire Prediction Engine** is a comprehensive, hybrid Machine Learning web application designed for real-time forest fire risk assessment and dynamic propagation simulation. Initially optimized for the geographical and climatic conditions of Odisha, India, the system continuously ingests live geospatial data to calculate fire probabilities and simulate how a fire front would physically spread across the terrain.

## ⚙️ Core Architecture & Capabilities

1. **Real-Time Machine Learning Pipeline:**
   - Powered by a custom **Flask-based microservice** running a highly optimized Scikit-learn model.
   - Evaluates live environmental conditions and classifies regions strictly into **LOW, MODERATE, or HIGH risk** categories with precise probability scoring.

2. **Live Hybrid Data Ingestion:**
   - Programmatically fetches and processes real-time contextual data:
     - **OpenWeather API:** Real-time temperature, humidity, and wind vectors.
     - **AgroMonitoring API:** Live calculation of NDVI (Normalized Difference Vegetation Index).
     - **Open-Elevation:** Topographical mapping for slope and aspect calculations.

3. **Physics-Based Propagation (Cellular Automata):**
   - Integrates a grid-based Cellular Automata physics engine to simulate the actual physical spread of the fire over time.
   - Reacts dynamically to local wind vectors, slope steepness, and current vegetation dryness to model unpredictable fire fingering and spotting.

4. **Custom-Built Dataset & Feature Engineering:**
   - The ML dataset was compiled entirely from scratch using satellite imagery, historical fire incidents, and climate records.
   - Engineered advanced custom features such as `veg_dryness` and Land Surface Temperature (`LST_C`) combined with monotonic logic to boost risk sensitivity in extreme environments.

5. **Full-Stack, Secure Dashboard:**
   - **Frontend:** Built with React.js (Vite) and Tailwind CSS for a highly responsive, modern UI featuring real-time heatmaps and simulation visuals.
   - **Backend:** Node.js, Express.js, and MongoDB manage secure JWT-based authentication, session management, and historical prediction saving.

---

## 🛠️ Technology Stack

| Domain | Technologies Used |
| :--- | :--- |
| **Machine Learning / Physics** | Python, Scikit-Learn, Pandas, NumPy, Flask |
| **Frontend / Web UI** | React.js (Vite), Tailwind CSS, React Toastify |
| **Backend / Database** | Node.js, Express.js, MongoDB (Mongoose), JWT, Bcrypt |
| **Data Sources** | OpenWeather, AgroMonitoring, Open-Elevation |

---

## 🚀 Research & Future Directions

While the computational prediction engine is robust, my immediate research goals involve bridging this AI application with rigorous mathematical modeling. I am actively looking to optimize the matrix algorithms driving the Cellular Automata grid, apply continuous Partial Differential Equations (reaction-diffusion systems) to the propagation model, and explore how these ML-driven heatmaps could be used by autonomous UAV swarms for real-time surveillance and disaster response protocols.
