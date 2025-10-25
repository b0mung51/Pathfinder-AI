import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { User, Mail, GraduationCap, Edit2, LogOut } from "lucide-react";

export default function Profile() {
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();

  const handleSave = () => {
    setIsEditing(false);
    toast({
      title: "Profile updated",
      description: "Your changes have been saved successfully.",
    });
  };

  const handleLogout = () => {
    toast({
      title: "Logged out",
      description: "You have been successfully logged out.",
    });
    // In production, this would handle Firebase logout
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">My Profile</h1>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>

          {/* Profile Overview */}
          <Card className="p-6">
            <div className="flex items-start gap-6">
              <Avatar className="h-24 w-24">
                <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                  JD
                </AvatarFallback>
              </Avatar>

              <div className="flex-1">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold">John Doe</h2>
                    <p className="text-muted-foreground">john.doe@example.com</p>
                  </div>
                  <Button
                    variant={isEditing ? "default" : "outline"}
                    onClick={isEditing ? handleSave : () => setIsEditing(true)}
                  >
                    {isEditing ? "Save Changes" : (
                      <>
                        <Edit2 className="h-4 w-4 mr-2" />
                        Edit Profile
                      </>
                    )}
                  </Button>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Class of 2025</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">GPA: 3.8</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">SAT: 1450</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Academic Information */}
          <Card className="p-6">
            <h3 className="text-xl font-semibold mb-4">Academic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gpa">GPA</Label>
                <Input
                  id="gpa"
                  type="number"
                  step="0.01"
                  defaultValue="3.8"
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sat">SAT Score</Label>
                <Input
                  id="sat"
                  type="number"
                  defaultValue="1450"
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="major">Intended Major</Label>
                <Input
                  id="major"
                  defaultValue="Computer Science"
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="graduation">Expected Graduation</Label>
                <Input
                  id="graduation"
                  defaultValue="2025"
                  disabled={!isEditing}
                />
              </div>
            </div>
          </Card>

          {/* Preferences Summary */}
          <Card className="p-6">
            <h3 className="text-xl font-semibold mb-4">Preferences & Dealbreakers</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Budget Range</p>
                <Badge variant="secondary">$20k - $60k per year</Badge>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground mb-2">Preferred Location</p>
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="secondary">West Coast</Badge>
                  <Badge variant="secondary">Urban Setting</Badge>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-2">Campus Size</p>
                <Badge variant="secondary">Medium (5k-15k students)</Badge>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-2">Nice-to-Haves</p>
                <div className="flex gap-2 flex-wrap">
                  <Badge>Strong Research</Badge>
                  <Badge>Study Abroad</Badge>
                  <Badge>Diverse Campus</Badge>
                  <Badge>Internship Programs</Badge>
                </div>
              </div>
            </div>

            {isEditing && (
              <Button variant="outline" className="mt-4">
                Edit Preferences
              </Button>
            )}
          </Card>

          {/* AI Insights */}
          <Card className="p-6 bg-gradient-to-br from-primary/5 to-accent/5">
            <h3 className="text-xl font-semibold mb-4">Your AI Profile Summary</h3>
            <p className="text-muted-foreground leading-relaxed">
              Based on your preferences and academic profile, you're best suited for mid-sized,
              research-focused universities with strong computer science programs. Your profile
              aligns particularly well with schools that offer robust internship opportunities
              and have active tech industry partnerships. Consider schools in urban tech hubs
              for maximum career preparation benefits.
            </p>
          </Card>

          {/* Export Options */}
          <Card className="p-6">
            <h3 className="text-xl font-semibold mb-4">Export Your Data</h3>
            <p className="text-muted-foreground mb-4">
              Download your complete college planning profile and recommendations
            </p>
            <div className="flex gap-2">
              <Button variant="outline">Export as PDF</Button>
              <Button variant="outline">Export as CSV</Button>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
