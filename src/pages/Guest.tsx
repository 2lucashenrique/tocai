import { useState } from "react";
import { Disc3, UserRound } from "lucide-react";
import { getGuestName, setGuestName as saveGuestName } from "@/lib/queue";
import { useQueueRealtime } from "@/hooks/useQueueRealtime";
import SongSearch from "@/components/SongSearch";
import SongQueue from "@/components/SongQueue";

const Guest = () => {
  const [name, setName] = useState(getGuestName());
  const [confirmed, setConfirmed] = useState(!!getGuestName());
  const { queue } = useQueueRealtime();

  const handleConfirmName = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      saveGuestName(name.trim());
      setConfirmed(true);
    }
  };

  if (!confirmed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-6 text-center animate-slide-up">
          <div className="w-16 h-16 rounded-2xl bg-gradient-neon flex items-center justify-center mx-auto">
            <Disc3 className="w-8 h-8 text-primary-foreground animate-spin" style={{ animationDuration: '3s' }} />
          </div>
          <div>
            <h1 className="font-display font-bold text-2xl text-foreground">
              Toca<span className="text-primary text-glow-cyan">Ai</span>
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Escolha a próxima música! 🎵
            </p>
          </div>
          <form onSubmit={handleConfirmName} className="space-y-3">
            <div className="relative">
              <UserRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome..."
                className="w-full pl-10 pr-4 py-3 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:border-glow-cyan transition-all text-sm"
                autoFocus
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 rounded-lg bg-gradient-neon text-primary-foreground font-display font-bold text-sm hover:opacity-90 transition-opacity"
            >
              Entrar na festa
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-4 py-4">
        <div className="container max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-neon flex items-center justify-center">
              <Disc3 className="w-4 h-4 text-primary-foreground animate-spin" style={{ animationDuration: '3s' }} />
            </div>
            <h1 className="font-display font-bold text-foreground">
              Toca<span className="text-primary text-glow-cyan">Ai</span>
            </h1>
          </div>
          <span className="text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
            {getGuestName()}
          </span>
        </div>
      </header>

      <main className="container max-w-lg mx-auto px-4 py-6 space-y-8">
        <section>
          <h2 className="font-display font-bold text-lg mb-4">Adicionar música</h2>
          <SongSearch />
        </section>

        <section>
          <h2 className="font-display font-bold text-lg mb-4">
            Fila ({queue.length})
          </h2>
          <SongQueue songs={queue} />
        </section>
      </main>
    </div>
  );
};

export default Guest;
