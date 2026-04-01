import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { Search, Plus, AlertCircle, Loader2, Link, Music } from "lucide-react";
import { addSong, getGuestName, extractYoutubeId } from "@/lib/queue";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const SUGGEST_API = "https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=";

interface YouTubeResult {
  url: string;
  title: string;
  thumbnail: string;
  uploaderName: string;
  duration: number;
}

const SEARCH_PROXY_BASE =
  "https://r.jina.ai/http://www.youtube.com/results?search_query=";

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function parseMarkdownResults(markdown: string): YouTubeResult[] {
  const regex = /### \[([^\]]+)\]\(https?:\/\/www\.youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})[^)]*\)/g;
  const results: YouTubeResult[] = [];
  const seen = new Set<string>();

  let match: RegExpExecArray | null;
  while ((match = regex.exec(markdown)) !== null) {
    const title = match[1]?.trim();
    const videoId = match[2];

    if (!title || !videoId || seen.has(videoId)) continue;
    if (title.toLowerCase().startsWith("mix -")) continue;

    seen.add(videoId);
    results.push({
      url: `https://youtube.com/watch?v=${videoId}`,
      title,
      thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
      uploaderName: "YouTube",
      duration: 0,
    });
  }

  return results;
}

const SongSearch = () => {
  const [query, setQuery] = useState("");
  const [pasteUrl, setPasteUrl] = useState("");
  const [results, setResults] = useState<YouTubeResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [currentQuery, setCurrentQuery] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestBoxRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const seenIdsRef = useRef<Set<string>>(new Set());

  // Fetch YouTube autocomplete suggestions
  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.trim().length < 1) {
      setSuggestions([]);
      return;
    }
    try {
      const res = await fetch(
        `https://corsproxy.io/?url=${encodeURIComponent(SUGGEST_API + encodeURIComponent(q))}`
      );
      const data = await res.json();
      if (Array.isArray(data) && Array.isArray(data[1])) {
        setSuggestions(data[1].slice(0, 8));
      }
    } catch {
      setSuggestions([]);
    }
  }, []);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    setError("");
    if (suggestTimeout.current) clearTimeout(suggestTimeout.current);
    if (value.trim().length >= 1) {
      setShowSuggestions(true);
      suggestTimeout.current = setTimeout(() => fetchSuggestions(value), 200);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const selectSuggestion = (s: string) => {
    setQuery(s);
    setSuggestions([]);
    setShowSuggestions(false);
    // Trigger search immediately
    triggerSearch(s);
  };

  // Close suggestions on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (suggestBoxRef.current && !suggestBoxRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const fetchResults = async (searchQuery: string, pageNum: number, append: boolean) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      // Add sp=EgIQAQ for video-only filter, page offset via pagination keywords
      const searchUrl = pageNum === 1
        ? `${SEARCH_PROXY_BASE}${encodeURIComponent(searchQuery)}`
        : `${SEARCH_PROXY_BASE}${encodeURIComponent(searchQuery + " " + getPageKeyword(pageNum))}`;

      const res = await fetch(searchUrl, { signal: controller.signal });

      if (!res.ok) throw new Error("Erro na busca");

      const markdown = await res.text();
      const items = parseMarkdownResults(markdown);

      // Filter out already seen results
      const newItems = items.filter((item) => {
        const id = item.url;
        if (seenIdsRef.current.has(id)) return false;
        seenIdsRef.current.add(id);
        return true;
      });

      if (append) {
        setResults((prev) => [...prev, ...newItems]);
      } else {
        setResults(newItems);
      }

      setHasMore(newItems.length >= 3);
    } catch {
      if (!append) {
        setError("Não foi possível buscar. Tente novamente.");
        setResults([]);
      }
      setHasMore(false);
    } finally {
      clearTimeout(timeout);
    }
  };

  // Generate varied search terms for pagination simulation
  function getPageKeyword(pageNum: number): string {
    const suffixes = [
      "music video", "official", "audio", "lyrics", "live",
      "remix", "cover", "acoustic", "hd", "full",
      "concert", "performance", "karaoke", "instrumental", "extended",
    ];
    return suffixes[(pageNum - 2) % suffixes.length] || "";
  }

  const triggerSearch = async (searchText: string) => {
    const guestName = getGuestName();
    if (!guestName) {
      setError("Por favor, informe seu nome primeiro.");
      return;
    }
    if (!searchText.trim()) {
      setError("Digite o nome da música ou artista.");
      return;
    }
    setError("");
    setLoading(true);
    setSearched(true);
    setPage(1);
    setCurrentQuery(searchText.trim());
    seenIdsRef.current = new Set();
    await fetchResults(searchText.trim(), 1, false);
    setLoading(false);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowSuggestions(false);
    await triggerSearch(query);
  };

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !currentQuery) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    setPage(nextPage);
    await fetchResults(currentQuery, nextPage, true);
    setLoadingMore(false);
  }, [loadingMore, hasMore, currentQuery, page]);

  // Infinite scroll observer
  const lastResultRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (loading) return;
      if (observerRef.current) observerRef.current.disconnect();

      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0]?.isIntersecting && hasMore) {
          loadMore();
        }
      }, { threshold: 0.5 });

      if (node) observerRef.current.observe(node);
    },
    [loading, hasMore, loadMore]
  );

  // Cleanup observer
  useEffect(() => {
    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, []);

  const handleAdd = async (result: YouTubeResult) => {
    const guestName = getGuestName();
    if (!guestName) return;

    const added = await addSong({
      title: result.title,
      youtubeUrl: result.url,
      thumbnailUrl: result.thumbnail,
      requestedBy: guestName,
    });
    if (!added) {
      toast.error("Não foi possível adicionar à fila. Tente de novo.");
      return;
    }
    toast.success("Música adicionada à fila! 🎶");
    setResults((prev) => prev.filter((r) => r.url !== result.url));
  };

  const handlePasteAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const guestName = getGuestName();
    if (!guestName) {
      setError("Por favor, informe seu nome primeiro.");
      return;
    }

    const videoId = extractYoutubeId(pasteUrl.trim());
    if (!videoId) {
      setError("Link inválido. Cole um link do YouTube válido.");
      return;
    }

    const added = await addSong({
      title: `Vídeo do YouTube (${videoId})`,
      youtubeUrl: `https://youtube.com/watch?v=${videoId}`,
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
      requestedBy: guestName,
    });
    if (!added) {
      toast.error("Não foi possível adicionar à fila. Tente de novo.");
      return;
    }
    toast.success("Música adicionada à fila! 🎶");
    setPasteUrl("");
    setError("");
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="search" className="w-full">
        <TabsList className="w-full grid grid-cols-2 bg-muted">
          <TabsTrigger value="search" className="flex items-center gap-1.5 text-xs">
            <Music className="w-3.5 h-3.5" />
            Buscar música
          </TabsTrigger>
          <TabsTrigger value="link" className="flex items-center gap-1.5 text-xs">
            <Link className="w-3.5 h-3.5" />
            Colar link
          </TabsTrigger>
        </TabsList>

        <TabsContent value="search" className="mt-3 space-y-4">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1" ref={suggestBoxRef}>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                placeholder="Buscar música ou artista..."
                className="w-full pl-10 pr-4 py-3 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:border-glow-cyan transition-all text-sm"
                autoComplete="off"
              />
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 rounded-lg bg-muted border border-border shadow-lg overflow-hidden">
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => selectSuggestion(s)}
                      className="w-full text-left px-4 py-2.5 text-sm text-foreground hover:bg-primary/10 flex items-center gap-2 transition-colors"
                    >
                      <Search className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      <span className="truncate">{s}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-3 rounded-lg bg-gradient-neon text-primary-foreground font-display font-bold text-sm hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Buscar
            </button>
          </form>

          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
          )}

          {!loading && results.length > 0 && (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {results.map((result, index) => (
                <div
                  key={result.url}
                  ref={index === results.length - 1 ? lastResultRef : undefined}
                  className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/50 border border-border hover:border-primary/50 transition-colors group"
                >
                  <img
                    src={result.thumbnail}
                    alt={result.title}
                    className="w-24 h-16 rounded-md object-cover flex-shrink-0"
                    loading="lazy"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground line-clamp-2 leading-snug">
                      {result.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {result.uploaderName}
                      {result.duration > 0 ? ` · ${formatDuration(result.duration)}` : ""}
                    </p>
                  </div>
                  <button
                    onClick={() => handleAdd(result)}
                    className="flex-shrink-0 w-9 h-9 rounded-full bg-primary/20 text-primary hover:bg-primary hover:text-primary-foreground transition-colors flex items-center justify-center"
                    title="Adicionar à fila"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              ))}

              {loadingMore && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                  <span className="ml-2 text-xs text-muted-foreground">Carregando mais...</span>
                </div>
              )}
            </div>
          )}

          {!loading && searched && results.length === 0 && !error && (
            <p className="text-center text-muted-foreground text-sm py-4">
              Nenhum resultado encontrado.
            </p>
          )}
        </TabsContent>

        <TabsContent value="link" className="mt-3 space-y-3">
          <p className="text-xs text-muted-foreground">
            Abra o YouTube, copie o link do vídeo e cole aqui.
          </p>
          <form onSubmit={handlePasteAdd} className="flex gap-2">
            <div className="relative flex-1">
              <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={pasteUrl}
                onChange={(e) => {
                  setPasteUrl(e.target.value);
                  setError("");
                }}
                placeholder="https://youtube.com/watch?v=..."
                className="w-full pl-10 pr-4 py-3 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:border-glow-cyan transition-all text-sm"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-3 rounded-lg bg-gradient-neon text-primary-foreground font-display font-bold text-sm hover:opacity-90 transition-opacity flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Adicionar
            </button>
          </form>
        </TabsContent>
      </Tabs>

      {error && (
        <p className="text-destructive text-sm flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5" />
          {error}
        </p>
      )}
    </div>
  );
};

export default SongSearch;
