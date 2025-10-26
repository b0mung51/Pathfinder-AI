import { Navbar } from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Layers3, MapPin, GraduationCap, Sparkles, Target } from "lucide-react";

type MatchBreakdown = {
  label: string;
  score: number;
  description: string;
};

type TimelineStat = {
  label: string;
  value: string;
};

type TimelineEntry = {
  stageOrder: number;
  stageLabel: string;
  targetType: "college" | "program";
  targetName: string;
  location: string;
  matchRating: number;
  summary: string;
  highlights: string[];
  stats: TimelineStat[];
  callout?: string;
};

type TimelineTrack = {
  trackId: number;
  trackName: string;
  goal?: string;
  overallFit?: number;
  aiSummary?: string;
  aiNextStep?: string;
  matchBreakdown: MatchBreakdown[];
  timeline: TimelineEntry[];
};

type SampleTrackRow = {
  trackId: number;
  stageOrder: number;
  stageLabel: string;
  targetType: "college" | "program";
  targetName: string;
  location?: string;
  matchRating: number;
  summary: string;
  highlights: string[];
  stats: TimelineStat[];
  callout?: string;
  trackName?: string;
  goal?: string;
  overallFit?: number;
  aiSummary?: string;
  aiNextStep?: string;
  matchBreakdown?: MatchBreakdown[];
};

