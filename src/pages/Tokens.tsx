import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Gift } from "lucide-react";
import { toast } from "sonner";

const Tokens = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);

  // 🔮 Future scope values
  const [tokenCount] = useState<number>(0); // starts at 0
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) navigate("/auth");
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        if (!session) navigate("/auth");
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (!session) return null;

  // 🎟 Generate random discount code (hash)
  const generateTokenCode = () => {
    const randomHash =
      Math.random().toString(36).substring(2, 10).toUpperCase() +
      "-" +
      Math.random().toString(36).substring(2, 6).toUpperCase();

    setGeneratedCode(randomHash);
    toast.success("Token code generated successfully");
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      {/* Back */}
      <Button
        variant="ghost"
        onClick={() => navigate("/dashboard")}
        className="mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Dashboard
      </Button>

      <h1 className="text-3xl font-bold mb-6">Tokens</h1>

      {/* Token Summary */}
      <Card className="mb-6">
        <CardContent className="pt-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Your Token Balance</p>
            <p className="text-4xl font-bold">{tokenCount}</p>
          </div>
          <Gift className="w-10 h-10 text-primary" />
        </CardContent>
      </Card>

      {/* Terms / Explanation */}
      <Card className="mb-6">
        <CardContent className="pt-6 space-y-3 text-sm text-muted-foreground">
          <p>
            Tokens are a <span className="font-medium text-foreground">reward system</span>
            designed to encourage consistent and focused usage of TimeWallet.
          </p>
          <p>
            For every <span className="font-medium text-foreground">50 hours</span> of
            productive time successfully completed in the app, you earn
            <span className="font-medium text-foreground"> 1 token</span>.
          </p>
          <p>
            Once you collect <span className="font-medium text-foreground">4 tokens</span>,
            you become eligible to generate a special reward code.
          </p>
          <p>
            This code can be used in the future to unlock exclusive benefits or
            discounts when TimeWallet partners with external platforms.
          </p>
          <p className="italic">
            This feature is currently in development and will be activated
            automatically once tracking is enabled.
          </p>
        </CardContent>
      </Card>

      {/* Generate Code */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <Button
            className="w-full"
            disabled={tokenCount < 4}
            onClick={generateTokenCode}
          >
            Generate Reward Code
          </Button>

          {tokenCount < 4 && (
            <p className="text-xs text-muted-foreground text-center">
              You need at least 4 tokens to generate a reward code.
            </p>
          )}

          {generatedCode && (
            <div className="mt-4 p-4 border rounded-md bg-muted text-center">
              <p className="text-sm text-muted-foreground mb-1">
                Your Reward Code
              </p>
              <p className="text-lg font-mono font-semibold tracking-wider">
                {generatedCode}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Tokens;
