import { supabase } from "@/integrations/supabase/client";

export interface Song {
  id: string;
  title: string;
  youtubeUrl: string;
  thumbnailUrl: string;
  requestedBy: string;
  requestedAt: string;
}

const GUEST_NAME_KEY = "party_guest_name";

function rowToSong(row: any): Song {
  return {
    id: row.id,
    title: row.title,
    youtubeUrl: row.youtube_url,
    thumbnailUrl: row.thumbnail_url,
    requestedBy: row.requested_by,
    requestedAt: row.created_at,
  };
}

export async function getQueue(): Promise<Song[]> {
  const primary = await supabase
    .from("queue")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (!primary.error) {
    return (primary.data || []).map(rowToSong);
  }
  // Banco sem coluna sort_order (migration ainda não aplicada): só created_at
  const legacy = await supabase
    .from("queue")
    .select("*")
    .order("created_at", { ascending: true });
  if (legacy.error) {
    console.error("Error fetching queue:", legacy.error);
    return [];
  }
  return (legacy.data || []).map(rowToSong);
}

async function nextSortOrder(): Promise<number> {
  const { data, error } = await supabase
    .from("queue")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return 0;
  return ((data?.sort_order as number | undefined) ?? -1) + 1;
}

export async function addSong(song: Omit<Song, "id" | "requestedAt">): Promise<Song | null> {
  const row = {
    title: song.title,
    youtube_url: song.youtubeUrl,
    thumbnail_url: song.thumbnailUrl,
    requested_by: song.requestedBy,
  };
  const withOrder = { ...row, sort_order: await nextSortOrder() };
  let res = await supabase.from("queue").insert(withOrder).select().single();
  if (res.error) {
    res = await supabase.from("queue").insert(row).select().single();
  }
  if (res.error) {
    console.error("Error adding song:", res.error);
    return null;
  }
  return rowToSong(res.data);
}

export async function removeSong(id: string) {
  const { error } = await supabase.from("queue").delete().eq("id", id);
  if (error) console.error("Error removing song:", error);
}

export async function clearQueue() {
  const { error } = await supabase.from("queue").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (error) console.error("Error clearing queue:", error);
}

export type ReorderResult = { ok: true } | { ok: false; message: string };

/** Persiste a ordem: tenta `sort_order`; se falhar, usa `created_at` (DB sem coluna ou outro erro recoverable). */
export async function reorderQueue(orderedIds: string[]): Promise<ReorderResult> {
  if (orderedIds.length === 0) return { ok: true };

  const bySort = await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from("queue").update({ sort_order: index }).eq("id", id)
    )
  );
  const sortFailed = bySort.find((r) => r.error);
  if (!sortFailed?.error) return { ok: true };

  const baseMs = Date.now();
  const byTime = await Promise.all(
    orderedIds.map((id, index) =>
      supabase
        .from("queue")
        .update({ created_at: new Date(baseMs + index * 1000).toISOString() })
        .eq("id", id)
    )
  );
  const timeFailed = byTime.find((r) => r.error);
  if (timeFailed?.error) {
    console.error("reorderQueue:", sortFailed.error, timeFailed.error);
    return {
      ok: false,
      message: timeFailed.error.message || sortFailed.error.message || "Sem permissão para atualizar a fila (RLS).",
    };
  }
  return { ok: true };
}

export function getGuestName(): string {
  return localStorage.getItem(GUEST_NAME_KEY) || "";
}

export function setGuestName(name: string) {
  localStorage.setItem(GUEST_NAME_KEY, name);
}

export function extractYoutubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export function getYoutubeThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
}
