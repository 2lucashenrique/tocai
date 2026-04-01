-- Garante UPDATE na fila (necessário para reordenar). Idempotente.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'queue'
      AND policyname = 'Anyone can update queue'
  ) THEN
    CREATE POLICY "Anyone can update queue" ON public.queue
    FOR UPDATE
    USING (true)
    WITH CHECK (true);
  END IF;
END $$;
