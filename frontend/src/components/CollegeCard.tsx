import { MapPin, Users, DollarSign, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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
  major: string;
  matchScore: number;
  selected?: boolean;
  onSelect?: (id: string) => void;
  onRemove?: (id: string) => void;
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
  major,
  matchScore,
  selected,
  onSelect,
  onRemove,
  className,
}: CollegeCardProps) {
  const getMatchColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-blue-600";
    return "text-yellow-600";
  };

  return (
    <Card
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
            <p className="text-sm text-muted-foreground">{major}</p>
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
        </div>

        <div className="flex flex-col gap-2">
          <Badge variant="secondary" className="whitespace-nowrap">
            {matchScore >= 80 ? "Great Fit" : matchScore >= 60 ? "Good Fit" : "Consider"}
          </Badge>
          {onSelect && (
            <Button
              size="sm"
              variant={selected ? "outline" : "default"}
              onClick={() => onSelect(id)}
            >
              {selected ? "Selected" : "Select"}
            </Button>
          )}
          {onRemove && (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => onRemove(id)}
            >
              Remove
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
