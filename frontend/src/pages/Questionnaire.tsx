import { useState } from "react";
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
  const navigate = useNavigate();
  const { toast } = useToast();

  const totalSteps = questions.length + 2; // questions + stats + preferences

  const handleResponse = (questionId: string, value: number) => {
    setResponses((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleNext = () => {
    if (step < totalSteps - 1) {
      setStep(step + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const handleSubmit = () => {
    toast({
      title: "Profile Complete!",
      description: "Generating your personalized college recommendations...",
    });
    setTimeout(() => navigate("/"), 1500);
  };

  const scaleLabels = ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"];

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
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="major">Intended Major</Label>
                <Select value={major} onValueChange={setMajor}>
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
              disabled={step === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Button onClick={handleNext} variant="hero">
              {step === totalSteps - 1 ? "Generate My Plan" : "Next"}
              {step < totalSteps - 1 && <ChevronRight className="h-4 w-4 ml-2" />}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
