import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Wallet, Clock, Target, TrendingUp, Sparkles } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard");
      }
    });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary">
      <nav className="border-b border-border bg-card/30 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center">
              <Wallet className="w-5 h-5 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              TimeWallet
            </h1>
          </div>
          <Button onClick={() => navigate("/auth")}>Get Started</Button>
        </div>
      </nav>

      <main className="container mx-auto px-4">
        <section className="py-20 text-center">
          <div className="max-w-3xl mx-auto space-y-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-primary mb-6 shadow-glow-primary animate-pulse">
              <Clock className="w-10 h-10 text-primary-foreground" />
            </div>
            
            <h2 className="text-5xl md:text-6xl font-bold leading-tight">
              Invest Your Time
              <br />
              <span className="bg-gradient-primary bg-clip-text text-transparent">
                Like Money
              </span>
            </h2>
            
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Every goal you complete adds time to your TimeWallet. Invest your effort, reap the rewards, and see your productivity soar.   
            </p>

            <div className="flex gap-4 justify-center">
              <Button size="lg" onClick={() => navigate("/auth")} className="text-lg">
                <Sparkles className="w-5 h-5 mr-2" />
                Start Managing Time
              </Button>
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="text-center space-y-4 p-6 rounded-xl bg-card/50 border border-border hover:border-primary/50 transition-all duration-300">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Target className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold">Set Clear Goals</h3>
              <p className="text-muted-foreground">
                Define your objectives with deadlines. AI generates a structured routine to help you succeed.
              </p>
            </div>

            <div className="text-center space-y-4 p-6 rounded-xl bg-card/50 border border-border hover:border-primary/50 transition-all duration-300">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Clock className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold">Track Your Time</h3>
              <p className="text-muted-foreground">
                Every goal adds time to your wallet.
              </p>
            </div>

            <div className="text-center space-y-4 p-6 rounded-xl bg-card/50 border border-border hover:border-primary/50 transition-all duration-300">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold">Build Momentum</h3>
              <p className="text-muted-foreground">
                Complete goals ro redeem rewards
              </p>
            </div>
          </div>
        </section>

        <section className="py-20 text-center">
          <div className="max-w-2xl mx-auto space-y-6">
            <h3 className="text-3xl font-bold">Ready to Transform Your Productivity?</h3>
            <p className="text-muted-foreground text-lg">
              Join TimeWallet and start treating every second as a valuable asset.
            </p>
            <Button size="lg" onClick={() => navigate("/auth")}>
              Create Your Wallet
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8 mt-20">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2025 TimeWallet. Make every second count.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
