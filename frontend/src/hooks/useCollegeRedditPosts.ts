import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface RedditPost {
  title?: string;
  body: string;
  url: string;
  score: number;
  subreddit?: string;
}

export function useCollegeRedditPosts(collegeId: string | number) {
  const [posts, setPosts] = useState<RedditPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Log on every render
  console.log('🎯 useCollegeRedditPosts called with:', { 
    collegeId, 
    collegeIdType: typeof collegeId,
    collegeIdLength: typeof collegeId === 'string' ? collegeId?.length : 'N/A',
    isEmpty: !collegeId 
  });

  useEffect(() => {
    async function fetchRedditPosts() {
      console.log('🔍 useEffect triggered. College ID:', collegeId);
      
      // If no supabase client, skip
      if (!supabase) {
        console.error('❌ Supabase client not initialized');
        setLoading(false);
        return;
      }

      if (!collegeId) {
        console.log('⚠️ No college ID provided, skipping fetch');
        setPosts([]);
        setLoading(false);
        return;
      }

      console.log('✅ Starting fetch...');

      try {
        setLoading(true);
        setError(null);
        
        console.log('📡 Querying Supabase...');
        
        // Convert collegeId to number (handles both string and number inputs)
        const numericCollegeId = typeof collegeId === 'number' 
          ? collegeId 
          : parseInt(collegeId, 10);
        
        if (isNaN(numericCollegeId)) {
          console.warn('⚠️ Invalid college ID:', collegeId);
          setPosts([]);
          return;
        }
        
        console.log('🔢 Using numeric college ID:', numericCollegeId);
        
        // Only select columns that exist in your database
        const { data, error: fetchError } = await supabase
          .from('reddit')
          .select('body, url, score')
          .eq('college_id', numericCollegeId)
          .order('score', { ascending: false })
          .limit(20);

        console.log('📦 Supabase response:', { data, error: fetchError });

        if (fetchError) {
          console.error('❌ Supabase error:', fetchError);
          throw fetchError;
        }

        console.log(`✅ Found ${data?.length || 0} posts`);

        // Transform data to match interface
        const transformedData = (data || []).map(post => {
          const title = extractTitleFromUrl(post.url);
          const subreddit = extractSubredditFromUrl(post.url);
          console.log('🔄 Transformed post:', { url: post.url, title, subreddit });
          return {
            ...post,
            title,
            subreddit
          };
        });

        setPosts(transformedData);
      } catch (err) {
        console.error('💥 Error fetching Reddit posts:', err);
        setError(err as Error);
        setPosts([]);
      } finally {
        setLoading(false);
      }
    }

    fetchRedditPosts();
  }, [collegeId]);

  console.log('📊 Hook state:', { postsCount: posts.length, loading, hasError: !!error });

  return { posts, loading, error };
}

// Helper function to extract title from Reddit URL
function extractTitleFromUrl(url: string): string {
  try {
    // Reddit URLs typically look like: /r/subreddit/comments/id/title_slug/
    const parts = url.split('/');
    const titleIndex = parts.findIndex(part => part === 'comments') + 2;
    if (titleIndex > 1 && parts[titleIndex]) {
      return parts[titleIndex].replace(/_/g, ' ').replace(/\+/g, ' ');
    }
  } catch (e) {
    console.warn('Failed to extract title from URL:', url);
  }
  return 'Reddit Post';
}

// Helper function to extract subreddit from Reddit URL
function extractSubredditFromUrl(url: string): string {
  try {
    // Extract subreddit name from URL like /r/USC/ or https://reddit.com/r/USC/
    const match = url.match(/\/r\/([^\/]+)/);
    if (match && match[1]) {
      return match[1];
    }
  } catch (e) {
    console.warn('Failed to extract subreddit from URL:', url);
  }
  return 'unknown';
}