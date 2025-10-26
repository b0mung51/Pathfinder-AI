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
    grad_rate: 0.94,
    average_cost: 55473,
    acceptance_rate: 0.04,
    medianSalary: 128000,
    size: 7000,
    majors: "Computer Science",
    score: 89,
  },
  {
    id: "2",
    name: "Massachusetts Institute of Technology (MIT)",
    location: "Cambridge, MA",
    ranking: 2,
    url: "https://www.mit.edu",
    grad_rate: 0.95,
    average_cost: 53790,
    acceptance_rate: 0.07,
    median_salary: 135000,
    size: 4500,
    majors: "Engineering",
    score: 86,
  },
  {
    id: "3",
    name: "University of California, Berkeley",
    location: "Berkeley, CA",
    ranking: 22,
    url: "https://www.berkeley.edu",
    grad_rate: 0.91,
    average_cost: 43232,
    acceptance_rate: 0.15,
    median_salary: 110000,
    size: 31000,
    majors: "Computer Science",
    score: 81,
  },
  {
    id: "4",
    name: "Carnegie Mellon University",
    location: "Pittsburgh, PA",
    ranking: 25,
    url: "https://www.cmu.edu",
    grad_rate: 0.90,
    average_cost: 58924,
    acceptance_rate: 0.13,
    median_salary: 115000,
    size: 7000,
    majors: "Computer Science",
    score: 78,
  },
  {
    id: "5",
    name: "University of Washington",
    location: "Seattle, WA",
    ranking: 40,
    url: "https://www.washington.edu",
    grad_rate: 0.84,
    average_cost: 38312,
    acceptance_rate: 0.48,
    median_salary: 98000,
    size: 47000,
    majors: "Computer Science",
    score: 75,
  },
  {
    id: "6",
    name: "Georgia Institute of Technology",
    location: "Atlanta, GA",
    ranking: 33,
    url: "https://www.gatech.edu",
    grad_rate: 0.88,
    average_cost: 33964,
    acceptance_rate: 0.18,
    median_salary: 102000,
    size: 16000,
    majors: "Computer Science",
    score: 76,
  },
];

export default function Search() {
  // selectedColleges has Ids that user selected 
  const [selectedColleges, setSelectedColleges] = useState<string[]>([]);
  // colleges has all data for colleges 
  const [colleges, setColleges] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  // error needed to show no results found message
  const [error, setError] = useState<string|null>(null);
  // loading needed to notify if results should be fetched
  const [loading, setLoading] = useState(false);
  
  const handleSelect = (id: string) => {
    setSelectedColleges((prev) => 
      prev.includes(id) // Check the Id
      ? prev.filter((cid) => cid !== id) // If it exists, loop through the array and remove the Id
      : [...prev, id] // If it doesn't then add it to the array
    );
  };

  useEffect(() => {
      // Flag to process only current request
      let isActive = true;
      
      const fetchCollege = async () => {
        // Trim whitespace
        const query = searchQuery.trim();

        // If no user input, return empty results
        if(!query) {
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
          .select("*")
          .ilike("name", `%${query}%`);

        // Fetch program from college
        const {data: programData, error: programError} = await supabase
          .from("programs")
          .select("*")
          .in("college_id", collegeData.map(college => college.id));

        // If input changed or component unmounted before query finished - ignore result
        if (!isActive) return;
        //console.log(`Query: '${query}'`, collegeData[0]);
        //console.log("Program Data: ", programData);
        
        if (collegeError || programError) {
          setError("Something went wrong while fetching results");
          setLoading(false);
          return;
        }

        const combinedResults = collegeData.map((college) => {
          const relatedPrograms = programData.filter(
            (program) => program.college_id === college.id
          );

          return {
            ...college,
            //Extract all programs into a string seperated by ','
            programs: relatedPrograms
            .map((p) => p.name).
            join(", "), 
            score: Math.floor(Math.random() * 100) + 1, // add a random score
          };
        });
        //console.log(combinedResults);
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

        {/*Title */}
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
                    {/* Input textbox */}
                    <Input
                      placeholder="Search colleges..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  {/* Filter button */}
                  <Button variant="outline">
                    <SlidersHorizontal className="h-4 w-4 mr-2" />
                    Filters
                  </Button>
                </div>
              </Card>


              {/* Results */}
              {/*
              Displays "Searching..." during a database call
              Displays error message when nothing is returned from database call
              Displays "Try searching for..." if no matches are found
              If no issues then display all colleges relevant to the search
              */}
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
                    id={college.id}
                    name={college.name}
                    location={college.location}
                    ranking={college.ranking}
                    url={college.url}
                    gradRate={Math.round(college.grad_rate * 100)}
                    averageCost={college.average_cost}
                    acceptanceRate={Math.round(college.acceptance_rate * 100)}
                    medianSalary={college.median_salary}
                    size={college.size}
                    majors={college.programs}
                    matchScore={college.score}
                    //{...college}
                    selected={selectedColleges.includes(college.id)}
                    onSelect={handleSelect}
                  />
                )))}
              </div>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <Card className="p-4 sticky top-20">

                {/* Empty sidebar container */}
                <h2 className="font-semibold mb-4">Selected Colleges</h2>
                
   
                {/* Empty message when no colleges selected */}
                {selectedColleges.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No colleges selected yet. Click "Select" on any college to add it here.
                  </p>
                ) : (

                  <div className="space-y-3">
                    {selectedColleges.map((id) => {
                      //const college = mockColleges.find((c) => c.id === id);
                      const college = colleges.find((c) => c.id === id);
                      
                      // If no colleges found then return nothing
                      if (!college) return null;

                      {/* Shows all colleges currently selected */}
                      return (
                        <Card key={id} className="p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{college.name}</p>
                              <Badge variant="secondary" className="mt-1">
                                {college.score}%
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
