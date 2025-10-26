import { useCallback, useEffect, useMemo, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/lib/supabaseClient";
import { Program } from "@/types/college";
import { Search as SearchIcon, SlidersHorizontal } from "lucide-react";
import { ProgramCard } from "@/components/ProgramCard";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

import type { College } from "@/types/college";

const DEFAULT_LIMIT = 30;

type SortOption = "match-desc" | "match-asc" | "ranking-asc" | "ranking-desc";

type CollegeSummary = Pick<
  College,
  "id" | "name" | "location" | "ranking" | "url" | "average_cost" | "acceptance_rate" | "median_salary"
> & { size?: number | null };

const toNumericId = (value: unknown): number | null => {
  if (value === null || value === undefined) {
    return null;
  }
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

type ProgramResult = {
  id: string;
  name: string;
  degree_type: string;
  field_of_study: string;
  specialty: string;
  notable_features: string;
  description: string;
  prestige: number | null;
  ranking_in_field: number | null;
  matchScore: number;
  college: CollegeSummary | null;
  rawProgramId: number | null;
  rawCollegeId: number | null;
};

const calculateProgramMatch = (program: Program): number => {
  const prestigeScore = typeof program.prestige === "number" && !Number.isNaN(program.prestige)
    ? Math.max(0, Math.min(100, program.prestige))
    : 60;
  const rankingRaw = typeof program.ranking_in_field === "number" && !Number.isNaN(program.ranking_in_field)
    ? program.ranking_in_field
    : 50;
  const rankingScore = Math.max(0, Math.min(100, 100 - rankingRaw));
  const weighted = prestigeScore * 0.6 + rankingScore * 0.4;
  return Math.max(0, Math.min(100, Math.round(weighted)));
};

const normalizeCollege = (input: unknown): CollegeSummary | null => {
  if (!input) {
    return null;
  }

  const college = Array.isArray(input) ? input[0] : input;
  if (!college) {
    return null;
  }

  return {
    id: String(college.id ?? ""),
    name: college.name ?? "Unknown College",
    location: college.location ?? "",
    ranking: typeof college.ranking === "number" ? college.ranking : null,
    url: college.url ?? "",
    average_cost: typeof college.average_cost === "number" ? college.average_cost : 0,
    acceptance_rate: typeof college.acceptance_rate === "number" ? college.acceptance_rate : 0,
    median_salary: typeof college.median_salary === "number" ? college.median_salary : 0,
    size: typeof college.size === "number" ? college.size : null,
  };
};

export default function ProgramSearch() {
  const [programs, setPrograms] = useState<ProgramResult[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [minFitScore, setMinFitScore] = useState(0);
  const [sortOption, setSortOption] = useState<SortOption>("match-desc");
  const [savedProgramIds, setSavedProgramIds] = useState<Set<string>>(new Set());
  const [savingProgramId, setSavingProgramId] = useState<string | null>(null);
  const { user, isAuthenticating } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    let isActive = true;

    const fetchPrograms = async () => {
      setLoading(true);
      setError(null);

      const query = searchQuery.trim();

      const baseQuery = supabase
        .from("programs")
        .select(
          `*,
          colleges:college_id (
            id,
            name,
            location,
            ranking,
            url,
            grad_rate,
            average_cost,
            acceptance_rate,
            median_salary,
            size
          )
        `
        )
        .limit(DEFAULT_LIMIT);

      const response = query
        ? await baseQuery.ilike("name", `%${query}%`).order("ranking_in_field", { ascending: true })
        : await baseQuery.order("prestige", { ascending: false });

      if (!isActive) {
        return;
      }

      if (response.error) {
        console.error("Failed to fetch programs", response.error);
        setError("Something went wrong while fetching programs.");
        setPrograms([]);
        setLoading(false);
        return;
      }

      const normalized: ProgramResult[] =
        response.data?.map((entry) => {
          const rawProgramId = toNumericId((entry as Program).id);
          const rawCollegeId = toNumericId((entry as Program).college_id);
          const matchScore = calculateProgramMatch(entry as Program);
          const college = normalizeCollege((entry as Record<string, unknown>).colleges);

          return {
            id:
              rawProgramId !== null
                ? String(rawProgramId)
                : String(entry.id ?? crypto.randomUUID()),
            name: entry.name ?? "Unnamed Program",
            degree_type: entry.degree_type ?? "",
            field_of_study: entry.field_of_study ?? "",
            specialty: entry.specialty ?? "",
            notable_features: entry.notable_features ?? "",
            description: entry.description ?? "",
            prestige:
              typeof entry.prestige === "number" && !Number.isNaN(entry.prestige)
                ? entry.prestige
                : null,
            ranking_in_field:
              typeof entry.ranking_in_field === "number" && !Number.isNaN(entry.ranking_in_field)
                ? entry.ranking_in_field
                : null,
            matchScore,
            college,
            rawProgramId,
            rawCollegeId,
          };
        }) ?? [];

      setPrograms(normalized);
      setLoading(false);
    };

    void fetchPrograms();

    return () => {
      isActive = false;
    };
  }, [searchQuery]);

  const handleResetFilters = () => {
    setMinFitScore(0);
    setSortOption("match-desc");
  };

  const filteredPrograms = useMemo(() => {
    const threshold = Math.max(0, Math.min(100, minFitScore));

    const matches = programs.filter((program) => program.matchScore >= threshold);

    return [...matches].sort((a, b) => {
      switch (sortOption) {
        case "match-asc":
          return a.matchScore - b.matchScore;
        case "ranking-asc": {
          const rankA = typeof a.ranking_in_field === "number" ? a.ranking_in_field : Number.MAX_SAFE_INTEGER;
          const rankB = typeof b.ranking_in_field === "number" ? b.ranking_in_field : Number.MAX_SAFE_INTEGER;
          return rankA - rankB;
        }
        case "ranking-desc": {
          const rankA = typeof a.ranking_in_field === "number" ? a.ranking_in_field : Number.MAX_SAFE_INTEGER;
          const rankB = typeof b.ranking_in_field === "number" ? b.ranking_in_field : Number.MAX_SAFE_INTEGER;
          return rankB - rankA;
        }
        case "match-desc":
        default:
          return b.matchScore - a.matchScore;
      }
    });
  }, [programs, minFitScore, sortOption]);

  const hasActiveFilters = minFitScore > 0 || sortOption !== "match-desc";

  useEffect(() => {
    if (!user) {
      setSavedProgramIds(new Set());
      return;
    }

    let isMounted = true;

    const loadSavedPrograms = async () => {
      const { data, error } = await supabase
        .from("saved_programs")
        .select("program_id")
        .eq("user_id", user.id);

      if (!isMounted) {
        return;
      }

      if (error) {
        console.error("Failed to load saved programs", error);
        return;
      }

      const ids = new Set((data ?? []).map((row) => String(row.program_id)));
      setSavedProgramIds(ids);
    };

    void loadSavedPrograms();

    return () => {
      isMounted = false;
    };
  }, [user]);

  const handleSaveProgram = useCallback(
    async (program: ProgramResult) => {
      if (!user) {
        toast({
          title: "Sign in required",
          description: "Please sign in to save programs to your list.",
          variant: "destructive",
        });
        return;
      }

      if (isAuthenticating) {
        return;
      }

      if (savedProgramIds.has(program.id)) {
        return;
      }

      const numericProgramId = program.rawProgramId ?? toNumericId(program.id);

      if (numericProgramId === null) {
        toast({
          title: "Unable to save program",
          description: "This program has an invalid identifier.",
          variant: "destructive",
        });
        return;
      }

      const numericCollegeId = program.rawCollegeId ?? toNumericId(program.college?.id);

      if (numericCollegeId === null) {
        toast({
          title: "Unable to save program",
          description: "We couldn't determine the associated college for this program.",
          variant: "destructive",
        });
        return;
      }

      setSavingProgramId(program.id);

      const payload = {
        user_id: user.id,
        program_id: numericProgramId,
        college_id: numericCollegeId,
      };

      const { data: existing, error: lookupError } = await supabase
        .from("saved_programs")
        .select("id")
        .eq("user_id", user.id)
        .eq("program_id", numericProgramId)
        .maybeSingle();

      if (lookupError) {
        console.error("Failed to check existing saved program", lookupError);
        setSavingProgramId(null);
        toast({
          title: "Save failed",
          description: "We couldn't verify your saved programs. Please try again.",
          variant: "destructive",
        });
        return;
      }

      if (!existing) {
        const { error: insertError } = await supabase
          .from("saved_programs")
          .insert(payload);

        if (insertError) {
          console.error("Failed to save program", insertError);
          setSavingProgramId(null);
          toast({
            title: "Save failed",
            description: "We couldn't save this program. Please try again.",
            variant: "destructive",
          });
          return;
        }
      }

      setSavedProgramIds((previous) => {
        const next = new Set(previous);
        next.add(program.id);
        return next;
      });

      setSavingProgramId(null);

      toast({
        title: "Program saved",
        description: `${program.name} was added to your list.`,
      });
    },
    [user, isAuthenticating, savedProgramIds, toast]
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Program Search</h1>
          <p className="text-muted-foreground">
            Explore specific programs across colleges and find the best academic fit for you.
          </p>
        </div>

        <div className="space-y-6">
          <Card className="p-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-muted-foreground" />
                <Input
                  placeholder="Search programs by name..."
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="pl-9"
                />
              </div>
              <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <SlidersHorizontal className="h-4 w-4" />
                    <span>Filters</span>
                    {hasActiveFilters && <span className="h-2 w-2 rounded-full bg-primary" />}
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
                          <RadioGroupItem value="match-desc" id="prog-sort-match-desc" />
                          <Label htmlFor="prog-sort-match-desc" className="text-sm leading-none">
                            Fit score (high to low)
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="match-asc" id="prog-sort-match-asc" />
                          <Label htmlFor="prog-sort-match-asc" className="text-sm leading-none">
                            Fit score (low to high)
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="ranking-asc" id="prog-sort-ranking-asc" />
                          <Label htmlFor="prog-sort-ranking-asc" className="text-sm leading-none">
                            Field ranking (best to worst)
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="ranking-desc" id="prog-sort-ranking-desc" />
                          <Label htmlFor="prog-sort-ranking-desc" className="text-sm leading-none">
                            Field ranking (worst to best)
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>

                    <div className="flex items-center justify-between border-t pt-2">
                      <Button variant="ghost" size="sm" onClick={handleResetFilters}>
                        Reset
                      </Button>
                      <Button size="sm" onClick={() => setFiltersOpen(false)}>
                        Done
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </Card>

          <div className="space-y-4">
            {loading ? (
              <p className="py-8 text-center text-muted-foreground">Searching programs...</p>
            ) : error ? (
              <p className="py-8 text-center text-muted-foreground">{error}</p>
            ) : filteredPrograms.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">
                {programs.length === 0
                  ? "No programs found. Try a different search term."
                  : "No programs match your filters. Adjust your filters and try again."}
              </p>
            ) : (
              filteredPrograms.map((program) => (
                <ProgramCard
                  key={program.id}
                  id={program.id}
                  name={program.name}
                  degreeType={program.degree_type}
                  fieldOfStudy={program.field_of_study}
                  specialty={program.specialty}
                  description={program.description}
                  notableFeatures={program.notable_features}
                  matchScore={program.matchScore}
                  prestige={program.prestige}
                  rankingInField={program.ranking_in_field}
                  college={program.college}
                  onSave={() => handleSaveProgram(program)}
                  isSaving={savingProgramId === program.id}
                  isSaved={savedProgramIds.has(program.id)}
                />
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
