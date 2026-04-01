import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getQueue, type Song } from "@/lib/queue";

export function useQueueRealtime() {
  const [queue, setQueue] = useState<Song[]>([]);

  const refresh = useCallback(async () => {
    const q = await getQueue();
    setQueue(q);
  }, []);

  useEffect(() => {
    refresh();

    const channel = supabase
      .channel("queue-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "queue" },
        () => {
          refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refresh]);

  return { queue, refresh };
}
