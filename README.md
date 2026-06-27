# Chikwawa Flood Prediction System

An AI-powered, full-stack early warning system designed for real-time flood risk prediction in **Chikwawa District, Malawi**.

What started as an exploratory data science project has evolved into a fully functional, real-time application. It combines Earth Engine satellite ingestion, machine learning, and a modern web dashboard to provide the Chikwawa District Council for Disaster Management (DCCM) with actionable, human-approved SMS alerts.

## Repository Structure

```text
Chikwawa-Flood-Prediction/
├── backend/                  # FastAPI server, Celery scheduler, ML pipeline, and DB
├── frontend/                 # Next.js interactive dashboard & alert management UI
├── notebooks/                # Jupyter notebooks for data extraction, EDA, and model training
├── models/                   # Serialized ML models (e.g., XGBoost) used by the backend
├── data/                     # Raw and processed datasets for historical analysis
├── geospatial/               # Static GeoJSON and DEM assets
├── docker-compose.yml        # Orchestration for backend services (Redis, PostgreSQL)
└── README.md                 # Project documentation
```

## System Architecture

The project consists of three main components:

### 1. Data Science & ML Pipeline (`notebooks/`)
The foundational notebooks where data is extracted from Google Earth Engine (GPM, Sentinel, SMAP) and the DAHITI API. Contains the Exploratory Data Analysis (EDA) and the training scripts for the core machine learning models (LightGBM/XGBoost) that predict flood risk based on hydrological and geospatial features.

### 2. Backend API (`backend/`)
A **Python/FastAPI** service responsible for real-time operations:
- **Data Ingestion**: A Celery task queue wakes up every 6 hours to fetch live satellite data from Earth Engine and river gauge levels from DAHITI.
- **Prediction Engine**: Runs the incoming data through the serialized ML models to compute live risk probabilities for Chikwawa's Traditional Authorities (TAs).
- **Alerting**: Monitors risk thresholds and can dispatch SMS alerts via the Airtel Malawi API (subject to human approval).

### 3. Frontend Dashboard (`frontend/`)
A **Next.js (React)** web application that serves as the command center for DCCM officials:
- **Live Monitoring**: Visualizes real-time flood risk on an interactive Leaflet map.
- **Trends & Analytics**: Displays historical rainfall and river level charts.
- **Alert Management**: Allows authorized personnel to review high-risk predictions and approve SMS dispatches to village headmen.

## Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+
- PostgreSQL & PostGIS
- Redis (for the Celery task queue)
- Google Earth Engine Service Account

### Running the Backend

We recommend using Docker Compose to spin up the database and Redis, or you can run everything locally.

```bash
cd backend
python -m venv .venv
# Activate virtual environment (Windows)
.venv\Scripts\Activate.ps1 
# On Linux/Mac: source .venv/bin/activate
pip install -r requirements.txt

# Start the FastAPI server
uvicorn app.main:app --reload

# Start the Celery worker (in a separate terminal)
celery -A scheduler.celery_app worker --loglevel=info

# Start the Celery beat scheduler (in another terminal)
celery -A scheduler.celery_app beat --loglevel=info
```
*Note: Ensure you have configured your `.env` file based on `.env.example` in the `backend/` directory.*

### Running the Frontend

```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser. Default admin credentials can be found in the frontend documentation.

### Exploring the Notebooks

To explore the data science workflow or retrain the models:
```bash
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
jupyter notebook
```
Run the notebooks in `notebooks/` sequentially, starting from `01_fetch_district_boundaries.ipynb`.

## Documentation

- Detailed backend architecture and data flow can be found in [`backend_architecture.md`](./backend_architecture.md).
- Further frontend documentation is located in [`frontend/README.md`](./frontend/README.md).
- Background research and the original project proposal are in `doc_text.txt` and `FINAL_REPORT_CHIKWAWA_FLOOD_PREDICTION.docx`.

