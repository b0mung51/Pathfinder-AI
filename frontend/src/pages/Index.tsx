import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Navbar } from "@/components/Navbar";
import { GraduationCap, Target, TrendingUp, Calendar } from "lucide-react";
import graduationIcon from "@/assets/graduation-icon.png";

export default function Index() {
  const navigate = useNavigate();

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
            <Button size="xl" variant="hero" onClick={() => navigate("/auth")}>
              Get Started Free
            </Button>
            <Button size="xl" variant="outline" onClick={() => navigate("/auth")}>
              Sign In
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
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="p-6 text-center hover:shadow-card-hover transition-smooth">
              <div className="inline-flex p-3 bg-primary/10 rounded-lg mb-4">
                <Target className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">AI-Powered Matching</h3>
              <p className="text-sm text-muted-foreground">
                Get personalized college recommendations based on your unique profile
              </p>
            </Card>

            <Card className="p-6 text-center hover:shadow-card-hover transition-smooth">
              <div className="inline-flex p-3 bg-primary/10 rounded-lg mb-4">
                <TrendingUp className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Smart Rankings</h3>
              <p className="text-sm text-muted-foreground">
                Organize and compare colleges with intelligent fit scoring
              </p>
            </Card>

            <Card className="p-6 text-center hover:shadow-card-hover transition-smooth">
              <div className="inline-flex p-3 bg-primary/10 rounded-lg mb-4">
                <Calendar className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Application Timeline</h3>
              <p className="text-sm text-muted-foreground">
                Never miss a deadline with automated reminders and tracking
              </p>
            </Card>

            <Card className="p-6 text-center hover:shadow-card-hover transition-smooth">
              <div className="inline-flex p-3 bg-primary/10 rounded-lg mb-4">
                <GraduationCap className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Multiple Paths</h3>
              <p className="text-sm text-muted-foreground">
                Explore different major and career track possibilities
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 gradient-primary">
        <div className="container mx-auto text-center max-w-3xl text-white">
          <h2 className="text-4xl font-bold mb-4">
            Start Planning Your Future Today
          </h2>
          <p className="text-xl mb-8 text-white/90">
            Join thousands of students who have found their perfect college match
          </p>
          <Button
            size="xl"
            variant="secondary"
            onClick={() => navigate("/auth")}
          >
            Create Free Account
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 px-4">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
          <p>© 2025 PathFinder AI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
