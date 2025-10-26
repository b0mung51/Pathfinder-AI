import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from '@/lib/supabaseClient';
import { CollegeCard } from '@/components/CollegeCard';

interface Program {
  id: number;
  name: string;
  degree_type: string;
  field_of_study: string;
  prestige: number;
  ranking_in_field: number;
  specialty: string;
  notable_features: string;
  description: string;
}

interface College {
  id: string;
  name: string;
  location: string;
  ranking: number;
  url: string;
  grad_rate: number;
  average_cost: number;
  acceptance_rate: number;
  median_salary: number;
  size: number;
  programs?: Program[];
}

export default function CollegeList() {
  const [colleges, setColleges] = useState<College[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);

  useEffect(() => {
    async function fetchColleges() {
      console.log('Fetching colleges from Supabase...'); // Debug log
      
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
      
      console.log('Fetched colleges:', data); // Debug log
      setColleges(data || []);
      setLoading(false);
    }

    fetchColleges();
  }, []);

  const handleRemove = (id: string) => {
    setColleges(colleges.filter((c) => c.id !== id));
  };

  const toggleCompareSelection = (id: string) => {
    setSelectedForCompare((prev) =>
      prev.includes(id) ? prev.filter((cid) => cid !== id) : [...prev, id]
    );
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
            Organize and prioritize your college choices
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
              colleges.map((college) => {
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
                  <CollegeCard
                    key={college.id}
                    id={college.id}
                    name={college.name}
                    location={college.location}
                    ranking={college.ranking}
                    url={college.url}
                    gradRate={college.grad_rate}
                    averageCost={`$${college.average_cost.toLocaleString()}`}
                    acceptanceRate={college.acceptance_rate}
                    medianSalary={college.median_salary}
                    size={college.size}
                    major={college.programs?.[0]?.field_of_study || 'Not specified'}
                    matchScore={matchScore}
                    description={description}
                    programs={programNames}
                    timeline={timeline}
                    fit={fit}
                    selected={selectedForCompare.includes(college.id)}
                    onSelect={toggleCompareSelection}
                    onRemove={handleRemove}
                  />
                );
              })
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

              <div className="pt-4 border-t">
                <Button
                  variant="hero"
                  className="w-full mb-2"
                  disabled={selectedForCompare.length < 2}
                >
                  Compare Selected ({selectedForCompare.length})
                </Button>
                <Button variant="outline" className="w-full">
                  Export List
                </Button>
              </div>

              {selectedForCompare.length > 0 && (
                <div className="pt-4 border-t">
                  <p className="text-xs text-muted-foreground mb-2">Selected for comparison:</p>
                  <div className="space-y-1">
                    {selectedForCompare.map((id) => {
                      const college = colleges.find((c) => c.id === id);
                      return (
                        <Badge key={id} variant="secondary" className="text-xs">
                          {college?.name}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}