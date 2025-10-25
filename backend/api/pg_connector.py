from dotenv import load_dotenv
from supabase import create_client
import os
import re

# Load environment variables from backend/.env
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
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
            prestige INT,
            ranking_in_field INT
            specialty VARCHAR(100),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        """,
        "user_preferences": """
            user_id FOREIGN KEY REFERENCES users(id),
            preferred_location VARCHAR(100),
            in_state BOOLEAN,
            state_residence VARCHAR(50),
            desired_major VARCHAR(100),
            GPA FLOAT,
            test_scores JSONB,
            extracurriculars text[],
            budget_range VARCHAR(50),
            interested_programs text[],
            career_goals text,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        """
        }):

        self.url = os.getenv("SUPABASE_URL")
        self.key = os.getenv("SUPABASE_KEY")
        self.client = create_client(self.url, self.key)
        self.requiredTables = requiredTables

    def get_client(self):
        return self.client
    
    
    def selectData(self,tableName, columns=["*"]):
        client = self.get_client()
        data = client.table(tableName).select(','.join(columns)).execute()
        return data.data
    
    def selectWhere(self, tableName, columns=["*"], conditions={}):
        client = self.get_client()
        query = client.table(tableName).select(','.join(columns))
        for col, val in conditions.items():
            query = query.eq(col, val)
        data = query.execute()
        return data.data
    def numRows(self, tableName, conditions={}):
        client = self.get_client()
        query = client.table(tableName).select("id", count="exact")
        for col, val in conditions.items():
            query = query.eq(col, val)
        data = query.execute()
        return data.count
    def insertData(self, tableName, data: dict):
        client = self.get_client()
        response = client.table(tableName).insert(data).execute()
        return response.data
    def batchInsertData(self, tableName, data: list[dict]):
        client = self.get_client()
        response = client.table(tableName).insert(data).execute()
        return response.data
    def updateData(self, tableName, data: dict, conditions: dict):
        client = self.get_client()
        query = client.table(tableName).update(data)
        for col, val in conditions.items():
            query = query.eq(col, val)
        response = query.execute()
        return response.data
    def deleteData(self, tableName, conditions: dict):
        client = self.get_client()
        query = client.table(tableName).delete()
        for col, val in conditions.items():
            query = query.eq(col, val)
        response = query.execute()
        return response.data
    def upsertData(self, tableName, data: dict):
        client = self.get_client()
        response = client.table(tableName).upsert(data).execute()
        return response.data

    # misc functions
    def checkIfValueExists(self, tableName, columnName, value):
        client = self.get_client()
        query = client.table(tableName).select(columnName).eq(columnName, value)
        data = query.execute()
        return len(data.data) > 0

    def getColumnValue(self, tableName, columnName, conditions):
        client = self.get_client()
        query = client.table(tableName).select(columnName)
        for col, val in conditions.items():
            query = query.eq(col, val)
        data = query.execute()
        return data.data[0].get(columnName) if data.data else None
    
    def getTableColumns(self, tableName):
        client = self.get_client()
        query = client.table(tableName).select("*").limit(1)
        data = query.execute()
        if data.data:
            return list(data.data[0].keys())
        return []
   
