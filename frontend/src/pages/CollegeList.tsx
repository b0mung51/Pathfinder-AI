import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GripVertical, Trash2, BarChart3 } from "lucide-react";

interface RankedCollege {
  id: string;
  rank: number;
  name: string;
  location: string;
  cost: string;
  matchScore: number;
  major: string;
}

const initialColleges: RankedCollege[] = [
  {
    id: "1",
    rank: 1,
    name: "Stanford University",
    location: "Stanford, CA",
    cost: "$55k/year",
    matchScore: 85,
    major: "Computer Science",
  },
  {
    id: "2",
    rank: 2,
    name: "MIT",
    location: "Cambridge, MA",
    cost: "$53k/year",
    matchScore: 82,
    major: "Engineering",
  },
  {
    id: "3",
    rank: 3,
    name: "UC Berkeley",
    location: "Berkeley, CA",
    cost: "$43k/year",
    matchScore: 80,
    major: "Computer Science",
  },
  {
    id: "4",
    rank: 4,
    name: "Carnegie Mellon",
    location: "Pittsburgh, PA",
    cost: "$58k/year",
    matchScore: 78,
    major: "Computer Science",
  },
];

export default function CollegeList() {
  const [colleges, setColleges] = useState<RankedCollege[]>(initialColleges);
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);

  const handleRemove = (id: string) => {
    setColleges(colleges.filter((c) => c.id !== id).map((c, idx) => ({ ...c, rank: idx + 1 })));
  };

  const toggleCompareSelection = (id: string) => {
    setSelectedForCompare((prev) =>
      prev.includes(id) ? prev.filter((cid) => cid !== id) : [...prev, id]
    );
  };

  const avgCost = colleges.reduce((sum, c) => sum + parseInt(c.cost.replace(/[^0-9]/g, "")), 0) / colleges.length;
  const avgMatch = colleges.reduce((sum, c) => sum + c.matchScore, 0) / colleges.length;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">My College List</h1>
          <p className="text-muted-foreground">
            Organize and prioritize your college choices
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main List */}
          <div className="lg:col-span-3 space-y-4">
            {colleges.length === 0 ? (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground mb-4">
                  Your college list is empty. Add colleges from the search page!
                </p>
                <Button variant="hero">Browse Colleges</Button>
              </Card>
            ) : (
              colleges.map((college) => (
                <Card
                  key={college.id}
                  className={`p-6 transition-smooth hover:shadow-card-hover ${
                    selectedForCompare.includes(college.id) ? "ring-2 ring-primary" : ""
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Drag Handle */}
                    <div className="cursor-grab active:cursor-grabbing pt-2">
                      <GripVertical className="h-5 w-5 text-muted-foreground" />
                    </div>

                    {/* Rank Badge */}
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold shrink-0">
                      #{college.rank}
                    </div>

                    {/* College Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold mb-1">{college.name}</h3>
                      <p className="text-sm text-muted-foreground mb-3">{college.major}</p>
                      
                      <div className="flex flex-wrap gap-4 text-sm">
                        <span className="text-muted-foreground">{college.location}</span>
                        <span className="text-muted-foreground">{college.cost}</span>
                        <Badge variant="secondary">{college.matchScore}% Match</Badge>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => toggleCompareSelection(college.id)}
                        className={selectedForCompare.includes(college.id) ? "bg-secondary" : ""}
                      >
                        <BarChart3 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemove(college.id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>

          {/* Sidebar Stats */}
          <div className="lg:col-span-1">
            <Card className="p-4 sticky top-20 space-y-6">
              <div>
                <h2 className="font-semibold mb-4">List Summary</h2>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Schools</span>
                    <span className="font-semibold">{colleges.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Avg. Cost</span>
                    <span className="font-semibold">${Math.round(avgCost / 1000)}k</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Avg. Match</span>
                    <span className="font-semibold">{Math.round(avgMatch)}%</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <Button
                  variant="hero"
                  className="w-full mb-2"
                  disabled={selectedForCompare.length < 2}
                >
                  Compare Selected ({selectedForCompare.length})
                </Button>
                <Button variant="outline" className="w-full">
                  Export List
                </Button>
              </div>

              {selectedForCompare.length > 0 && (
                <div className="pt-4 border-t">
                  <p className="text-xs text-muted-foreground mb-2">Selected for comparison:</p>
                  <div className="space-y-1">
                    {selectedForCompare.map((id) => {
                      const college = colleges.find((c) => c.id === id);
                      return (
                        <Badge key={id} variant="secondary" className="text-xs">
                          {college?.name}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
