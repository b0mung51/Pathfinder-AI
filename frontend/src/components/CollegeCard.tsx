import { MapPin, Users, DollarSign, TrendingUp, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { MouseEvent, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { College, Program } from "@/types/college";

interface CollegeCardProps {
  id: string;
  name: string;
  location: string;
  ranking: number;
  url: string;
  gradRate: number;
  averageCost: number;
  acceptanceRate: number;
  medianSalary: number;
  size: number;
  majors: string;
  matchScore: number;
  // Optional extended details for the modal
  description?: string;
  programs?: string[];
  timeline?: string[]; // e.g. ["Year 1: Explore majors", "Year 2: Apply to internships"]
  fit?: string; // textual fit information
  selected?: boolean;
  onSelect?: (id: string) => void;
  onRemove?: (id: string) => Promise<void> | void;
  onRemoveProgram?: (collegeId: string, programId: number | string) => Promise<void> | void;
  className?: string;
  savedPrograms?: Program[];
  isVirtual?: boolean;
}

export function CollegeCard({
  id,
  name,
  location,
  ranking,
  url,
  gradRate,
  averageCost,
  acceptanceRate,
  medianSalary,
  size,
  majors,
  matchScore,
  description,
  programs,
  timeline,
  fit,
  selected,
  onSelect,
  onRemove,
  onRemoveProgram,
  className,
  savedPrograms,
  isVirtual,
}: CollegeCardProps) {
  const getMatchColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-blue-600";
    return "text-yellow-600";
  };
  const [open, setOpen] = useState(false);
  const [removingProgramId, setRemovingProgramId] = useState<number | string | null>(null);

  const hasSavedPrograms = Array.isArray(savedPrograms) && savedPrograms.length > 0;

  const handleProgramRemove = async (
    event: MouseEvent<HTMLButtonElement>,
    program: Program
  ) => {
    event.stopPropagation();
    if (!onRemoveProgram) {
      return;
    }

    setRemovingProgramId(program.id);
    try {
      await onRemoveProgram(id, program.id);
    } catch (error) {
      console.error("Failed to remove saved program", error);
    } finally {
      setRemovingProgramId(null);
    }
  };

  return (
    <>
      <Card
        onClick={() => setOpen(true)}
        className={cn(
          "p-6 transition-smooth hover:shadow-card-hover cursor-pointer",
          selected && "ring-2 ring-primary",
          className
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-3">
            <div>
              <h3 className="text-lg font-semibold mb-1">{name}</h3>
              <p className="text-sm text-muted-foreground">{majors}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{location}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>{size}</span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span>{averageCost}</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span className={cn("font-semibold", getMatchColor(matchScore))}>
                  {matchScore}% Match
                </span>
              </div>
            </div>

            {hasSavedPrograms && (
              <div className="mt-4 rounded-md border p-4">
                <h4 className="text-sm font-semibold mb-2">Saved Programs</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {savedPrograms!.map((program) => (
                    <li key={program.id} className="flex items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-foreground">{program.name}</span>
                        {program.degree_type && <Badge variant="outline">{program.degree_type}</Badge>}
                        {program.field_of_study && <Badge variant="outline">{program.field_of_study}</Badge>}
                        {program.specialty && <Badge variant="secondary">{program.specialty}</Badge>}
                      </div>
                      {onRemoveProgram && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={(event) => handleProgramRemove(event, program)}
                          disabled={removingProgramId === program.id}
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Remove saved program</span>
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="flex flex-col items-end gap-2">
            <Badge variant="secondary" className="whitespace-nowrap">
              {matchScore >= 80 ? "Great Fit" : matchScore >= 60 ? "Good Fit" : "Consider"}
            </Badge>
            {onSelect && (
              <Button
                size="sm"
                variant={selected ? "destructive" : "default"}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(id);
                }}
              >
                {selected ? "Unselect" : "Select"}
              </Button>
            )}
            {onRemove && !isVirtual && (
              <Button
                size="sm"
                variant="destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  void onRemove(id);
                }}
              >
                Delete
              </Button>
            )}
          </div>
        </div>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent 
          className="max-w-6xl overflow-auto"
          style={{maxHeight: '90vh'}}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>{name}</DialogTitle>
            <DialogDescription asChild>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>{location}</span>
                <span>•</span>
                <span>Acceptance: {acceptanceRate}%</span>
                <span>•</span>
                <span>Avg Cost: {averageCost}</span>
              </div>
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {description && <p className="text-sm text-muted-foreground">{description}</p>}

            {hasSavedPrograms && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold">Your Saved Programs</h4>
                <div className="space-y-3">
                  {savedPrograms!.map((program) => (
                    <div key={program.id} className="rounded-md border p-3 text-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 space-y-2">
                          <div className="flex flex-wrap items-center gap-2 text-foreground">
                            <span className="font-medium">{program.name}</span>
                            {program.degree_type && <Badge variant="secondary">{program.degree_type}</Badge>}
                            {program.field_of_study && <Badge variant="outline">{program.field_of_study}</Badge>}
                            {program.specialty && <Badge variant="outline">{program.specialty}</Badge>}
                          </div>
                          {program.description && (
                            <p className="text-muted-foreground">{program.description}</p>
                          )}
                          {program.notable_features && (
                            <p className="text-muted-foreground">Highlights: {program.notable_features}</p>
                          )}
                        </div>
                        {onRemoveProgram && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={(event) => handleProgramRemove(event, program)}
                            disabled={removingProgramId === program.id}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Remove saved program</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                {/* Programs */}
                <h4 className="text-sm font-semibold mb-2">Top Programs</h4>
                {/* If programs exist, show all programs */}
                {majors && majors.length > 0 ? (
                  <div className="list-disc list-inside text-sm">
                    <span>{majors}</span>
                  </div>
                ) : (
                  // Message if no programs exist
                  <p className="text-sm text-muted-foreground">No program data available.</p>
                )}
              </div>

              {/* College Specifics */}
              <div>
                <h4 className="text-sm font-semibold mb-2">Fit & Stats</h4>
                <div className="text-sm text-muted-foreground space-y-1">
                  <div>Match: <span className={cn("font-semibold", getMatchColor(matchScore))}>{matchScore}%</span></div>
                  <div>Graduation Rate: {gradRate}%</div>
                  <div>Median Salary: ${medianSalary}</div>
                  <div>Ranking: #{ranking}</div>
                  {fit && <div>Fit: {fit}</div>}
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div>
              <h4 className="text-sm font-semibold mb-2">Suggested Timeline</h4>
              {timeline && timeline.length > 0 ? (
                <div className="list-decimal list-inside text-sm">
                  {/* List of steps for the timeline */}
                  {timeline.map((t, i) => (
                    <p key={i}>{t}</p>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No timeline provided.</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <div className="flex items-center gap-2 w-full justify-between">
              <a href={url} target="_blank" rel="noreferrer" className="text-sm underline">
                View official site
              </a>
            </div>
          </DialogFooter>
          </DialogContent>
      </Dialog>
    </>
  );
}
