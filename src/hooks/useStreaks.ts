import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UserStreak {
  id: string;
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_streak_date: string | null;
  total_goals_completed: number;
}

interface Badge {
  id: string;
  badge_type: string;
  badge_name: string;
  earned_at: string;
}

export const useStreaks = (userId: string | null) => {
  const [streak, setStreak] = useState<UserStreak | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStreakData = async () => {
    if (!userId) return;
    
    try {
      // Fetch streak data
      const { data: streakData, error: streakError } = await supabase
        .from("user_streaks")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (streakError) throw streakError;

      if (!streakData) {
        // Create initial streak record
        const { data: newStreak, error: createError } = await supabase
          .from("user_streaks")
          .insert({ user_id: userId })
          .select()
          .single();
        
        if (createError) throw createError;
        setStreak(newStreak);
      } else {
        setStreak(streakData);
      }

      // Fetch badges
      const { data: badgesData, error: badgesError } = await supabase
        .from("user_badges")
        .select("*")
        .eq("user_id", userId)
        .order("earned_at", { ascending: false });

      if (badgesError) throw badgesError;
      setBadges(badgesData || []);
    } catch (error) {
      console.error("Error fetching streak data:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateStreak = async () => {
    if (!userId || !streak) return;

    const today = new Date().toISOString().split("T")[0];
    const lastDate = streak.last_streak_date;
    
    let newCurrentStreak = streak.current_streak;
    let newLongestStreak = streak.longest_streak;

    if (!lastDate) {
      // First goal completion
      newCurrentStreak = 1;
    } else {
      const lastDateObj = new Date(lastDate);
      const todayObj = new Date(today);
      const diffDays = Math.floor((todayObj.getTime() - lastDateObj.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        // Same day, no streak change
        return streak;
      } else if (diffDays === 1) {
        // Consecutive day
        newCurrentStreak = streak.current_streak + 1;
      } else {
        // Streak broken
        newCurrentStreak = 1;
      }
    }

    newLongestStreak = Math.max(newLongestStreak, newCurrentStreak);

    const { data, error } = await supabase
      .from("user_streaks")
      .update({
        current_streak: newCurrentStreak,
        longest_streak: newLongestStreak,
        last_streak_date: today,
        total_goals_completed: streak.total_goals_completed + 1,
      })
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      console.error("Error updating streak:", error);
      return null;
    }

    setStreak(data);
    await checkForBadges(newCurrentStreak, data.total_goals_completed);
    return data;
  };

  const checkForBadges = async (currentStreak: number, totalGoals: number) => {
    if (!userId) return;

    const badgesToAward: { type: string; name: string }[] = [];

    // Streak-based badges
    if (currentStreak >= 7 && !badges.find(b => b.badge_type === "streak_7")) {
      badgesToAward.push({ type: "streak_7", name: "Week Warrior" });
    }
    if (currentStreak >= 30 && !badges.find(b => b.badge_type === "streak_30")) {
      badgesToAward.push({ type: "streak_30", name: "Monthly Master" });
    }

    // Total goals badges
    if (totalGoals >= 10 && !badges.find(b => b.badge_type === "goals_10")) {
      badgesToAward.push({ type: "goals_10", name: "Goal Getter" });
    }
    if (totalGoals >= 50 && !badges.find(b => b.badge_type === "goals_50")) {
      badgesToAward.push({ type: "goals_50", name: "Achievement Hunter" });
    }
    if (totalGoals >= 100 && !badges.find(b => b.badge_type === "goals_100")) {
      badgesToAward.push({ type: "goals_100", name: "Century Champion" });
    }

    for (const badge of badgesToAward) {
      const { error } = await supabase.from("user_badges").insert({
        user_id: userId,
        badge_type: badge.type,
        badge_name: badge.name,
      });
      if (!error) {
        setBadges(prev => [{ 
          id: crypto.randomUUID(), 
          badge_type: badge.type, 
          badge_name: badge.name, 
          earned_at: new Date().toISOString() 
        }, ...prev]);
      }
    }
  };

  useEffect(() => {
    fetchStreakData();
  }, [userId]);

  return { streak, badges, loading, updateStreak, refetch: fetchStreakData };
};