const sampleTimelineRows: SampleTrackRow[] = [
  {
    trackId: 101,
    trackName: "Machine Learning Trailblazer",
    goal: "Graduate as an applied ML engineer with a research-backed portfolio.",
    overallFit: 93,
    aiSummary:
      "You already exceed the technical baseline. Double down on research output and leadership touchpoints to stand out in competitive AI fellowships.",
    aiNextStep:
      "Submit the Stanford HAI scholarship application before November 15 and lock in your faculty recommender list this week.",
    matchBreakdown: [
      {
        label: "Academic alignment",
        score: 95,
        description: "Top-tier AI lab access plus honors coursework keeps you in the research fast lane.",
      },
      {
        label: "Financial outlook",
        score: 76,
        description: "High tuition offset by merit aid and research stipends identified through HAI.",
      },
      {
        label: "Career outcomes",
        score: 88,
        description: "Strong pipeline into ML engineer roles via Silicon Valley internship partnerships.",
      },
    ],
    stageOrder: 1,
    stageLabel: "Foundation: Undergraduate Experience",
    targetType: "college",
    targetName: "Stanford University",
    location: "Stanford, CA",
    matchRating: 94,
    summary: "World-class CS program with early access to the Stanford AI Lab and interdisciplinary HAI seminars.",
    highlights: [
      "On-campus AI research assistant roles by sophomore year",
      "Silicon Valley internship pipeline",
    ],
    stats: [
      { label: "Ranking", value: "#3 National" },
      { label: "Avg. Cost", value: "$18.4K after aid" },
      { label: "Acceptance", value: "4.3%" },
    ],
    callout: "Focus on the Human-Centered AI (HAI) research fellowship by spring semester.",
  },
  {
    trackId: 101,
    stageOrder: 2,
    stageLabel: "Deepen Expertise",
    targetType: "program",
    targetName: "AI Honors Cohort",
    location: "Interdisciplinary cohort",
    matchRating: 90,
    summary: "Selective honors sequence combining ML theory, ethics, and real-world launch labs.",
    highlights: [
      "Capstone ships an applied ML product",
      "Mentorship from Google Brain alumni",
    ],
    stats: [
      { label: "Seats", value: "40" },
      { label: "Timeline", value: "Junior year" },
      { label: "Credit Load", value: "12 credits" },
    ],
    callout: "Secure faculty recommendation letters during sophomore spring.",
  },
  {
    trackId: 101,
    stageOrder: 3,
    stageLabel: "Launch to Industry",
    targetType: "program",
    targetName: "MS Computer Science (AI Specialization)",
    location: "Stanford School of Engineering",
    matchRating: 88,
    summary: "Accelerated coterm pathway to complete the MS in five years with funded research.",
    highlights: [
      "Hands-on ML systems practicum",
      "Industry-funded research stipend",
    ],
    stats: [
      { label: "Duration", value: "18 months" },
      { label: "Avg. Salary", value: "$165K" },
      { label: "Research Tracks", value: "5 options" },
    ],
    callout: "Prepare GRE waiver request alongside coterm application timeline.",
  },
  {
    trackId: 202,
    trackName: "Design-Led MBA Journey",
    goal: "Blend product design leadership with MBA-level strategy and venture fluency.",
    overallFit: 88,
    aiSummary:
      "Your design portfolio already differentiates you. Strengthen quantitative storytelling to resonate with top MBA adcoms.",
    aiNextStep:
      "Book the GMAT Focus prep sprint and request recommendation letters before October 1 to beat early-decision timelines.",
    matchBreakdown: [
      {
        label: "Creative alignment",
        score: 92,
        description: "Portfolio-ready case studies resonate strongly with design-forward programs.",
      },
      {
        label: "Leadership readiness",
        score: 85,
        description: "Documented cross-functional leadership aligns with MBA cohort expectations.",
      },
      {
        label: "Financial plan",
        score: 71,
        description: "Tuition reimbursement plus design scholarships close most funding gaps.",
      },
    ],
    stageOrder: 1,
    stageLabel: "Design Foundation",
    targetType: "college",
    targetName: "Rhode Island School of Design (Continuing Ed)",
    location: "Providence, RI (Hybrid)",
    matchRating: 87,
    summary: "Certificate layering advanced prototyping with business storytelling fundamentals.",
    highlights: [
      "Weekend intensives with IDEO mentors",
      "Portfolio piece every 4 weeks",
    ],
    stats: [
      { label: "Duration", value: "6 months" },
      { label: "Tuition", value: "$8.2K" },
      { label: "Format", value: "Hybrid" },
    ],
    callout: "Leverage employer L&D stipend to subsidize tuition.",
  },
  {
    trackId: 202,
    stageOrder: 2,
    stageLabel: "Product Strategy Bridge",
    targetType: "program",
    targetName: "Northwestern Kellogg Product Strategy Exec Program",
    location: "Evanston, IL",
    matchRating: 83,
    summary: "Executive track sharpening market sizing, pricing, and stakeholder influence.",
    highlights: [
      "Live case collaboration with Fortune 100 partners",
      "Executive coaching cohort",
    ],
    stats: [
      { label: "Length", value: "12 weeks" },
      { label: "Format", value: "Online + 2 residencies" },
      { label: "Cohort Size", value: "120" },
    ],
    callout: "Draft a mini-consulting sprint to demonstrate ROI to leadership.",
  },
  {
    trackId: 202,
    stageOrder: 3,
    stageLabel: "MBA Application Push",
    targetType: "college",
    targetName: "University of Michigan – Ross School of Business (MBA)",
    location: "Ann Arbor, MI",
    matchRating: 89,
    summary: "Design management concentration with proximate VC and startup ecosystem.",
    highlights: [
      "MAP consulting project tackling live venture challenges",
      "Access to Zell Lurie Institute",
    ],
    stats: [
      { label: "Ranking", value: "#8 MBA" },
      { label: "Scholarship Odds", value: "40% (design leaders)" },
      { label: "GMAT Focus", value: "Target 655+" },
    ],
    callout: "Translate design impact into quantified business outcomes inside essays.",
  },
];

