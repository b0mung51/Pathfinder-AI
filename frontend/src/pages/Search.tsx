import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { CollegeCard } from "@/components/CollegeCard";
import { CompareDialog } from "@/components/CompareDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search as SearchIcon, SlidersHorizontal } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { College, Program } from "@/types/college";
import { useCollegeSelection } from "@/hooks/useCollegeSelection"; 
import { FiltersDialog, FilterValues } from "@/components/FiltersDialog";

export default function Search() {
  // Remove this line - using hook version instead
  // const [selectedColleges, setSelectedColleges] = useState<string[]>([]);
  
  const [colleges, setColleges] = useState<College[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const {
    selectedColleges, // Add this - it was missing!
    compareDialogOpen,
    handleSelect,
    handleRemoveFromCompare,
    getSelectedColleges,
    setCompareDialogOpen,
  } = useCollegeSelection();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<FilterValues>({
    maxCost: 100000,
    minAcceptanceRate: 0,
    maxAcceptanceRate: 100,
    minGradRate: 0,
    location: "",
    minSize: 0,
    maxSize: 100000,
  });
    // Add filter function
  const applyFiltersToColleges = (colleges: College[]) => {
    return colleges.filter((college) => {
      // Cost filter
      if (college.average_cost > filters.maxCost) return false;
      
      // Acceptance rate filter
      if (
        college.acceptance_rate < filters.minAcceptanceRate ||
        college.acceptance_rate > filters.maxAcceptanceRate
      )
        return false;
      
      // Graduation rate filter
      if (college.grad_rate < filters.minGradRate) return false;
      
      // Location filter
      if (
        filters.location &&
        !college.location.toLowerCase().includes(filters.location.toLowerCase())
      )
        return false;
      
      // Size filter
      if (college.size < filters.minSize || college.size > filters.maxSize)
        return false;
      
      return true;
    });
  };

  const handleApplyFilters = (newFilters: FilterValues) => {
    setFilters(newFilters);
  };

  const handleResetFilters = () => {
    setFilters({
      maxCost: 100000,
      minAcceptanceRate: 0,
      maxAcceptanceRate: 100,
      minGradRate: 0,
      location: "",
      minSize: 0,
      maxSize: 100000,
    });
  };

  const calculateMatchScore = (college: College) => {
    const acceptanceScore = (100 - college.acceptance_rate) * 0.4;
    const costScore = Math.max(0, 100 - (college.average_cost / 1000)) * 0.3;
    const gradScore = college.grad_rate * 0.3;
    return Math.round(acceptanceScore + costScore + gradScore);
  };

  useEffect(() => {
    let isActive = true;

    const fetchColleges = async () => {
      const query = searchQuery.trim();

      // If no search query, fetch all colleges
      if (!query) {
        setLoading(true);
        setError(null);

        const { data: collegeData, error: collegeError } = await supabase
          .from("colleges")
          .select(`
            *,
            programs (*)
          `)
          .order('ranking', { ascending: true })
          .limit(20);

        if (!isActive) return;

        if (collegeError) {
          setError("Something went wrong while fetching colleges");
          setLoading(false);
          return;
        }

        const collegesWithScores = collegeData.map((college) => ({
          ...college,
          matchScore: calculateMatchScore(college),
        }));

        setColleges(collegesWithScores);
        setLoading(false);
        return;
      }

      // Search with query
      setLoading(true);
      setError(null);

      const { data: collegeData, error: collegeError } = await supabase
        .from("colleges")
        .select(`
          *,
          programs (*)
        `)
        .ilike("name", `%${query}%`)
        .order('ranking', { ascending: true });

      if (!isActive) return;

      if (collegeError) {
        setError("Something went wrong while fetching results");
        setLoading(false);
        return;
      }

      const collegesWithScores = collegeData.map((college) => ({
        ...college,
        matchScore: calculateMatchScore(college),
      }));

      setColleges(collegesWithScores);
      setLoading(false);
    };

    fetchColleges();

    return () => {
      isActive = false;
    };
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
                  <Button variant="outline" onClick={() => setFiltersOpen(true)}>
                    <SlidersHorizontal className="h-4 w-4 mr-2" />
                    Filters
                  </Button>
              </div>
            </Card>

            {/*Results*/}
            <div className="space-y-4">
              {loading ? (
                <p className="text-muted-foreground text-center py-8">Searching...</p>
              ) : error ? (
                <p className="text-muted-foreground text-center py-8">{error}</p>
              ) : (() => {
                  const filteredColleges = applyFiltersToColleges(colleges);
                  return filteredColleges.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      No colleges match your filters. Try adjusting your criteria.
                    </p>
                  ) : (
                    filteredColleges.map((college) => {
                      const programNames = college.programs?.map(p => p.name) || [];
                      const description = college.programs?.[0]?.description || '';
                      
                      const timeline = [
                        "Year 1: Complete general education requirements and explore majors",
                        "Year 2: Declare major and begin core coursework",
                        "Year 3: Apply for internships and research opportunities",
                        "Year 4: Complete capstone project and prepare for career/graduate school"
                      ];
                      
                      const fit = college.programs?.[0]?.notable_features 
                        ? `Strong programs in ${college.programs[0].field_of_study}. ${college.programs[0].notable_features}`
                        : undefined;

                      return (
                        <CollegeCard
                          key={college.id}
                          id={college.id}
                          name={college.name}
                          location={college.location}
                          ranking={college.ranking}
                          url={college.url}
                          gradRate={college.grad_rate}
                          averageCost={college.average_cost}
                          acceptanceRate={college.acceptance_rate}
                          medianSalary={college.median_salary}
                          size={college.size}
                          major={college.programs?.[0]?.field_of_study || 'Not specified'}
                          matchScore={college.matchScore || 75}
                          description={description}
                          programs={programNames}
                          timeline={timeline}
                          fit={fit}
                          selected={selectedColleges.includes(college.id)}
                          onSelect={handleSelect}
                        />
                      );
                    })
                  );
                })() // Added closing parentheses and () to invoke the function
              }
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
                    const college = colleges.find((c) => c.id === id);
                    if (!college) return null;
                    return (
                      <Card key={id} className="p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{college.name}</p>
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
                    onClick={() => setCompareDialogOpen(true)}
                  >
                    Compare ({selectedColleges.length})
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    disabled={selectedColleges.length === 0}
                  >
                    Save ({selectedColleges.length})
                  </Button>
                </div>
              )}
            </Card>
          </div>
        </div>
      </main>
      
      {/* Compare Dialog */}
      <CompareDialog
        open={compareDialogOpen}
        onOpenChange={setCompareDialogOpen}
        colleges={getSelectedColleges(colleges)}
        onRemoveCollege={handleRemoveFromCompare}
      />
      {/* Filters Dialog */}
      <FiltersDialog
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        filters={filters}
        onApplyFilters={handleApplyFilters}
        onResetFilters={handleResetFilters}
      />
    </div>
  );
}