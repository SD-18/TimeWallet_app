import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Trash2, Check } from "lucide-react";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface Reminder {
  id: string;
  title: string;
  description: string | null;
  reminder_date: string;
  is_completed: boolean;
}

const Reminders = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState("09:00");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      } else {
        fetchReminders(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        if (!session) {
          navigate("/auth");
        } else {
          fetchReminders(session.user.id);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchReminders = async (userId: string) => {
    const { data, error } = await supabase
      .from("reminders")
      .select("*")
      .eq("user_id", userId)
      .order("reminder_date", { ascending: true });

    if (error) {
      toast.error("Failed to load reminders");
      return;
    }

    setReminders(data || []);
  };

  const handleCreateReminder = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!session || !selectedDate) return;

    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;

    // Combine date and time
    const [hours, minutes] = selectedTime.split(":");
    const reminderDateTime = new Date(selectedDate);
    reminderDateTime.setHours(parseInt(hours), parseInt(minutes));

    const { error } = await supabase.from("reminders").insert({
      user_id: session.user.id,
      title,
      description: description || null,
      reminder_date: reminderDateTime.toISOString(),
    });

    setLoading(false);

    if (error) {
      toast.error("Failed to create reminder");
      return;
    }

    toast.success("Reminder created successfully");
    setIsDialogOpen(false);
    fetchReminders(session.user.id);
    e.currentTarget.reset();
    setSelectedDate(undefined);
    setSelectedTime("09:00");
  };

  const toggleComplete = async (id: string, currentStatus: boolean) => {
    if (!session) return;

    const { error } = await supabase
      .from("reminders")
      .update({ is_completed: !currentStatus })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update reminder");
      return;
    }

    fetchReminders(session.user.id);
    toast.success(currentStatus ? "Reminder marked as incomplete" : "Reminder completed");
  };

  const deleteReminder = async (id: string) => {
    if (!session) return;

    const { error } = await supabase.from("reminders").delete().eq("id", id);

    if (error) {
      toast.error("Failed to delete reminder");
      return;
    }

    fetchReminders(session.user.id);
    toast.success("Reminder deleted");
  };

  if (!session) return null;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Reminder
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Reminder</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateReminder} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  name="title"
                  placeholder="Meeting with team"
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Discuss Q1 goals..."
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label>Date & Time</Label>
                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "flex-1 justify-start text-left font-normal",
                          !selectedDate && "text-muted-foreground"
                        )}
                      >
                        {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>

                  <Input
                    type="time"
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                    className="w-32"
                    required
                  />
                </div>
              </div>

              <Button type="submit" disabled={loading || !selectedDate} className="w-full">
                {loading ? "Creating..." : "Create Reminder"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <h1 className="text-3xl font-bold mb-4">Reminders</h1>
      <p className="text-muted-foreground mb-6">Set reminders for important meetings</p>

      <div className="space-y-3">
        {reminders.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              No reminders yet. Create one to get started!
            </CardContent>
          </Card>
        ) : (
          reminders.map((reminder) => (
            <Card
              key={reminder.id}
              className={cn(
                "transition-opacity",
                reminder.is_completed && "opacity-60"
              )}
            >
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleComplete(reminder.id, reminder.is_completed)}
                      className="mt-0.5"
                    >
                      <Check
                        className={cn(
                          "w-5 h-5",
                          reminder.is_completed && "text-success"
                        )}
                      />
                    </Button>
                    <div className="flex-1">
                      <h3
                        className={cn(
                          "font-semibold mb-1",
                          reminder.is_completed && "line-through"
                        )}
                      >
                        {reminder.title}
                      </h3>
                      {reminder.description && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {reminder.description}
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(reminder.reminder_date), "PPP 'at' p")}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteReminder(reminder.id)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default Reminders;
