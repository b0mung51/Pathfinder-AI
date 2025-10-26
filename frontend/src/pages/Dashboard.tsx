import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Navbar } from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabaseClient";
import { Target, TrendingUp, Calendar, Plus, CheckCircle2, Loader2, X } from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000/api";

type SavedTrack = {
  id: string;
  college_id: number | string;
  college_name: string;
  location?: string | null;
  ranking?: number | null;
  match_score?: number | null;
  fit_score?: number | null;
};

type Task = {
  id: string;
  title: string;
  due_date: string | null;
  completed: boolean;
  created_at: string;
};

type MatchResult = {
  college_id: number | string;
  college_name: string;
  location?: string | null;
  average_cost?: number | null;
  acceptance_rate?: number | null;
  ranking?: number | null;
  score: number;
  heuristic_score?: number;
  notes?: string[];
};

type Insight = {
  title: string;
  description: string;
  metadata?: unknown;
};

type Insight = {
  title: string;
  description: string;
  metadata?: unknown;
};

export default function Dashboard() {
  const { user, isAuthenticating } = useAuth();
  const [savedTracks, setSavedTracks] = useState<SavedTrack[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [insightsData, setInsightsData] = useState<Insight[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [isLoadingMatches, setIsLoadingMatches] = useState(false);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  const [isRefreshingMatches, setIsRefreshingMatches] = useState(false);
  const [isRefreshingInsights, setIsRefreshingInsights] = useState(false);
  const [isLoadingTracks, setIsLoadingTracks] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [tracksError, setTracksError] = useState<string | null>(null);
  const [insightsError, setInsightsError] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [isSavingTask, setIsSavingTask] = useState(false);

const matchScoreColor = useCallback((score: number) => {
  if (score >= 80) {
    return "text-green-600";
  }
  if (score >= 70) {
    return "text-blue-600";
  }
  return "text-yellow-600";
}, []);

const fetchTasks = useCallback(async () => {
    if (!user) {
      setTasks([]);
      return;
    }

    setIsLoadingTasks(true);
    const { data, error: fetchError } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", user.id)
      .order("completed", { ascending: true })
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true });

    if (fetchError) {
      console.error("Failed to load tasks", fetchError);
      setError("We couldn't load your tasks. Please try again.");
      setTasks([]);
    } else {
      setError(null);
      setTasks(data ?? []);
    }

    setIsLoadingTasks(false);
  }, [user]);

  useEffect(() => {
    if (!isAuthenticating) {
      void fetchTasks();
    }
  }, [isAuthenticating, fetchTasks]);

  const loadCachedMatches = useCallback(async () => {
    if (!user) {
      setMatches([]);
      setMatchError(null);
      setIsLoadingMatches(false);
      return;
    }

    setIsLoadingMatches(true);
    setMatchError(null);

    const { data, error } = await supabase
      .from("match_recommendations")
      .select(
        `
          score,
          heuristic_score,
          notes,
          llm,
          college_id,
          colleges:college_id (
            id,
            name,
            location,
            average_cost,
            acceptance_rate,
            ranking
          )
        `
      )
      .eq("user_id", user.id)
      .order("score", { ascending: false });

    if (error) {
      console.error("Failed to load cached match scores", error);
      setMatchError("Unable to load match scores at the moment.");
      setMatches([]);
      setIsLoadingMatches(false);
      return;
    }

    const mapped =
      data?.map((row) => ({
        college_id: row.college_id ?? crypto.randomUUID(),
        college_name: row.colleges?.name ?? "Unknown college",
        location: row.colleges?.location ?? null,
        average_cost: row.colleges?.average_cost ?? null,
        acceptance_rate: row.colleges?.acceptance_rate ?? null,
        ranking: row.colleges?.ranking ?? null,
        score: typeof row.score === "number" ? Number(row.score) : 0,
        heuristic_score:
          typeof row.heuristic_score === "number"
            ? Number(row.heuristic_score)
            : undefined,
        notes: Array.isArray(row.notes) ? row.notes : undefined,
      })) ?? [];

    setMatches(mapped.slice(0, 5));
    setMatchError(null);
    setIsLoadingMatches(false);
  }, [user]);

  const refreshMatches = useCallback(async () => {
    if (!user) {
      return;
    }

    setIsRefreshingMatches(true);
    setMatchError(null);

    try {
      const base = API_BASE_URL.endsWith("/") ? API_BASE_URL : `${API_BASE_URL}/`;
      const url = new URL("match-scores/", base);
      url.searchParams.set("user_id", user.id);
      url.searchParams.set("limit", "5");
      url.searchParams.set("use_llm", "true");
      url.searchParams.set("refresh", "true");

      const response = await fetch(url.toString(), {
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to refresh match scores (${response.status})`);
      }

      await loadCachedMatches();
    } catch (err) {
      console.error("Failed to refresh match scores", err);
      setMatchError("Unable to refresh match scores right now.");
    } finally {
      setIsRefreshingMatches(false);
    }
  }, [user, loadCachedMatches]);

  const loadCachedInsights = useCallback(async () => {
    if (!user) {
      setInsightsData([]);
      setInsightsError(null);
      setIsLoadingInsights(false);
      return;
    }

    setIsLoadingInsights(true);
    setInsightsError(null);

    const { data, error } = await supabase
      .from("match_insights")
      .select("title, insight, metadata")
      .eq("user_id", user.id)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("Failed to load insights", error);
      setInsightsError("Unable to load insights at the moment.");
      setInsightsData([]);
    } else {
      const mapped =
        data?.map((row) => ({
          title: row.title ?? "",
          description: row.insight ?? "",
          metadata: row.metadata,
        })) ?? [];
      setInsightsData(mapped.slice(0, 3));
      setInsightsError(null);
    }

    setIsLoadingInsights(false);
  }, [user]);

  const refreshInsights = useCallback(async () => {
    if (!user) {
      return;
    }

    setIsRefreshingInsights(true);
    setInsightsError(null);

    try {
      const base = API_BASE_URL.endsWith("/") ? API_BASE_URL : `${API_BASE_URL}/`;
      const url = new URL("match-insights/", base);
      url.searchParams.set("user_id", user.id);
      url.searchParams.set("refresh", "true");

      const response = await fetch(url.toString(), {
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to refresh insights (${response.status})`);
      }

      await loadCachedInsights();
    } catch (err) {
      console.error("Failed to refresh insights", err);
      setInsightsError("Unable to refresh insights right now.");
    } finally {
      setIsRefreshingInsights(false);
    }
  }, [user, loadCachedInsights]);

  useEffect(() => {
    if (!user) {
      setMatches([]);
      setMatchError(null);
      setIsLoadingMatches(false);
      setIsRefreshingMatches(false);
      return;
    }
    void loadCachedMatches();
  }, [user, loadCachedMatches]);

  useEffect(() => {
    if (!user) {
      setInsightsData([]);
      setInsightsError(null);
      setIsLoadingInsights(false);
      setIsRefreshingInsights(false);
      return;
    }
    void loadCachedInsights();
  }, [user, loadCachedInsights]);

  useEffect(() => {
    if (!user) {
      setSavedTracks([]);
      setIsLoadingTracks(false);
      setTracksError(null);
      return;
    }

    let isMounted = true;

    const fetchSavedTracks = async () => {
      setIsLoadingTracks(true);
      setTracksError(null);

      const { data, error: trackFetchError } = await supabase
        .from("saved_colleges")
        .select(
          `
            id,
            match_score,
            fit_score,
            college_id,
            colleges:college_id (
              name,
              location,
              ranking
            )
          `
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (!isMounted) {
        return;
      }

      if (trackFetchError) {
        console.error("Failed to load saved tracks", trackFetchError);
        setSavedTracks([]);
        setTracksError("Unable to load your saved tracks right now.");
      } else {
        const mapped =
          data?.map((entry) => {
            let derivedScore: number | null | undefined;
            if (typeof entry.fit_score === "number") {
              derivedScore = Number(entry.fit_score);
            } else if (typeof entry.match_score === "number") {
              derivedScore = Number(entry.match_score);
            } else if (entry.fit_score === null || entry.match_score === null) {
              derivedScore = null;
            } else {
              derivedScore = undefined;
            }

            return {
              id: entry.id,
              college_id: entry.college_id,
              college_name: entry.colleges?.name ?? "Unknown college",
              location: entry.colleges?.location,
              ranking: entry.colleges?.ranking ?? null,
              match_score: derivedScore,
              fit_score: derivedScore,
            };
          }) ?? [];
        setSavedTracks(mapped);
      }

      setIsLoadingTracks(false);
    };

    void fetchSavedTracks();

    return () => {
      isMounted = false;
    };
  }, [user]);

  const handleToggleTask = async (task: Task) => {
    if (!user) {
      return;
    }

    const nextCompleted = !task.completed;
    const { error: updateError } = await supabase
      .from("tasks")
      .update({ completed: nextCompleted })
      .eq("id", task.id)
      .eq("user_id", user.id);

    if (updateError) {
      console.error("Failed to update task", updateError);
      setError("Updating the task failed. Please try again.");
      return;
    }

    setError(null);
    await fetchTasks();
  };

  const handleAddTask = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!user) {
      setError("Sign in to add tasks.");
      return;
    }

    const trimmedTitle = newTaskTitle.trim();
    if (!trimmedTitle) {
      setError("Task title is required.");
      return;
    }

    setIsSavingTask(true);
    const { error: insertError } = await supabase
      .from("tasks")
      .insert([
        {
          title: trimmedTitle,
          due_date: newTaskDueDate ? newTaskDueDate : null,
          completed: false,
          user_id: user.id,
        },
      ]);

    if (insertError) {
      console.error("Failed to add task", insertError);
      setError("We couldn't save your new task. Please try again.");
    } else {
      setError(null);
      setNewTaskTitle("");
      setNewTaskDueDate("");
      await fetchTasks();
    }

    setIsSavingTask(false);
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!user) {
      return;
    }

    const { error: deleteError } = await supabase
      .from("tasks")
      .delete()
      .eq("id", taskId)
      .eq("user_id", user.id);

    if (deleteError) {
      console.error("Failed to delete task", deleteError);
      setError("Deleting the task failed. Please try again.");
      return;
    }

    setError(null);
    await fetchTasks();
  };

  const formattedTasks = useMemo(
    () =>
      tasks.map((task) => ({
        ...task,
        formattedDate: task.due_date
          ? new Intl.DateTimeFormat(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric",
            }).format(new Date(task.due_date))
          : "No due date",
      })),
    [tasks]
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">My College Plan Dashboard</h1>
          <p className="text-muted-foreground">
            Track your journey to the perfect college
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column - Tracks */}
          <div className="lg:col-span-3 space-y-4">
            <Card className="p-4">
              <h2 className="font-semibold mb-4 flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                My Tracks
              </h2>
              <div className="space-y-3">
                {isAuthenticating ? (
                  <p className="text-muted-foreground text-sm">Signing in...</p>
                ) : !user ? (
                  <p className="text-sm text-muted-foreground">
                    Sign in to see colleges saved from your list.
                  </p>
                ) : isLoadingTracks ? (
                  <div className="flex items-center justify-center py-6 text-muted-foreground">
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Loading your tracks...
                  </div>
                ) : tracksError ? (
                  <p className="text-sm text-destructive">{tracksError}</p>
                ) : savedTracks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Add colleges to your list to see them here.
                  </p>
                ) : (
                  savedTracks.map((track) => (
                    <Card
                      key={track.id}
                      className="p-4 hover:shadow-card transition-smooth border-l-4 border-l-primary"
                    >
                      <h3 className="font-medium mb-2">{track.college_name}</h3>
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>{track.location ?? "Location unavailable"}</span>
                        {typeof track.match_score === "number" ? (
                          <span className={matchScoreColor(track.match_score)}>
                            {track.match_score.toFixed(1)}%
                          </span>
                        ) : null}
                      </div>
                      {track.ranking ? (
                        <div className="mt-2 text-xs text-muted-foreground">
                          Ranking #{track.ranking}
                        </div>
                      ) : null}
                    </Card>
                  ))
                )}
              </div>
            </Card>
          </div>

          {/* Center Column - AI Insights */}
          <div className="lg:col-span-6 space-y-6">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-semibold">AI Insights</h2>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={
                    isRefreshingInsights || isLoadingInsights || !user || isAuthenticating
                  }
                  onClick={() => void refreshInsights()}
                >
                  {isRefreshingInsights ? (
                    <span className="flex items-center gap-2 text-sm">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Refreshing
                    </span>
                  ) : (
                    "Refresh"
                  )}
                </Button>
              </div>
              <div className="space-y-4">
                {isAuthenticating ? (
                  <p className="text-muted-foreground text-sm">Signing in...</p>
                ) : !user ? (
                  <p className="text-sm text-muted-foreground">
                    Sign in to receive personalized insights about your saved colleges.
                  </p>
                ) : isLoadingInsights ? (
                  <div className="flex items-center justify-center py-6 text-muted-foreground">
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Loading insights...
                  </div>
                ) : insightsError ? (
                  <p className="text-sm text-destructive">{insightsError}</p>
                ) : insightsData.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {savedTracks.length === 0
                      ? "Add colleges to your list to unlock tailored insights."
                      : "Press refresh to generate your latest insights."}
                  </p>
                ) : (
                  insightsData.map((insight, idx) => (
                    <Card key={`${insight.title}-${idx}`} className="p-4 bg-secondary/50">
                      <h3 className="font-semibold mb-1">{insight.title}</h3>
                      <p className="text-sm text-muted-foreground">{insight.description}</p>
                    </Card>
                  ))
                )}
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Top Recommended Colleges</h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isRefreshingMatches || isLoadingMatches || !user || isAuthenticating}
                    onClick={() => void refreshMatches()}
                >
                  {isRefreshingMatches ? (
                    <span className="flex items-center gap-2 text-sm">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Refreshing
                    </span>
                  ) : (
                    "Refresh"
                  )}
                </Button>
              </div>
              <div className="space-y-3">
                {isAuthenticating && !user ? (
                  <p className="text-muted-foreground">Sign in to view personalized match scores.</p>
                ) : isLoadingMatches ? (
                  <div className="flex items-center justify-center py-6 text-muted-foreground">
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Calculating your matches...
                  </div>
                ) : matchError ? (
                  <p className="text-destructive text-sm">{matchError}</p>
                ) : matches.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    No personalized matches yet. Update your preferences or check back soon.
                  </p>
                ) : (
                  matches.map((match) => (
                    <Card key={match.college_id} className="p-4 hover:shadow-card transition-smooth cursor-pointer">
                      <div className="flex flex-col gap-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="font-semibold">{match.college_name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {match.location ?? "Location unavailable"}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                              {match.ranking ? (
                                <span className="rounded-full border px-2 py-0.5">
                                  Ranking #{match.ranking}
                                </span>
                              ) : null}
                              {match.average_cost ? (
                                <span className="rounded-full border px-2 py-0.5">
                                  Avg. Cost ${Math.round(match.average_cost).toLocaleString()}
                                </span>
                              ) : null}
                              {typeof match.acceptance_rate === "number" ? (
                                <span className="rounded-full border px-2 py-0.5">
                                  Acceptance {match.acceptance_rate.toFixed(1)}%
                                </span>
                              ) : null}
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge variant="secondary" className="text-base px-3 py-1">
                              {match.score.toFixed(1)}% Match
                            </Badge>
                            {typeof match.heuristic_score === "number" &&
                            Math.abs(match.heuristic_score - match.score) >= 0.1 ? (
                              <p className="mt-1 text-xs text-muted-foreground">
                                Heuristic: {match.heuristic_score.toFixed(1)}%
                              </p>
                            ) : null}
                          </div>
                        </div>
                        {match.notes?.length ? (
                          <div className="space-y-1">
                            {match.notes.slice(0, 3).map((note, idx) => (
                              <p key={idx} className="text-xs text-muted-foreground leading-relaxed">
                                • {note}
                              </p>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </Card>
                  ))
                )}
              </div>
              <Button variant="outline" className="w-full mt-4" asChild>
                <a href="/search">View All Recommendations</a>
              </Button>
            </Card>
          </div>

          {/* Right Column - Tasks */}
          <div className="lg:col-span-3 space-y-4">
            <Card className="p-4">
              <h2 className="font-semibold mb-4 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Upcoming Tasks
              </h2>
              <div className="space-y-4">
                {error ? (
                  <p className="text-sm text-destructive">{error}</p>
                ) : null}
                {isAuthenticating ? (
                  <div className="flex items-center justify-center py-6 text-muted-foreground">
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Checking your session...
                  </div>
                ) : !user ? (
                  <p className="text-sm text-muted-foreground">
                    Sign in to track upcoming tasks and keep them synced across devices.
                  </p>
                ) : (
                  <>
                    <form onSubmit={handleAddTask} className="space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor="task-title">Task</Label>
                        <Input
                          id="task-title"
                          placeholder="e.g. Submit FAFSA"
                          value={newTaskTitle}
                          onChange={(event) => setNewTaskTitle(event.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="task-due-date">Due date</Label>
                        <Input
                          id="task-due-date"
                          type="date"
                          value={newTaskDueDate}
                          onChange={(event) => setNewTaskDueDate(event.target.value)}
                        />
                      </div>
                      <Button type="submit" className="w-full" disabled={isSavingTask}>
                        {isSavingTask ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Task
                          </>
                        )}
                      </Button>
                    </form>

                    <div className="space-y-3">
                      {isLoadingTasks ? (
                        <div className="flex items-center justify-center py-6 text-muted-foreground">
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Loading tasks...
                        </div>
                      ) : formattedTasks.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          You don't have any upcoming tasks yet. Add one to get started!
                        </p>
                      ) : (
                        formattedTasks.map((task) => (
                          <Card
                            key={task.id}
                            className="p-3 hover:shadow-card transition-smooth cursor-pointer"
                            onClick={() => void handleToggleTask(task)}
                          >
                            <div className="flex items-start gap-2">
                              <CheckCircle2
                                className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
                                  task.completed ? "text-green-600 fill-green-600" : "text-muted-foreground"
                                }`}
                              />
                              <div className="flex-1">
                                <p
                                  className={`font-medium text-sm ${
                                    task.completed ? "line-through text-muted-foreground" : ""
                                  }`}
                                >
                                  {task.title}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">{task.formattedDate}</p>
                              </div>
                              <button
                                type="button"
                                className="text-muted-foreground hover:text-destructive transition-smooth"
                                aria-label="Delete task"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  void handleDeleteTask(task.id);
                                }}
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          </Card>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
