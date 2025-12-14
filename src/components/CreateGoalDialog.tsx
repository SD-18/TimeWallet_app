import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface CreateGoalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}

const CATEGORIES = [
  { value: "study", label: "Study" },
  { value: "fitness", label: "Fitness" },
  { value: "career", label: "Career" },
  { value: "personal", label: "Personal" },
  { value: "creative", label: "Creative" },
  { value: "health", label: "Health" },
  { value: "finance", label: "Finance" },
  { value: "general", label: "General" },
];

const CreateGoalDialog = ({ open, onOpenChange, userId }: CreateGoalDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [timeUnit, setTimeUnit] = useState<"hours" | "days">("hours");
  const [useAIEstimate, setUseAIEstimate] = useState(false);
  const [category, setCategory] = useState("general");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const timeValue = formData.get("deadline") ? parseInt(formData.get("deadline") as string) : null;

    if (!useAIEstimate && !timeValue) {
      toast.error("Please specify time or enable AI estimation");
      setLoading(false);
      return;
    }

    const deadlineHours = timeValue ? (timeUnit === "days" ? timeValue * 24 : timeValue) : null;

    try {
      const { data: functionData, error: functionError } = await supabase.functions.invoke(
        "generate-goal-routine",
        {
          body: {
            title,
            description,
            deadlineHours,
          },
        }
      );

      if (functionError) throw functionError;

      // Use AI-estimated hours if not provided by user
      const finalHours = deadlineHours || functionData.estimatedHours || 24;
      
      const deadline = new Date();
      deadline.setHours(deadline.getHours() + finalHours);

      const { data: goalData, error: goalError } = await supabase
        .from("goals")
        .insert({
          user_id: userId,
          title,
          description,
          deadline: deadline.toISOString(),
          time_allocated: finalHours * 3600,
          status: "ongoing",
          category,
        })
        .select()
        .single();

      if (goalError) throw goalError;

      if (functionData?.tasks && Array.isArray(functionData.tasks)) {
        const tasksToInsert = functionData.tasks.map((task: any, index: number) => ({
          goal_id: goalData.id,
          title: task.title,
          description: task.description || null,
          position: index,
          completed: false,
        }));

        const { error: tasksError } = await supabase
          .from("tasks")
          .insert(tasksToInsert);

        if (tasksError) throw tasksError;
      }

      toast.success("Goal created with AI-generated routine!");
      onOpenChange(false);
      (e.target as HTMLFormElement).reset();
    } catch (error: any) {
      console.error("Error creating goal:", error);
      toast.error(error.message || "Failed to create goal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Create New Goal
          </DialogTitle>
          <DialogDescription>
            Describe your goal and AI will generate a structured routine to help you achieve it.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Goal Title</Label>
            <Input
              id="title"
              name="title"
              placeholder="Learn React fundamentals"
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger disabled={loading}>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="I want to learn React basics including components, hooks, and state management..."
              rows={3}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="deadline">Time Limit</Label>
            <div className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                id="aiEstimate"
                checked={useAIEstimate}
                onChange={(e) => setUseAIEstimate(e.target.checked)}
                className="rounded h-4 w-4"
              />
              <label htmlFor="aiEstimate" className="text-sm text-muted-foreground cursor-pointer">
                Let AI estimate the time needed
              </label>
            </div>
            <div className="flex gap-2">
              <Input
                id="deadline"
                name="deadline"
                type="number"
                min="1"
                max={timeUnit === "hours" ? "720" : "30"}
                placeholder={timeUnit === "hours" ? "24" : "7"}
                required={!useAIEstimate}
                disabled={loading || useAIEstimate}
                className="flex-1"
              />
              <Select value={timeUnit} onValueChange={(value: "hours" | "days") => setTimeUnit(value)} disabled={useAIEstimate}>
                <SelectTrigger className="w-[110px]" disabled={loading || useAIEstimate}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hours">Hours</SelectItem>
                  <SelectItem value="days">Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              {useAIEstimate ? "AI will determine the appropriate time based on your goal" : "How much time do you want to allocate for this goal?"}
            </p>
          </div>

          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Create Goal
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateGoalDialog;
