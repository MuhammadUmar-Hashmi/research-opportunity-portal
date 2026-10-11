# University Research Opportunity Portal

**Course:** Computer Networks (CN) — BS (CS)  
**Assignment:** Assignment #01 — University Research Opportunity Portal  
**Repository:** [https://github.com/MuhammadUmar-Hashmi/research-opportunity-portal](https://github.com/MuhammadUmar-Hashmi/research-opportunity-portal)

---

## 1. Project Overview

The **University Research Opportunity Portal** is a web-based system where university faculty members can post, view, update, and manage research opportunities in one centralized platform. It replaces scattered notices across emails and WhatsApp groups, allowing students to discover active research openings and laboratory positions.

The project consists of:
1. **Backend REST API**: Built with Python & Flask, providing full CRUD endpoints.
2. **Database**: MySQL relational database storing opportunity details.
3. **Frontend**: Clean, minimalist interface using plain HTML, CSS, and Vanilla JavaScript.
4. **Postman Collection**: Pre-configured test suite verifying all 8 demonstration requirements.

---

## 2. Technology Stack

- **Backend:** Python 3.13, Flask 3.1, Flask-CORS, python-dotenv
- **Database:** MySQL / MariaDB (via `mysql-connector-python`)
- **Frontend:** HTML5, CSS3 (Linear/Vercel dark minimalist design), Vanilla JavaScript (ES6+)
- **Testing:** Python `unittest`, Postman Collection v2.1

---

## 3. Project Directory Structure

```text
research-opportunity-portal/
├── Backend/
│   ├── .env.example          # Environment variables template
│   ├── app.py                # Main Flask application entrypoint & static server
│   ├── db.py                 # MySQL connection manager
│   ├── routes.py             # REST API routes for /api/opportunities
│   ├── requirements.txt      # Python dependencies
│   └── test_backend.py       # Automated unit test suite
├── Database/
│   └── research_portal.sql   # Database schema and table dump
├── frontend/
│   ├── index.html            # Main web portal interface
│   ├── style.css             # Dark minimalist theme stylesheet
│   └── script.js             # Client-side API integration & validation logic
├── Postman/
│   └── collection.json       # Exported Postman collection for all 8 test cases
└── README.md                 # Setup and run instructions
```

---

## 4. Setup and Installation

### Prerequisites
- Python 3.10+ installed
- MySQL Server running (e.g. via XAMPP or native MySQL on port `3306`)

### Step 1: Database Setup
1. Start MySQL (e.g., click **Start** for MySQL in XAMPP Control Panel).
2. Open phpMyAdmin (`http://localhost/phpmyadmin`) or MySQL CLI.
3. Create a database named `research_portal`:
   ```sql
   CREATE DATABASE research_portal;
   ```
4. Import the schema file located at:
   `Database/research_portal.sql`

### Step 2: Backend Configuration
1. Open a terminal in the `Backend` directory:
   ```powershell
   cd Backend
   ```
2. Create and activate a Python virtual environment:
   ```powershell
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   ```
3. Install required packages:
   ```powershell
   pip install -r requirements.txt
   ```
4. Create a `.env` file in `Backend/` (or copy from `.env.example`):
   ```env
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=
   DB_NAME=research_portal
   DB_PORT=3306
   PORT=5000
   ```

---

## 5. Running the Application

### Start the Server
With `.venv` activated in the `Backend` directory, run:
```powershell
python app.py
```
You will see:
```text
 * Running on http://127.0.0.1:5000
 * Running on http://localhost:5000
```

### Access the Application
Open your browser and navigate to:
**[http://localhost:5000](http://localhost:5000)**

The Flask server automatically serves `frontend/index.html`. Alternatively, you can open `frontend/index.html` directly in any web browser.

---

## 6. REST API Specification

All endpoints communicate via JSON and are prefixed with `/api`.

| Method | Endpoint | Description | Status Codes |
| :--- | :--- | :--- | :--- |
| **GET** | `/api/health` | Healthcheck & database connectivity status | `200`, `503` |
| **GET** | `/api/opportunities` | Retrieve all research opportunities (supports search & filter) | `200`, `500` |
| **GET** | `/api/opportunities/:id` | Retrieve complete details of one opportunity | `200`, `404`, `500` |
| **POST** | `/api/opportunities` | Create a new research opportunity | `201`, `400`, `500` |
| **PUT** | `/api/opportunities/:id` | Update an existing opportunity (or close applications) | `200`, `400`, `404`, `500` |
| **DELETE** | `/api/opportunities/:id` | Delete a research opportunity | `200`, `404`, `500` |

### Opportunity Data Schema
```json
{
  "id": 1,
  "title": "Deep Learning for Clinical Diagnosis",
  "description": "Multi-modal vision transformers for medical scans.",
  "research_area": "Machine Learning",
  "faculty_name": "Dr. Sarah Khan",
  "department": "Computer Science",
  "required_skills": "Python, PyTorch, Linear Algebra",
  "available_positions": 2,
  "deadline": "2026-12-15",
  "status": "Open"
}
```

---

## 7. Postman / Bruno Testing

An exported collection is provided at `Postman/collection.json` containing the 8 demonstration requests required by the assignment:

1. **Creating 3 Research Opportunities** (`POST /api/opportunities`)
2. **Retrieving all Research Opportunities** (`GET /api/opportunities`)
3. **Retrieving one Opportunity by ID** (`GET /api/opportunities/1`)
4. **Updating an existing Opportunity** (`PUT /api/opportunities/1`)
5. **Changing status from Open to Closed** (`PUT /api/opportunities/1` with `{"status":"Closed"}`)
6. **Deleting an Opportunity** (`DELETE /api/opportunities/2`)
7. **Requesting deleted item to verify 404** (`GET /api/opportunities/2` returns `404 Not Found`)
8. **Sending invalid payload to demonstrate validation** (`POST` with missing fields returns `400 Bad Request`)

To test:
1. Open Postman or Bruno.
2. Click **Import** and select `Postman/collection.json`.
3. Set the `baseUrl` variable to `http://localhost:5000`.
4. Run each request sequentially.

---

## 8. Running Automated Unit Tests

In the `Backend` directory:
```powershell
python -m unittest test_backend.py -v
```
All 7 test cases covering root status, healthcheck, retrieval, validation, updates, not-found errors, and deletion will execute.