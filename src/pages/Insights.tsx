import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { LogOut, TrendingUp, Target, Clock, Trophy, Brain, Zap, AlertTriangle, Sparkles, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface Goal {
  id: string;
  title: string;
  category: string | null;
  status: string;
  time_allocated: number;
  created_at: string | null;
  updated_at: string | null;
  deadline: string;
  description: string | null;
  last_progress_update: string | null;
  user_id: string;
}


interface Profile {
  interested_subjects: string[] | null;
  education_standard: string | null;
}

interface AIInsights {
  patternAnalysis: string;
  failureAnalysis: string | null;
  recommendations: string[];
  encouragement: string;
  focusArea: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  study: "hsl(280, 100%, 70%)",
  fitness: "hsl(145, 80%, 62%)",
  career: "hsl(190, 100%, 60%)",
  personal: "hsl(340, 92%, 68%)",
  creative: "hsl(40, 98%, 70%)",
  health: "hsl(145, 80%, 50%)",
  finance: "hsl(210, 100%, 60%)",
  general: "hsl(245, 40%, 60%)",
};

const CATEGORY_LABELS: Record<string, string> = {
  study: "Study",
  fitness: "Fitness",
  career: "Career",
  personal: "Personal",
  creative: "Creative",
  health: "Health",
  finance: "Finance",
  general: "General",
};

const Insights = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiInsights, setAiInsights] = useState<AIInsights | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        if (!session) {
          navigate("/auth");
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (session?.user.id) {
      fetchData();
    }
  }, [session]);

  const fetchData = async () => {
    if (!session) return;
    
    setLoading(true);
    const [goalsResult, profileResult] = await Promise.all([
      supabase.from("goals").select("*").eq("user_id", session.user.id),
      supabase.from("profiles").select("interested_subjects, education_standard").eq("id", session.user.id).maybeSingle()
    ]);

    if (goalsResult.data) setGoals(goalsResult.data);
    if (profileResult.data) setProfile(profileResult.data);
    setLoading(false);
  };

  const generateAIInsights = async () => {
    if (goals.length < 2) {
      toast.info("Create at least 2 goals to get AI insights");
      return;
    }

    setLoadingAI(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-insights", {
        body: { goals, profile }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setAiInsights(data);
      console.log("generate-insights response:", data);

      toast.success("Insights generated!");
    } catch (error: any) {
      console.error("Error generating insights:", error);
      toast.error(error.message || "Failed to generate insights");
    } finally {
      setLoadingAI(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
    navigate("/auth");
  };

  // Analytics calculations
  const categoryStats = goals.reduce((acc, goal) => {
    const cat = goal.category || "general";
    if (!acc[cat]) acc[cat] = { count: 0, completed: 0, failed: 0, timeAllocated: 0 };
    acc[cat].count++;
    if (goal.status === "completed") acc[cat].completed++;
    if (goal.status === "failed") acc[cat].failed++;
    acc[cat].timeAllocated += goal.time_allocated;
    return acc;
  }, {} as Record<string, { count: number; completed: number; failed: number; timeAllocated: number }>);

  const categoryPieData = Object.entries(categoryStats).map(([category, stats]) => ({
    name: CATEGORY_LABELS[category] || category,
    value: stats.count,
    color: CATEGORY_COLORS[category] || CATEGORY_COLORS.general,
  }));

  const completionData = Object.entries(categoryStats).map(([category, stats]) => ({
    name: CATEGORY_LABELS[category] || category,
    completed: stats.completed,
    failed: stats.failed,
    total: stats.count,
    rate: stats.count > 0 ? Math.round((stats.completed / stats.count) * 100) : 0,
  }));

  const totalGoals = goals.length;
  const completedGoals = goals.filter(g => g.status === "completed").length;
  const failedGoals = goals.filter(g => g.status === "failed").length;
  const overallCompletionRate = totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0;
  const failureRate = totalGoals > 0 ? Math.round((failedGoals / totalGoals) * 100) : 0;
  const totalTimeAllocated = goals.reduce((sum, g) => sum + g.time_allocated, 0);

  if (!session) return null;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          <header className="border-b border-border bg-card/30 backdrop-blur-sm sticky top-0 z-10">
            <div className="container mx-auto px-4 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SidebarTrigger />
                <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                  Learning Insights
                </h1>
              </div>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </header>

          <main className="container mx-auto px-4 py-8 space-y-8">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <p className="text-muted-foreground">Loading your insights...</p>
              </div>
            ) : (
              <>
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <Card className="bg-gradient-to-br from-primary/20 to-primary/5 border-primary/30">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-primary/20">
                      <Target className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Goals</p>
                      <p className="text-3xl font-bold">{totalGoals}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-success/20 to-success/5 border-success/30">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-success/20">
                      <Trophy className="w-6 h-6 text-success" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Completed</p>
                      <p className="text-3xl font-bold">{completedGoals}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-destructive/20 to-destructive/5 border-destructive/30">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-destructive/20">
                      <AlertTriangle className="w-6 h-6 text-destructive" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Failed</p>
                      <p className="text-3xl font-bold">{failedGoals}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-accent/20 to-accent/5 border-accent/30">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-accent/20">
                      <TrendingUp className="w-6 h-6 text-accent" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Success Rate</p>
                      <p className="text-3xl font-bold">{overallCompletionRate}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-secondary/20 to-secondary/5 border-secondary/30">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-secondary/20">
                      <Clock className="w-6 h-6 text-secondary-foreground" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Time Invested</p>
                      <p className="text-3xl font-bold">{Math.round(totalTimeAllocated / 3600)}h</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* AI Insights Section */}
            <Card className="bg-gradient-to-br from-primary/10 via-accent/5 to-card border-primary/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-primary" />
                      AI-Powered Insights
                    </CardTitle>
                    <CardDescription>Personalized analysis of your learning patterns</CardDescription>
                  </div>
                  <Button 
                    onClick={generateAIInsights} 
                    disabled={loadingAI || goals.length < 2}
                    className="gap-2"
                  >
                    {loadingAI ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    {loadingAI ? "Analyzing..." : "Generate Insights"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {aiInsights ? (
                  <div className="space-y-6">
                    {/* Pattern Analysis */}
                    <div className="p-4 rounded-lg bg-muted/30 border border-border">
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <Brain className="w-4 h-4 text-primary" />
                        Pattern Analysis
                      </h4>
                      <p className="text-foreground">{aiInsights.patternAnalysis}</p>
                    </div>

                    {/* Failure Analysis */}
                    {aiInsights.failureAnalysis && failedGoals > 0 && (
                      <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-destructive" />
                          Why Goals Fail
                        </h4>
                        <p className="text-foreground">{aiInsights.failureAnalysis}</p>
                      </div>
                    )}

                    {/* Recommendations */}
                    <div className="p-4 rounded-lg bg-accent/10 border border-accent/20">
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <Zap className="w-4 h-4 text-accent" />
                        Recommendations
                      </h4>
                      <ul className="space-y-2">
                        {aiInsights.recommendations.map((rec, i) => (
                          <li key={i} className="flex items-start gap-3">
                            <span className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center text-sm font-medium shrink-0">
                              {i + 1}
                            </span>
                            <p className="text-foreground">{rec}</p>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Encouragement */}
                    <div className="p-4 rounded-lg bg-success/10 border border-success/20">
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-success" />
                        Keep It Up!
                      </h4>
                      <p className="text-foreground">{aiInsights.encouragement}</p>
                    </div>

                    {/* Focus Area */}
                    {aiInsights.focusArea && (
                      <div className="text-center p-3 rounded-lg bg-primary/10 border border-primary/20">
                        <span className="text-sm text-muted-foreground">Focus Area: </span>
                        <span className="font-semibold text-primary capitalize">{aiInsights.focusArea}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    {goals.length < 2 ? (
                      <p>Create at least 2 goals to unlock AI insights</p>
                    ) : (
                      <p>Click "Generate Insights" to get personalized AI analysis</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="w-5 h-5 text-primary" />
                    Goal Categories
                  </CardTitle>
                  <CardDescription>Distribution of your goals by type</CardDescription>
                </CardHeader>
                <CardContent>
                  {categoryPieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie
                          data={categoryPieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={4}
                          dataKey="value"
                          label={({ name, percent }) => { const p = typeof percent === "number" ? percent : 0;
                          return `${name} ${(p * 100).toFixed(0)}%`;
}}
                        >
                          {categoryPieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                      No goals yet. Create your first goal to see insights!
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-accent" />
                    Completion by Category
                  </CardTitle>
                  <CardDescription>How well you complete different goal types</CardDescription>
                </CardHeader>
                <CardContent>
                  {completionData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={completionData} layout="vertical">
                        <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                        <YAxis type="category" dataKey="name" width={80} />
                        <Tooltip formatter={(value) => [`${value}%`, "Completion Rate"]} />
                        <Bar dataKey="rate" fill="hsl(280, 100%, 70%)" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                      Complete some goals to see your success rates!
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
              </>
            )}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Insights;
