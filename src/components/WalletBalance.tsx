import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Wallet, TrendingUp, TrendingDown } from "lucide-react";

interface WalletBalanceProps {
  userId: string;
}

const WalletBalance = ({ userId }: WalletBalanceProps) => {
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBalance = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("balance")
        .eq("id", userId)
        .single();

      if (!error && data) {
        setBalance(data.balance);
      }
      setLoading(false);
    };

    fetchBalance();

    const channel = supabase
      .channel("profile-changes")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          setBalance((payload.new as any).balance);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(Math.abs(seconds) / 3600);
    const minutes = Math.floor((Math.abs(seconds) % 3600) / 60);
    const secs = Math.abs(seconds) % 60;

    return {
      hours,
      minutes,
      seconds: secs,
      isNegative: seconds < 0,
    };
  };

  const time = formatTime(balance);

  if (loading) {
    return (
      <Card className="bg-gradient-card border-border">
        <CardContent className="p-8">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-32 mb-4"></div>
            <div className="h-16 bg-muted rounded w-48"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-card border-border relative overflow-hidden group hover:shadow-glow-primary transition-all duration-300">
      <div className="absolute inset-0 bg-gradient-primary opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
      <CardContent className="p-8 relative">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1 flex items-center gap-2">
              <Wallet className="w-4 h-4" />
              Time Wallet
            </p>
            <div className="flex items-baseline gap-3">
              <h2 className={`text-5xl font-bold ${time.isNegative ? "text-destructive" : "text-foreground"}`}>
                {time.isNegative && "-"}
                {time.hours}
                <span className="text-2xl text-muted-foreground">h</span>{" "}
                {time.minutes}
                <span className="text-2xl text-muted-foreground">m</span>
              </h2>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {time.isNegative ? (
                <span className="flex items-center gap-1 text-destructive">
                  <TrendingDown className="w-3 h-3" />
                  In debt
                </span>
              ) : (
                <span className="flex items-center gap-1 text-success">
                  <TrendingUp className="w-3 h-3" />
                  Invested
                </span>
              )}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Total seconds</p>
            <p className="text-lg font-mono">{balance.toLocaleString()}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WalletBalance;
