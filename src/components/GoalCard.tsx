import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Calendar, Clock, CheckCircle2, XCircle, AlertCircle, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Task {
  id: string;
  title: string;
  description: string | null;
  completed: boolean;
  position: number;
}

interface Goal {
  id: string;
  title: string;
  description: string | null;
  deadline: string;
  time_allocated: number;
  status: string;
  last_progress_update: string;
}

interface GoalCardProps {
  goal: Goal;
  userId: string;
}

const GoalCard = ({ goal, userId }: GoalCardProps) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    const fetchTasks = async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("goal_id", goal.id)
        .order("position");

      if (!error && data) {
        setTasks(data);
      }
    };

    fetchTasks();
  }, [goal.id]);

  const toggleTask = async (taskId: string, completed: boolean) => {
    setLoading(true);
    const { error } = await supabase
      .from("tasks")
      .update({ 
        completed: !completed,
        completed_at: !completed ? new Date().toISOString() : null,
      })
      .eq("id", taskId);

    if (error) {
      toast.error("Failed to update task");
    } else {
      const updatedTasks = tasks.map((t) => 
        t.id === taskId ? { ...t, completed: !completed } : t
      );
      setTasks(updatedTasks);
      
      await supabase
        .from("goals")
        .update({ last_progress_update: new Date().toISOString() })
        .eq("id", goal.id);

      // Check if all tasks are completed and goal is before deadline
      const allCompleted = updatedTasks.every((t) => t.completed);
      const beforeDeadline = new Date(goal.deadline) > new Date();
      
      if (allCompleted && beforeDeadline && goal.status === "ongoing") {
        await completeGoalEarly();
      }
    }
    setLoading(false);
  };

  const completeGoalEarly = async () => {
    // Mark goal as completed
    const { error: goalError } = await supabase
      .from("goals")
      .update({ status: "completed" })
      .eq("id", goal.id);

    if (goalError) {
      toast.error("Failed to complete goal");
      return;
    }

    // ADD time to user's balance (time invested is now earned)
    const { error: profileError } = await supabase.rpc('increment_balance', {
      user_id_param: userId,
      amount_param: goal.time_allocated
    });

    if (!profileError) {
      // Record transaction
      await supabase
        .from("transactions")
        .insert({
          user_id: userId,
          goal_id: goal.id,
          type: "credit",
          amount: goal.time_allocated,
          reason: `Completed goal: "${goal.title}"`,
        });

      toast.success(`Goal completed! ${Math.round(goal.time_allocated / 3600)}h added to your wallet`);
    }
  };

  const deleteGoal = async () => {
    setLoading(true);
    
    // Delete all tasks first
    const { error: tasksError } = await supabase
      .from("tasks")
      .delete()
      .eq("goal_id", goal.id);

    if (tasksError) {
      toast.error("Failed to delete goal tasks");
      setLoading(false);
      return;
    }

    // Delete the goal
    const { error: goalError } = await supabase
      .from("goals")
      .delete()
      .eq("id", goal.id);

    if (goalError) {
      toast.error("Failed to delete goal");
    } else {
      // No time refund on deletion - time is only added on completion
      toast.success("Goal deleted successfully");
    }
    
    setLoading(false);
    setShowDeleteDialog(false);
  };

  const completedTasks = tasks.filter((t) => t.completed).length;
  const progress = tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0;
  const isOverdue = new Date(goal.deadline) < new Date() && goal.status === "ongoing";

  const getStatusIcon = () => {
    if (goal.status === "completed") return <CheckCircle2 className="w-5 h-5 text-success" />;
    if (goal.status === "failed") return <XCircle className="w-5 h-5 text-destructive" />;
    if (isOverdue) return <AlertCircle className="w-5 h-5 text-warning" />;
    return <Clock className="w-5 h-5 text-primary" />;
  };

  const getStatusBadge = () => {
    if (goal.status === "completed") return <Badge className="bg-success">Completed</Badge>;
    if (goal.status === "failed") return <Badge variant="destructive">Failed</Badge>;
    if (isOverdue) return <Badge className="bg-warning text-warning-foreground">Overdue</Badge>;
    return <Badge>Ongoing</Badge>;
  };

  return (
    <>
      <Card className="bg-card border-border hover:border-primary/50 transition-all duration-300">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                {getStatusIcon()}
                <CardTitle className="text-xl">{goal.title}</CardTitle>
              </div>
              {goal.description && (
                <p className="text-sm text-muted-foreground">{goal.description}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge()}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowDeleteDialog(true)}
                disabled={loading}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mt-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span>Due {formatDistanceToNow(new Date(goal.deadline), { addSuffix: true })}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>{Math.round(goal.time_allocated / 3600)}h allocated</span>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Progress</span>
              <span className="text-sm text-muted-foreground">
                {completedTasks} / {tasks.length} tasks
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {tasks.length > 0 && goal.status === "ongoing" && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Tasks</p>
              <div className="space-y-2">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                  >
                    <Checkbox
                      checked={task.completed}
                      onCheckedChange={() => toggleTask(task.id, task.completed)}
                      disabled={loading}
                      className="mt-0.5"
                    />
                    <div className="flex-1">
                      <p className={`text-sm ${task.completed ? "line-through text-muted-foreground" : ""}`}>
                        {task.title}
                      </p>
                      {task.description && (
                        <p className="text-xs text-muted-foreground mt-1">{task.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>

    <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Goal</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete "{goal.title}"? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={deleteGoal} className="bg-destructive hover:bg-destructive/90">
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
};

export default GoalCard;
