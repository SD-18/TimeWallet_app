import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Swords, Trophy, Calendar, Target, CheckCircle } from "lucide-react";
import { formatDistanceToNow, addDays, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";

interface Challenge {
  id: string;
  name: string;
  description: string;
  duration_days: number;
  target_goals: number;
  badge_reward: string;
}

interface UserChallenge {
  id: string;
  challenge_id: string;
  started_at: string;
  completed_at: string | null;
  goals_completed: number;
  status: string;
  challenge?: Challenge;
}

interface ChallengesPanelProps {
  challenges: Challenge[];
  activeChallenges: UserChallenge[];
  completedChallenges: UserChallenge[];
  onJoinChallenge: (challengeId: string) => void;
  loading?: boolean;
}

export const ChallengesPanel = ({
  challenges,
  activeChallenges,
  completedChallenges,
  onJoinChallenge,
  loading,
}: ChallengesPanelProps) => {
  const isAlreadyJoined = (challengeId: string) => {
    return activeChallenges.some(ac => ac.challenge_id === challengeId);
  };

  const getDaysRemaining = (startedAt: string, durationDays: number) => {
    const endDate = addDays(new Date(startedAt), durationDays);
    return Math.max(0, differenceInDays(endDate, new Date()));
  };

  if (loading) {
    return (
      <Card className="backdrop-blur-xl bg-card/50 border-border/50">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-muted rounded w-1/3" />
            <div className="h-24 bg-muted rounded" />
            <div className="h-24 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="backdrop-blur-xl bg-card/50 border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Swords className="h-5 w-5 text-primary" />
          Challenges
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Active Challenges */}
        {activeChallenges.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4" />
              Active Challenges
            </h4>
            {activeChallenges.map(uc => {
              const challenge = uc.challenge;
              if (!challenge) return null;
              const progress = (uc.goals_completed / challenge.target_goals) * 100;
              const daysLeft = getDaysRemaining(uc.started_at, challenge.duration_days);

              return (
                <div
                  key={uc.id}
                  className="p-4 rounded-lg border bg-gradient-to-br from-primary/10 to-primary/5"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h5 className="font-medium">{challenge.name}</h5>
                    <Badge variant="outline" className="shrink-0">
                      {daysLeft} days left
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    {challenge.description}
                  </p>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>Progress</span>
                      <span>
                        {uc.goals_completed}/{challenge.target_goals} goals
                      </span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Completed Challenges */}
        {completedChallenges.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Trophy className="h-4 w-4 text-yellow-500" />
              Completed ({completedChallenges.length})
            </h4>
            <div className="flex flex-wrap gap-2">
              {completedChallenges.slice(0, 5).map(uc => (
                <Badge
                  key={uc.id}
                  className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white"
                >
                  <CheckCircle className="h-3 w-3 mr-1" />
                  {uc.challenge?.name}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Available Challenges */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Available Challenges
          </h4>
          <div className="grid gap-3">
            {challenges.map(challenge => {
              const joined = isAlreadyJoined(challenge.id);
              return (
                <div
                  key={challenge.id}
                  className={cn(
                    "p-4 rounded-lg border transition-all",
                    joined
                      ? "bg-muted/50 border-primary/30"
                      : "hover:border-primary/50"
                  )}
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex-1">
                      <h5 className="font-medium">{challenge.name}</h5>
                      <p className="text-sm text-muted-foreground mt-1">
                        {challenge.description}
                      </p>
                      <div className="flex gap-2 mt-2 text-xs text-muted-foreground">
                        <span>{challenge.duration_days} days</span>
                        <span>•</span>
                        <span>{challenge.target_goals} goals</span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={joined ? "secondary" : "default"}
                      disabled={joined}
                      onClick={() => onJoinChallenge(challenge.id)}
                    >
                      {joined ? "Joined" : "Join"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