const buildSampleTracks = (rows: SampleTrackRow[]): TimelineTrack[] => {
  const trackMap = new Map<number, TimelineTrack>();

  rows.forEach((row) => {
    let track = trackMap.get(row.trackId);

    if (!track) {
      track = {
        trackId: row.trackId,
        trackName: row.trackName ?? `Track ${row.trackId}`,
        goal: row.goal,
        overallFit: row.overallFit,
        aiSummary: row.aiSummary,
        aiNextStep: row.aiNextStep,
        matchBreakdown: row.matchBreakdown ?? [],
        timeline: [],
      };
      trackMap.set(row.trackId, track);
    } else {
      if (!track.trackName && row.trackName) {
        track.trackName = row.trackName;
      }
      if (!track.goal && row.goal) {
        track.goal = row.goal;
      }
      if (track.overallFit == null && row.overallFit != null) {
        track.overallFit = row.overallFit;
      }
      if (!track.aiSummary && row.aiSummary) {
        track.aiSummary = row.aiSummary;
      }
      if (!track.aiNextStep && row.aiNextStep) {
        track.aiNextStep = row.aiNextStep;
      }
      if ((!track.matchBreakdown || track.matchBreakdown.length === 0) && row.matchBreakdown?.length) {
        track.matchBreakdown = row.matchBreakdown;
      }
    }

    track.timeline.push({
      stageOrder: row.stageOrder,
      stageLabel: row.stageLabel,
      targetType: row.targetType,
      targetName: row.targetName,
      location: row.location ?? "",
      matchRating: row.matchRating,
      summary: row.summary,
      highlights: row.highlights,
      stats: row.stats,
      callout: row.callout,
    });
  });

  return Array.from(trackMap.values()).map((track) => ({
    ...track,
    matchBreakdown: track.matchBreakdown ?? [],
    timeline: [...track.timeline].sort((a, b) => a.stageOrder - b.stageOrder),
  }));
};

const sampleTracks = buildSampleTracks(sampleTimelineRows);

const clampScore = (score: number) => {
  if (Number.isNaN(score)) {
    return 0;
  }
  return Math.min(100, Math.max(0, score));
};

const scoreTone = (score: number) => {
  if (score >= 90) {
    return "text-emerald-600";
  }
  if (score >= 75) {
    return "text-blue-600";
  }
  return "text-amber-600";
};

