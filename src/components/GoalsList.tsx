import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import GoalCard from "./GoalCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Goal {
  id: string;
  title: string;
  description: string | null;
  deadline: string;
  time_allocated: number;
  status: string;
  created_at: string | null;
  updated_at: string | null;
  category: string | null;
  last_progress_update: string | null;
  user_id: string;
}

interface GoalsListProps {
  userId: string;
}

const GoalsList = ({ userId }: GoalsListProps) => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGoals = async () => {
      const { data, error } = await supabase
        .from("goals")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setGoals(data);
      }
      setLoading(false);
    };

    fetchGoals();

    const channel = supabase
      .channel("goals-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "goals",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          fetchGoals();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const ongoingGoals = goals.filter((g) => g.status === "ongoing");
  const completedGoals = goals.filter((g) => g.status === "completed");
  const failedGoals = goals.filter((g) => g.status === "failed");

  if (loading) {
    return (
      <div className="grid gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-48 bg-card border border-border rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <Tabs defaultValue="ongoing" className="w-full">
      <TabsList className="grid w-full max-w-md grid-cols-3">
        <TabsTrigger value="ongoing">Ongoing ({ongoingGoals.length})</TabsTrigger>
        <TabsTrigger value="completed">Completed ({completedGoals.length})</TabsTrigger>
        <TabsTrigger value="failed">Failed ({failedGoals.length})</TabsTrigger>
      </TabsList>

      <TabsContent value="ongoing" className="mt-6">
        {ongoingGoals.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No ongoing goals. Create one to get started!</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {ongoingGoals.map((goal) => (
              <GoalCard key={goal.id} goal={goal} userId={userId} />
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="completed" className="mt-6">
        {completedGoals.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No completed goals yet.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {completedGoals.map((goal) => (
              <GoalCard key={goal.id} goal={goal} userId={userId} />
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="failed" className="mt-6">
        {failedGoals.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No failed goals.</p>
          </div>
        ) : (
          <div className="grid gap-2">
            {failedGoals.map((goal) => (
              <div
                key={goal.id}
                className="flex items-center justify-between p-4 rounded-lg bg-destructive/10 border border-destructive/20"
              >
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-destructive" />
                  <span className="font-medium text-foreground">{goal.title}</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {new Date(goal.deadline).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
};

export default GoalsList;
