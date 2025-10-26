import praw
import os
from dotenv import load_dotenv
import json

load_dotenv()

reddit = praw.Reddit(
    client_id=os.environ.get("REDDIT_CLIENT_ID"),
    client_secret=os.environ.get("REDDIT_CLIENT_SECRET"),
    password=os.environ.get("REDDIT_PASSWORD"),
    user_agent=os.environ.get("REDDIT_USER_AGENT"),
    username=os.environ.get("REDDIT_USERNAME"),
)

def fetch_subreddit_posts(subreddit_name, limit=10):
    subreddit = reddit.subreddit(subreddit_name)
    posts = []
    for post in subreddit.hot(limit=limit):
        posts.append({
            "title": post.title,
            "score": post.score,
            "id": post.id,
            "url": post.url,
            "created": post.created_utc,
            "body": post.selftext,
        })
    return posts

search_terms = [
    "undergraduate programs",
    "major selection",
    "info about specific program",
    "campus life",
    "what major is best for me",
]
college_subreddits = [
    "ApplyingToCollege",      # Best for admissions advice
    "CollegeAdmissions",      # Admissions discussions
    "College",                # General college topics
    "college",                # Alternative spelling
    "UniUK",                  # UK universities
    "gradadmissions",         # Graduate school admissions
    "engineering",            # Engineering programs
    "premed",                 # Pre-med advice
]

combined_subreddits = "+".join(college_subreddits)
multi_subreddit = reddit.subreddit(combined_subreddits)

all_results = []

for term in search_terms:
    print(f"\nSearching for: '{term}' across college subreddits...")
    
    results = multi_subreddit.search(
        query=term,
        sort="top",
        time_filter="year",
        limit=100  # Total across all subreddits
    )
    
    for post in results:
        result_data = {
            'score': post.score,
            'url': f"https://reddit.com{post.permalink}",
            'body': post.selftext,
        }
        all_results.append(result_data)

with open('college_search_results.json', 'w', encoding='utf-8') as f:
    json.dump(all_results, f, indent=2, ensure_ascii=False)

print(f"Saved {len(all_results)} results to college_search_results.json")