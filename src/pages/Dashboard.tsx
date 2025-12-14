import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { LogOut, Plus } from "lucide-react";
import { toast } from "sonner";
import WalletBalance from "@/components/WalletBalance";
import GoalsList from "@/components/GoalsList";
import CreateGoalDialog from "@/components/CreateGoalDialog";

import Notepad from "@/components/Notepad";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

const Dashboard = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [isCreateGoalOpen, setIsCreateGoalOpen] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        if (!session) {
          navigate("/auth");
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
    navigate("/auth");
  };

  if (!session) return null;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          <header className="border-b border-border bg-card/30 backdrop-blur-sm sticky top-0 z-10">
            <div className="container mx-auto px-4 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SidebarTrigger />
                <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                  TimeWallet
                </h1>
              </div>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </header>

          <main className="container mx-auto px-4 py-8 space-y-8">
            {/* Top Section - Wallet & Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <WalletBalance userId={session.user.id} />
              </div>
              <div className="flex flex-col gap-4">
                <Button 
                  onClick={() => setIsCreateGoalOpen(true)} 
                  className="w-full h-16 text-lg"
                  size="lg"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Create New Goal
                </Button>
                <Notepad userId={session.user.id} />
              </div>
            </div>

            {/* Goals Section */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Your Goals</h2>
              <GoalsList userId={session.user.id} />
            </div>
          </main>

          <CreateGoalDialog
            open={isCreateGoalOpen}
            onOpenChange={setIsCreateGoalOpen}
            userId={session.user.id}
          />
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;
