import { useState } from 'react';
import { College } from '@/types/college';

export function useCollegeSelection() {
  const [selectedColleges, setSelectedColleges] = useState<string[]>([]);
  const [compareDialogOpen, setCompareDialogOpen] = useState(false);

  const handleSelect = (id: string) => {
    setSelectedColleges((prev) =>
      prev.includes(id)
        ? prev.filter((cid) => cid !== id)
        : [...prev, id]
    );
  };

  const handleRemoveFromCompare = (id: string) => {
    setSelectedColleges((prev) => prev.filter((cid) => cid !== id));
  };

  const getSelectedColleges = (colleges: College[]) => {
    return colleges.filter((c) => selectedColleges.includes(c.id));
  };

  const openCompareDialog = () => setCompareDialogOpen(true);
  const closeCompareDialog = () => setCompareDialogOpen(false);

  return {
    selectedColleges,
    compareDialogOpen,
    handleSelect,
    handleRemoveFromCompare,
    getSelectedColleges,
    openCompareDialog,
    closeCompareDialog,
    setCompareDialogOpen,
  };
}