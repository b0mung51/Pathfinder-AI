import json
from supabase import create_client, Client
from anthropic import Anthropic
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

Search the official website of {college_name} and gather detailed information about at least 5 unique academic programs. For each program, provide:
1. Detailed Description (80-120 words): Write a comprehensive overview that includes:
   - Program structure and duration
   - Unique features or distinctive elements
   - Geographic locations or study abroad components (if applicable)
   - Institutional partnerships or collaborations
   - Career outcomes and pathways

2. Notable Features: List key highlights such as:
   - Study abroad opportunities
   - Internship programs
   - Research opportunities
   - Industry partnerships
   - Networking events
   - Language requirements or immersion
   - Specializations or concentrations
   - Hands-on learning experiences

Focus on accuracy by citing the official program pages. Prioritize programs that have unique structures, international components, or distinctive pedagogical approaches. Ensure all information is current and factually correct based on the official website.

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
                    "description":"The Computer Science program provides a strong foundation in computational thinking, software development, and emerging technologies. Students explore core areas including algorithms, artificial intelligence, machine learning, cybersecurity, and software engineering through rigorous coursework and hands-on projects. Located in Los Angeles, students access exceptional internship and research opportunities with leading tech companies and startups. The program offers flexible specializations in areas like game development, data science, robotics, and human-computer interaction, plus interdisciplinary collaborations with business and cinematic arts programs. Graduates are prepared for careers in software engineering, data science, product management, and tech entrepreneurship." 
                    "notable_features": "Research opportunities, labs, co-ops, study abroad, internships",
                    "specialty": "Artificial Intelligence"
                }}
            ],
        }}
    ]
}}
"""
    response = client.messages.create(
        model="claude-sonnet-4-5-20250929",
        max_tokens=8000,
        messages=[{"role": "user", "content": search_query}],
        tools=[{
            "type": "web_search_20250305",
            "name": "web_search",
            "max_uses": 10
        }]
    )
    
    # Extract JSON from response
    text_blocks = []
    for block in response.content:
        if block.type == "text":
            text_blocks.append(block.text)
        elif block.type == "tool_use":
            print(f"🔧 Tool used: {block.name}")

    # Try to parse JSON from text blocks
    for i, text in enumerate(reversed(text_blocks)):
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
            continue
    return None

# --- 4. NEW: Function to check if college exists ---
def get_existing_college(college_name):
    """
    Check if a college already exists in the database.
    Returns the college record if found, None otherwise.
    """
    try:
        response = supabase.table('colleges').select('*').eq('name', college_name).execute()
        if response.data and len(response.data) > 0:
            return response.data[0]
        return None
    except Exception as e:
        print(f"    Error checking for existing college: {e}")
        return None

# --- 5. NEW: Function to check if program exists ---
def program_exists(college_id, program_name):
    """
    Check if a program already exists for this college.
    Returns True if exists, False otherwise.
    """
    try:
        response = supabase.table('programs').select('id').eq('college_id', college_id).eq('name', program_name).execute()
        return len(response.data) > 0
    except Exception as e:
        print(f"    Error checking for existing program: {e}")
        return False

# --- 6. UPDATED: Function to insert or update data ---
def insert_or_update_data(college_data_dict):
    """
    Inserts a new college or updates existing one by appending new programs.
    Avoids duplicate programs.
    """
    for college_data in college_data_dict.get('colleges', []):
        try:
            college_name = college_data.get('name')
            programs_list = college_data.pop('programs', [])

            # Check if college already exists
            existing_college = get_existing_college(college_name)
            
            if existing_college:
                # College exists - just add programs
                college_id = existing_college['id']
                print(f"    ℹ️  College '{college_name}' already exists (ID: {college_id})")
                print(f"    📚 Appending programs...")
                
                # Optionally update college metadata
                # supabase.table('colleges').update(college_data).eq('id', college_id).execute()
                
            else:
                # College doesn't exist - insert it
                college_response = supabase.table('colleges').insert(college_data).execute()
                
                if college_response.data:
                    college_id = college_response.data[0]['id']
                    print(f"    ✅ Successfully inserted college: {college_name} (ID: {college_id})")
                else:
                    print(f"    ❌ ERROR inserting college: {college_response.error}")
                    continue

            # --- Insert Programs (skip duplicates) ---
            if programs_list:
                new_programs = []
                skipped_count = 0
                
                for program in programs_list:
                    program_name = program.get('name')
                    
                    # Check if program already exists
                    if program_exists(college_id, program_name):
                        print(f"        ⏭️  Skipping duplicate: {program_name}")
                        skipped_count += 1
                        continue
                    
                    program['college_id'] = college_id
                    new_programs.append(program)
                
                # Insert only new programs
                if new_programs:
                    program_response = supabase.table('programs').insert(new_programs).execute()
                    if program_response.data:
                        print(f"        ✅ Inserted {len(program_response.data)} new programs")
                    else:
                        print(f"        ❌ ERROR inserting programs: {program_response.error}")
                
                if skipped_count > 0:
                    print(f"        ℹ️  Skipped {skipped_count} duplicate programs")
                
                if not new_programs and skipped_count > 0:
                    print(f"        ℹ️  No new programs to add (all duplicates)")

        except Exception as e:
            print(f"    ❌ An exception occurred during insertion: {e}")
            import traceback
            traceback.print_exc()

# --- 7. OPTIONAL: Function to update only programs for existing college ---
def update_programs_only(college_name):
    """
    Only fetch and add new programs for an existing college.
    Useful if you want to re-run for specific colleges.
    """
    print(f"🔄 Updating programs for: {college_name}")
    
    # Check if college exists
    existing_college = get_existing_college(college_name)
    if not existing_college:
        print(f"    ❌ College '{college_name}' not found in database")
        return False
    
    # Get fresh program data
    college_json = get_college_data_from_agent(college_name)
    
    if college_json:
        insert_or_update_data(college_json)
        return True
    return False

# --- 8. Main Loop ---
def main():
    print("Starting data scraping and insertion process...")
    print("Mode: Insert new colleges or append programs to existing ones\n")
    
    for college_name in top_50_colleges:
        # Step 1: Get data from agent
        college_json = get_college_data_from_agent(college_name)
        
        # Step 2: Insert or update data in Supabase
        if college_json:
            insert_or_update_data(college_json)
        
        print(f"--- Completed: {college_name} ---\n")

# --- 9. Alternative: Update specific colleges ---
def update_specific_colleges(college_list):
    """
    Update only specific colleges from the list.
    Useful for re-running failed colleges or adding more programs.
    """
    print(f"Updating {len(college_list)} specific colleges...\n")
    
    for college_name in college_list:
        update_programs_only(college_name)
        print()

if __name__ == "__main__":
    # Option 1: Run for all colleges
    main()
    
    # Option 2: Update specific colleges only
    # update_specific_colleges([
    #     "University of Southern California",
    #     "Stanford University"
    # ])