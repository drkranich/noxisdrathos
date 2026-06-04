import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Download, X, ZoomIn, ZoomOut } from "lucide-react";

// Carrega pdf.js via CDN
const PDFJS_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
const WORKER_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

declare global {
  interface Window { pdfjsLib: any; }
}

type Props = {
  url: string;
  title: string;
  onClose: () => void;
};

export function PdfBookReader({ url, title, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pdfRef = useRef<any>(null);
  const renderingRef = useRef(false);

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [scale, setScale] = useState(1.3);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [animDir, setAnimDir] = useState<"left" | "right" | null>(null);

  // Carrega pdf.js dinamicamente
  useEffect(() => {
    if (window.pdfjsLib) { loadPdf(); return; }
    const script = document.createElement("script");
    script.src = PDFJS_URL;
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = WORKER_URL;
      loadPdf();
    };
    script.onerror = () => setError("Não foi possível carregar o leitor.");
    document.head.appendChild(script);
  }, [url]);

  async function loadPdf() {
    try {
      setLoading(true);
      const pdf = await window.pdfjsLib.getDocument(url).promise;
      pdfRef.current = pdf;
      setTotal(pdf.numPages);
      setPage(1);
      setLoading(false);
    } catch (e) {
      setError("Erro ao carregar o documento.");
      setLoading(false);
    }
  }

  const renderPage = useCallback(async (pageNum: number, sc: number) => {
    if (!pdfRef.current || !canvasRef.current || renderingRef.current) return;
    renderingRef.current = true;
    try {
      const pg = await pdfRef.current.getPage(pageNum);
      const viewport = pg.getViewport({ scale: sc });
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await pg.render({ canvasContext: ctx, viewport }).promise;
    } finally {
      renderingRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!loading && pdfRef.current) renderPage(page, scale);
  }, [page, scale, loading, renderPage]);

  // Teclado: ← → e ESC
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") goNext();
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") goPrev();
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [page, total]);

  // Swipe touch
  const touchStartX = useRef(0);
  function onTouchStart(e: React.TouchEvent) { touchStartX.current = e.touches[0].clientX; }
  function onTouchEnd(e: React.TouchEvent) {
    const dx = touchStartX.current - e.changedTouches[0].clientX;
    if (dx > 50) goNext();
    if (dx < -50) goPrev();
  }

  function goNext() {
    if (page >= total) return;
    setAnimDir("left");
    setTimeout(() => { setPage(p => p + 1); setAnimDir(null); }, 180);
  }

  function goPrev() {
    if (page <= 1) return;
    setAnimDir("right");
    setTimeout(() => { setPage(p => p - 1); setAnimDir(null); }, 180);
  }

  const reader = (
    <div
      ref={containerRef}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(6,6,8,0.98)",
        display: "flex", flexDirection: "column",
        userSelect: "none",
      }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* HUD superior */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0,
        background: "linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, transparent 100%)",
        padding: "14px 20px",
        display: "flex", alignItems: "center", gap: 12,
        zIndex: 10,
      }}>
        <span style={{
          fontFamily: "var(--font-mono)", fontSize: 10,
          textTransform: "uppercase", letterSpacing: "0.3em",
          color: "rgba(255,255,255,0.35)", flex: 1,
        }}>{title}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={() => setScale(s => Math.max(0.7, s - 0.2))}
            style={{ padding: "5px 8px", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 7, color: "rgba(255,255,255,0.5)", cursor: "pointer" }}>
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setScale(s => Math.min(2.5, s + 0.2))}
            style={{ padding: "5px 8px", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 7, color: "rgba(255,255,255,0.5)", cursor: "pointer" }}>
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <a href={url} download style={{
            padding: "5px 10px", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 7, color: "rgba(255,255,255,0.5)", display: "flex", alignItems: "center", gap: 5,
            fontFamily: "var(--font-mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.15em", textDecoration: "none",
          }}>
            <Download className="w-3 h-3" />
          </a>
          <button onClick={onClose} style={{
            padding: "5px 10px", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 7, color: "rgba(255,255,255,0.5)", cursor: "pointer",
            fontFamily: "var(--font-mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.15em",
            display: "flex", alignItems: "center", gap: 5,
          }}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Área de leitura */}
      <div style={{
        flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
        position: "relative", overflow: "hidden",
      }}>
        {/* Seta esquerda */}
        <button
          onClick={goPrev}
          disabled={page <= 1}
          style={{
            position: "absolute", left: 16, zIndex: 5,
            width: 44, height: 44, borderRadius: "50%",
            background: page > 1 ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.1)",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: page > 1 ? "pointer" : "default",
            transition: "all 0.2s",
            backdropFilter: "blur(8px)",
          }}
        >
          <ChevronLeft style={{ width: 20, height: 20, color: page > 1 ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.15)" }} />
        </button>

        {/* Canvas com animação de virada */}
        <div style={{
          transition: "opacity 0.18s ease, transform 0.18s ease",
          opacity: animDir ? 0 : 1,
          transform: animDir === "left" ? "translateX(-30px)" : animDir === "right" ? "translateX(30px)" : "translateX(0)",
          maxWidth: "calc(100vw - 120px)",
          maxHeight: "calc(100vh - 100px)",
          overflow: "auto",
          borderRadius: 4,
          boxShadow: "0 32px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.06)",
        }}>
          {loading && (
            <div style={{
              width: 600, height: 800, background: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              borderRadius: 4,
            }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#999", letterSpacing: "0.3em", textTransform: "uppercase" }}>
                carregando…
              </span>
            </div>
          )}
          {error && (
            <div style={{
              width: 400, height: 300, background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12,
            }}>
              <p style={{ color: "rgba(255,255,255,0.5)", fontFamily: "var(--font-mono)", fontSize: 11 }}>{error}</p>
              <a href={url} target="_blank" rel="noreferrer" style={{
                padding: "8px 16px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 8, color: "rgba(255,255,255,0.6)", textDecoration: "none",
                fontFamily: "var(--font-mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.2em",
              }}>
                abrir no browser
              </a>
            </div>
          )}
          {!loading && !error && <canvas ref={canvasRef} style={{ display: "block" }} />}
        </div>

        {/* Seta direita */}
        <button
          onClick={goNext}
          disabled={page >= total}
          style={{
            position: "absolute", right: 16, zIndex: 5,
            width: 44, height: 44, borderRadius: "50%",
            background: page < total ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.1)",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: page < total ? "pointer" : "default",
            transition: "all 0.2s",
            backdropFilter: "blur(8px)",
          }}
        >
          <ChevronRight style={{ width: 20, height: 20, color: page < total ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.15)" }} />
        </button>
      </div>

      {/* Paginação inferior */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)",
        padding: "16px", display: "flex", alignItems: "center", justifyContent: "center", gap: 16,
      }}>
        {/* Dots de progresso */}
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          {Array.from({ length: Math.min(total, 20) }).map((_, i) => {
            const dotPage = total <= 20 ? i + 1 : Math.round((i / 19) * (total - 1)) + 1;
            const isActive = total <= 20 ? i + 1 === page : Math.abs(dotPage - page) < total / 20;
            return (
              <div key={i} style={{
                width: isActive ? 20 : 4,
                height: 4, borderRadius: 2,
                background: isActive ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.2)",
                transition: "all 0.2s",
              }} />
            );
          })}
        </div>
        <span style={{
          fontFamily: "var(--font-mono)", fontSize: 10,
          color: "rgba(255,255,255,0.3)", letterSpacing: "0.2em",
          textTransform: "uppercase",
        }}>
          {page} / {total}
        </span>
      </div>
    </div>
  );

  return createPortal(reader, document.body);
}
