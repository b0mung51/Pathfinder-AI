import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Target, TrendingUp, Calendar, Plus, CheckCircle2 } from "lucide-react";

const tracks = [
  { id: 1, title: "CS @ Stanford", matchScore: 85, color: "text-green-600" },
  { id: 2, title: "Business @ Wharton", matchScore: 78, color: "text-blue-600" },
  { id: 3, title: "Engineering @ MIT", matchScore: 82, color: "text-green-600" },
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

const upcomingTasks = [
  { id: 1, title: "Submit FAFSA", date: "March 1, 2025", completed: false },
  { id: 2, title: "Request recommendation letters", date: "Feb 15, 2025", completed: false },
  { id: 3, title: "Finalize essay drafts", date: "Feb 28, 2025", completed: true },
  { id: 4, title: "Campus visit: Stanford", date: "March 10, 2025", completed: false },
];

export default function Dashboard() {
  const [tasks, setTasks] = useState(upcomingTasks);

  const toggleTask = (id: number) => {
    setTasks(tasks.map(task => 
      task.id === id ? { ...task, completed: !task.completed } : task
    ));
  };

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
                {tracks.map((track) => (
                  <Card
                    key={track.id}
                    className="p-4 hover:shadow-card transition-smooth cursor-pointer border-l-4 border-l-primary"
                  >
                    <h3 className="font-medium mb-2">{track.title}</h3>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Match</span>
                      <span className={`font-semibold ${track.color}`}>
                        {track.matchScore}%
                      </span>
                    </div>
                    <Progress value={track.matchScore} className="mt-2 h-1" />
                  </Card>
                ))}
                <Button variant="outline" className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Track
                </Button>
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
                {[
                  { name: "Stanford University", match: 85, location: "California" },
                  { name: "MIT", match: 82, location: "Massachusetts" },
                  { name: "UC Berkeley", match: 80, location: "California" },
                ].map((college, idx) => (
                  <Card key={idx} className="p-4 hover:shadow-card transition-smooth cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{college.name}</h3>
                        <p className="text-sm text-muted-foreground">{college.location}</p>
                      </div>
                      <Badge variant="secondary">{college.match}% Match</Badge>
                    </div>
                  </Card>
                ))}
              </div>
              <Button variant="outline" className="w-full mt-4">
                View All Recommendations
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
              <div className="space-y-3">
                {tasks.map((task) => (
                  <Card
                    key={task.id}
                    className="p-3 hover:shadow-card transition-smooth cursor-pointer"
                    onClick={() => toggleTask(task.id)}
                  >
                    <div className="flex items-start gap-2">
                      <CheckCircle2
                        className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
                          task.completed ? "text-green-600 fill-green-600" : "text-muted-foreground"
                        }`}
                      />
                      <div className="flex-1">
                        <p className={`font-medium text-sm ${task.completed ? "line-through text-muted-foreground" : ""}`}>
                          {task.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">{task.date}</p>
                      </div>
                    </div>
                  </Card>
                ))}
                <Button variant="outline" size="sm" className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Task
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
