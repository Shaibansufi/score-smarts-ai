import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  FileText, 
  Search, 
  Plus, 
  Trash2, 
  Download, 
  Clock, 
  BookOpen,
  FolderOpen,
  Star,
  StarOff,
  Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface Note {
  id: string;
  title: string;
  content: string;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

export default function Notes() {
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "favorites">("all");
  const [newNoteOpen, setNewNoteOpen] = useState(false);
  const [newNote, setNewNote] = useState({ title: "", content: "" });
  const [viewNote, setViewNote] = useState<Note | null>(null);

  useEffect(() => {
    if (!authLoading && user) {
      fetchNotes();
    } else if (!authLoading && !user) {
      setLoading(false);
    }
  }, [user, authLoading]);

  const fetchNotes = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("study_notes")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (error) {
      console.error("Error fetching notes:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredNotes = notes.filter((note) => {
    const matchesSearch = note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filter === "all" || (filter === "favorites" && note.is_favorite);
    return matchesSearch && matchesFilter;
  });

  const toggleFavorite = async (id: string, currentValue: boolean) => {
    try {
      const { error } = await supabase
        .from("study_notes")
        .update({ is_favorite: !currentValue })
        .eq("id", id);

      if (error) throw error;
      
      setNotes((prev) =>
        prev.map((note) =>
          note.id === id ? { ...note, is_favorite: !currentValue } : note
        )
      );
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update favorite",
        variant: "destructive",
      });
    }
  };

  const deleteNote = async (id: string) => {
    try {
      const { error } = await supabase
        .from("study_notes")
        .delete()
        .eq("id", id);

      if (error) throw error;
      
      setNotes((prev) => prev.filter((note) => note.id !== id));
      toast({ title: "Note deleted" });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete note",
        variant: "destructive",
      });
    }
  };

  const createNote = async () => {
    if (!user || !newNote.title.trim() || !newNote.content.trim()) {
      toast({
        title: "Error",
        description: "Please fill in both title and content",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from("study_notes")
        .insert({
          user_id: user.id,
          title: newNote.title,
          content: newNote.content,
        })
        .select()
        .single();

      if (error) throw error;
      
      setNotes((prev) => [data, ...prev]);
      setNewNote({ title: "", content: "" });
      setNewNoteOpen(false);
      toast({ title: "Note created!" });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create note",
        variant: "destructive",
      });
    }
  };

  const exportNote = (note: Note) => {
    const blob = new Blob([`# ${note.title}\n\n${note.content}`], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${note.title.replace(/\s+/g, "-")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Downloaded!" });
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(dateString));
  };

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!user) {
    return (
      <Layout>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Card variant="gradient" className="max-w-md mx-auto text-center py-16">
            <CardContent>
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-heading font-semibold text-xl mb-2">
                Sign in to view notes
              </h3>
              <p className="text-muted-foreground mb-6">
                Create an account to save and manage your study notes
              </p>
              <Button variant="hero" onClick={() => navigate("/auth")}>
                Sign In
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-5xl mx-auto"
        >
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="font-heading text-3xl sm:text-4xl font-bold mb-2">
                My Notes
              </h1>
              <p className="text-muted-foreground">
                Your saved AI-generated answers and study notes
              </p>
            </div>
            <Dialog open={newNoteOpen} onOpenChange={setNewNoteOpen}>
              <DialogTrigger asChild>
                <Button variant="hero" className="gap-2">
                  <Plus className="w-4 h-4" />
                  New Note
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Note</DialogTitle>
                  <DialogDescription>
                    Add a new study note to your collection
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <Input
                    placeholder="Note title..."
                    value={newNote.title}
                    onChange={(e) => setNewNote(prev => ({ ...prev, title: e.target.value }))}
                  />
                  <Textarea
                    placeholder="Note content..."
                    rows={6}
                    value={newNote.content}
                    onChange={(e) => setNewNote(prev => ({ ...prev, content: e.target.value }))}
                  />
                  <Button onClick={createNote} className="w-full">
                    Create Note
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Search and Filters */}
          <Card variant="default" className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search notes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={filter === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilter("all")}
                  >
                    <FolderOpen className="w-4 h-4 mr-2" />
                    All Notes
                  </Button>
                  <Button
                    variant={filter === "favorites" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilter("favorites")}
                  >
                    <Star className="w-4 h-4 mr-2" />
                    Favorites
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes Grid */}
          {filteredNotes.length === 0 ? (
            <Card variant="gradient" className="text-center py-16">
              <CardContent>
                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="font-heading font-semibold text-xl mb-2">
                  No notes found
                </h3>
                <p className="text-muted-foreground mb-6">
                  {searchQuery
                    ? "Try a different search term"
                    : "Start by asking the AI to generate study notes"}
                </p>
                <Button variant="hero" onClick={() => navigate("/ask-ai")}>
                  Ask AI to Generate Notes
                </Button>
              </CardContent>
            </Card>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              <AnimatePresence>
                {filteredNotes.map((note) => (
                  <motion.div
                    key={note.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                  >
                    <Card variant="interactive" className="h-full">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-lg truncate">
                              {note.title}
                            </CardTitle>
                            <CardDescription className="flex items-center gap-2 mt-1">
                              <span className="flex items-center gap-1 text-xs">
                                <Clock className="w-3 h-3" />
                                {formatDate(note.created_at)}
                              </span>
                            </CardDescription>
                          </div>
                          <button
                            onClick={() => toggleFavorite(note.id, note.is_favorite)}
                            className="p-2 hover:bg-muted rounded-lg transition-colors"
                          >
                            {note.is_favorite ? (
                              <Star className="w-4 h-4 text-warning fill-warning" />
                            ) : (
                              <StarOff className="w-4 h-4 text-muted-foreground" />
                            )}
                          </button>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                          {note.content}
                        </p>
                        <div className="flex items-center gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm" className="flex-1">
                                <BookOpen className="w-4 h-4 mr-2" />
                                View
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>{note.title}</DialogTitle>
                                <DialogDescription>
                                  Created on {formatDate(note.created_at)}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="pt-4">
                                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                                  {note.content}
                                </pre>
                              </div>
                            </DialogContent>
                          </Dialog>
                          <Button variant="ghost" size="sm" onClick={() => exportNote(note)}>
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteNote(note.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}

          {/* Quick Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8">
            <Card variant="gradient">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-heading font-bold text-primary">
                  {notes.length}
                </div>
                <div className="text-xs text-muted-foreground">Total Notes</div>
              </CardContent>
            </Card>
            <Card variant="gradient">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-heading font-bold text-warning">
                  {notes.filter((n) => n.is_favorite).length}
                </div>
                <div className="text-xs text-muted-foreground">Favorites</div>
              </CardContent>
            </Card>
            <Card variant="gradient">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-heading font-bold text-success">
                  {notes.length > 0 ? Math.round(notes.reduce((sum, n) => sum + n.content.length, 0) / 1000) : 0}K
                </div>
                <div className="text-xs text-muted-foreground">Characters</div>
              </CardContent>
            </Card>
            <Card variant="gradient">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-heading font-bold text-accent">
                  {notes.length * 2}
                </div>
                <div className="text-xs text-muted-foreground">Pages Saved</div>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </div>
    </Layout>
  );
}
