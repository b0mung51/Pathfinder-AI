import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { CollegeCard } from "@/components/CollegeCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search as SearchIcon, SlidersHorizontal } from "lucide-react";

const mockColleges = [
  {
    id: "1",
    name: "Stanford University",
    location: "Stanford, CA",
    size: "Medium (7,000)",
    cost: "$55k/year",
    major: "Computer Science",
    matchScore: 85,
  },
  {
    id: "2",
    name: "MIT",
    location: "Cambridge, MA",
    size: "Medium (4,500)",
    cost: "$53k/year",
    major: "Engineering",
    matchScore: 82,
  },
  {
    id: "3",
    name: "UC Berkeley",
    location: "Berkeley, CA",
    size: "Large (31,000)",
    cost: "$43k/year",
    major: "Computer Science",
    matchScore: 80,
  },
  {
    id: "4",
    name: "Carnegie Mellon",
    location: "Pittsburgh, PA",
    size: "Medium (7,000)",
    cost: "$58k/year",
    major: "Computer Science",
    matchScore: 78,
  },
  {
    id: "5",
    name: "University of Washington",
    location: "Seattle, WA",
    size: "Large (47,000)",
    cost: "$38k/year",
    major: "Computer Science",
    matchScore: 75,
  },
  {
    id: "6",
    name: "Georgia Tech",
    location: "Atlanta, GA",
    size: "Large (16,000)",
    cost: "$33k/year",
    major: "Computer Science",
    matchScore: 76,
  },
];

export default function Search() {
  const [selectedColleges, setSelectedColleges] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const handleSelect = (id: string) => {
    setSelectedColleges((prev) =>
      prev.includes(id) ? prev.filter((cid) => cid !== id) : [...prev, id]
    );
  };

  const filteredColleges = mockColleges.filter((college) =>
    college.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">College Search</h1>
          <p className="text-muted-foreground">
            Browse and select colleges that match your profile
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Search Bar */}
            <Card className="p-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search colleges..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Button variant="outline">
                  <SlidersHorizontal className="h-4 w-4 mr-2" />
                  Filters
                </Button>
              </div>
            </Card>

            {/* Results */}
            <div className="space-y-4">
              {filteredColleges.map((college) => (
                <CollegeCard
                  key={college.id}
                  {...college}
                  selected={selectedColleges.includes(college.id)}
                  onSelect={handleSelect}
                />
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card className="p-4 sticky top-20">
              <h2 className="font-semibold mb-4">Selected Colleges</h2>
              
              {selectedColleges.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No colleges selected yet. Click "Select" on any college to add it here.
                </p>
              ) : (
                <div className="space-y-3">
                  {selectedColleges.map((id) => {
                    const college = mockColleges.find((c) => c.id === id);
                    if (!college) return null;
                    return (
                      <Card key={id} className="p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{college.name}</p>
                            <Badge variant="secondary" className="mt-1">
                              {college.matchScore}%
                            </Badge>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSelect(id)}
                            className="text-destructive hover:text-destructive h-8 px-2"
                          >
                            ✕
                          </Button>
                        </div>
                      </Card>
                    );
                  })}

                  <Button
                    variant="hero"
                    className="w-full mt-4"
                    disabled={selectedColleges.length < 2}
                  >
                    Compare ({selectedColleges.length})
                  </Button>
                </div>
              )}
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
