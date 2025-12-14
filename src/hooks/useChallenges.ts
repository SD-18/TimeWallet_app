import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

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
  user_id: string;
  challenge_id: string;
  started_at: string;
  completed_at: string | null;
  goals_completed: number;
  status: string;
  challenge?: Challenge;
}

export const useChallenges = (userId: string | null) => {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [userChallenges, setUserChallenges] = useState<UserChallenge[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchChallenges = useCallback(async () => {
    try {
      // Fetch all available challenges
      const { data: challengesData, error: challengesError } = await supabase
        .from("challenges")
        .select("*")
        .order("duration_days", { ascending: true });

      if (challengesError) throw challengesError;
      setChallenges(challengesData || []);

      if (!userId) {
        setLoading(false);
        return;
      }

      // Fetch user's active challenges
      const { data: userChallengesData, error: userChallengesError } = await supabase
        .from("user_challenges")
        .select("*")
        .eq("user_id", userId)
        .order("started_at", { ascending: false });

      if (userChallengesError) throw userChallengesError;
      setUserChallenges(userChallengesData || []);
    } catch (error) {
      console.error("Error fetching challenges:", error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const joinChallenge = async (challengeId: string) => {
    if (!userId) return null;

    // Check if already in this challenge
    const existing = userChallenges.find(
      uc => uc.challenge_id === challengeId && uc.status === "active"
    );
    if (existing) return null;

    const { data, error } = await supabase
      .from("user_challenges")
      .insert({
        user_id: userId,
        challenge_id: challengeId,
      })
      .select()
      .single();

    if (error) {
      console.error("Error joining challenge:", error);
      return null;
    }

    setUserChallenges(prev => [data, ...prev]);
    return data;
  };

  const updateChallengeProgress = async () => {
    if (!userId) return;

    const activeChallenges = userChallenges.filter(uc => uc.status === "active");

    for (const uc of activeChallenges) {
      const challenge = challenges.find(c => c.id === uc.challenge_id);
      if (!challenge) continue;

      const newGoalsCompleted = uc.goals_completed + 1;
      const isCompleted = newGoalsCompleted >= challenge.target_goals;

      const startDate = new Date(uc.started_at);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + challenge.duration_days);
      const isExpired = new Date() > endDate;

      let newStatus = uc.status;
      if (isCompleted) newStatus = "completed";
      else if (isExpired) newStatus = "failed";

      const { error } = await supabase
        .from("user_challenges")
        .update({
          goals_completed: newGoalsCompleted,
          status: newStatus,
          completed_at: isCompleted ? new Date().toISOString() : null,
        })
        .eq("id", uc.id);

      if (!error) {
        setUserChallenges(prev =>
          prev.map(c =>
            c.id === uc.id
              ? {
                  ...c,
                  goals_completed: newGoalsCompleted,
                  status: newStatus,
                  completed_at: isCompleted ? new Date().toISOString() : null,
                }
              : c
          )
        );

        // Award badge if completed
        if (isCompleted) {
          await supabase.from("user_badges").insert({
            user_id: userId,
            badge_type: challenge.badge_reward,
            badge_name: challenge.name,
          });
        }
      }
    }
  };

  const getActiveChallenges = () => {
    return userChallenges
      .filter(uc => uc.status === "active")
      .map(uc => ({
        ...uc,
        challenge: challenges.find(c => c.id === uc.challenge_id),
      }));
  };

  const getCompletedChallenges = () => {
    return userChallenges
      .filter(uc => uc.status === "completed")
      .map(uc => ({
        ...uc,
        challenge: challenges.find(c => c.id === uc.challenge_id),
      }));
  };

  useEffect(() => {
    fetchChallenges();
  }, [fetchChallenges]);

  return {
    challenges,
    userChallenges,
    loading,
    joinChallenge,
    updateChallengeProgress,
    getActiveChallenges,
    getCompletedChallenges,
    refetch: fetchChallenges,
  };
};
