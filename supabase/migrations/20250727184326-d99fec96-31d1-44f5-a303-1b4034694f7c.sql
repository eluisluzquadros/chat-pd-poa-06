-- Create interest_manifestations table for the interest form
CREATE TABLE public.interest_manifestations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  newsletter_opt_in BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'pending',
  account_created BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.interest_manifestations ENABLE ROW LEVEL SECURITY;

-- Create policies for interest manifestations
-- Allow anyone to insert (public form)
CREATE POLICY "Anyone can submit interest manifestations"
ON public.interest_manifestations
FOR INSERT
WITH CHECK (true);

-- Only admins and supervisors can view manifestations
CREATE POLICY "Admins and supervisors can view interest manifestations"
ON public.interest_manifestations
FOR SELECT
USING (is_supervisor_or_admin());

-- Only admins can update manifestations
CREATE POLICY "Admins can update interest manifestations"
ON public.interest_manifestations
FOR UPDATE
USING (is_admin());

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_interest_manifestations_updated_at
BEFORE UPDATE ON public.interest_manifestations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();