import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Upload, FileText, Image, X, CheckCircle2, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface UploadedFile {
  id: string;
  name: string;
  type: "pdf" | "image";
  size: string;
  category: "syllabus" | "question-paper";
  file: File;
}

export default function UploadPage() {
  const { toast } = useToast();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [syllabusFiles, setSyllabusFiles] = useState<UploadedFile[]>([]);
  const [questionPaperFiles, setQuestionPaperFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [existingSyllabus, setExistingSyllabus] = useState<number>(0);
  const [existingPapers, setExistingPapers] = useState<number>(0);

  useEffect(() => {
    if (!loading && !user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to upload files",
        variant: "destructive",
      });
      navigate("/auth");
    }
  }, [user, loading, navigate, toast]);

  useEffect(() => {
    if (user) {
      fetchExistingFiles();
    }
  }, [user]);

  const fetchExistingFiles = async () => {
    if (!user) return;
    
    const { count: syllabusCount } = await supabase
      .from("syllabus")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);
    
    const { count: papersCount } = await supabase
      .from("past_papers")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);
    
    setExistingSyllabus(syllabusCount || 0);
    setExistingPapers(papersCount || 0);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const handleFileUpload = useCallback(
    (category: "syllabus" | "question-paper") =>
      (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files) return;

        const newFiles: UploadedFile[] = Array.from(files).map((file) => ({
          id: crypto.randomUUID(),
          name: file.name,
          type: file.type.includes("pdf") ? "pdf" : "image",
          size: formatFileSize(file.size),
          category,
          file,
        }));

        if (category === "syllabus") {
          setSyllabusFiles((prev) => [...prev, ...newFiles]);
        } else {
          setQuestionPaperFiles((prev) => [...prev, ...newFiles]);
        }
        
        toast({
          title: "Files ready",
          description: `${newFiles.length} file(s) added. Click "Start AI Analysis" to upload and analyze.`,
        });
      },
    [toast]
  );

  const removeFile = (category: "syllabus" | "question-paper", id: string) => {
    if (category === "syllabus") {
      setSyllabusFiles((prev) => prev.filter((f) => f.id !== id));
    } else {
      setQuestionPaperFiles((prev) => prev.filter((f) => f.id !== id));
    }
  };

  const uploadFilesToStorage = async () => {
    if (!user) return;

    const uploadPromises: Promise<void>[] = [];

    // Upload syllabus files
    for (const file of syllabusFiles) {
      const filePath = `${user.id}/${crypto.randomUUID()}-${file.name}`;
      
      const uploadPromise = supabase.storage
        .from("syllabus")
        .upload(filePath, file.file)
        .then(async ({ data, error }) => {
          if (error) throw error;
          
          const { data: publicUrl } = supabase.storage
            .from("syllabus")
            .getPublicUrl(filePath);
          
          await supabase.from("syllabus").insert({
            user_id: user.id,
            title: file.name,
            file_url: publicUrl.publicUrl,
          });
        });
      
      uploadPromises.push(uploadPromise);
    }

    // Upload question paper files
    for (const file of questionPaperFiles) {
      const filePath = `${user.id}/${crypto.randomUUID()}-${file.name}`;
      
      // Extract year from filename or default to current year
      const yearMatch = file.name.match(/20\d{2}/);
      const year = yearMatch ? yearMatch[0] : new Date().getFullYear().toString();
      
      // Extract subject from filename
      const subject = file.name.replace(/\.\w+$/, "").replace(/20\d{2}/, "").trim() || "General";
      
      const uploadPromise = supabase.storage
        .from("past-papers")
        .upload(filePath, file.file)
        .then(async ({ data, error }) => {
          if (error) throw error;
          
          const { data: publicUrl } = supabase.storage
            .from("past-papers")
            .getPublicUrl(filePath);
          
          await supabase.from("past_papers").insert({
            user_id: user.id,
            year,
            subject,
            file_url: publicUrl.publicUrl,
          });
        });
      
      uploadPromises.push(uploadPromise);
    }

    await Promise.all(uploadPromises);
  };

  const handleAnalyze = async () => {
    if (syllabusFiles.length === 0 && questionPaperFiles.length === 0) {
      toast({
        title: "No files selected",
        description: "Please select at least one file before analyzing",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to upload files",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    setUploading(true);

    try {
      await uploadFilesToStorage();
      
      toast({
        title: "Upload successful!",
        description: "Your files have been uploaded. You can now ask AI questions about them.",
      });
      
      // Clear local files and refresh counts
      setSyllabusFiles([]);
      setQuestionPaperFiles([]);
      await fetchExistingFiles();
      
      // Navigate to Ask AI page
      navigate("/ask-ai");
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: "There was an error uploading your files. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
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
          className="max-w-4xl mx-auto"
        >
          <div className="text-center mb-12">
            <h1 className="font-heading text-3xl sm:text-4xl font-bold mb-4">
              Upload Your Study Materials
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Upload your syllabus and past question papers. Our AI will analyze
              patterns and help you prepare better.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Syllabus Upload */}
            <Card variant="gradient">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Syllabus
                </CardTitle>
                <CardDescription>
                  Upload your course syllabus (PDF format preferred)
                  {existingSyllabus > 0 && (
                    <span className="block mt-1 text-primary">
                      {existingSyllabus} file(s) already uploaded
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-border rounded-xl hover:border-primary/50 hover:bg-primary/5 transition-colors cursor-pointer">
                  <Upload className="w-10 h-10 text-muted-foreground mb-3" />
                  <span className="text-sm text-muted-foreground">
                    Click to upload or drag and drop
                  </span>
                  <span className="text-xs text-muted-foreground mt-1">
                    PDF, DOC up to 10MB
                  </span>
                  <Input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    multiple
                    className="hidden"
                    onChange={handleFileUpload("syllabus")}
                  />
                </label>

                {/* Uploaded Files List */}
                <AnimatePresence>
                  {syllabusFiles.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4 space-y-2"
                    >
                      {syllabusFiles.map((file) => (
                        <motion.div
                          key={file.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <FileText className="w-4 h-4 text-primary" />
                            <div>
                              <p className="text-sm font-medium truncate max-w-[150px]">
                                {file.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {file.size}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => removeFile("syllabus", file.id)}
                            className="p-1 hover:bg-destructive/10 rounded-lg transition-colors"
                          >
                            <X className="w-4 h-4 text-destructive" />
                          </button>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>

            {/* Question Papers Upload */}
            <Card variant="gradient">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Image className="w-5 h-5 text-primary" />
                  Question Papers
                </CardTitle>
                <CardDescription>
                  Upload past years question papers (PDF or images)
                  {existingPapers > 0 && (
                    <span className="block mt-1 text-primary">
                      {existingPapers} paper(s) already uploaded
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-border rounded-xl hover:border-primary/50 hover:bg-primary/5 transition-colors cursor-pointer">
                  <Upload className="w-10 h-10 text-muted-foreground mb-3" />
                  <span className="text-sm text-muted-foreground">
                    Click to upload or drag and drop
                  </span>
                  <span className="text-xs text-muted-foreground mt-1">
                    PDF, PNG, JPG up to 10MB each
                  </span>
                  <Input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    multiple
                    className="hidden"
                    onChange={handleFileUpload("question-paper")}
                  />
                </label>

                {/* Uploaded Files List */}
                <AnimatePresence>
                  {questionPaperFiles.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4 space-y-2"
                    >
                      {questionPaperFiles.map((file) => (
                        <motion.div
                          key={file.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            {file.type === "pdf" ? (
                              <FileText className="w-4 h-4 text-primary" />
                            ) : (
                              <Image className="w-4 h-4 text-primary" />
                            )}
                            <div>
                              <p className="text-sm font-medium truncate max-w-[150px]">
                                {file.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {file.size}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => removeFile("question-paper", file.id)}
                            className="p-1 hover:bg-destructive/10 rounded-lg transition-colors"
                          >
                            <X className="w-4 h-4 text-destructive" />
                          </button>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </div>

          {/* Status Summary */}
          <Card variant="default" className="mb-8">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className={`w-5 h-5 ${syllabusFiles.length > 0 || existingSyllabus > 0 ? "text-success" : "text-muted-foreground"}`} />
                    <span className="text-sm">
                      {syllabusFiles.length + existingSyllabus} Syllabus file(s)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className={`w-5 h-5 ${questionPaperFiles.length > 0 || existingPapers > 0 ? "text-success" : "text-muted-foreground"}`} />
                    <span className="text-sm">
                      {questionPaperFiles.length + existingPapers} Question paper(s)
                    </span>
                  </div>
                </div>
                <Button
                  variant="hero"
                  size="lg"
                  onClick={handleAnalyze}
                  disabled={uploading || (syllabusFiles.length === 0 && questionPaperFiles.length === 0)}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      Start AI Analysis
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Tips */}
          <div className="text-center text-sm text-muted-foreground">
            <p>
              Tip: Upload question papers from at least 5-10 years for better
              analysis and predictions.
            </p>
          </div>
        </motion.div>
      </div>
    </Layout>
  );
}
