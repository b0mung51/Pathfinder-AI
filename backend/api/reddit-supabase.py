import json
from supabase import create_client, Client
import os
from typing import List, Dict
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Supabase configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

def validate_config():
    """Validate that Supabase configuration is set"""
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("\n❌ ERROR: Missing Supabase configuration!")
        print("\nPlease create a .env file in this directory with:")
        print("SUPABASE_URL=https://your-project.supabase.co")
        print("SUPABASE_KEY=your-anon-key")
        print("\nOr set environment variables:")
        print("export SUPABASE_URL='https://your-project.supabase.co'")
        print("export SUPABASE_KEY='your-anon-key'")
        return False
    # Ensure URL has https://
    
    print(f"✅ Configuration loaded")
    print(f"   URL: {SUPABASE_URL}")
    print(f"   Key: {SUPABASE_KEY[:20]}...{SUPABASE_KEY[-4:]}")
    return True

def test_connection(supabase: Client):
    """Test the connection to Supabase"""
    try:
        # Try a simple query to verify connection
        response = supabase.table("reddit").select("id").limit(1).execute()
        print(f"✅ Connection successful! Table is accessible.")
        return True
    except Exception as e:
        print(f"❌ Connection failed: {str(e)}")
        print("\nTroubleshooting steps:")
        print("1. Verify your SUPABASE_URL is correct (should be https://xxxxx.supabase.co)")
        print("2. Verify your SUPABASE_KEY is the 'anon' key from Settings → API")
        print("3. Check that the 'reddit' table exists in your database")
        print("4. Verify RLS (Row Level Security) policies allow inserts")
        return False

def load_json_data(file_path: str) -> List[Dict]:
    """Load JSON data from file"""
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")
    
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    return data

def prepare_reddit_data(raw_data: List[Dict]) -> List[Dict]:
    """
    Transform raw JSON data to match Supabase schema
    Handles both list of objects and nested structures
    """
    prepared_data = []
    
    for item in raw_data:
        # Handle nested data structures if needed
        # Adjust based on your actual JSON structure
        record = {
            "search_term": item.get("search_term", ""),
            "subreddit": item.get("subreddit", ""),
            "title": item.get("title", ""),
            "score": item.get("score", 0),
            "url": item.get("url", ""),
            "body": item.get("body", "")
        }
        prepared_data.append(record)
    
    return prepared_data

def batch_insert(supabase: Client, table_name: str, data: List[Dict], batch_size: int = 100):
    """Insert data in batches to avoid timeout"""
    total = len(data)
    success_count = 0
    failed_count = 0
    
    for i in range(0, total, batch_size):
        batch = data[i:i + batch_size]
        batch_num = i // batch_size + 1
        
        try:
            response = supabase.table(table_name).insert(batch).execute()
            success_count += len(batch)
            print(f"✅ Batch {batch_num}: Inserted {len(batch)} records (Total: {min(i + batch_size, total)}/{total})")
        except Exception as e:
            failed_count += len(batch)
            error_msg = str(e)
            print(f"❌ Batch {batch_num} failed: {error_msg}")
            
            # Save failed batch to a file
            failed_file = f'failed_batch_{batch_num}.json'
            with open(failed_file, 'w') as f:
                json.dump(batch, f, indent=2)
            print(f"   Saved failed batch to: {failed_file}")
    
    print(f"\n{'='*50}")
    print(f"Import Summary:")
    print(f"  ✅ Successful: {success_count} records")
    print(f"  ❌ Failed: {failed_count} records")
    print(f"{'='*50}")

def main():
    print("="*50)
    print("Reddit Data Import to Supabase")
    print("="*50)
    
    # Validate configuration
    if not validate_config():
        return
    
    try:
        # Initialize Supabase client
        print("\nInitializing Supabase client...")
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        
        # Test connection
        print("Testing connection...")
        if not test_connection(supabase):
            return
        
        # Load your JSON data
        json_file_path = "college_search_results.json"
        
        print(f"\nLoading JSON data from: {json_file_path}")
        raw_data = load_json_data(json_file_path)
        print(f"✅ Loaded {len(raw_data)} records")
        
        # Show sample of first record
        if raw_data:
            print("\nSample record:")
            print(json.dumps(raw_data[0], indent=2)[:200] + "...")
        
        # Prepare data for Supabase
        print("\nPreparing data for Supabase schema...")
        prepared_data = prepare_reddit_data(raw_data)
        print(f"✅ Prepared {len(prepared_data)} records")
        
        # Confirm before inserting
        response = input(f"\nReady to insert {len(prepared_data)} records into Supabase. Continue? (y/n): ")
        if response.lower() != 'y':
            print("Import cancelled.")
            return
        
        # Insert data into Supabase
        print("\nInserting data into Supabase...")
        batch_insert(supabase, "reddit", prepared_data, batch_size=100)
        
        print("\n✅ Import complete!")
        
    except FileNotFoundError as e:
        print(f"\n❌ Error: {e}")
    except json.JSONDecodeError as e:
        print(f"\n❌ Invalid JSON file: {e}")
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()