import json
from supabase import create_client, Client
from dotenv import load_dotenv
import os

load_dotenv()

SUPABASE_URL = "https://kuazksvlfyjygydinamx.supabase.co/"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1YXprc3ZsZnlqeWd5ZGluYW14Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTM2MzU1MywiZXhwIjoyMDc2OTM5NTUzfQ.ClKV-dxNlSjQXBFbCZcVxdYLQTLnxJ3z3992wUporLw"

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

print("Testing Harvard (college_id = 7)")
print("="*60)

# Test 1: Check with exact query from the hook
print("\n1. Exact query from hook:")
response = supabase.table('reddit').select('body, url, score').eq('college_id', 7).order('score', desc=True).limit(20).execute()
print(f"   Results: {len(response.data)} posts")
if response.data:
    print(f"   First post: {response.data[0]}")

# Test 2: Check all Harvard posts
print("\n2. All Harvard posts (any query):")
response = supabase.table('reddit').select('*').eq('college_id', 7).execute()
print(f"   Results: {len(response.data)} posts")
if response.data:
    print(f"   Sample post:")
    for key, value in response.data[0].items():
        if isinstance(value, str) and len(value) > 50:
            print(f"   - {key}: {value[:50]}...")
        else:
            print(f"   - {key}: {value}")

# Test 3: Check data types
print("\n3. Checking data types in database:")
response = supabase.table('reddit').select('id, college_id').limit(5).execute()
for post in response.data:
    print(f"   Post {post['id']}: college_id = {post['college_id']} (type: {type(post['college_id']).__name__})")

print("\n" + "="*60)