import json
from supabase import create_client, Client
from anthropic import Anthropic
from dotenv import load_dotenv
import os
from typing import List, Dict

load_dotenv()

# --- Setup ---
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
client = Anthropic()

def get_all_colleges():
    """Fetch all colleges from the database."""
    try:
        response = supabase.table('colleges').select('id, name').execute()
        print(f"✅ Loaded {len(response.data)} colleges from database")
        return response.data
    except Exception as e:
        print(f"❌ Error fetching colleges: {e}")
        return []

def match_posts_to_colleges(posts: List[Dict], colleges: List[Dict], batch_size: int = 50):
    """Use Claude to match posts to colleges in batches."""
    
    # Create college list string
    college_list = "\n".join([f"- {c['name']} (ID: {c['id']})" for c in colleges])
    
    total_posts = len(posts)
    print(f"\n📊 Processing {total_posts} posts in batches of {batch_size}...")
    
    for i in range(0, total_posts, batch_size):
        batch = posts[i:i + batch_size]
        batch_num = i // batch_size + 1
        total_batches = (total_posts + batch_size - 1) // batch_size
        
        print(f"\n🔄 Batch {batch_num}/{total_batches} ({len(batch)} posts)...")
        
        # Create simplified posts for prompt
        posts_summary = []
        for j, post in enumerate(batch):
            posts_summary.append({
                "index": j,
                "search_term": post.get("search_term", ""),
                "subreddit": post.get("subreddit", ""),
                "title": post.get("title", ""),
                "body": post.get("body", "")[:500]
            })
        
        prompt = f"""Analyze these Reddit posts and match them to colleges from the list below.

COLLEGES:
{college_list}

POSTS:
{json.dumps(posts_summary, indent=2)}

Consider:
- College names in title, body, search term, or subreddit
- Abbreviations (USC = University of Southern California, MIT = Massachusetts Institute of Technology, etc.)
- Context and references

Return a JSON array with this exact format:
[
  {{
    "college_id": 23,
    "college_name": "University of Southern California",
    "confidence": "high",
    "reason": "Post is in r/USC subreddit"
  }},
  {{
    "body": "Post body text...",
    "url": reddit.com/xyz,
    "index": 1,
    "score": 1000,
    "college_id": null,
    "college_name": null,
    "confidence": "high",
    "reason": "General college advice, not specific"
  }}
]

Keep reasons brief (under 50 characters). Return ONLY the JSON array, nothing else.
"""

        try:
            response = client.messages.create(
                model="claude-sonnet-4-5-20250929",
                max_tokens=4000,
                messages=[{"role": "user", "content": prompt}]
            )
            
            # Extract JSON
            text = response.content[0].text
            
            if "```json" in text:
                start = text.find("```json") + 7
                end = text.find("```", start)
                json_str = text[start:end].strip()
            elif "```" in text:
                start = text.find("```") + 3
                end = text.find("```", start)
                json_str = text[start:end].strip()
            else:
                start = text.find("[")
                end = text.rfind("]") + 1
                json_str = text[start:end]
            
            matches = json.loads(json_str)
            
            # Apply matches to posts
            for match in matches:
                index = match.get("index")
                if index is not None and index < len(batch):
                    batch[index]["college_id"] = match.get("college_id")
                    batch[index]["college_name"] = match.get("college_name")
                    batch[index]["match_confidence"] = match.get("confidence")
                    batch[index]["match_reason"] = match.get("reason")
            
            matched = sum(1 for m in matches if m.get("college_id") is not None)
            print(f"   ✅ Matched {matched}/{len(batch)} posts")
            
        except Exception as e:
            print(f"   ❌ Error: {e}")
    
    return posts

def upload_to_database(posts: List[Dict], batch_size: int = 100):
    """Upload posts to Supabase in batches."""
    total = len(posts)
    success = 0
    failed = 0
    
    print(f"\n📤 Uploading {total} posts to database...")
    
    for i in range(0, total, batch_size):
        batch = posts[i:i + batch_size]
        try:
            response = supabase.table('reddit').insert(batch).execute()
            success += len(batch)
            print(f"   ✅ Batch {i//batch_size + 1}: {len(batch)} posts")
        except Exception as e:
            failed += len(batch)
            print(f"   ❌ Batch {i//batch_size + 1} failed: {e}")
    
    print(f"\n{'='*50}")
    print(f"Upload Summary:")
    print(f"   Success: {success} posts")
    print(f"   Failed: {failed} posts")
    print(f"{'='*50}")

def main():
    print("="*60)
    print("Reddit Post College Matcher")
    print("="*60)
    
    # Load posts
    json_file = "college_search_results.json"
    print(f"\n📂 Loading posts from {json_file}...")
    
    try:
        with open(json_file, 'r', encoding='utf-8') as f:
            posts = json.load(f)
        print(f"✅ Loaded {len(posts)} posts")
    except Exception as e:
        print(f"❌ Error loading posts: {e}")
        return
    
    # Fetch colleges
    print("\n📚 Fetching colleges from database...")
    colleges = get_all_colleges()
    
    if not colleges:
        print("❌ No colleges found. Exiting.")
        return
    
    # Match posts to colleges
    print("\n🤖 Starting AI-powered matching...")
    posts = match_posts_to_colleges(posts, colleges, batch_size=50)
    
    # Summary
    matched = sum(1 for p in posts if p.get('college_id') is not None)
    print(f"\n{'='*50}")
    print(f"Matching Summary:")
    print(f"   Total: {len(posts)} posts")
    print(f"   Matched: {matched} posts")
    print(f"   Unmatched: {len(posts) - matched} posts")
    print(f"{'='*50}")
    
    # Save results
    output_file = "reddit_posts_with_colleges.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(posts, f, indent=2)
    print(f"\n💾 Saved to {output_file}")
    
    # Filter matched posts
    matched_posts = [p for p in posts if p.get('college_id') is not None]
    
    # Upload
    if matched_posts:
        upload = input(f"\n📤 Upload {len(matched_posts)} matched posts to database? (y/n): ").strip().lower()
        if upload == 'y':
            upload_to_database(matched_posts)
        else:
            print("✅ Saved locally. Upload skipped.")
    else:
        print("\n⚠️  No matched posts to upload.")

if __name__ == "__main__":
    main()
