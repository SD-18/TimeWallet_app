import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Flame, Trophy, Star, Award, Target, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface UserStreak {
  current_streak: number;
  longest_streak: number;
  total_goals_completed: number;
}

interface BadgeItem {
  id: string;
  badge_type: string;
  badge_name: string;
  earned_at: string;
}

interface StreakDisplayProps {
  streak: UserStreak | null;
  badges: BadgeItem[];
  loading?: boolean;
}

const getBadgeIcon = (badgeType: string) => {
  if (badgeType.includes("streak")) return <Flame className="h-4 w-4" />;
  if (badgeType.includes("goals")) return <Target className="h-4 w-4" />;
  if (badgeType.includes("sprint")) return <Zap className="h-4 w-4" />;
  if (badgeType.includes("champion")) return <Trophy className="h-4 w-4" />;
  if (badgeType.includes("crusher")) return <Star className="h-4 w-4" />;
  return <Award className="h-4 w-4" />;
};

const getBadgeColor = (badgeType: string) => {
  if (badgeType.includes("streak_30") || badgeType.includes("goals_100")) return "bg-gradient-to-r from-yellow-400 to-orange-500";
  if (badgeType.includes("streak_7") || badgeType.includes("goals_50")) return "bg-gradient-to-r from-purple-400 to-pink-500";
  if (badgeType.includes("champion") || badgeType.includes("crusher")) return "bg-gradient-to-r from-cyan-400 to-blue-500";
  return "bg-gradient-to-r from-green-400 to-emerald-500";
};

export const StreakDisplay = ({ streak, badges, loading }: StreakDisplayProps) => {
  if (loading) {
    return (
      <Card className="backdrop-blur-xl bg-card/50 border-border/50">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3" />
            <div className="h-16 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="backdrop-blur-xl bg-card/50 border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Flame className="h-5 w-5 text-orange-500" />
          Streaks & Achievements
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Streak Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 rounded-lg bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/30">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Flame className={cn(
                "h-6 w-6",
                streak?.current_streak && streak.current_streak > 0 
                  ? "text-orange-500 animate-pulse" 
                  : "text-muted-foreground"
              )} />
            </div>
            <div className="text-2xl font-bold">{streak?.current_streak || 0}</div>
            <div className="text-xs text-muted-foreground">Current Streak</div>
          </div>
          <div className="text-center p-4 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Trophy className="h-6 w-6 text-purple-500" />
            </div>
            <div className="text-2xl font-bold">{streak?.longest_streak || 0}</div>
            <div className="text-xs text-muted-foreground">Best Streak</div>
          </div>
          <div className="text-center p-4 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Target className="h-6 w-6 text-cyan-500" />
            </div>
            <div className="text-2xl font-bold">{streak?.total_goals_completed || 0}</div>
            <div className="text-xs text-muted-foreground">Goals Completed</div>
          </div>
        </div>

        {/* Badges Section */}
        <div>
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Award className="h-4 w-4" />
            Earned Badges ({badges.length})
          </h4>
          {badges.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Complete goals daily to earn badges!
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {badges.map(badge => (
                <Badge
                  key={badge.id}
                  className={cn(
                    "flex items-center gap-1 text-white",
                    getBadgeColor(badge.badge_type)
                  )}
                >
                  {getBadgeIcon(badge.badge_type)}
                  {badge.badge_name}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Progress to next badge */}
        {streak && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Progress to Next Badge</h4>
            <div className="space-y-2">
              {streak.current_streak < 7 && (
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>Week Warrior (7-day streak)</span>
                    <span>{streak.current_streak}/7</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-orange-400 to-red-500 transition-all"
                      style={{ width: `${(streak.current_streak / 7) * 100}%` }}
                    />
                  </div>
                </div>
              )}
              {streak.total_goals_completed < 10 && (
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>Goal Getter (10 goals)</span>
                    <span>{streak.total_goals_completed}/10</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-400 to-emerald-500 transition-all"
                      style={{ width: `${(streak.total_goals_completed / 10) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
