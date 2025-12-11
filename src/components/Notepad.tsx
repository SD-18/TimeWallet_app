import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface NotepadEntry {
  id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

interface NotepadProps {
  userId: string;
}

const Notepad = ({ userId }: NotepadProps) => {
  const [entries, setEntries] = useState<NotepadEntry[]>([]);
  const [newEntry, setNewEntry] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchEntries();
    
    // Real-time subscription
    const channel = supabase
      .channel('notepad_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notepad_entries',
          filter: `user_id=eq.${userId}`
        },
        () => {
          fetchEntries();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const fetchEntries = async () => {
    const { data, error } = await supabase
      .from("notepad_entries")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load notepad entries");
    } else if (data) {
      setEntries(data);
    }
  };

  const addEntry = async () => {
    if (!newEntry.trim()) {
      toast.error("Please write something first");
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from("notepad_entries")
      .insert({
        user_id: userId,
        content: newEntry.trim(),
      });

    if (error) {
      toast.error("Failed to add entry");
    } else {
      toast.success("Entry added!");
      setNewEntry("");
    }
    setLoading(false);
  };

  const deleteEntry = async (id: string) => {
    const { error } = await supabase
      .from("notepad_entries")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Failed to delete entry");
    } else {
      toast.success("Entry deleted");
    }
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          Productivity Notepad
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Track other productive tasks and accomplishments
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Textarea
            value={newEntry}
            onChange={(e) => setNewEntry(e.target.value)}
            placeholder="What productive task did you complete today?"
            rows={3}
            disabled={loading}
          />
          <Button
            onClick={addEntry}
            disabled={loading || !newEntry.trim()}
            className="w-full"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Entry
          </Button>
        </div>

        <div className="space-y-2">
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No entries yet. Start tracking your productive activities!
            </p>
          ) : (
            entries.map((entry) => (
              <Card key={entry.id} className="bg-secondary/30 border-border/50">
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-sm whitespace-pre-wrap">{entry.content}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteEntry(entry.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default Notepad;