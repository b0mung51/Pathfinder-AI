from dotenv import load_dotenv
from supabase import create_client
import os
import re


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

        ROOT_DIR = "../.."
        load_dotenv(os.path.join(ROOT_DIR, ".env"))
        self.url = os.getenv("SUPABASE_URL")
        self.key = os.getenv("SUPABASE_KEY")
        self.client = create_client(self.url, self.key)
        self.requiredTables = requiredTables
        self.intialize_tables()

    def get_client(self):
        return self.client
    
    def intialize_tables(self):
        # runs. If tables not exist, creates them.
        client = self.get_client()
        query = lambda name, colstr: f"""CREATE TABLE IF NOT EXISTS ${name} (
            ${colstr}
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );"""
        
        user_columns = self.requiredTables
        for (name, columns) in user_columns.items():
            thisQuery = query(name, columns)
            try:
                result = client.postgrest.rpc("execute_sql", {"sql": thisQuery})
                print(result)
            except Exception as e:
                print(f"Error creating table {name}: {e}")
                break
    def getColumnsFromTable(self, table):
        """Return a list of column names for the given table key.

        The method expects `self.requiredTables[table]` to be a string containing
        SQL-style column definitions (one per line). It extracts the first
        identifier on each non-empty line as the column name.

        Returns an empty list if the table key is not found or no columns are
        discoverable.
        """
        columns_def = self.requiredTables.get(table)
        if not columns_def:
            return []

        names = []
        for line in columns_def.strip().splitlines():
            line = line.strip()
            if not line:
                continue
            # remove trailing comma if present
            if line.endswith(','):
                line = line[:-1].rstrip()
            # Match an identifier at start (allows letters, numbers, underscore)
            m = re.match(r'^"?`?([A-Za-z0-9_]+)"?`?\b', line)
            if m:
                names.append(m.group(1))
        return names
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
