-- Create tables for EngiGenius

-- Syllabus table
CREATE TABLE public.syllabus (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  file_url TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Past papers table
CREATE TABLE public.past_papers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  year TEXT NOT NULL,
  subject TEXT NOT NULL,
  file_url TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- AI answers table
CREATE TABLE public.ai_answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  summary TEXT,
  subject TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Important topics table
CREATE TABLE public.important_topics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  topic TEXT NOT NULL,
  probability NUMERIC DEFAULT 0,
  frequency INTEGER DEFAULT 1,
  difficulty TEXT DEFAULT 'medium',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Study notes table
CREATE TABLE public.study_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_favorite BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.syllabus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.past_papers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.important_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for syllabus
CREATE POLICY "Users can view own syllabus" ON public.syllabus FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own syllabus" ON public.syllabus FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own syllabus" ON public.syllabus FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own syllabus" ON public.syllabus FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for past_papers
CREATE POLICY "Users can view own past_papers" ON public.past_papers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own past_papers" ON public.past_papers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own past_papers" ON public.past_papers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own past_papers" ON public.past_papers FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for ai_answers
CREATE POLICY "Users can view own ai_answers" ON public.ai_answers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own ai_answers" ON public.ai_answers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own ai_answers" ON public.ai_answers FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for important_topics
CREATE POLICY "Users can view own important_topics" ON public.important_topics FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own important_topics" ON public.important_topics FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own important_topics" ON public.important_topics FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own important_topics" ON public.important_topics FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for study_notes
CREATE POLICY "Users can view own study_notes" ON public.study_notes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own study_notes" ON public.study_notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own study_notes" ON public.study_notes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own study_notes" ON public.study_notes FOR DELETE USING (auth.uid() = user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger for study_notes
CREATE TRIGGER update_study_notes_updated_at
  BEFORE UPDATE ON public.study_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('syllabus', 'syllabus', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('past-papers', 'past-papers', false);

-- Storage policies for syllabus bucket
CREATE POLICY "Users can upload own syllabus files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'syllabus' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can view own syllabus files" ON storage.objects FOR SELECT USING (bucket_id = 'syllabus' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own syllabus files" ON storage.objects FOR DELETE USING (bucket_id = 'syllabus' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for past-papers bucket
CREATE POLICY "Users can upload own past-papers files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'past-papers' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can view own past-papers files" ON storage.objects FOR SELECT USING (bucket_id = 'past-papers' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own past-papers files" ON storage.objects FOR DELETE USING (bucket_id = 'past-papers' AND auth.uid()::text = (storage.foldername(name))[1]);