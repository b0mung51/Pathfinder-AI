import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MapPin, GraduationCap, TrendingUp, DollarSign, Award, ExternalLink, Check, Loader2 } from "lucide-react";

export interface ProgramCardCollege {
  name?: string | null;
  location?: string | null;
  ranking?: number | null;
  url?: string | null;
  average_cost?: number | null;
  acceptance_rate?: number | null;
  median_salary?: number | null;
}

interface ProgramCardProps {
  id: string;
  name: string;
  degreeType?: string;
  fieldOfStudy?: string;
  specialty?: string;
  description?: string;
  notableFeatures?: string;
  matchScore: number;
  prestige?: number | null;
  rankingInField?: number | null;
  college?: ProgramCardCollege | null;
  onSave?: () => Promise<void> | void;
  isSaving?: boolean;
  isSaved?: boolean;
}

const getMatchColor = (score: number) => {
  if (score >= 80) return "text-green-600";
  if (score >= 60) return "text-blue-600";
  return "text-yellow-600";
};

const getMatchLabel = (score: number) => {
  if (score >= 80) return "Great Fit";
  if (score >= 60) return "Good Fit";
  return "Consider";
};

export function ProgramCard({
  id,
  name,
  degreeType,
  fieldOfStudy,
  specialty,
  description,
  notableFeatures,
  matchScore,
  prestige,
  rankingInField,
  college,
  onSave,
  isSaving = false,
  isSaved = false,
}: ProgramCardProps) {
  const [open, setOpen] = useState(false);

  const formatMoney = (value?: number | null) => {
    if (typeof value !== "number" || Number.isNaN(value)) {
      return null;
    }
    return `$${Math.round(value).toLocaleString()}`;
  };

  const formatRate = (value?: number | null) => {
    if (typeof value !== "number" || Number.isNaN(value)) {
      return null;
    }
    return `${Math.round(value)}%`;
  };

  const averageCostDisplay = formatMoney(college?.average_cost ?? null);
  const acceptanceRateDisplay = formatRate(college?.acceptance_rate ?? null);
  const medianSalaryDisplay = formatMoney(college?.median_salary ?? null);
  const saveDisabled = isSaved || isSaving;

  return (
    <>
      <Card
        onClick={() => setOpen(true)}
        className="p-6 transition-smooth cursor-pointer hover:shadow-card-hover"
        data-testid={`program-card-${id}`}
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex-1 space-y-3">
            <div>
              <h3 className="text-lg font-semibold mb-1">{name}</h3>
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                {degreeType && <Badge variant="secondary">{degreeType}</Badge>}
                {fieldOfStudy && <Badge variant="outline">{fieldOfStudy}</Badge>}
                {specialty && <Badge variant="outline">{specialty}</Badge>}
              </div>
            </div>

            {college?.name && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <GraduationCap className="h-4 w-4" />
                <span>
                  {college.name}
                  {college.location ? ` • ${college.location}` : ""}
                </span>
              </div>
            )}

            {description && <p className="text-sm text-muted-foreground">{description}</p>}

            {notableFeatures && (
              <div className="rounded-md border p-3 text-sm">
                <p className="font-medium">Highlights</p>
                <p className="text-muted-foreground">{notableFeatures}</p>
              </div>
            )}

            <div className="grid gap-3 text-sm md:grid-cols-2">
              {rankingInField !== null && rankingInField !== undefined && (
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Field Ranking:</span>
                  <span>#{rankingInField}</span>
                </div>
              )}
              {prestige !== null && prestige !== undefined && (
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Prestige:</span>
                  <span>{Math.round(prestige)} / 100</span>
                </div>
              )}
              {averageCostDisplay && (
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Avg Cost:</span>
                  <span>{averageCostDisplay}</span>
                </div>
              )}
              {acceptanceRateDisplay && (
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Acceptance:</span>
                  <span>{acceptanceRateDisplay}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-3">
            <Badge variant="secondary" className="whitespace-nowrap">
              {getMatchLabel(matchScore)}
            </Badge>
            <span className={cn("text-lg font-semibold", getMatchColor(matchScore))}>
              {matchScore}% Fit
            </span>
            {college?.location && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{college.location}</span>
              </div>
            )}
            {onSave && (
              <Button
                size="sm"
                variant={isSaved ? "secondary" : "default"}
                disabled={saveDisabled}
                onClick={(event) => {
                  event.stopPropagation();
                  void onSave?.();
                }}
                className="w-36 justify-center"
              >
                {isSaved ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Saved
                  </>
                ) : isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save to list"
                )}
              </Button>
            )}
            {college?.url && (
              <Button
                variant="outline"
                size="sm"
                onClick={(event) => {
                  event.stopPropagation();
                  window.open(college.url as string, "_blank", "noreferrer");
                }}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                College Site
              </Button>
            )}
          </div>
        </div>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl" onOpenAutoFocus={(event) => event.preventDefault()}>
          <DialogHeader>
            <DialogTitle>{name}</DialogTitle>
            <DialogDescription>
              {college?.name ? `${college.name}${college.location ? ` • ${college.location}` : ""}` : "Program details"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="flex flex-wrap gap-2">
              {degreeType && <Badge variant="secondary">{degreeType}</Badge>}
              {fieldOfStudy && <Badge variant="outline">{fieldOfStudy}</Badge>}
              {specialty && <Badge variant="outline">{specialty}</Badge>}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3 text-sm text-muted-foreground">
                {description && <p>{description}</p>}
                {notableFeatures && (
                  <div className="rounded-md border p-3">
                    <p className="font-medium text-foreground">Highlights</p>
                    <p>{notableFeatures}</p>
                  </div>
                )}
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Fit Score:</span>
                  <span className={getMatchColor(matchScore)}>{matchScore}%</span>
                </div>
                {prestige !== null && prestige !== undefined && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Award className="h-4 w-4" />
                    <span className="font-medium text-foreground">Prestige:</span>
                    <span>{Math.round(prestige)} / 100</span>
                  </div>
                )}
                {rankingInField !== null && rankingInField !== undefined && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Award className="h-4 w-4" />
                    <span className="font-medium text-foreground">Field Ranking:</span>
                    <span>#{rankingInField}</span>
                  </div>
                )}
                {college?.ranking && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <GraduationCap className="h-4 w-4" />
                    <span className="font-medium text-foreground">College Ranking:</span>
                    <span>#{college.ranking}</span>
                  </div>
                )}
                {averageCostDisplay && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <DollarSign className="h-4 w-4" />
                    <span className="font-medium text-foreground">Average Cost:</span>
                    <span>{averageCostDisplay}</span>
                  </div>
                )}
                {acceptanceRateDisplay && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <TrendingUp className="h-4 w-4" />
                    <span className="font-medium text-foreground">Acceptance Rate:</span>
                    <span>{acceptanceRateDisplay}</span>
                  </div>
                )}
                {medianSalaryDisplay && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <DollarSign className="h-4 w-4" />
                    <span className="font-medium text-foreground">Median Salary:</span>
                    <span>{medianSalaryDisplay}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <div className="flex w-full items-center justify-between">
              <div className="flex items-center gap-2">
                {onSave && (
                  <Button
                    size="sm"
                    variant={isSaved ? "secondary" : "default"}
                    disabled={saveDisabled}
                    onClick={() => {
                      void onSave?.();
                    }}
                  >
                    {isSaved ? (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Saved
                      </>
                    ) : isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save to list"
                    )}
                  </Button>
                )}
                {college?.url ? (
                  <Button variant="outline" size="sm" asChild>
                    <a href={college.url} target="_blank" rel="noreferrer">
                      Visit College Site
                    </a>
                  </Button>
                ) : null}
              </div>
              <Button onClick={() => setOpen(false)}>Close</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
