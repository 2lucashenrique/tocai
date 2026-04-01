-- Custom order for queue (DJ can reorder)
ALTER TABLE public.queue ADD COLUMN sort_order integer;

UPDATE public.queue q
SET sort_order = sub.pos
FROM (
  SELECT id, row_number() OVER (ORDER BY created_at ASC) - 1 AS pos
  FROM public.queue
) sub
WHERE q.id = sub.id;

ALTER TABLE public.queue ALTER COLUMN sort_order SET NOT NULL;

CREATE POLICY "Anyone can update queue" ON public.queue
FOR UPDATE
USING (true)
WITH CHECK (true);
