import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";

export interface FilterValues {
  maxCost: number;
  minAcceptanceRate: number;
  maxAcceptanceRate: number;
  minGradRate: number;
  location: string;
  minSize: number;
  maxSize: number;
}

interface FiltersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: FilterValues;
  onApplyFilters: (filters: FilterValues) => void;
  onResetFilters: () => void;
}

export function FiltersDialog({
  open,
  onOpenChange,
  filters,
  onApplyFilters,
  onResetFilters,
}: FiltersDialogProps) {
  const [localFilters, setLocalFilters] = useState<FilterValues>(filters);

  const handleApply = () => {
    onApplyFilters(localFilters);
    onOpenChange(false);
  };

  const handleReset = () => {
    onResetFilters();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Filter Colleges</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Cost Filter */}
          <div className="space-y-2">
            <Label>Maximum Cost (per year)</Label>
            <div className="flex items-center gap-4">
              <Slider
                value={[localFilters.maxCost]}
                onValueChange={(value) =>
                  setLocalFilters({ ...localFilters, maxCost: value[0] })
                }
                min={0}
                max={100000}
                step={5000}
                className="flex-1"
              />
              <span className="text-sm font-medium w-24">
                ${localFilters.maxCost.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Acceptance Rate Filter */}
          <div className="space-y-2">
            <Label>Acceptance Rate Range (%)</Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Min</Label>
                <Input
                  type="number"
                  value={localFilters.minAcceptanceRate}
                  onChange={(e) =>
                    setLocalFilters({
                      ...localFilters,
                      minAcceptanceRate: Number(e.target.value),
                    })
                  }
                  min={0}
                  max={100}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Max</Label>
                <Input
                  type="number"
                  value={localFilters.maxAcceptanceRate}
                  onChange={(e) =>
                    setLocalFilters({
                      ...localFilters,
                      maxAcceptanceRate: Number(e.target.value),
                    })
                  }
                  min={0}
                  max={100}
                />
              </div>
            </div>
          </div>

          {/* Graduation Rate Filter */}
          <div className="space-y-2">
            <Label>Minimum Graduation Rate (%)</Label>
            <div className="flex items-center gap-4">
              <Slider
                value={[localFilters.minGradRate]}
                onValueChange={(value) =>
                  setLocalFilters({ ...localFilters, minGradRate: value[0] })
                }
                min={0}
                max={100}
                step={5}
                className="flex-1"
              />
              <span className="text-sm font-medium w-16">
                {localFilters.minGradRate}%
              </span>
            </div>
          </div>

          {/* Location Filter */}
          <div className="space-y-2">
            <Label>Location (State/City)</Label>
            <Input
              placeholder="e.g. California, Boston"
              value={localFilters.location}
              onChange={(e) =>
                setLocalFilters({ ...localFilters, location: e.target.value })
              }
            />
          </div>

          {/* School Size Filter */}
          <div className="space-y-2">
            <Label>School Size (Students)</Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Min</Label>
                <Input
                  type="number"
                  value={localFilters.minSize}
                  onChange={(e) =>
                    setLocalFilters({
                      ...localFilters,
                      minSize: Number(e.target.value),
                    })
                  }
                  min={0}
                  placeholder="0"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Max</Label>
                <Input
                  type="number"
                  value={localFilters.maxSize}
                  onChange={(e) =>
                    setLocalFilters({
                      ...localFilters,
                      maxSize: Number(e.target.value),
                    })
                  }
                  min={0}
                  placeholder="No limit"
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={handleReset}>
            Reset Filters
          </Button>
          <DialogClose asChild>
            <Button variant="ghost">Cancel</Button>
          </DialogClose>
          <Button variant="default" onClick={handleApply}>
            Apply Filters
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}