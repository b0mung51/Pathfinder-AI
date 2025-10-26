import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from '@/lib/supabaseClient';
import { CollegeCard } from '@/components/CollegeCard';
import { CompareDialog } from '@/components/CompareDialog';
import { College } from "@/types/college";
import { useCollegeSelection } from "@/hooks/useCollegeSelection";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { GripVertical } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Sortable College Card Wrapper
function SortableCollegeCard({ 
  college, 
  matchScore, 
  programNames, 
  description, 
  timeline, 
  fit,
  selected,
  onSelect,
  onRemove,
  isOrganizeMode,
  onRemoveProgram,
}: {
  college: College;
  matchScore: number;
  programNames: string[];
  description: string;
  timeline: string[];
  fit?: string;
  selected: boolean;
  onSelect: (id: string) => void;
  onRemove?: (id: string) => Promise<void> | void;
  isOrganizeMode: boolean;
  onRemoveProgram?: (collegeId: string, programId: number | string) => Promise<void> | void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: college.id });

  const savedPrograms = college.savedPrograms ?? [];
  const displayPrograms = savedPrograms.length ? savedPrograms : college.programs ?? [];
  const majorsText = displayPrograms.length
    ? displayPrograms.map((p) => p.name).join(', ')
    : 'Not specified';

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      {/* Show grip icon only in organize mode */}
      {isOrganizeMode && (
        <div className="absolute left-2 top-1/2 -translate-y-1/2 z-10 cursor-grab active:cursor-grabbing" {...attributes} {...listeners}>
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </div>
      )}
      <div className={isOrganizeMode ? "pl-8" : ""}>
        <CollegeCard
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
          majors={majorsText}
          matchScore={matchScore}
          description={description}
          programs={programNames}
          timeline={timeline}
          fit={fit}
          selected={selected}
          onSelect={isOrganizeMode ? undefined : onSelect}
          onRemove={college.isVirtual ? undefined : onRemove}
          savedPrograms={savedPrograms}
          isVirtual={college.isVirtual}
          onRemoveProgram={onRemoveProgram}
        />
      </div>
    </div>
  );
}

