import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabaseClient";
import { Mail, GraduationCap, Edit2, Loader2 } from "lucide-react";

type ProfileRecord = {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
};

type PreferenceRecord = {
  gpa: number | null;
  sat_score: number | null;
  intended_major: string | null;
  budget: number | null;
  preference_tags: string[] | null;
};

export default function Profile() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isAuthenticating } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [gpa, setGpa] = useState("");
  const [satScore, setSatScore] = useState("");
  const [major, setMajor] = useState("");
  const [budget, setBudget] = useState("");
  const [preferencesInput, setPreferencesInput] = useState("");

  useEffect(() => {
    if (isAuthenticating) return;
    if (!user) {
      navigate("/auth", { replace: true });
      return;
    }

    const loadProfile = async () => {
      try {
        const [{ data: profileData, error: profileError }, { data: prefsData, error: prefsError }] = await Promise.all([
          supabase.from("profiles").select("*").eq("id", user.id).maybeSingle<ProfileRecord>(),
          supabase.from("user_preferences").select("*").eq("user_id", user.id).maybeSingle<PreferenceRecord>(),
        ]);

        if (profileError) {
          console.error("Failed to load profile", profileError);
        }
        if (prefsError) {
          console.error("Failed to load preferences", prefsError);
        }

        setFullName(profileData?.full_name ?? "");
        setEmail(profileData?.email ?? user.email ?? "");
        setAvatarUrl(profileData?.avatar_url ?? null);

        setGpa(prefsData?.gpa !== null && prefsData?.gpa !== undefined ? String(prefsData.gpa) : "");
        setSatScore(prefsData?.sat_score !== null && prefsData?.sat_score !== undefined ? String(prefsData.sat_score) : "");
        setMajor(prefsData?.intended_major ?? "");
        setBudget(prefsData?.budget !== null && prefsData?.budget !== undefined ? String(prefsData.budget) : "");
        const tags = prefsData?.preference_tags ?? [];
        setPreferencesInput(tags.join("\n"));
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [user, isAuthenticating, navigate]);

  const parsedPreferences = useMemo(
    () =>
      preferencesInput
        .split(/[\n,]/)
        .map((tag) => tag.trim())
        .filter(Boolean),
    [preferencesInput]
  );

  const handleSave = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      const { error: profileError } = await supabase.from("profiles").upsert(
        {
          id: user.id,
          full_name: fullName || null,
          email: email || null,
          avatar_url: avatarUrl,
        },
        { onConflict: "id" }
      );

      if (profileError) {
        throw profileError;
      }

      const { error: prefsError } = await supabase.from("user_preferences").upsert(
        {
          user_id: user.id,
          gpa: gpa ? Number(gpa) : null,
          sat_score: satScore ? Number(satScore) : null,
          intended_major: major || null,
          budget: budget ? Number(budget) : null,
          preference_tags: parsedPreferences,
        },
        { onConflict: "user_id" }
      );

      if (prefsError) {
        throw prefsError;
      }

      toast({
        title: "Profile updated",
        description: "Your changes have been saved successfully.",
      });
      setIsEditing(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to save your profile.";
      toast({
        title: "Save failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading your profile...</p>
      </div>
    );
  }

  const initials = (fullName || email || "User")
    .split(" ")
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">My Profile</h1>
            {isEditing ? (
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setIsEditing(false)} disabled={isSaving}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving…
                    </span>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            ) : (
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                <Edit2 className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            )}
          </div>

          <Card className="p-6">
            <div className="flex items-start gap-6">
              <Avatar className="h-24 w-24">
                {avatarUrl ? <AvatarImage src={avatarUrl} alt={fullName ?? ""} /> : null}
                <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 space-y-4">
                <div>
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled
                  />
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-xl font-semibold mb-4">Academic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gpa">GPA</Label>
                <Input
                  id="gpa"
                  type="number"
                  step="0.01"
                  value={gpa}
                  onChange={(e) => setGpa(e.target.value)}
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sat">SAT / ACT Score</Label>
                <Input
                  id="sat"
                  type="number"
                  value={satScore}
                  onChange={(e) => setSatScore(e.target.value)}
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="major">Intended Major</Label>
                <Input
                  id="major"
                  value={major}
                  onChange={(e) => setMajor(e.target.value)}
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="budget">Annual Budget (USD)</Label>
                <Input
                  id="budget"
                  type="number"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  disabled={!isEditing}
                />
              </div>
            </div>
          </Card>

  <Card className="p-6">
    <h3 className="text-xl font-semibold mb-4">Preferences & Dealbreakers</h3>
    <div className="space-y-4">
      <div>
        <p className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
          <Mail className="h-4 w-4" />
          Contact
        </p>
        <Badge variant="secondary">{email || "No email on file"}</Badge>
      </div>
      <div>
        <p className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
          <GraduationCap className="h-4 w-4" />
          Academic Snapshot
        </p>
        <div className="flex flex-wrap gap-2">
          {gpa && <Badge variant="secondary">GPA: {gpa}</Badge>}
          {satScore && <Badge variant="secondary">SAT/ACT: {satScore}</Badge>}
          {budget && <Badge variant="secondary">Budget: ${Number(budget).toLocaleString()}</Badge>}
          {major && <Badge variant="secondary">Major: {major}</Badge>}
        </div>
      </div>
      <div>
        <p className="text-sm text-muted-foreground mb-2">Nice-to-Haves</p>
        <div className="flex flex-wrap gap-2">
          {parsedPreferences.length > 0 ? (
            parsedPreferences.map((pref) => (
              <Badge key={pref} variant="outline">
                {pref}
              </Badge>
            ))
          ) : (
            <span className="text-muted-foreground text-sm">No preferences captured yet.</span>
          )}
        </div>
      </div>
      {isEditing && (
        <div>
          <Label htmlFor="preferences">Edit preferences (comma or newline separated)</Label>
          <Textarea
            id="preferences"
            value={preferencesInput}
            onChange={(e) => setPreferencesInput(e.target.value)}
            className="mt-2"
          />
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => navigate("/questionnaire")}>
          Update via questionnaire
        </Button>
      </div>
    </div>
  </Card>
        </div>
      </main>
    </div>
  );
}