const Tracks = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-10 space-y-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">Personalized Tracks Timeline</h1>
            <p className="max-w-2xl text-muted-foreground">
              Preview how Pathfinder could turn a set of track rows into an easy-to-scan timeline. Each milestone blends program details, match scoring, and AI coaching to keep next steps obvious.
            </p>
          </div>
          <Badge variant="outline" className="text-xs uppercase tracking-wide">
            Concept Preview
          </Badge>
        </div>

        <div className="space-y-10">
          {sampleTracks.map((track) => {
            const averageMatch =
              track.timeline.length > 0
                ? track.timeline.reduce((total, entry) => total + entry.matchRating, 0) /
                  track.timeline.length
                : 0;

            return (
              <Card key={track.trackId} className="p-8 space-y-8">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-primary">
                      <Layers3 className="h-4 w-4" />
                      <span>Track {track.trackId}</span>
                    </div>
                    <h2 className="text-2xl font-semibold leading-tight">{track.trackName}</h2>
                    {track.goal ? (
                      <p className="flex items-start gap-2 text-sm text-muted-foreground">
                        <Target className="mt-0.5 h-4 w-4 text-primary" />
                        {track.goal}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    {typeof track.overallFit === "number" ? (
                      <Badge variant="secondary" className={`text-base px-3 py-1 ${scoreTone(track.overallFit)}`}>
                        Overall Fit {track.overallFit.toFixed(0)}%
                      </Badge>
                    ) : null}
                    <Badge variant="outline" className="text-sm">
                      {track.timeline.length} step timeline
                    </Badge>
                    <Badge variant="outline" className={`text-sm ${scoreTone(averageMatch)}`}>
                      Avg. Match {averageMatch.toFixed(0)}%
                    </Badge>
                  </div>
                </div>

                <div className="grid gap-8 lg:grid-cols-[2fr,1fr]">
                  <div className="space-y-6">
                    <div className="relative">
                      <div className="absolute left-4 top-3 bottom-6 hidden border-l border-border sm:block" />
                      <div className="space-y-6">
                        {track.timeline.map((entry, index) => (
                          <div key={`${track.trackId}-${entry.stageOrder}`} className="relative sm:pl-12">
                            <div className="absolute left-0 top-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-primary bg-background text-sm font-semibold text-primary sm:left-[10px]">
                              {index + 1}
                            </div>
                            <div className="rounded-xl border bg-card p-5 shadow-sm">
                              <div className="flex flex-wrap items-start justify-between gap-4">
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                                    <Badge variant="outline" className="capitalize">
                                      {entry.targetType}
                                    </Badge>
                                    <span>{entry.stageLabel}</span>
                                  </div>
                                  <h3 className="text-lg font-semibold leading-tight">{entry.targetName}</h3>
                                  {entry.location ? (
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                      {entry.targetType === "college" ? (
                                        <MapPin className="h-4 w-4" />
                                      ) : (
                                        <GraduationCap className="h-4 w-4" />
                                      )}
                                      <span>{entry.location}</span>
                                    </div>
                                  ) : null}
                                </div>
                                <div className="w-full min-w-[120px] max-w-[180px] sm:w-auto">
                                  <p className={`text-sm font-semibold ${scoreTone(entry.matchRating)}`}>
                                    Match {entry.matchRating.toFixed(0)}%
                                  </p>
                                  <Progress value={clampScore(entry.matchRating)} className="mt-2 h-2" />
                                </div>
                              </div>

                              <p className="mt-4 text-sm text-muted-foreground">{entry.summary}</p>

                              {entry.highlights.length ? (
                                <div className="mt-4 flex flex-wrap gap-2">
                                  {entry.highlights.map((highlight) => (
                                    <span
                                      key={highlight}
                                      className="rounded-full border border-dashed border-primary/40 px-3 py-1 text-xs text-primary"
                                    >
                                      {highlight}
                                    </span>
                                  ))}
                                </div>
                              ) : null}

                              {entry.stats.length ? (
                                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                                  {entry.stats.map((stat) => (
                                    <div key={`${entry.stageOrder}-${stat.label}`} className="rounded-md border bg-muted/30 p-3">
                                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground/80">
                                        {stat.label}
                                      </p>
                                      <p className="text-sm font-semibold text-foreground">{stat.value}</p>
                                    </div>
                                  ))}
                                </div>
                              ) : null}

                              {entry.callout ? (
                                <div className="mt-5 rounded-md border border-dashed border-primary/50 bg-primary/5 px-3 py-2 text-sm text-primary">
                                  {entry.callout}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <aside className="space-y-6">
                    <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-6 space-y-4">
                      <div className="flex items-center gap-2 text-sm font-medium text-primary">
                        <Sparkles className="h-4 w-4" />
                        AI Guidance
                      </div>
                      {track.aiSummary ? (
                        <p className="text-sm text-muted-foreground">{track.aiSummary}</p>
                      ) : (
                        <p className="text-sm text-muted-foreground">AI summarization would appear here once recommendations are generated.</p>
                      )}
                      {track.aiNextStep ? (
                        <div className="rounded-lg border bg-background p-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/80">
                            Recommended next move
                          </p>
                          <p className="mt-2 text-sm text-foreground">{track.aiNextStep}</p>
                        </div>
                      ) : null}
                    </div>

                    {track.matchBreakdown.length ? (
                      <div className="rounded-xl border bg-card p-6 space-y-4">
                        <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                          Match Snapshot
                        </h4>
                        <div className="space-y-4">
                          {track.matchBreakdown.map((segment) => (
                            <div key={segment.label} className="space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span className="font-medium text-foreground">{segment.label}</span>
                                <span className={`font-semibold ${scoreTone(segment.score)}`}>
                                  {segment.score.toFixed(0)}%
                                </span>
                              </div>
                              <Progress value={clampScore(segment.score)} className="h-2" />
                              <p className="text-xs text-muted-foreground">{segment.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </aside>
                </div>
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
};

export default Tracks;
