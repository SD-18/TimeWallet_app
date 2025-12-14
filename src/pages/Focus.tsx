import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { FocusTimer } from "@/components/FocusTimer";
import { StreakDisplay } from "@/components/StreakDisplay";
import { ChallengesPanel } from "@/components/ChallengesPanel";
import { NotificationCenter } from "@/components/NotificationCenter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut, Clock, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useStreaks } from "@/hooks/useStreaks";
import { useNotifications } from "@/hooks/useNotifications";
import { useChallenges } from "@/hooks/useChallenges";

interface Goal {
  id: string;
  title: string;
  status: string;
}

interface FocusSession {
  id: string;
  duration_minutes: number;
  completed_at: string;
}

const Focus = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [focusSessions, setFocusSessions] = useState<FocusSession[]>([]);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();
  const { toast } = useToast();

  const { streak, badges, loading: streakLoading } = useStreaks(userId);
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    createNotification,
    requestBrowserPermission,
  } = useNotifications(userId);
  const {
    challenges,
    loading: challengesLoading,
    joinChallenge,
    getActiveChallenges,
    getCompletedChallenges,
  } = useChallenges(userId);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setUserId(session.user.id);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        navigate("/auth");
      } else if (session) {
        setUserId(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (!userId) return;

    const fetchData = async () => {
      try {
        // Fetch ongoing goals for timer linking
        const { data: goalsData } = await supabase
          .from("goals")
          .select("id, title, status")
          .eq("user_id", userId)
          .eq("status", "ongoing");

        setGoals(goalsData || []);

        // Fetch focus sessions for stats
        const { data: sessionsData } = await supabase
          .from("focus_sessions")
          .select("id, duration_minutes, completed_at")
          .eq("user_id", userId)
          .order("completed_at", { ascending: false })
          .limit(50);

        setFocusSessions(sessionsData || []);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const handleSessionComplete = async () => {
    // Refetch focus sessions
    if (!userId) return;
    
    const { data } = await supabase
      .from("focus_sessions")
      .select("id, duration_minutes, completed_at")
      .eq("user_id", userId)
      .order("completed_at", { ascending: false })
      .limit(50);

    setFocusSessions(data || []);

    // Create notification
    createNotification(
      "Focus session complete! 🎯",
      "Great job staying focused. Keep up the momentum!",
      "info"
    );
  };

  const handleJoinChallenge = async (challengeId: string) => {
    const result = await joinChallenge(challengeId);
    if (result) {
      toast({
        title: "Challenge joined!",
        description: "Good luck completing your new challenge!",
      });
      createNotification(
        "New challenge started! 🏆",
        "You've joined a new challenge. Complete goals to make progress!",
        "info"
      );
    }
  };

  // Calculate stats
  const todaySessions = focusSessions.filter(
    s => new Date(s.completed_at).toDateString() === new Date().toDateString()
  );
  const todayMinutes = todaySessions.reduce((sum, s) => sum + s.duration_minutes, 0);
  const totalMinutes = focusSessions.reduce((sum, s) => sum + s.duration_minutes, 0);

  if (!userId) return null;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-background via-background to-primary/5">
        <AppSidebar />
        <main className="flex-1 p-4 md:p-8 overflow-auto">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <SidebarTrigger />
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                    Focus Zone
                  </h1>
                  <p className="text-muted-foreground">
                    Stay focused and track your productivity
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <NotificationCenter
                  notifications={notifications}
                  unreadCount={unreadCount}
                  onMarkAsRead={markAsRead}
                  onMarkAllAsRead={markAllAsRead}
                  onDelete={deleteNotification}
                  onRequestPermission={requestBrowserPermission}
                />
                <Button variant="outline" onClick={handleSignOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <Card className="backdrop-blur-xl bg-card/50 border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Clock className="h-4 w-4" />
                    <span className="text-xs">Today</span>
                  </div>
                  <div className="text-2xl font-bold">{todayMinutes} min</div>
                </CardContent>
              </Card>
              <Card className="backdrop-blur-xl bg-card/50 border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <BarChart3 className="h-4 w-4" />
                    <span className="text-xs">Sessions Today</span>
                  </div>
                  <div className="text-2xl font-bold">{todaySessions.length}</div>
                </CardContent>
              </Card>
              <Card className="backdrop-blur-xl bg-card/50 border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Clock className="h-4 w-4" />
                    <span className="text-xs">Total Focus Time</span>
                  </div>
                  <div className="text-2xl font-bold">
                    {Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m
                  </div>
                </CardContent>
              </Card>
              <Card className="backdrop-blur-xl bg-card/50 border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <BarChart3 className="h-4 w-4" />
                    <span className="text-xs">Total Sessions</span>
                  </div>
                  <div className="text-2xl font-bold">{focusSessions.length}</div>
                </CardContent>
              </Card>
            </div>

            {/* Main Content Grid */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-6">
                <FocusTimer
                  userId={userId}
                  goals={goals}
                  onSessionComplete={handleSessionComplete}
                />
                <StreakDisplay
                  streak={streak}
                  badges={badges}
                  loading={streakLoading}
                />
              </div>
              <ChallengesPanel
                challenges={challenges}
                activeChallenges={getActiveChallenges()}
                completedChallenges={getCompletedChallenges()}
                onJoinChallenge={handleJoinChallenge}
                loading={challengesLoading}
              />
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Focus;
