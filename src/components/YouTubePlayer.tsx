import { useRef, useEffect, useState, useCallback } from "react";
import { SkipForward, Maximize2, Minimize2 } from "lucide-react";
import { extractYoutubeId } from "@/lib/queue";

interface YouTubePlayerProps {
  youtubeUrl: string;
  title: string;
  onEnded: () => void;
}

const YT_ENDED = 0;

let ytApiPromise: Promise<void> | null = null;

function ensureYoutubeIframeApi(): Promise<void> {
  if (window.YT?.Player) return Promise.resolve();
  if (!ytApiPromise) {
    ytApiPromise = new Promise((resolve) => {
      const done = () => resolve();
      if (window.YT?.Player) {
        done();
        return;
      }
      const prior = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        prior?.();
        done();
      };
      if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
        const s = document.createElement("script");
        s.src = "https://www.youtube.com/iframe_api";
        document.head.appendChild(s);
      } else {
        const poll = setInterval(() => {
          if (window.YT?.Player) {
            clearInterval(poll);
            done();
          }
        }, 50);
      }
    });
  }
  return ytApiPromise;
}

const YouTubePlayer = ({ youtubeUrl, title, onEnded }: YouTubePlayerProps) => {
  const videoId = extractYoutubeId(youtubeUrl);
  const fullscreenHostRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YT.Player | null>(null);
  const onEndedRef = useRef(onEnded);
  const pendingReFullscreenRef = useRef(false);
  const [hostIsFullscreen, setHostIsFullscreen] = useState(false);

  onEndedRef.current = onEnded;

  const toggleHostFullscreen = useCallback(() => {
    const host = fullscreenHostRef.current;
    if (!host) return;
    if (document.fullscreenElement === host) {
      void document.exitFullscreen();
    } else {
      void host.requestFullscreen();
    }
  }, []);

  useEffect(() => {
    const onFsChange = () => {
      const host = fullscreenHostRef.current;
      setHostIsFullscreen(!!host && document.fullscreenElement === host);
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  useEffect(() => {
    if (!videoId || !containerRef.current) return;

    let cancelled = false;

    const run = async () => {
      await ensureYoutubeIframeApi();
      if (cancelled || !containerRef.current) return;

      playerRef.current?.destroy();
      playerRef.current = null;

      const el = containerRef.current;
      el.innerHTML = "";

      const player = new window.YT.Player(el, {
        videoId,
        width: "100%",
        height: "100%",
        playerVars: {
          autoplay: 1,
          rel: 0,
          enablejsapi: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: () => {
            if (!pendingReFullscreenRef.current || !fullscreenHostRef.current) return;
            pendingReFullscreenRef.current = false;
            void fullscreenHostRef.current.requestFullscreen().catch(() => {});
          },
          onStateChange: (event: { data: number }) => {
            if (event.data === YT_ENDED) {
              const fs = document.fullscreenElement;
              const host = fullscreenHostRef.current;
              const container = containerRef.current;
              if (fs && host && container?.contains(fs) && fs !== host) {
                pendingReFullscreenRef.current = true;
              }
              onEndedRef.current();
            }
          },
        },
      });
      playerRef.current = player;
    };

    run();

    return () => {
      cancelled = true;
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [videoId]);

  if (!videoId) return null;

  return (
    <div className="rounded-xl overflow-hidden border border-border bg-card">
      <div
        ref={fullscreenHostRef}
        className="aspect-video w-full bg-black [&_iframe]:w-full [&_iframe]:h-full [&_iframe]:block [&_iframe]:min-h-[200px]"
      >
        <div ref={containerRef} className="w-full h-full min-h-[200px]" />
      </div>
      <div className="px-4 py-3 flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground truncate flex-1 min-w-0">{title}</p>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={toggleHostFullscreen}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-md hover:bg-muted/80"
            title={hostIsFullscreen ? "Sair da tela cheia" : "Tela cheia"}
            aria-label={hostIsFullscreen ? "Sair da tela cheia" : "Tela cheia"}
          >
            {hostIsFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            <span className="hidden sm:inline">{hostIsFullscreen ? "Sair" : "Tela cheia"}</span>
          </button>
          <button
            type="button"
            onClick={() => onEnded()}
            className="flex items-center gap-1.5 text-xs text-primary hover:opacity-80 transition-opacity p-1.5"
          >
            <SkipForward className="w-4 h-4" />
            <span className="hidden sm:inline">Próxima</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default YouTubePlayer;

declare global {
  interface Window {
    YT: typeof YT;
    onYouTubeIframeAPIReady?: () => void;
  }
}
