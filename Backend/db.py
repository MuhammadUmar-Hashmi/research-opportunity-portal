import os
import mysql.connector
from dotenv import load_dotenv

# Read the settings from the .env file
load_dotenv()


def get_connection():
    """Open and return a new MySQL connection."""
    return mysql.connector.connect(
        host=os.getenv("DB_HOST", "localhost"),
        user=os.getenv("DB_USER", "root"),
        password=os.getenv("DB_PASSWORD", ""),
        database=os.getenv("DB_NAME", "research_portal"),
        port=int(os.getenv("DB_PORT", 3306)),
    )
