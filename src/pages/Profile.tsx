import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, User, Calendar, GraduationCap, BookOpen } from "lucide-react";

interface Profile {
  id: string;
  username: string;
  age: number | null;
  gender: string | null;
  education_standard: string | null;
  interested_subjects: string[] | null;
  balance: number;
}

const Profile = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      } else {
        fetchProfile(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        if (!session) {
          navigate("/auth");
        } else if (session.user) {
          fetchProfile(session.user.id);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (!error && data) {
      setProfile(data);
    }
  };

  if (!session || !profile) return null;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Dashboard
      </Button>
      
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-full bg-gradient-primary flex items-center justify-center">
                <User className="w-8 h-8 text-primary-foreground" />
              </div>
              <div>
                <CardTitle className="text-2xl">{profile.username}</CardTitle>
                <p className="text-sm text-muted-foreground">{session.user.email}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {profile.age && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Calendar className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Age</p>
                    <p className="font-medium">{profile.age} years</p>
                  </div>
                </div>
              )}
              {profile.gender && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <User className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Gender</p>
                    <p className="font-medium capitalize">{profile.gender}</p>
                  </div>
                </div>
              )}
            </div>

            {profile.education_standard && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <GraduationCap className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Education Level</p>
                  <p className="font-medium">{profile.education_standard}</p>
                </div>
              </div>
            )}

            {profile.interested_subjects && profile.interested_subjects.length > 0 && (
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 mb-3">
                  <BookOpen className="w-5 h-5 text-primary" />
                  <p className="text-sm text-muted-foreground font-medium">Interested Subjects</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {profile.interested_subjects.map((subject) => (
                    <Badge key={subject} variant="secondary">
                      {subject}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="p-3 rounded-lg bg-gradient-primary/10 border border-primary/20">
              <p className="text-sm text-muted-foreground">Time Balance</p>
              <p className="text-2xl font-bold text-primary">{Math.floor(profile.balance / 3600)}h {Math.floor((profile.balance % 3600) / 60)}m</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