export default function CollegeList() {
  const [colleges, setColleges] = useState<College[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOrganizeMode, setIsOrganizeMode] = useState(false);
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

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    let isMounted = true;

    const hydrateProgram = (program: any) => {
      const toNumber = (value: unknown, fallback = 0) => {
        if (typeof value === "number" && Number.isFinite(value)) {
          return value;
        }
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : fallback;
      };

      return {
        ...program,
        id: toNumber(program?.id),
        college_id:
          program?.college_id !== undefined && program?.college_id !== null
            ? String(program.college_id)
            : '',
        name: program?.name ?? '',
        degree_type: program?.degree_type ?? '',
        field_of_study: program?.field_of_study ?? '',
        prestige: toNumber(program?.prestige, 0),
        ranking_in_field: toNumber(program?.ranking_in_field, 0),
        specialty: program?.specialty ?? '',
        notable_features: program?.notable_features ?? '',
        description: program?.description ?? '',
      };
    };

    const fetchColleges = async () => {
      if (!user) {
        if (isMounted) {
          setColleges([]);
          setLoading(false);
        }
        return;
      }

      setLoading(true);

      const { data, error } = await supabase
        .from("saved_colleges")
        .select(`
          match_score,
          colleges:college_id (
            *,
            programs (*)
          )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (!isMounted) {
        return;
      }

      if (error) {
        console.error("Error fetching saved colleges:", error);
        toast({
          title: "Unable to load list",
          description: "We couldn't load your saved colleges. Please try again.",
          variant: "destructive",
        });
        setColleges([]);
        setLoading(false);
        return;
      }

      const collegeMap = new Map<string, College>();
      const ordering: string[] = [];

      data?.forEach((entry) => {
        const rawCollege = entry.colleges;
        if (!rawCollege) {
          return;
        }

        const collegeObj = Array.isArray(rawCollege) ? rawCollege[0] : rawCollege;

        const programs = Array.isArray(collegeObj.programs)
          ? collegeObj.programs.map(hydrateProgram)
          : [];

        const hydrated: College = {
          id: String(collegeObj.id ?? ''),
          name: String(collegeObj.name ?? ''),
          location: String(collegeObj.location ?? ''),
          url: String(collegeObj.url ?? ''),
          average_cost: Number(collegeObj.average_cost ?? 0),
          acceptance_rate: Number(collegeObj.acceptance_rate ?? 0),
          grad_rate: Number(collegeObj.grad_rate ?? 0),
          median_salary: Number(collegeObj.median_salary ?? 0),
          size: Number(collegeObj.size ?? 0),
          ranking: Number(collegeObj.ranking ?? 0),
          matchScore:
            typeof entry.match_score === "number" ? Number(entry.match_score) : undefined,
          programs,
          savedPrograms: [],
          isVirtual: false,
        };

        collegeMap.set(hydrated.id, hydrated);
        ordering.push(hydrated.id);
      });

      const { data: savedProgramsData, error: savedProgramsError } = await supabase
        .from("saved_programs")
        .select(`
          program_id,
          college_id,
          programs:program_id (
            id,
            college_id,
            name,
            degree_type,
            field_of_study,
            prestige,
            ranking_in_field,
            specialty,
            notable_features,
            description
          ),
          colleges:college_id (
            id,
            name,
            location,
            url,
            average_cost,
            acceptance_rate,
            grad_rate,
            median_salary,
            size,
            ranking,
            programs (*)
          )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (savedProgramsError) {
        console.error("Error fetching saved programs:", savedProgramsError);
      } else {
        (savedProgramsData ?? []).forEach((row: any) => {
          const programPayload = Array.isArray(row.programs) ? row.programs[0] : row.programs;
          if (!programPayload) {
            return;
          }

          const hydratedProgram = hydrateProgram(programPayload);
          const collegePayload = Array.isArray(row.colleges) ? row.colleges[0] : row.colleges;
          const collegeId = String(hydratedProgram.college_id ?? row.college_id ?? "");
          if (!collegeId) {
            return;
          }

          let targetCollege = collegeMap.get(collegeId);

          if (!targetCollege) {
            const derivedPrograms = Array.isArray(collegePayload?.programs)
              ? collegePayload.programs.map(hydrateProgram)
              : [];

            const virtualCollege: College = {
              id: collegeId,
              name: String(collegePayload?.name ?? "Unknown College"),
              location: String(collegePayload?.location ?? ""),
              url: String(collegePayload?.url ?? ""),
              average_cost: Number(collegePayload?.average_cost ?? 0),
              acceptance_rate: Number(collegePayload?.acceptance_rate ?? 0),
              grad_rate: Number(collegePayload?.grad_rate ?? 0),
              median_salary: Number(collegePayload?.median_salary ?? 0),
              size: Number(collegePayload?.size ?? 0),
              ranking: Number(collegePayload?.ranking ?? 0),
              matchScore: undefined,
              programs: derivedPrograms,
              savedPrograms: [],
              isVirtual: true,
            };

            collegeMap.set(collegeId, virtualCollege);
            ordering.push(collegeId);
            targetCollege = virtualCollege;
          }

          if (!targetCollege.savedPrograms) {
            targetCollege.savedPrograms = [];
          }

          const alreadyIncluded = targetCollege.savedPrograms.some(
            (program) => program.id === hydratedProgram.id
          );

          if (!alreadyIncluded) {
            targetCollege.savedPrograms.push(hydratedProgram);
          }
        });
      }

      const orderedColleges = ordering
        .map((idValue) => collegeMap.get(idValue))
        .filter((college): college is College => Boolean(college));

      setColleges(orderedColleges);
      setLoading(false);
    };

    void fetchColleges();

    return () => {
      isMounted = false;
    };
  }, [user, toast]);

  const handleRemove = async (id: string) => {
    setColleges((prev) => prev.filter((c) => c.id !== id));
    if (!user) {
      return;
    }

    const { error } = await supabase
      .from("saved_colleges")
      .delete()
      .eq("user_id", user.id)
      .eq("college_id", Number(id));

    if (error) {
      console.error("Failed to remove college", error);
      toast({
        title: "Remove failed",
        description: "We couldn't remove that college. Please refresh and try again.",
        variant: "destructive",
      });
    }
  };

  const handleRemoveProgram = async (collegeId: string, programId: number | string) => {
    const numericProgramId = Number(programId);
    if (!Number.isFinite(numericProgramId)) {
      console.warn("Cannot remove program with non-numeric id", programId);
      return;
    }

    let rollbackState: College[] = [];

    setColleges((prev) => {
      rollbackState = prev;
      const next: College[] = [];

      prev.forEach((college) => {
        if (college.id !== collegeId) {
          next.push(college);
          return;
        }

        const updatedSavedPrograms = (college.savedPrograms ?? []).filter(
          (program) => program.id !== numericProgramId
        );

        if (updatedSavedPrograms.length === 0 && college.isVirtual) {
          // Removing the last program from a virtual college removes the entire card.
          return;
        }

        next.push({
          ...college,
          savedPrograms: updatedSavedPrograms,
        });
      });

      return next;
    });

    if (!user) {
      return;
    }

    const { error } = await supabase
      .from("saved_programs")
      .delete()
      .eq("user_id", user.id)
      .eq("program_id", numericProgramId);

    if (error) {
      console.error("Failed to remove saved program", error);
      toast({
        title: "Remove failed",
        description: "We couldn't remove that program. Please refresh and try again.",
        variant: "destructive",
      });
      setColleges(rollbackState);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setColleges((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const calculateMatchScore = (college: College) => {
    if (typeof college.matchScore === "number") {
      return Math.round(college.matchScore);
    }
    const acceptanceScore = (100 - college.acceptance_rate) * 0.4;
    const costScore = Math.max(0, 100 - (college.average_cost / 1000)) * 0.3;
    const gradScore = college.grad_rate * 0.3;
    return Math.round(acceptanceScore + costScore + gradScore);
  };

  const avgCost = colleges.length > 0 
    ? colleges.reduce((sum, c) => sum + c.average_cost, 0) / colleges.length 
    : 0;

  const avgMatch = colleges.length > 0
    ? colleges.reduce((sum, c) => sum + calculateMatchScore(c), 0) / colleges.length
    : 0;

  if (loading || isAuthenticating) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading your saved colleges...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">My College List</h1>
          <p className="text-muted-foreground">
            {!user
              ? "Sign in to save colleges from the search page and build your personalized list."
              : isOrganizeMode
                ? "Drag cards to reorder and click Remove to delete colleges."
                : "Organize and prioritize the colleges you have saved."
            }
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main List */}
          <div className="lg:col-span-3 space-y-4">
            {colleges.length === 0 ? (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground mb-4">
                  {user
                    ? "You haven't saved any colleges yet. Browse the catalog to build your list."
                    : "No saved colleges to show. Sign in and add schools from the search page."
                  }
                </p>
                <Button variant="hero" asChild>
                  <a href="/search">Browse Colleges</a>
                </Button>
              </Card>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={colleges.map(c => c.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {colleges.map((college) => {
                    const savedPrograms = college.savedPrograms ?? [];
                    const displayPrograms = savedPrograms.length
                      ? savedPrograms
                      : college.programs ?? [];
                    const primaryProgram = displayPrograms[0];
                    const programNames = displayPrograms.map((p) => p.name);
                    const description = primaryProgram?.description || '';
                    const matchScore = calculateMatchScore(college);
                    
                    const timeline = [
                      "Year 1: Complete general education requirements and explore majors",
                      "Year 2: Declare major and begin core coursework",
                      "Year 3: Apply for internships and research opportunities",
                      "Year 4: Complete capstone project and prepare for career/graduate school"
                    ];
                    
                    const fieldOfStudyText = primaryProgram?.field_of_study || "this field";

                    const fit = primaryProgram?.notable_features
                      ? `Strong programs in ${fieldOfStudyText}. ${primaryProgram.notable_features}`
                      : undefined;

                    return (
                      <SortableCollegeCard
                        key={college.id}
                        college={college}
                        matchScore={matchScore}
                        programNames={programNames}
                        description={description}
                        timeline={timeline}
                        fit={fit}
                        selected={selectedColleges.includes(college.id)}
                        onSelect={handleSelect}
                        onRemove={handleRemove}
                        isOrganizeMode={isOrganizeMode}
                        onRemoveProgram={handleRemoveProgram}
                      />
                    );
                  })}
                </SortableContext>
              </DndContext>
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

              {/* Only show selection features when NOT in organize mode */}
              {!isOrganizeMode && selectedColleges.length > 0 && (
                <>
                  <div className="pt-4 border-t">
                    <p className="text-xs text-muted-foreground mb-2">Selected for comparison:</p>
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
                                  {calculateMatchScore(college)}%
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
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <Button
                      variant="hero"
                      className="w-full mb-2"
                      disabled={selectedColleges.length < 2}
                      onClick={() => setCompareDialogOpen(true)}
                    >
                      Compare Selected ({selectedColleges.length})
                    </Button>
                    <Button variant="outline" className="w-full">
                      Export List
                    </Button>
                  </div>
                </>
              )}

              {/* Organize button - always at the bottom */}
              {colleges.length > 0 && (
                <div className="pt-4 border-t">
                  <Button
                    variant={isOrganizeMode ? "destructive" : "outline"}
                    onClick={() => setIsOrganizeMode(!isOrganizeMode)}
                    className="w-full"
                  >
                    {isOrganizeMode ? "Done Organizing" : "Organize"}
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
