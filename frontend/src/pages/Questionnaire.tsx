import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProgressBar } from "@/components/ProgressBar";
import { useToast } from "@/hooks/use-toast";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";

const questions = [
  {
    id: "academics",
    title: "Academic Goals",
    questions: [
      "I want to attend a highly selective university",
      "Research opportunities are important to me",
      "I prefer small class sizes",
      "Access to advanced courses is a priority",
    ],
  },
  {
    id: "social",
    title: "Social & Campus Life",
    questions: [
      "Greek life is important to me",
      "I want a strong sense of community",
      "Division I sports are a priority",
      "I prefer an active social scene",
    ],
  },
  {
    id: "career",
    title: "Career Preparation",
    questions: [
      "Internship opportunities are essential",
      "Strong alumni network matters to me",
      "Career services support is important",
      "I want industry partnerships",
    ],
  },
];

export default function Questionnaire() {
  const [step, setStep] = useState(0);
  const [responses, setResponses] = useState<Record<string, number>>({});
  const [gpa, setGpa] = useState("");
  const [sat, setSat] = useState("");
  const [major, setMajor] = useState("");
  const [costRange, setCostRange] = useState([20000]);
  const [preferences, setPreferences] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isAuthenticating } = useAuth();

  const totalSteps = questions.length + 2; // questions + stats + preferences

  useEffect(() => {
    if (isAuthenticating) return;
    if (!user) {
      navigate("/auth", { replace: true });
      return;
    }

    const loadExisting = async () => {
      try {
        const { data, error } = await supabase
          .from("user_preferences")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) {
          console.error("Failed to fetch preferences", error);
          return;
        }

        if (data) {
          setGpa(data.gpa !== null && data.gpa !== undefined ? String(data.gpa) : "");
          setSat(data.sat_score !== null && data.sat_score !== undefined ? String(data.sat_score) : "");
          setMajor(data.intended_major ?? "");
          setCostRange([data.budget ?? 20000]);
          setPreferences(Array.isArray(data.preference_tags) ? data.preference_tags : []);
          setResponses(
            data.responses && typeof data.responses === "object"
              ? (data.responses as Record<string, number>)
              : {}
          );
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadExisting();
  }, [isAuthenticating, user, navigate]);

  const handleResponse = (questionId: string, value: number) => {
    setResponses((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleNext = async () => {
    if (isSubmitting) return;

    if (step < totalSteps - 1) {
      setStep(step + 1);
    } else {
      await handleSubmit();
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in before saving your questionnaire.",
        variant: "destructive",
      });
      navigate("/auth", { replace: true });
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        user_id: user.id,
        gpa: gpa ? Number(gpa) : null,
        sat_score: sat ? Number(sat) : null,
        intended_major: major || null,
        budget: costRange?.[0] ?? null,
        preference_tags: preferences,
        responses,
      };

      const { error } = await supabase.from("user_preferences").upsert(payload, {
        onConflict: "user_id",
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Profile saved!",
        description: "Generating your personalized college recommendations...",
      });
      setTimeout(() => navigate("/dashboard"), 1200);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to save your preferences.";
      toast({
        title: "Save failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const scaleLabels = ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"];
  const isDisabled = useMemo(() => isSubmitting || isAuthenticating || isLoading, [isSubmitting, isAuthenticating, isLoading]);

  if (isLoading) {
    return (
      <div className="min-h-screen gradient-subtle flex items-center justify-center">
        <p className="text-muted-foreground">Loading your questionnaire...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-subtle py-12 px-4">
      <div className="container max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Tell Us About Your Goals</h1>
          <p className="text-muted-foreground">
            Help us understand what you're looking for in your college experience
          </p>
        </div>

        <ProgressBar currentStep={step + 1} totalSteps={totalSteps} className="mb-8" />

        <Card className="p-8 shadow-card">
          {step === 0 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold mb-6">Academic Information</h2>
              
              <div className="space-y-2">
                <Label htmlFor="gpa">GPA</Label>
                <Input
                  id="gpa"
                  type="number"
                  step="0.01"
                  min="0"
                  max="4.0"
                  placeholder="3.8"
                  value={gpa}
                  onChange={(e) => setGpa(e.target.value)}
                  disabled={isDisabled}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sat">SAT/ACT Score</Label>
                <Input
                  id="sat"
                  type="number"
                  placeholder="1400"
                  value={sat}
                  onChange={(e) => setSat(e.target.value)}
                  disabled={isDisabled}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="major">Intended Major</Label>
                <Select value={major} onValueChange={setMajor} disabled={isDisabled}>
                  <SelectTrigger id="major">
                    <SelectValue placeholder="Select a major" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="cs">Computer Science</SelectItem>
                    <SelectItem value="business">Business</SelectItem>
                    <SelectItem value="engineering">Engineering</SelectItem>
                    <SelectItem value="biology">Biology</SelectItem>
                    <SelectItem value="psychology">Psychology</SelectItem>
                    <SelectItem value="english">English</SelectItem>
                    <SelectItem value="undecided">Undecided</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                <Label>Annual Cost Budget: ${costRange[0].toLocaleString()}</Label>
                <Slider
                  value={costRange}
                  onValueChange={setCostRange}
                  max={80000}
                  min={5000}
                  step={5000}
                  className="py-4"
                  disabled={isDisabled}
                />
                <p className="text-sm text-muted-foreground">
                  This helps us recommend colleges within your budget
                </p>
              </div>
            </div>
          )}

          {step > 0 && step <= questions.length && (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold mb-6">
                {questions[step - 1].title}
              </h2>

              {questions[step - 1].questions.map((question, idx) => {
                const questionId = `${questions[step - 1].id}_${idx}`;
                return (
                  <div key={questionId} className="space-y-4 pb-6 border-b last:border-0">
                    <p className="font-medium">{question}</p>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((value) => (
                        <Button
                          key={value}
                          variant={responses[questionId] === value ? "default" : "outline"}
                          size="lg"
                          className="flex-1 flex-col h-auto py-3"
                          onClick={() => handleResponse(questionId, value)}
                        >
                          <span className="text-2xl font-bold">{value}</span>
                          <span className="text-xs mt-1">{scaleLabels[value - 1]}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {step === totalSteps - 1 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold mb-6">Nice-to-Haves</h2>
              <p className="text-muted-foreground mb-4">
                Select any additional preferences (optional)
              </p>

              {[
                "Strong Arts Programs",
                "Study Abroad Opportunities",
                "Diverse Student Body",
                "Green Campus",
                "Religious Affiliation",
                "Urban Setting",
                "Rural Setting",
                "Strong Athletics",
              ].map((pref) => (
                <div key={pref} className="flex items-center space-x-2">
                  <Checkbox
                    id={pref}
                    checked={preferences.includes(pref)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setPreferences([...preferences, pref]);
                      } else {
                        setPreferences(preferences.filter((p) => p !== pref));
                      }
                    }}
                    disabled={isDisabled}
                  />
                  <Label htmlFor={pref} className="cursor-pointer">
                    {pref}
                  </Label>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-between mt-8 pt-6 border-t">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={step === 0 || isDisabled}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Button onClick={handleNext} variant="hero" disabled={isDisabled}>
              {step === totalSteps - 1 ? (isSubmitting ? "Saving..." : "Generate My Plan") : "Next"}
              {step < totalSteps - 1 && <ChevronRight className="h-4 w-4 ml-2" />}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
