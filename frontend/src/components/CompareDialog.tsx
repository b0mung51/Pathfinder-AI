import{
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogClose,
} from"@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { MapPin, Users, DollarSign, TrendingUp, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { College, Program } from "@/types/college";

interface CompareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  colleges: College[];
  onRemoveCollege: (id: string) => void;
}

export function CompareDialog({ 
  open, 
  onOpenChange, 
  colleges,
  onRemoveCollege 
}: CompareDialogProps) {
  const getMatchColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-blue-600";
    return "text-yellow-600";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-[95vw] h-[90vh] overflow-hidden p-0"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader className="p-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle>Compare Colleges ({colleges.length})</DialogTitle>
          </div>
          <p className="text-sm text-muted-foreground">
            Scroll horizontally to view all colleges, scroll vertically within each card for details
          </p>
        </DialogHeader>

        {/* Horizontal scroll container */}
        <div className="overflow-x-auto overflow-y-hidden px-6 pb-6">
          <div className="flex gap-4" style={{ minWidth: 'min-content' }}>
            {colleges.map((college) => {
              const programNames = college.programs?.map(p => p.name) || [];
              const description = college.programs?.[0]?.description || '';
              
              return (
                <Card 
                  key={college.id}
                  className="flex-shrink-0 w-[350px] h-[calc(90vh-140px)] flex flex-col"
                >
                  {/* Fixed header */}
                  <div className="p-4 border-b bg-background">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-1">{college.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {college.programs?.[0]?.field_of_study || 'Not specified'}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onRemoveCollege(college.id)}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <Badge 
                      variant="secondary" 
                      className={cn("text-sm", getMatchColor(college.matchScore || 0))}
                    >
                      {college.matchScore}% Match - {college.matchScore >= 80 ? "Great Fit" : college.matchScore >= 60 ? "Good Fit" : "Consider"}
                    </Badge>
                  </div>

                  {/* Scrollable content */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="truncate">{college.location}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span>{college.size.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span>${college.average_cost.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span>Ranking: #{college.ranking}</span>
                      </div>
                    </div>

                    {/* Description */}
                    {description && (
                      <div>
                        <h4 className="text-sm font-semibold mb-2">About</h4>
                        <p className="text-sm text-muted-foreground">{description}</p>
                      </div>
                    )}

                    {/* Key Stats */}
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Key Statistics</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Acceptance Rate:</span>
                          <span className="font-medium">{college.acceptance_rate}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Graduation Rate:</span>
                          <span className="font-medium">{college.grad_rate}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Median Salary:</span>
                          <span className="font-medium">${college.median_salary.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Programs */}
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Top Programs</h4>
                      {programNames.length > 0 ? (
                        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                          {programNames.map((program) => (
                            <li key={program}>{program}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-muted-foreground">No program data available.</p>
                      )}
                    </div>

                    {/* Notable Features */}
                    {college.programs?.[0]?.notable_features && (
                      <div>
                        <h4 className="text-sm font-semibold mb-2">Notable Features</h4>
                        <p className="text-sm text-muted-foreground">
                          {college.programs[0].notable_features}
                        </p>
                      </div>
                    )}

                    {/* Link to official site */}
                    <div className="pt-4 border-t">
                      <a 
                        href={college.url} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="text-sm text-primary hover:underline"
                      >
                        View official website →
                      </a>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}