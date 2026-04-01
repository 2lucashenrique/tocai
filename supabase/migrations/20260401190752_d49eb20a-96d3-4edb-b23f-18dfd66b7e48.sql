
-- Create queue table for song requests
CREATE TABLE public.queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  youtube_url TEXT NOT NULL,
  thumbnail_url TEXT NOT NULL,
  requested_by TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.queue ENABLE ROW LEVEL SECURITY;

-- Public access policies (party app - no auth required)
CREATE POLICY "Anyone can view queue" ON public.queue FOR SELECT USING (true);
CREATE POLICY "Anyone can add to queue" ON public.queue FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can remove from queue" ON public.queue FOR DELETE USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.queue;
