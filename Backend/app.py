import os
from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from routes import opportunities_bp

# Load environment variables
load_dotenv()

app = Flask(__name__)

# Enable CORS for all routes (allows frontend to connect)
CORS(app)

# Register API routes under /api
app.register_blueprint(opportunities_bp, url_prefix="/api")


@app.route("/", methods=["GET"])
def home():
    """Root endpoint to check if API is running."""
    return jsonify(
        {
            "message": "Research Opportunity Portal API is online",
            "version": "1.0",
            "endpoints": {
                "health": "/api/health",
                "opportunities": "/api/opportunities",
            },
        }
    ), 200


@app.errorhandler(404)
def not_found(error):
    return jsonify({"success": False, "error": "Endpoint not found"}), 404


@app.errorhandler(500)
def server_error(error):
    return jsonify({"success": False, "error": "Internal server error"}), 500


if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
