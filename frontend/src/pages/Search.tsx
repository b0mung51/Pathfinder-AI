import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { CollegeCard } from "@/components/CollegeCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search as SearchIcon, SlidersHorizontal } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

export const mockColleges = [
  {
    id: "1",
    name: "Stanford University",
    location: "Stanford, CA",
    ranking: 3,
    url: "https://www.stanford.edu",
    gradRate: 94,
    averageCost: "$55,473",
    acceptanceRate: 4,
    medianSalary: 128000,
    size: 7000,
    major: "Computer Science",
    matchScore: 89,
  },
  {
    id: "2",
    name: "Massachusetts Institute of Technology (MIT)",
    location: "Cambridge, MA",
    ranking: 2,
    url: "https://www.mit.edu",
    gradRate: 95,
    averageCost: "$53,790",
    acceptanceRate: 7,
    medianSalary: 135000,
    size: 4500,
    major: "Engineering",
    matchScore: 86,
  },
  {
    id: "3",
    name: "University of California, Berkeley",
    location: "Berkeley, CA",
    ranking: 22,
    url: "https://www.berkeley.edu",
    gradRate: 91,
    averageCost: "$43,232",
    acceptanceRate: 15,
    medianSalary: 110000,
    size: 31000,
    major: "Computer Science",
    matchScore: 81,
  },
  {
    id: "4",
    name: "Carnegie Mellon University",
    location: "Pittsburgh, PA",
    ranking: 25,
    url: "https://www.cmu.edu",
    gradRate: 90,
    averageCost: "$58,924",
    acceptanceRate: 13,
    medianSalary: 115000,
    size: 7000,
    major: "Computer Science",
    matchScore: 78,
  },
  {
    id: "5",
    name: "University of Washington",
    location: "Seattle, WA",
    ranking: 40,
    url: "https://www.washington.edu",
    gradRate: 84,
    averageCost: "$38,312",
    acceptanceRate: 48,
    medianSalary: 98000,
    size: 47000,
    major: "Computer Science",
    matchScore: 75,
  },
  {
    id: "6",
    name: "Georgia Institute of Technology",
    location: "Atlanta, GA",
    ranking: 33,
    url: "https://www.gatech.edu",
    gradRate: 88,
    averageCost: "$33,964",
    acceptanceRate: 18,
    medianSalary: 102000,
    size: 16000,
    major: "Computer Science",
    matchScore: 76,
  },
];

export default function Search() {
  // selectedColleges has Ids
  const [selectedColleges, setSelectedColleges] = useState<string[]>([]);
  // colleges has all data for colleges 
  const [colleges, setColleges] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  // error needed to show no results found message
  const [error, setError] = useState<string|null>(null);
  // loading needed to notify if results should be fetched
  const [loading, setLoading] = useState(false);
  // Flag to process only current request
  let isActive = true;

  const handleSelect = (id: string) => {
    setSelectedColleges((prev) =>
      prev.includes(id) ? prev.filter((cid) => cid !== id) : [...prev, id]
    );
  };

  useEffect(() => {
    const fetchCollege = async () => {
      // If no user input, return empty results
      if(!searchQuery.trim()) {
        setColleges(mockColleges)
        setError(null);
        setLoading(null);
        return
      }

      setError(null);
      setLoading(null);

      // Fetch fuzzy results using user input
      const {data: collegeData, error: collegeError} = await supabase
        .from("colleges")
        .select()
        .textSearch("title", searchQuery.toLowerCase())

      // Fetch program from college
      const {data: programData, error: programError} = await supabase
        .from("programs")
        .select("*")
        .ilike("field_of_study", searchQuery.toLowerCase())

      // If input changed or component unmounted before query finished - ignore result
      if (!isActive) return;

      if (collegeError || programError) {
        setError("Something went wrong while fetching results");
        setLoading(false);
        return;
      }

      const combinedResults = collegeData.map((college) => {
        const relatedPrograms = programData.filter(
          (program) => program.college_id === college.college_id
        )

        return {
          ...collegeData,
          programs: relatedPrograms,
          score: Math.floor(Math.random() * 100) + 1, // Random "match" score
        };
      });

      if (combinedResults.length == 0) {
        setError("No results found.");
      }

      setColleges(combinedResults);
      setLoading(false);
    }
    fetchCollege()

    // When component unmounted early, cancel the request
    return () => {
      isActive = false;
    }

  }, [searchQuery]);
  
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
              {loading ? (
                 <p className="text-muted-foreground text-center py-8">Searching...</p>
              ) : error ? (
                <p className="text-muted-foreground text-center py-8">{error}</p>
              ) : colleges.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Try searching for a college name or major.
                </p>
              ) : (
              colleges.map((college) => (
                <CollegeCard
                  key={college.college_id}
                  {...college}
                />
              )))}
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
