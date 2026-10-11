from datetime import date
from flask import Blueprint, jsonify, request
import mysql.connector
from db import get_connection

opportunities_bp = Blueprint("opportunities", __name__)


def format_opportunity(opp):
    """Ensure dates and other non-JSON types are properly serialized."""
    if opp and isinstance(opp.get("deadline"), date):
        opp["deadline"] = opp["deadline"].isoformat()
    return opp


@opportunities_bp.route("/health", methods=["GET"])
def health_check():
    """Health check endpoint that also tests database connection."""
    try:
        conn = get_connection()
        conn.close()
        return jsonify({"status": "ok", "database": "connected"}), 200
    except mysql.connector.Error as err:
        return (
            jsonify(
                {
                    "status": "warning",
                    "database": "disconnected",
                    "error": str(err),
                }
            ),
            503,
        )


@opportunities_bp.route("/opportunities", methods=["GET"])
def get_opportunities():
    """Fetch all opportunities with optional filtering and search."""
    status = request.args.get("status")
    department = request.args.get("department")
    research_area = request.args.get("research_area")
    search = request.args.get("search")

    query = "SELECT * FROM opportunities WHERE 1=1"
    params = []

    if status:
        query += " AND status = %s"
        params.append(status)

    if department:
        query += " AND department = %s"
        params.append(department)

    if research_area:
        query += " AND research_area = %s"
        params.append(research_area)

    if search:
        query += " AND (title LIKE %s OR description LIKE %s OR required_skills LIKE %s OR faculty_name LIKE %s)"
        like_search = f"%{search}%"
        params.extend([like_search, like_search, like_search, like_search])

    query += " ORDER BY id DESC"

    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(query, params)
        rows = cursor.fetchall()
        cursor.close()
        conn.close()

        formatted_rows = [format_opportunity(row) for row in rows]
        return jsonify({"success": True, "count": len(formatted_rows), "data": formatted_rows}), 200
    except mysql.connector.Error as err:
        return jsonify({"success": False, "error": f"Database error: {str(err)}"}), 500


@opportunities_bp.route("/opportunities/<int:opp_id>", methods=["GET"])
def get_opportunity(opp_id):
    """Fetch a single opportunity by its ID."""
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM opportunities WHERE id = %s", (opp_id,))
        row = cursor.fetchone()
        cursor.close()
        conn.close()

        if not row:
            return jsonify({"success": False, "error": f"Opportunity with id {opp_id} not found"}), 404

        return jsonify({"success": True, "data": format_opportunity(row)}), 200
    except mysql.connector.Error as err:
        return jsonify({"success": False, "error": f"Database error: {str(err)}"}), 500


@opportunities_bp.route("/opportunities", methods=["POST"])
def create_opportunity():
    """Create a new research opportunity."""
    data = request.get_json() or {}

    required_fields = [
        "title",
        "description",
        "research_area",
        "faculty_name",
        "department",
        "required_skills",
        "available_positions",
        "deadline",
    ]

    missing = [field for field in required_fields if field not in data or data[field] is None or str(data[field]).strip() == ""]
    if missing:
        return (
            jsonify({"success": False, "error": f"Missing required fields: {', '.join(missing)}"}),
            400,
        )

    status = data.get("status", "Open")
    if status not in ["Open", "Closed"]:
        return jsonify({"success": False, "error": "Status must be 'Open' or 'Closed'"}), 400

    try:
        available_positions = int(data["available_positions"])
    except ValueError:
        return jsonify({"success": False, "error": "available_positions must be an integer"}), 400

    query = """
        INSERT INTO opportunities 
        (title, description, research_area, faculty_name, department, required_skills, available_positions, deadline, status)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
    """
    params = (
        data["title"].strip(),
        data["description"].strip(),
        data["research_area"].strip(),
        data["faculty_name"].strip(),
        data["department"].strip(),
        data["required_skills"].strip(),
        available_positions,
        data["deadline"],
        status,
    )

    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(query, params)
        conn.commit()
        new_id = cursor.lastrowid
        cursor.close()
        conn.close()

        return (
            jsonify(
                {
                    "success": True,
                    "message": "Opportunity created successfully",
                    "id": new_id,
                }
            ),
            201,
        )
    except mysql.connector.Error as err:
        return jsonify({"success": False, "error": f"Database error: {str(err)}"}), 500


@opportunities_bp.route("/opportunities/<int:opp_id>", methods=["PUT"])
def update_opportunity(opp_id):
    """Update an existing opportunity."""
    data = request.get_json() or {}
    if not data:
        return jsonify({"success": False, "error": "No update fields provided"}), 400

    allowed_fields = [
        "title",
        "description",
        "research_area",
        "faculty_name",
        "department",
        "required_skills",
        "available_positions",
        "deadline",
        "status",
    ]

    updates = []
    params = []

    for key in allowed_fields:
        if key in data:
            if key == "status" and data[key] not in ["Open", "Closed"]:
                return jsonify({"success": False, "error": "Status must be 'Open' or 'Closed'"}), 400
            if key == "available_positions":
                try:
                    params.append(int(data[key]))
                except ValueError:
                    return jsonify({"success": False, "error": "available_positions must be an integer"}), 400
            else:
                params.append(data[key])
            updates.append(f"{key} = %s")

    if not updates:
        return jsonify({"success": False, "error": "No valid fields provided for update"}), 400

    query = f"UPDATE opportunities SET {', '.join(updates)} WHERE id = %s"
    params.append(opp_id)

    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(query, tuple(params))
        conn.commit()
        affected_rows = cursor.rowcount
        cursor.close()
        conn.close()

        if affected_rows == 0:
            return jsonify({"success": False, "error": f"Opportunity {opp_id} not found or no changes made"}), 404

        return jsonify({"success": True, "message": f"Opportunity {opp_id} updated successfully"}), 200
    except mysql.connector.Error as err:
        return jsonify({"success": False, "error": f"Database error: {str(err)}"}), 500


@opportunities_bp.route("/opportunities/<int:opp_id>", methods=["DELETE"])
def delete_opportunity(opp_id):
    """Delete an opportunity by ID."""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM opportunities WHERE id = %s", (opp_id,))
        conn.commit()
        affected_rows = cursor.rowcount
        cursor.close()
        conn.close()

        if affected_rows == 0:
            return jsonify({"success": False, "error": f"Opportunity with id {opp_id} not found"}), 404

        return jsonify({"success": True, "message": f"Opportunity {opp_id} deleted successfully"}), 200
    except mysql.connector.Error as err:
        return jsonify({"success": False, "error": f"Database error: {str(err)}"}), 500
