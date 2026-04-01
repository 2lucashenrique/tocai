import { useState, useCallback, useRef, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Music, Trash2, Users, Disc3, LogOut } from "lucide-react";
import { clearQueue, removeSong, type Song } from "@/lib/queue";
import { useQueueRealtime } from "@/hooks/useQueueRealtime";
import { useAuth } from "@/hooks/useAuth";
import SongQueue from "@/components/SongQueue";
import YouTubePlayer from "@/components/YouTubePlayer";
import DJLogin from "@/components/DJLogin";

/** URL pública do app (obrigatória no APK para o QR dos convidados — ex.: https://seu-dominio.com) */
function guestPageBase(): string {
  const fromEnv = import.meta.env.VITE_APP_PUBLIC_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return window.location.origin;
}

const Index = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const { queue } = useQueueRealtime();
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const autoPlayRef = useRef(false);
  const queueRef = useRef(queue);
  queueRef.current = queue;
  const guestUrl = `${guestPageBase()}/guest`;

  const playNext = useCallback(async () => {
    const q = queueRef.current;
    if (q.length > 0) {
      const next = q[0];
      await removeSong(next.id);
      setCurrentSong(next);
    } else {
      setCurrentSong(null);
    }
  }, []);

  const displayQueue = currentSong
    ? queue.filter((s) => s.id !== currentSong.id)
    : queue;

  useEffect(() => {
    if (!currentSong && queue.length > 0 && !autoPlayRef.current) {
      autoPlayRef.current = true;
      const next = queue[0];
      removeSong(next.id).then(() => {
        setCurrentSong(next);
        autoPlayRef.current = false;
      });
    }
  }, [currentSong, queue]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Disc3 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <DJLogin />;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-4 py-3">
        <div className="container max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-neon flex items-center justify-center">
              <Disc3 className="w-5 h-5 text-primary-foreground animate-spin" style={{ animationDuration: '3s' }} />
            </div>
            <div>
              <h1 className="font-display font-bold text-lg text-foreground">
                Toca<span className="text-primary text-glow-cyan">Ai</span>
              </h1>
              <p className="text-xs text-muted-foreground">Painel do DJ</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Users className="w-4 h-4" />
              <span>{displayQueue.length} na fila</span>
            </div>
            <button
              onClick={signOut}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors"
              title="Sair"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="container max-w-6xl mx-auto px-4 py-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <h2 className="font-display font-bold text-lg flex items-center gap-2 mb-4">
              <Disc3 className="w-5 h-5 text-primary animate-spin" style={{ animationDuration: '3s' }} />
              Tocando agora
            </h2>
            {currentSong ? (
              <div>
                <YouTubePlayer
                  youtubeUrl={currentSong.youtubeUrl}
                  title={currentSong.title}
                  onEnded={playNext}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Pedido por <span className="text-foreground font-medium">{currentSong.requestedBy}</span>
                </p>
              </div>
            ) : (
              <div className="aspect-video rounded-xl bg-muted/50 border border-border flex flex-col items-center justify-center gap-3">
                <Disc3 className="w-12 h-12 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Nenhuma música tocando</p>
                <p className="text-xs text-muted-foreground/60">Aguardando pedidos dos convidados...</p>
              </div>
            )}
          </div>

          <div className="flex flex-col items-center text-center space-y-4 p-6 rounded-xl bg-muted/30 border border-border">
            <h2 className="font-display font-bold text-base text-foreground">
              Escaneie para entrar
            </h2>
            <div className="p-3 bg-foreground rounded-2xl border-glow-cyan">
              <QRCodeSVG
                value={guestUrl}
                size={160}
                bgColor="hsl(0, 0%, 95%)"
                fgColor="hsl(240, 15%, 6%)"
                level="M"
              />
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Convidados escaneiam para escolher músicas
            </p>
            <a
              href="/guest"
              className="text-xs text-primary underline underline-offset-4 hover:opacity-80 break-all"
            >
              {guestUrl}
            </a>
          </div>
        </div>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-lg flex items-center gap-2">
              <Music className="w-5 h-5 text-primary" />
              <span>
                Fila de músicas ({displayQueue.length})
                <span className="block text-xs font-normal text-muted-foreground font-sans mt-0.5">
                  Arraste pelo ícone ⋮⋮ ou use as setas; no celular use as setas
                </span>
              </span>
            </h2>
            {displayQueue.length > 0 && (
              <button
                onClick={() => clearQueue()}
                className="text-xs text-destructive flex items-center gap-1 hover:opacity-80 transition-opacity"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Limpar fila
              </button>
            )}
          </div>
          <SongQueue songs={displayQueue} isHost reorderable />
        </section>
      </main>
    </div>
  );
};

export default Index;
