import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, Pause, RotateCcw, Settings, Timer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Goal {
  id: string;
  title: string;
}

interface FocusTimerProps {
  userId: string;
  goals?: Goal[];
  onSessionComplete?: () => void;
}

export const FocusTimer = ({ userId, goals = [], onSessionComplete }: FocusTimerProps) => {
  const [workDuration, setWorkDuration] = useState(25);
  const [breakDuration, setBreakDuration] = useState(5);
  const [longBreakDuration, setLongBreakDuration] = useState(15);
  const [sessionsBeforeLongBreak, setSessionsBeforeLongBreak] = useState(4);
  
  const [timeLeft, setTimeLeft] = useState(workDuration * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isWorkSession, setIsWorkSession] = useState(true);
  const [completedSessions, setCompletedSessions] = useState(0);
  const [selectedGoalId, setSelectedGoalId] = useState<string>("");
  const [showSettings, setShowSettings] = useState(false);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleSessionEnd();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning]);

  const handleSessionEnd = async () => {
    setIsRunning(false);
    
    if (isWorkSession) {
      // Save focus session
      await supabase.from("focus_sessions").insert({
        user_id: userId,
        goal_id: selectedGoalId || null,
        duration_minutes: workDuration,
        session_type: "work",
      });

      const newCompletedSessions = completedSessions + 1;
      setCompletedSessions(newCompletedSessions);

      // Determine next break type
      const isLongBreak = newCompletedSessions % sessionsBeforeLongBreak === 0;
      const nextBreakDuration = isLongBreak ? longBreakDuration : breakDuration;

      toast({
        title: "Work session complete! 🎉",
        description: `Time for a ${isLongBreak ? "long " : ""}break.`,
      });

      setIsWorkSession(false);
      setTimeLeft(nextBreakDuration * 60);
      onSessionComplete?.();
    } else {
      toast({
        title: "Break over!",
        description: "Ready to focus again?",
      });
      setIsWorkSession(true);
      setTimeLeft(workDuration * 60);
    }

    // Play notification sound if available
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(isWorkSession ? "Break time!" : "Back to work!", {
        icon: "/favicon.ico",
      });
    }
  };

  const toggleTimer = () => setIsRunning(!isRunning);

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(isWorkSession ? workDuration * 60 : breakDuration * 60);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const progress = isWorkSession
    ? ((workDuration * 60 - timeLeft) / (workDuration * 60)) * 100
    : ((breakDuration * 60 - timeLeft) / (breakDuration * 60)) * 100;

  const applySettings = () => {
    setTimeLeft(workDuration * 60);
    setIsWorkSession(true);
    setShowSettings(false);
  };

  return (
    <Card className="backdrop-blur-xl bg-card/50 border-border/50">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Timer className="h-5 w-5 text-primary" />
          Focus Timer
        </CardTitle>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowSettings(!showSettings)}
        >
          <Settings className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {showSettings ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Work (min)</Label>
                <Input
                  type="number"
                  value={workDuration}
                  onChange={e => setWorkDuration(Number(e.target.value))}
                  min={1}
                  max={120}
                />
              </div>
              <div className="space-y-2">
                <Label>Break (min)</Label>
                <Input
                  type="number"
                  value={breakDuration}
                  onChange={e => setBreakDuration(Number(e.target.value))}
                  min={1}
                  max={60}
                />
              </div>
              <div className="space-y-2">
                <Label>Long Break (min)</Label>
                <Input
                  type="number"
                  value={longBreakDuration}
                  onChange={e => setLongBreakDuration(Number(e.target.value))}
                  min={1}
                  max={60}
                />
              </div>
              <div className="space-y-2">
                <Label>Sessions before long break</Label>
                <Input
                  type="number"
                  value={sessionsBeforeLongBreak}
                  onChange={e => setSessionsBeforeLongBreak(Number(e.target.value))}
                  min={1}
                  max={10}
                />
              </div>
            </div>
            <Button onClick={applySettings} className="w-full">
              Apply Settings
            </Button>
          </div>
        ) : (
          <>
            {goals.length > 0 && (
              <div className="space-y-2">
                <Label>Link to Goal (optional)</Label>
                <Select value={selectedGoalId} onValueChange={setSelectedGoalId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a goal" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No goal</SelectItem>
                    {goals.map(goal => (
                      <SelectItem key={goal.id} value={goal.id}>
                        {goal.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="relative flex flex-col items-center">
              <div className="relative w-48 h-48">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="96"
                    cy="96"
                    r="88"
                    className="stroke-muted"
                    strokeWidth="8"
                    fill="none"
                  />
                  <circle
                    cx="96"
                    cy="96"
                    r="88"
                    className={cn(
                      "transition-all duration-1000",
                      isWorkSession ? "stroke-primary" : "stroke-green-500"
                    )}
                    strokeWidth="8"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 88}
                    strokeDashoffset={2 * Math.PI * 88 * (1 - progress / 100)}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-bold">{formatTime(timeLeft)}</span>
                  <span className="text-sm text-muted-foreground">
                    {isWorkSession ? "Focus Time" : "Break Time"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-4">
              <Button
                size="lg"
                onClick={toggleTimer}
                className={cn(
                  "w-16 h-16 rounded-full",
                  isRunning && "bg-destructive hover:bg-destructive/90"
                )}
              >
                {isRunning ? (
                  <Pause className="h-6 w-6" />
                ) : (
                  <Play className="h-6 w-6 ml-1" />
                )}
              </Button>
              <Button variant="outline" size="icon" onClick={resetTimer}>
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex justify-center gap-2 text-sm text-muted-foreground">
              <span>Sessions: {completedSessions}</span>
              <span>•</span>
              <span>
                Next long break in {sessionsBeforeLongBreak - (completedSessions % sessionsBeforeLongBreak)} sessions
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
