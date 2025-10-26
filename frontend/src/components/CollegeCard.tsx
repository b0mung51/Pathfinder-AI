import { MapPin, Users, DollarSign, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useState } from "react";
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
  averageCost: string;
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
  //onRemove?: (id: string) => void;
  className?: string;
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
  //onRemove,
  className,
}: CollegeCardProps) {
  const getMatchColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-blue-600";
    return "text-yellow-600";
  };
  const [open, setOpen] = useState(false);

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
          {/* College and Major Title */}
          <div>
            <h3 className="text-lg font-semibold mb-1">{name}</h3>
            <p className="text-sm text-muted-foreground">{majors}</p>
          </div>

          {/* Location Title */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{location}</span>
            </div>

            {/* Student Population */}
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>{size}</span>
            </div>

            {/* Average Cost to Attend */}
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span>{averageCost}</span>
            </div>

            {/* Match Percent Score */}
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className={cn("font-semibold", getMatchColor(matchScore))}>
                {matchScore}% Match
              </span>
            </div>

          </div>
        </div>

        {/* Match Comparison Stuff */}
        <div className="flex flex-col gap-2">
          <Badge variant="secondary" className="whitespace-nowrap">
            {matchScore >= 80 ? "Great Fit" : matchScore >= 60 ? "Good Fit" : "Consider"}
          </Badge>
          {onSelect && (
            <Button
              size="sm"
              variant={selected ? "destructive" : "default"}
              onClick={(e) => {
                e.stopPropagation(); // Prevent card click event
                if (onSelect) onSelect(id);
              }}
            >
              {selected ? "Unselect" : "Select"}
            </Button>
          )}
          {/* {onRemove && (
            <Button
              size="sm"
              variant="destructive"
              onClick={(e) => {
                e.stopPropagation(); // Prevent card click event
                if (onRemove) onRemove(id);
              }}
            >
              Remove
            </Button>
          )} */}
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
