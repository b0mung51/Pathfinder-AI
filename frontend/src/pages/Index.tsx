import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { GraduationCap, Target, TrendingUp, Calendar } from "lucide-react";
import graduationIcon from "@/assets/graduation-icon.png";

export default function Index() {
  const navigate = useNavigate();
  const { user, isAuthenticating } = useAuth();

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero Section */}
      <section className="gradient-subtle py-20 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <div className="flex justify-center mb-6">
            <img src={graduationIcon} alt="Graduation" className="h-24 w-24" />
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Find Your Perfect College Path
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            PathFinder AI uses intelligent matching to connect you with colleges that align with
            your goals, preferences, and academic profile.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Button
              size="xl"
              variant="hero"
              disabled={isAuthenticating}
              onClick={() => navigate(user ? "/questionnaire" : "/auth")}
            >
              {user ? "Continue your journey" : "Get Started Free"}
            </Button>
            <Button
              size="xl"
              variant="outline"
              disabled={isAuthenticating}
              onClick={() => navigate(user ? "/dashboard" : "/auth")}
            >
              {user ? "Go to dashboard" : "Sign In"}
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold text-center mb-12">
            Everything You Need to Plan Your College Journey
          </h2>

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="p-6 shadow-card-hover transition-smooth hover:-translate-y-1 hover:shadow-card-hover">
              <div className="flex items-center gap-4 mb-4">
                <GraduationCap className="h-10 w-10 text-primary" />
                <div>
                  <h3 className="text-xl font-semibold">Smart College Matches</h3>
                  <p className="text-muted-foreground">
                    Personalized recommendations using AI that align with your academic strengths and preferences.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6 shadow-card-hover transition-smooth hover:-translate-y-1 hover:shadow-card-hover">
              <div className="flex items-center gap-4 mb-4">
                <Target className="h-10 w-10 text-accent" />
                <div>
                  <h3 className="text-xl font-semibold">Goal Tracking</h3>
                  <p className="text-muted-foreground">
                    Track application milestones, deadlines, and progress toward your top-choice schools.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6 shadow-card-hover transition-smooth hover:-translate-y-1 hover:shadow-card-hover">
              <div className="flex items-center gap-4 mb-4">
                <TrendingUp className="h-10 w-10 text-secondary" />
                <div>
                  <h3 className="text-xl font-semibold">Data-Driven Insights</h3>
                  <p className="text-muted-foreground">
                    Understand admissions trends, acceptance rates, and financial aid options tailored to you.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6 shadow-card-hover transition-smooth hover:-translate-y-1 hover:shadow-card-hover">
              <div className="flex items-center gap-4 mb-4">
                <Calendar className="h-10 w-10 text-emerald-500" />
                <div>
                  <h3 className="text-xl font-semibold">Unified Planning</h3>
                  <p className="text-muted-foreground">
                    Build your college list, schedule visits, and keep notes all in one place.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
