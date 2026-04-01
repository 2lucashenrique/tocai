import { useState, useCallback } from "react";
import { Music, Trash2, ListMusic, GripVertical, ChevronUp, ChevronDown } from "lucide-react";
import { removeSong, reorderQueue, type Song } from "@/lib/queue";
import { toast } from "sonner";

interface SongQueueProps {
  songs: Song[];
  isHost?: boolean;
  /** DJ: arrastar linhas para persistir nova ordem */
  reorderable?: boolean;
}

function moveIndex<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to > list.length) {
    return [...list];
  }
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

const SongQueue = ({ songs, isHost = false, reorderable = false }: SongQueueProps) => {
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const commitOrder = useCallback(async (ordered: Song[]) => {
    const result = await reorderQueue(ordered.map((s) => s.id));
    if (!result.ok) {
      toast.error(result.message);
    }
  }, []);

  const moveRelative = useCallback(
    async (index: number, delta: number) => {
      const to = index + delta;
      if (to < 0 || to >= songs.length) return;
      const next = moveIndex(songs, index, to);
      await commitOrder(next);
    },
    [songs, commitOrder]
  );

  const handleDragStart = useCallback(
    (e: React.DragEvent, songId: string) => {
      if (!reorderable) return;
      const t = e.target as HTMLElement;
      if (!t.closest("[data-drag-handle]")) {
        e.preventDefault();
        return;
      }
      e.dataTransfer.setData("text/plain", songId);
      e.dataTransfer.effectAllowed = "move";
      try {
        e.dataTransfer.setData("application/x-song-id", songId);
      } catch {
        /* ignore */
      }
    },
    [reorderable]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent, index: number) => {
      if (!reorderable) return;
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = "move";
      setDragOverIndex(index);
    },
    [reorderable]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    const related = e.relatedTarget as Node | null;
    if (related && (e.currentTarget as Node).contains(related)) return;
    setDragOverIndex(null);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent, dropIndex: number) => {
      if (!reorderable) return;
      e.preventDefault();
      e.stopPropagation();
      setDragOverIndex(null);
      const dragId =
        e.dataTransfer.getData("text/plain") || e.dataTransfer.getData("application/x-song-id");
      if (!dragId) return;
      const fromIndex = songs.findIndex((s) => s.id === dragId);
      if (fromIndex === -1 || fromIndex === dropIndex) return;
      const next = moveIndex(songs, fromIndex, dropIndex);
      await commitOrder(next);
    },
    [reorderable, songs, commitOrder]
  );

  const handleDragEnd = useCallback(() => {
    setDragOverIndex(null);
  }, []);

  if (songs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <ListMusic className="w-12 h-12 mb-3 opacity-40" />
        <p className="text-lg font-display">Nenhuma música na fila</p>
        <p className="text-sm mt-1">As músicas adicionadas aparecerão aqui</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {songs.map((song, index) => (
        <div
          key={song.id}
          draggable={reorderable}
          onDragStart={(e) => handleDragStart(e, song.id)}
          onDragEnd={handleDragEnd}
          onDragOver={(e) => handleDragOver(e, index)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, index)}
          className={`animate-slide-up flex items-center gap-2 sm:gap-3 rounded-lg bg-card p-3 border transition-all group ${
            dragOverIndex === index && reorderable
              ? "border-primary border-glow-cyan bg-primary/5"
              : "border-border hover:border-glow-cyan"
          }`}
          style={{ animationDelay: `${index * 0.05}s` }}
        >
          {reorderable && (
            <>
              <div
                data-drag-handle
                title="Arrastar para reordenar"
                aria-label="Arrastar para reordenar"
                className="touch-none flex items-center justify-center p-1 rounded text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing shrink-0"
              >
                <GripVertical className="w-5 h-5" />
              </div>
              <div className="flex flex-col gap-0.5 shrink-0">
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => moveRelative(index, -1)}
                  className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted/80 disabled:opacity-30 disabled:pointer-events-none"
                  title="Mover para cima"
                  aria-label="Mover para cima"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  disabled={index === songs.length - 1}
                  onClick={() => moveRelative(index, 1)}
                  className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted/80 disabled:opacity-30 disabled:pointer-events-none"
                  title="Mover para baixo"
                  aria-label="Mover para baixo"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-primary font-display font-bold text-sm shrink-0">
            {index + 1}
          </div>

          <img
            src={song.thumbnailUrl}
            alt={song.title}
            className="w-16 h-12 rounded object-cover shrink-0 pointer-events-none select-none"
            draggable={false}
          />

          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground truncate text-sm">
              {song.title}
            </p>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Music className="w-3 h-3" />
              {song.requestedBy}
            </p>
          </div>

          {isHost && (
            <button
              type="button"
              onClick={() => removeSong(song.id)}
              className="opacity-0 group-hover:opacity-100 p-2 rounded-md hover:bg-destructive/20 text-destructive transition-all shrink-0"
              title="Remover"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
};

export default SongQueue;
