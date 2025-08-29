-- Create message_feedback table for collecting user feedback on AI responses
CREATE TABLE public.message_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id TEXT NOT NULL,
  session_id UUID NOT NULL,
  user_id UUID NOT NULL DEFAULT auth.uid(),
  model TEXT NOT NULL,
  helpful BOOLEAN,
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.message_feedback ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own feedback" 
ON public.message_feedback 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own feedback" 
ON public.message_feedback 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own feedback" 
ON public.message_feedback 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Supervisors can view all feedback" 
ON public.message_feedback 
FOR SELECT 
USING (is_supervisor_or_admin());

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_message_feedback_updated_at
BEFORE UPDATE ON public.message_feedback
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();