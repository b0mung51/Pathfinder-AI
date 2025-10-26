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
}: {
  college: College;
  matchScore: number;
  programNames: string[];
  description: string;
  timeline: string[];
  fit?: string;
  selected: boolean;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  isOrganizeMode: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: college.id });

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
          major={college.programs?.[0]?.field_of_study || 'Not specified'}
          matchScore={matchScore}
          description={description}
          programs={programNames}
          timeline={timeline}
          fit={fit}
          selected={selected}
          onSelect={isOrganizeMode ? undefined : onSelect} // Disable select in organize mode
          onRemove={isOrganizeMode ? onRemove : undefined} // Enable remove only in organize mode
        />
      </div>
    </div>
  );
}

export default function CollegeList() {
  const [colleges, setColleges] = useState<College[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOrganizeMode, setIsOrganizeMode] = useState(false);

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
        distance: 8, // Require 8px of movement before dragging starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    async function fetchColleges() {
      console.log('Fetching colleges from Supabase...');
      
      const { data, error } = await supabase
        .from('colleges')
        .select(`
          *,
          programs (*)
        `)
        .order('ranking', { ascending: true });
      
      if (error) {
        console.error('Error fetching colleges:', error);
        setLoading(false);
        return;
      }
      
      console.log('Fetched colleges:', data);
      setColleges(data || []);
      setLoading(false);
    }

    fetchColleges();
  }, []);

  const handleRemove = (id: string) => {
    setColleges(colleges.filter((c) => c.id !== id));
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading colleges...</p>
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
            {isOrganizeMode 
              ? "Drag cards to reorder and click Remove to delete colleges" 
              : "Organize and prioritize your college choices"
            }
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main List */}
          <div className="lg:col-span-3 space-y-4">
            {colleges.length === 0 ? (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground mb-4">
                  No colleges found in database. Add some colleges to get started!
                </p>
                <Button variant="hero">Browse Colleges</Button>
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
                    const programNames = college.programs?.map(p => p.name) || [];
                    const description = college.programs?.[0]?.description || '';
                    const matchScore = calculateMatchScore(college);
                    
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