import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Target, TrendingUp, Clock, AlertTriangle, Zap, ChevronRight, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface PredictedTopic {
  id: string;
  subject: string;
  topic: string;
  probability: number;
  frequency: number;
  difficulty: string;
  created_at: string;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const getDifficultyColor = (difficulty: string) => {
  switch (difficulty) {
    case "easy":
      return "bg-success/10 text-success border-success/20";
    case "medium":
      return "bg-warning/10 text-warning border-warning/20";
    case "hard":
      return "bg-destructive/10 text-destructive border-destructive/20";
    default:
      return "bg-muted text-muted-foreground";
  }
};

export default function Predictions() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [predictions, setPredictions] = useState<PredictedTopic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && user) {
      fetchPredictions();
    } else if (!authLoading && !user) {
      setLoading(false);
    }
  }, [user, authLoading]);

  const fetchPredictions = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("important_topics")
        .select("*")
        .eq("user_id", user.id)
        .order("probability", { ascending: false });

      if (error) throw error;
      setPredictions(data || []);
    } catch (error) {
      console.error("Error fetching predictions:", error);
    } finally {
      setLoading(false);
    }
  };

  const avgProbability = predictions.length > 0 
    ? Math.round(predictions.reduce((sum, p) => sum + Number(p.probability), 0) / predictions.length)
    : 0;

  const uniqueSubjects = new Set(predictions.map(p => p.subject)).size;

  if (authLoading || loading) {
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
          className="max-w-5xl mx-auto"
        >
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              <Target className="w-4 h-4" />
              AI-Powered Predictions
            </div>
            <h1 className="font-heading text-3xl sm:text-4xl font-bold mb-4">
              Predicted Important Topics
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {predictions.length > 0 
                ? "Based on your uploaded materials and AI analysis, here are the topics most likely to appear in your exam."
                : "Ask questions to the AI to generate topic predictions based on your study materials."}
            </p>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <Card variant="gradient">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <Target className="w-6 h-6 text-primary" />
                </div>
                <div className="text-3xl font-heading font-bold text-primary mb-1">
                  {predictions.length}
                </div>
                <div className="text-sm text-muted-foreground">Topics Identified</div>
              </CardContent>
            </Card>
            <Card variant="gradient">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center mx-auto mb-3">
                  <TrendingUp className="w-6 h-6 text-success" />
                </div>
                <div className="text-3xl font-heading font-bold text-success mb-1">
                  {avgProbability}%
                </div>
                <div className="text-sm text-muted-foreground">Avg. Probability</div>
              </CardContent>
            </Card>
            <Card variant="gradient">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center mx-auto mb-3">
                  <Clock className="w-6 h-6 text-warning" />
                </div>
                <div className="text-3xl font-heading font-bold text-warning mb-1">
                  {uniqueSubjects}
                </div>
                <div className="text-sm text-muted-foreground">Subjects Covered</div>
              </CardContent>
            </Card>
          </div>

          {/* Predictions List */}
          {predictions.length === 0 ? (
            <Card variant="gradient" className="text-center py-16">
              <CardContent>
                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                  <Target className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="font-heading font-semibold text-xl mb-2">
                  No predictions yet
                </h3>
                <p className="text-muted-foreground mb-6">
                  {user 
                    ? "Start asking questions to the AI to generate topic predictions."
                    : "Sign in and start asking questions to see AI predictions."}
                </p>
                <Button variant="hero" onClick={() => navigate(user ? "/ask-ai" : "/auth")}>
                  {user ? "Ask AI Now" : "Sign In"}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-4"
            >
              {predictions.map((topic, index) => (
                <motion.div key={topic.id} variants={itemVariants}>
                  <Card variant="interactive" className="overflow-hidden">
                    <CardContent className="p-0">
                      <div className="flex flex-col sm:flex-row">
                        {/* Rank Badge */}
                        <div className="flex sm:flex-col items-center justify-center p-4 sm:p-6 bg-muted/30 sm:border-r border-b sm:border-b-0 border-border">
                          <span className="text-xs text-muted-foreground mr-2 sm:mr-0 sm:mb-1">Rank</span>
                          <span className="text-2xl font-heading font-bold text-primary">
                            #{index + 1}
                          </span>
                        </div>

                        {/* Content */}
                        <div className="flex-1 p-4 sm:p-6">
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                            <div className="flex-1">
                              <h3 className="font-heading font-semibold text-lg mb-2">
                                {topic.topic}
                              </h3>
                              <div className="flex flex-wrap items-center gap-2 mb-4">
                                <Badge
                                  variant="outline"
                                  className={getDifficultyColor(topic.difficulty)}
                                >
                                  {topic.difficulty.charAt(0).toUpperCase() + topic.difficulty.slice(1)}
                                </Badge>
                                <Badge variant="secondary">
                                  {topic.subject}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  Frequency: {topic.frequency}x
                                </span>
                              </div>

                              {/* Probability Bar */}
                              <div className="flex items-center gap-3">
                                <span className="text-sm text-muted-foreground w-24">
                                  Likelihood:
                                </span>
                                <div className="flex-1 max-w-xs">
                                  <Progress value={Number(topic.probability)} className="h-2" />
                                </div>
                                <span className="text-sm font-semibold text-primary">
                                  {topic.probability}%
                                </span>
                              </div>
                            </div>

                            {/* Action */}
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="gap-2"
                              onClick={() => navigate("/ask-ai")}
                            >
                              <Zap className="w-4 h-4" />
                              Study This
                              <ChevronRight className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* Info Card */}
          <Card variant="glow" className="mt-8">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-heading font-semibold mb-1">
                    Want More Accurate Predictions?
                  </h4>
                  <p className="text-muted-foreground text-sm mb-3">
                    Upload more question papers from past years to improve prediction accuracy.
                    The more data we have, the better our AI can predict what's coming next.
                  </p>
                  <Button variant="hero" size="sm" onClick={() => navigate("/upload")}>
                    Upload More Papers
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </Layout>
  );
}
