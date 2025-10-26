import { useEffect, useMemo, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { CollegeCard } from "@/components/CollegeCard";
import { CompareDialog } from "@/components/CompareDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Search as SearchIcon, SlidersHorizontal } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { College, Program } from "@/types/college";
import { useCollegeSelection } from "@/hooks/useCollegeSelection";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type SortOption = "match-desc" | "match-asc" | "ranking-asc" | "ranking-desc";

export default function Search() {
  const [colleges, setColleges] = useState<College[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [minFitScore, setMinFitScore] = useState(0);
  const [sortOption, setSortOption] = useState<SortOption>("match-desc");
  const { user, isAuthenticating } = useAuth();
  const { toast } = useToast();

  const {
    selectedColleges,
    compareDialogOpen,
    handleSelect,
    handleRemoveFromCompare,
    getSelectedColleges,
    setCompareDialogOpen,
  } = useCollegeSelection();

  const calculateMatchScore = (college: College) => {
    const acceptanceScore = (100 - college.acceptance_rate) * 0.4;
    const costScore = Math.max(0, 100 - (college.average_cost / 1000)) * 0.3;
    const gradScore = college.grad_rate * 0.3;
    return Math.round(acceptanceScore + costScore + gradScore);
  };

  const handleResetFilters = () => {
    setMinFitScore(0);
    setSortOption("match-desc");
  };

  const filteredColleges = useMemo(() => {
    const threshold = Math.max(0, Math.min(100, minFitScore));

    const getMatchScore = (college: College) =>
      typeof college.matchScore === "number" ? college.matchScore : calculateMatchScore(college);

    const matches = colleges.filter((college) => getMatchScore(college) >= threshold);

    const sorted = [...matches].sort((a, b) => {
      const scoreA = getMatchScore(a);
      const scoreB = getMatchScore(b);

      switch (sortOption) {
        case "match-asc":
          return scoreA - scoreB;
        case "ranking-asc":
          return (a.ranking ?? Number.MAX_SAFE_INTEGER) - (b.ranking ?? Number.MAX_SAFE_INTEGER);
        case "ranking-desc":
          return (b.ranking ?? Number.MAX_SAFE_INTEGER) - (a.ranking ?? Number.MAX_SAFE_INTEGER);
        case "match-desc":
        default:
          return scoreB - scoreA;
      }
    });

    return sorted;
  }, [colleges, minFitScore, sortOption]);

  const hasScoreFilter = minFitScore > 0;

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
                <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="gap-2">
                      <SlidersHorizontal className="h-4 w-4" />
                      <span>Filters</span>
                      {(hasScoreFilter || sortOption !== "match-desc") && (
                        <span className="h-2 w-2 rounded-full bg-primary" />
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80" align="end" side="bottom">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm font-medium">
                          <span>Minimum fit score</span>
                          <span className="text-muted-foreground">{minFitScore}%</span>
                        </div>
                        <Slider
                          value={[minFitScore]}
                          min={0}
                          max={100}
                          step={5}
                          onValueChange={(value) => setMinFitScore(value[0] ?? 0)}
                          aria-label="Minimum fit score"
                        />
                      </div>
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">Sort results</Label>
                        <RadioGroup
                          value={sortOption}
                          onValueChange={(value) => setSortOption(value as SortOption)}
                          className="space-y-2"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="match-desc" id="sort-match-desc" />
                            <Label htmlFor="sort-match-desc" className="text-sm leading-none">
                              Match score (high to low)
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="match-asc" id="sort-match-asc" />
                            <Label htmlFor="sort-match-asc" className="text-sm leading-none">
                              Match score (low to high)
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="ranking-asc" id="sort-ranking-asc" />
                            <Label htmlFor="sort-ranking-asc" className="text-sm leading-none">
                              Ranking (best to worst)
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="ranking-desc" id="sort-ranking-desc" />
                            <Label htmlFor="sort-ranking-desc" className="text-sm leading-none">
                              Ranking (worst to best)
                            </Label>
                          </div>
                        </RadioGroup>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t">
                        <Button variant="ghost" size="sm" onClick={handleResetFilters}>
                          Reset
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => setFiltersOpen(false)}
                        >
                          Done
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </Card>

            {/* Results */}
            <div className="space-y-4">
              {loading ? (
                <p className="text-muted-foreground text-center py-8">Searching...</p>
              ) : error ? (
                <p className="text-muted-foreground text-center py-8">{error}</p>
              ) : filteredColleges.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  {colleges.length === 0
                    ? "No colleges found. Try a different search term."
                    : "No colleges match your filters. Adjust your filter settings and try again."}
                </p>
              ) : (
                filteredColleges.map((college) => {
                  const programNames = college.programs?.map(p => p.name) || [];
                  const description = college.programs?.[0]?.description || '';
                  const calculatedMatch =
                    typeof college.matchScore === "number"
                      ? college.matchScore
                      : calculateMatchScore(college);
                  
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
                      majors={college.programs?.map(p => p.name).join(', ') || 'Not specified'}
                      matchScore={calculatedMatch}
                      description={description}
                      programs={programNames}
                      timeline={timeline}
                      fit={fit}
                      selected={selectedColleges.includes(college.id)}
                      onSelect={handleSelect}
                    />
                  );
                })
              )}
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
                            <Badge variant="secondary" className="mt-1">
                              {(college.matchScore ?? calculateMatchScore(college))}%
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
                    onClick={() => setCompareDialogOpen(true)}
                  >
                    Compare ({selectedColleges.length})
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    disabled={selectedColleges.length === 0 || !user || isSaving || isAuthenticating}
                    onClick={async () => {
                      if (!user) {
                        toast({
                          title: "Sign in required",
                          description: "Please sign in to save colleges to your list.",
                          variant: "destructive",
                        });
                        return;
                      }

                      const payload = selectedColleges
                        .map((id) => {
                          const college = colleges.find((c) => c.id === id);
                          if (!college) {
                            return null;
                          }
                          return {
                            user_id: user.id,
                            college_id: Number(college.id),
                            match_score: college.matchScore ?? null,
                          };
                        })
                        .filter((entry): entry is { user_id: string; college_id: number; match_score: number | null } => Boolean(entry));

                      if (payload.length === 0) {
                        toast({
                          title: "No colleges to save",
                          description: "Select at least one college to add to your list.",
                          variant: "destructive",
                        });
                        return;
                      }

                      setIsSaving(true);
                      const { error: saveError } = await supabase
                        .from("saved_colleges")
                        .upsert(payload, { onConflict: "user_id,college_id" });
                      setIsSaving(false);

                      if (saveError) {
                        console.error("Failed to save colleges", saveError);
                        toast({
                          title: "Save failed",
                          description: "We couldn't save your colleges. Please try again.",
                          variant: "destructive",
                        });
                        return;
                      }

                      toast({
                        title: "Colleges saved",
                        description: "Your selections are now in My List.",
                      });
                    }}
                  >
                    {isSaving ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving...
                      </span>
                    ) : (
                      <>Save ({selectedColleges.length})</>
                    )}
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
    </div>
  );
}
