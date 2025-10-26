import json
from supabase import create_client, Client
from anthropic import Anthropic # Or however you've initialized 'client'
from dotenv import load_dotenv
import os

load_dotenv()

# --- 1. Supabase Setup ---
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Assume 'client' for Claude is already set up
client = Anthropic()

# --- 2. List of Colleges ---
# Get this list from a source like US News or Forbes
top_50_colleges = [
    "Princeton University",
    "Massachusetts Institute of Technology",
    "Harvard University",
    "Stanford University",
    "Yale University",
    "University of Pennsylvania",
    "California Institute of Technology",
    "Duke University",
    "Brown University",
    "Johns Hopkins University",
    "Northwestern University",
    "Cornell University",
    "Columbia University",
    "University of Chicago",
    "Rice University",
    "Dartmouth College",
    "University of Notre Dame",
    "Vanderbilt University",
    "Washington University in St. Louis",
    "University of California, Los Angeles",
    "Emory University",
    "University of California, Berkeley",
    "University of Southern California",
    "Georgetown University",
    "Carnegie Mellon University",
    "University of Michigan",
    "University of Virginia",
    "New York University",
    "Tufts University",
    "University of North Carolina at Chapel Hill",
    "University of Florida",
    "University of California, Santa Barbara",
    "University of California, Irvine",
    "Boston College",
    "University of California, San Diego",
    "University of Rochester",
    "Boston University",
    "University of Wisconsin-Madison",
    "University of Illinois Urbana-Champaign",
    "Georgia Institute of Technology",
    "University of Texas at Austin",
    "College of William & Mary",
    "Lehigh University",
    "Northeastern University",
    "Case Western Reserve University",
    "Tulane University",
    "Ohio State University",
    "Pepperdine University",
    "University of Georgia",
    "Rensselaer Polytechnic Institute",
]

# --- 3. Function to get data for ONE college ---
def get_college_data_from_agent(college_name):
    """
    Calls the agent for ONLY ONE college and returns the parsed JSON.
    """
    print(f"--- 🔍 Searching for: {college_name} ---")
    
    search_query = f"""Find detailed information for "{college_name}".

Search its official website for accurate data. Get specific program details.
Return the information in this EXACT JSON format. Return ONLY the valid JSON.

{{
    "colleges": [
        {{
            "name": "{college_name}",
            "location": "City, State",
            "ranking": 50,
            "url": "https://college.edu",
            "grad_rate": 0.85,
            "average_cost": 45000,
            "acceptance_rate": 0.15,
            "median_salary": 75000,
            "size": 15000,
            "programs": [
                {{
                    "name": "Computer Science",
                    "degree_type": "Bachelor of Science",
                    "field_of_study": "STEM",
                    "prestige": 95,
                    "ranking_in_field": 5,
                    "description": "A rigorous program focusing on AI theory, algorithms, and applications.",
                    "notable_features": "Research opportunities, labs, co-ops, study abroad, internships",
                    "specialty": "Artificial Intelligence"
                }}
                {{
                    "name": "International Business",
                    "degree_type": "Bachelor of Arts",
                    "field_of_study": "Business",
                    "prestige": 90,
                    "ranking_in_field": 8,
                    "description": "Comprehensive curriculum covering global markets, cross-cultural management, and international trade.",
                    "notable_features": "Study abroad, global internships, language immersion, internships, networking",
                    "specialty": "Global Markets, Cross-Cultural Management"
                }}
            ],
        }}
    ]
}}
"""
    response = client.messages.create(
        model="claude-sonnet-4-5-20250929",
        max_tokens=5000,  # Increased for multiple colleges
        messages=[{"role": "user", "content": search_query}],
        tools=[{
            "type": "web_search_20250305",
            "name": "web_search",
            "max_uses": 5  # More searches for multiple colleges
        }]
    )
      # Extract JSON from response
    text_blocks = []
    for block in response.content:
        if block.type == "text":
            text_blocks.append(block.text)
        elif block.type == "tool_use":
            print(f"🔧 Tool used: {block.name}")

    # Try to parse JSON from text blocks (usually the last one has the full response)
    for i, text in enumerate(reversed(text_blocks)):
        # Skip very short blocks (likely not JSON)
        if len(text) < 100:
            continue

        print(f"📄 Processing text block {len(text_blocks) - i} ({len(text)} chars)")

        try:
            # Extract JSON
            if "```json" in text:
                start = text.find("```json") + 7
                end = text.find("```", start)
                json_str = text[start:end].strip()
            elif "```" in text:
                start = text.find("```") + 3
                end = text.find("```", start)
                json_str = text[start:end].strip()
            else:
                start = text.find("{")
                end = text.rfind("}") + 1
                if start == -1 or end == 0:
                    continue
                json_str = text[start:end]

            data = json.loads(json_str)
            print("✅ Successfully parsed JSON")
            return data

        except json.JSONDecodeError as e:
            # Continue to next block instead of immediate retry
            continue
    return None

# --- 4. Function to insert data (from our previous conversation) ---
def insert_data_into_supabase(college_data_dict):
    """
    Inserts a single college and its programs into Supabase.
    'college_data_dict' should be the {"colleges": [...]} structure.
    """
    for college_data in college_data_dict.get('colleges', []):
        try:
            programs_list = college_data.pop('programs', [])

            # --- Insert College ---
            college_response = supabase.table('colleges').insert(college_data).execute()

            if college_response.data:
                inserted_id = college_response.data[0]['id']
                college_name = college_response.data[0]['name']
                print(f"    ✅ Successfully inserted college: {college_name} (ID: {inserted_id})")

                # --- Insert Programs ---
                if programs_list:
                    programs_to_insert = []
                    for program in programs_list:
                        program['college_id'] = inserted_id
                        programs_to_insert.append(program)
                    
                    program_response = supabase.table('programs').insert(programs_to_insert).execute()
                    if program_response.data:
                        print(f"        -> Inserted {len(program_response.data)} programs.")
                    else:
                        print(f"        -> ERROR inserting programs: {program_response.error}")
            else:
                print(f"    ERROR inserting college: {college_response.error}")

        except Exception as e:
            print(f"    An exception occurred during insertion: {e}")

# --- 5. Main Loop ---
def main():
    print("Starting data scraping and insertion process...")
    for college_name in top_50_colleges:
        # Step 1: Get data from agent
        college_json = get_college_data_from_agent(college_name)
        
        # Step 2: Insert data into Supabase
        if college_json:
            insert_data_into_supabase(college_json)
        
        print(f"--- Completed: {college_name} ---\n")

if __name__ == "__main__":
    main()