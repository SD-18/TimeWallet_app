import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, User, Calendar, GraduationCap, BookOpen, X } from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

interface Profile {
  id: string;
  username: string;
  age?: number | null;
  gender?: string | null;
  education_standard?: string | null;
  interested_subjects?: string[] | string | null;
  balance: number;
}

const EDUCATION_OPTIONS = [
  "6th", "7th", "8th", "9th", "10th",
  "11th", "12th", "College", "Other"
];

const toArray = (value: string[] | string | null | undefined): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  const s = String(value).trim();
  if (s.startsWith("{") && s.endsWith("}")) {
    const inner = s.slice(1, -1).trim();
    if (!inner) return [];
    return inner.split(",").map((x) => x.trim()).filter(Boolean);
  }
  try {
    const parsed = JSON.parse(s);
    if (Array.isArray(parsed)) return parsed.map(String);
  } catch {}
  if (s.includes(",")) return s.split(",").map((x) => x.trim()).filter(Boolean);
  return [s];
};

const ProfilePage = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  // edit state
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    username: "",
    age: "",
    gender: "",
    education_standard: "", // will match Select value
    interested_subjects: [] as string[], // array for chips
  });
  const [newSubject, setNewSubject] = useState("");
  const [saving, setSaving] = useState(false);

  // change password
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

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
        } else if (session?.user) {
          fetchProfile(session.user.id);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (!error && data) {
      setProfile(data);
      // initialize form values
      setForm({
        username: data.username ?? "",
        age: data.age != null ? String(data.age) : "",
        gender: data.gender ?? "",
        education_standard: data.education_standard ?? "",
        interested_subjects: toArray(data.interested_subjects),
      });
    } else {
      console.error("Failed to fetch profile", error);
    }
  };

  if (!session || !profile) return null;

  const subjects = toArray(profile.interested_subjects);

  // helpers to update form fields
  const updateField = (key: keyof typeof form, value: string | string[]) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const handleStartEdit = () => {
    setIsEditing(true);
  };
  const handleCancelEdit = () => {
    // restore form to current profile
    setForm({
      username: profile.username ?? "",
      age: profile.age != null ? String(profile.age) : "",
      gender: profile.gender ?? "",
      education_standard: profile.education_standard ?? "",
      interested_subjects: toArray(profile.interested_subjects),
    });
    setNewSubject("");
    setIsEditing(false);
  };

  const handleAddSubject = () => {
    const s = (newSubject || "").trim();
    if (!s) {
      toast.error("Enter a subject to add");
      return;
    }
    // prevent duplicates
    const lower = s.toLowerCase();
    const exists = form.interested_subjects.some((sub) => sub.toLowerCase() === lower);
    if (exists) {
      toast.info("Subject already added");
      setNewSubject("");
      return;
    }
    updateField("interested_subjects", [...form.interested_subjects, s]);
    setNewSubject("");
  };

  const handleRemoveSubject = (subject: string) => {
    updateField(
      "interested_subjects",
      form.interested_subjects.filter((s) => s !== subject)
    );
  };

  const handleSave = async () => {
    // basic validation
    if (!form.username.trim()) {
      toast.error("Username cannot be empty");
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        username: form.username.trim(),
        education_standard: form.education_standard || null,
        gender: form.gender || null,
        age: form.age ? Number(form.age) : null,
      };

      // write array or null
      payload.interested_subjects = form.interested_subjects.length > 0 ? form.interested_subjects : null;

      const { error } = await supabase
        .from("profiles")
        .update(payload)
        .eq("id", profile.id);

      if (error) {
        console.error("Profile update error", error);
        toast.error(error.message || "Failed to update profile");
      } else {
        toast.success("Profile updated");
        // refresh
        await fetchProfile(profile.id);
        setIsEditing(false);
      }
    } catch (err: any) {
      console.error("Save profile failed", err);
      toast.error(err?.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setPwLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        console.error("Password update error", error);
        toast.error(error.message || "Failed to update password");
      } else {
        toast.success("Password updated successfully");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (err: any) {
      console.error("Password update failed", err);
      toast.error(err?.message || "Failed to update password");
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Dashboard
      </Button>

      <div className="space-y-6">
        {/* Main profile card with warm-gold gradient */}
        <Card className="bg-gradient-to-br from-[#F5E6D2] via-[#F9F4EA] to-[#E6C79E] border border-[#E0C6A1] shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#E6C79E] to-[#DDB68A] flex items-center justify-center">
                <User className="w-8 h-8 text-primary-foreground" />
              </div>
              <div className="flex-1">
                {!isEditing ? (
                  <>
                    <CardTitle className="text-2xl">{profile.username}</CardTitle>
                    <p className="text-sm text-muted-foreground">{session.user.email}</p>
                  </>
                ) : (
                  <>
                    <Input
                      value={form.username}
                      onChange={(e) => updateField("username", e.target.value)}
                      placeholder="Username"
                      className="mb-2 max-w-xs"
                    />
                    <p className="text-sm text-muted-foreground">{session.user.email}</p>
                  </>
                )}
              </div>

              {/* edit / save actions */}
              <div className="flex items-center gap-2">
                {!isEditing ? (
                  <Button variant="ghost" onClick={handleStartEdit}>Edit</Button>
                ) : (
                  <>
                    <Button variant="ghost" onClick={handleCancelEdit}>Cancel</Button>
                    <Button onClick={handleSave} disabled={saving}>
                      {saving ? "Saving..." : "Save"}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="grid gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {!isEditing ? (
                <>
                  {profile.age != null && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-[#FBF5EE]">
                      <Calendar className="w-5 h-5 text-[#C68F4A]" />
                      <div>
                        <p className="text-sm text-muted-foreground">Age</p>
                        <p className="font-medium">{profile.age} years</p>
                      </div>
                    </div>
                  )}
                  {profile.gender && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-[#FBF5EE]">
                      <User className="w-5 h-5 text-[#C68F4A]" />
                      <div>
                        <p className="text-sm text-muted-foreground">Gender</p>
                        <p className="font-medium capitalize">{profile.gender}</p>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-[#FBF5EE]">
                    <Calendar className="w-5 h-5 text-[#C68F4A]" />
                    <div className="flex-1">
                      <Label>Age</Label>
                      <Input
                        value={form.age}
                        onChange={(e) => updateField("age", e.target.value)}
                        type="number"
                        min={5}
                        max={120}
                        placeholder="Age"
                        className="max-w-xs"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-lg bg-[#FBF5EE]">
                    <User className="w-5 h-5 text-[#C68F4A]" />
                    <div className="flex-1">
                      <Label>Gender</Label>
                      <Input
                        value={form.gender}
                        onChange={(e) => updateField("gender", e.target.value)}
                        placeholder="Gender"
                        className="max-w-xs capitalize"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Education select */}
            {!isEditing ? (
              profile.education_standard && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-[#FBF5EE]">
                  <GraduationCap className="w-5 h-5 text-[#C68F4A]" />
                  <div>
                    <p className="text-sm text-muted-foreground">Education Level</p>
                    <p className="font-medium">{profile.education_standard}</p>
                  </div>
                </div>
              )
            ) : (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-[#FBF5EE]">
                <GraduationCap className="w-5 h-5 text-[#C68F4A]" />
                <div className="flex-1">
                  <Label>Education Level</Label>
                  <Select
                    value={form.education_standard}
                    onValueChange={(v) => updateField("education_standard", v)}
                  >
                    <SelectTrigger className="max-w-xs">
                      <SelectValue placeholder="Select your grade/level" />
                    </SelectTrigger>
                    <SelectContent>
                      {EDUCATION_OPTIONS.map((opt) => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Interested subjects - display or chips editor */}
            {!isEditing ? (
              subjects.length > 0 && (
                <div className="p-3 rounded-lg bg-[#FBF5EE]">
                  <div className="flex items-center gap-2 mb-3">
                    <BookOpen className="w-5 h-5 text-[#C68F4A]" />
                    <p className="text-sm text-muted-foreground font-medium">Interested Subjects</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {subjects.map((subject) => (
                      <Badge key={subject} variant="secondary">
                        {subject}
                      </Badge>
                    ))}
                  </div>
                </div>
              )
            ) : (
              <div className="p-3 rounded-lg bg-[#FBF5EE]">
                <div className="flex items-center gap-2 mb-3">
                  <BookOpen className="w-5 h-5 text-[#C68F4A]" />
                  <p className="text-sm text-muted-foreground font-medium">Interested Subjects</p>
                </div>

                {/* chips row */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {form.interested_subjects.map((sub) => (
                    <div key={sub} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E6C79E]/30 text-sm">
                      <span className="capitalize">{sub}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSubject(sub)}
                        className="flex items-center justify-center rounded-full p-1 hover:bg-[#E6C79E]/20"
                        aria-label={`Remove ${sub}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* add new subject */}
                <div className="flex gap-2 items-center">
                  <Input
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    placeholder="Add subject (e.g. Mathematics)"
                    className="flex-1 max-w-sm"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddSubject();
                      }
                    }}
                  />
                  <Button onClick={handleAddSubject}>Add</Button>
                </div>

                <p className="text-xs text-muted-foreground mt-2">Add subjects one-by-one. Remove by clicking the × on a chip.</p>
              </div>
            )}

            <div className="p-3 rounded-lg bg-gradient-to-br from-[#FFF9F1] to-[#F5E6D2] border border-[#E0C6A1]">
              <p className="text-sm text-muted-foreground">Time Balance</p>
              <p className="text-2xl font-bold text-[#C68F4A]">
                {Math.floor(profile.balance / 3600)}h {Math.floor((profile.balance % 3600) / 60)}m
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Security card with same warm gradient */}
        <Card className="bg-gradient-to-br from-[#F5E6D2] via-[#F9F4EA] to-[#E6C79E] border border-[#E0C6A1] shadow-sm">
          <CardHeader>
            <CardTitle>Security</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-w-md">
              <div>
                <Label>New Password</Label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                />
              </div>
              <div>
                <Label>Confirm Password</Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleChangePassword} disabled={pwLoading}>
                  {pwLoading ? "Updating..." : "Change Password"}
                </Button>
                <Button variant="ghost" onClick={() => { setNewPassword(""); setConfirmPassword(""); }}>
                  Clear
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Password must be at least 6 characters.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProfilePage;
