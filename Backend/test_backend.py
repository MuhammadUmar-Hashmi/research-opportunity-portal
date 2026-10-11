import unittest
from unittest.mock import patch, MagicMock
from app import app
from datetime import date


class TestBackendAPI(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()

    def test_root_endpoint(self):
        """Test root endpoint returns 200 and API info."""
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertIn("message", data)
        self.assertEqual(data["version"], "1.0")

    def test_health_endpoint_offline(self):
        """Test health endpoint responds gracefully when database is offline."""
        response = self.client.get("/api/health")
        self.assertIn(response.status_code, [200, 503])
        data = response.get_json()
        self.assertIn("status", data)

    @patch("routes.get_connection")
    def test_get_opportunities(self, mock_get_conn):
        """Test fetching opportunities list with mocked database."""
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_get_conn.return_value = mock_conn
        mock_conn.cursor.return_value = mock_cursor

        sample_row = {
            "id": 1,
            "title": "AI in Healthcare",
            "description": "Research on LLMs in clinical diagnosis",
            "research_area": "Machine Learning",
            "faculty_name": "Dr. Sarah Khan",
            "department": "Computer Science",
            "required_skills": "Python, PyTorch",
            "available_positions": 2,
            "deadline": date(2026, 12, 31),
            "status": "Open",
        }
        mock_cursor.fetchall.return_value = [sample_row]

        response = self.client.get("/api/opportunities")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertTrue(data["success"])
        self.assertEqual(data["count"], 1)
        self.assertEqual(data["data"][0]["deadline"], "2026-12-31")

    @patch("routes.get_connection")
    def test_create_opportunity_validation(self, mock_get_conn):
        """Test validation error when required fields are missing."""
        response = self.client.post("/api/opportunities", json={"title": "Incomplete"})
        self.assertEqual(response.status_code, 400)
        data = response.get_json()
        self.assertFalse(data["success"])
        self.assertIn("Missing required fields", data["error"])

    @patch("routes.get_connection")
    def test_create_opportunity_success(self, mock_get_conn):
        """Test creating an opportunity with all required fields."""
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_get_conn.return_value = mock_conn
        mock_conn.cursor.return_value = mock_cursor
        mock_cursor.lastrowid = 10

        payload = {
            "title": "Quantum Computing Algorithms",
            "description": "Developing error mitigation algorithms",
            "research_area": "Quantum Computing",
            "faculty_name": "Dr. Alex Rivera",
            "department": "Physics & Computing",
            "required_skills": "Qiskit, Linear Algebra",
            "available_positions": 1,
            "deadline": "2026-11-15",
            "status": "Open",
        }

        response = self.client.post("/api/opportunities", json=payload)
        self.assertEqual(response.status_code, 201)
        data = response.get_json()
        self.assertTrue(data["success"])
        self.assertEqual(data["id"], 10)

    @patch("routes.get_connection")
    def test_get_opportunity_by_id_not_found(self, mock_get_conn):
        """Test getting non-existent opportunity returns 404."""
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_get_conn.return_value = mock_conn
        mock_conn.cursor.return_value = mock_cursor
        mock_cursor.fetchone.return_value = None

        response = self.client.get("/api/opportunities/999")
        self.assertEqual(response.status_code, 404)
        data = response.get_json()
        self.assertFalse(data["success"])

    @patch("routes.get_connection")
    def test_delete_opportunity_success(self, mock_get_conn):
        """Test deleting an opportunity."""
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_get_conn.return_value = mock_conn
        mock_conn.cursor.return_value = mock_cursor
        mock_cursor.rowcount = 1

        response = self.client.delete("/api/opportunities/1")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertTrue(data["success"])


if __name__ == "__main__":
    unittest.main()
