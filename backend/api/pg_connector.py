from dotenv import load_dotenv
from supabase import create_client
import os

ROOT_DIR = "../.."
load_dotenv(os.path.join(ROOT_DIR, ".env"))

class SupabaseConnector:
    def __init__(self, requiredTables={
        "colleges": """
            college_id SERIAL PRIMARY KEY,
            name VARCHAR(100) UNIQUE NOT NULL,
            location VARCHAR(100),
            ranking INT,
            url VARCHAR(100),
            grad_rate FLOAT,
            average_cost FLOAT,
            acceptance_rate FLOAT,
            median_salary FLOAT,
            size INT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        """,
        "programs": """
            program_id SERIAL PRIMARY KEY,
            college_id INT REFERENCES colleges(college_id),
            name VARCHAR(100) NOT NULL,
            degree_type VARCHAR(50),
            field_of_study VARCHAR(100),
            duration INT,
            prestige INT,
            ranking_in_field INT
            specialty VARCHAR(100),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        """,
        "user_preferences": """
            user_id FOREIGN KEY REFERENCES users(id),
            preferred_location VARCHAR(100),
            budget_range VARCHAR(50),
        """
        
            
    }):
        self.url = os.getenv("SUPABASE_URL")
        self.key = os.getenv("SUPABASE_KEY")
        self.client = create_client(self.url, self.key)
        self.requiredTables = requiredTables

    def get_client(self):
        return self.client
    
    def intialize_tables(self):
        # runs. If tables not exist, creates them.
        client = self.get_client()
        query = lambda name, colstr, foreignk="": f"""CREATE TABLE IF NOT EXISTS ${name} (
            ${colstr}
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );"""
        
        user_columns = """
            id SERIAL PRIMARY KEY,
            username VARCHAR(50) UNIQUE NOT NULL,
            email VARCHAR(100) UNIQUE NOT NULL,
        """
        client.sql(query("users", user_columns))

testClient = SupabaseConnector()
client = testClient.get_client()