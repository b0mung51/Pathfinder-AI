import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Navbar } from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabaseClient";
import { Target, TrendingUp, Calendar, Plus, CheckCircle2, Loader2, X } from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000/api";

type Track = {
  id: string;
  college: string;
  major: string;
  matchScore: number;
};

const initialTracks: Track[] = [
  {
    id: "track-1",
    college: "Stanford University",
    major: "Computer Science",
    matchScore: 85,
  },
  {
    id: "track-2",
    college: "University of Pennsylvania (Wharton)",
    major: "Business Administration",
    matchScore: 78,
  },
  {
    id: "track-3",
    college: "Massachusetts Institute of Technology",
    major: "Mechanical Engineering",
    matchScore: 82,
  },
];

const insights = [
  {
    title: "Strong Research Match",
    description: "Your profile aligns well with research-focused universities",
    icon: Target,
  },
  {
    title: "Mid-Sized Preferences",
    description: "Schools with 5,000-15,000 students fit your criteria best",
    icon: TrendingUp,
  },
];

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
  score: number;
};

export default function Dashboard() {
  const { user, isAuthenticating } = useAuth();
  const [tracks, setTracks] = useState<Track[]>(initialTracks);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [isLoadingMatches, setIsLoadingMatches] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [trackError, setTrackError] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [isSavingTask, setIsSavingTask] = useState(false);
  const [newTrackCollege, setNewTrackCollege] = useState("");
  const [newTrackMajor, setNewTrackMajor] = useState("");

  const matchScoreColor = useCallback((score: number) => {
    if (score >= 80) {
      return "text-green-600";
    }
    if (score >= 70) {
      return "text-blue-600";
    }
    return "text-yellow-600";
  }, []);

  const createTrackId = useCallback(() => {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }
    return Math.random().toString(36).slice(2);
  }, []);

  const generateMatchScore = useCallback(() => {
    const base = 70;
    const variance = Math.floor(Math.random() * 21); // 0-20
    return base + variance;
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

  useEffect(() => {
    if (!user) {
      setMatches([]);
      setIsLoadingMatches(false);
      return;
    }

    let isActive = true;
    const controller = new AbortController();

    const fetchMatches = async () => {
      setIsLoadingMatches(true);
      setMatchError(null);

      try {
        const url = new URL("/match-scores/", API_BASE_URL);
        url.searchParams.set("user_id", user.id);
        url.searchParams.set("limit", "5");
        url.searchParams.set("use_llm", "true");

        const response = await fetch(url.toString(), {
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to load match scores (${response.status})`);
        }

        const payload = await response.json();
        if (!isActive) return;

        const simplified = Array.isArray(payload.results)
          ? payload.results.map((item: Record<string, unknown>) => ({
              college_id: item.college_id ?? item.id ?? crypto.randomUUID(),
              college_name: String(item.college_name ?? item.name ?? "Unknown college"),
              score: typeof item.score === "number" ? item.score : Number(item.score) || 0,
            }))
          : [];

        setMatches(simplified);
        setMatchError(null);
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error("Failed to fetch match scores", err);
        setMatchError("Unable to load match scores at the moment.");
        setMatches([]);
      } finally {
        if (isActive) {
          setIsLoadingMatches(false);
        }
      }
    };

    void fetchMatches();

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [user]);

  useEffect(() => {
    console.log("Dashboard user:", user?.id);
  }, [user]);
  const handleAddTrack = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedCollege = newTrackCollege.trim();
    const trimmedMajor = newTrackMajor.trim();

    if (!trimmedCollege || !trimmedMajor) {
      setTrackError("Both college and major are required.");
      return;
    }

    const matchScore = generateMatchScore();

    const nextTrack: Track = {
      id: createTrackId(),
      college: trimmedCollege,
      major: trimmedMajor,
      matchScore,
    };

    setTracks((prevTracks) => [nextTrack, ...prevTracks]);
    setNewTrackCollege("");
    setNewTrackMajor("");
    setTrackError(null);
  };

  const handleRemoveTrack = (trackId: string) => {
    setTracks((prevTracks) => prevTracks.filter((track) => track.id !== trackId));
  };

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
                <form onSubmit={handleAddTrack} className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="track-major">Intended major</Label>
                    <Input
                      id="track-major"
                      placeholder="e.g. Computer Science"
                      value={newTrackMajor}
                      onChange={(event) => {
                        if (trackError) {
                          setTrackError(null);
                        }
                        setNewTrackMajor(event.target.value);
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="track-college">College</Label>
                    <Input
                      id="track-college"
                      placeholder="e.g. Stanford University"
                      value={newTrackCollege}
                      onChange={(event) => {
                        if (trackError) {
                          setTrackError(null);
                        }
                        setNewTrackCollege(event.target.value);
                      }}
                    />
                  </div>
                  {trackError ? <p className="text-sm text-destructive">{trackError}</p> : null}
                  <Button type="submit" variant="outline" className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Track
                  </Button>
                </form>

                {tracks.map((track) => (
                  <Card
                    key={track.id}
                    className="p-4 hover:shadow-card transition-smooth border-l-4 border-l-primary relative"
                  >
                    <button
                      type="button"
                      className="absolute right-3 top-3 text-muted-foreground hover:text-destructive transition-smooth"
                      aria-label={`Remove ${track.major} at ${track.college}`}
                      onClick={() => handleRemoveTrack(track.id)}
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <h3 className="font-medium mb-2 pr-6">{`${track.major} @ ${track.college}`}</h3>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Match</span>
                      <span className={`font-semibold ${matchScoreColor(track.matchScore)}`}>
                        {track.matchScore}%
                      </span>
                    </div>
                    <Progress value={track.matchScore} className="mt-2 h-1" />
                  </Card>
                ))}
              </div>
            </Card>
          </div>

          {/* Center Column - AI Insights */}
          <div className="lg:col-span-6 space-y-6">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                AI Insights
              </h2>
              <div className="space-y-4">
                {insights.map((insight, idx) => {
                  const Icon = insight.icon;
                  return (
                    <Card key={idx} className="p-4 bg-secondary/50">
                      <div className="flex gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg h-fit">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold mb-1">{insight.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            {insight.description}
                          </p>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Top Recommended Colleges</h2>
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
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h3 className="font-semibold">{match.college_name}</h3>
                        </div>
                        <Badge variant="secondary">{match.score.toFixed(1)}% Match</Badge>
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
