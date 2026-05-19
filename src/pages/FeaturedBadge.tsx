import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SeoHead } from "@/components/SeoHead";
import { Download, Sparkles } from "lucide-react";

const SITE_URL = "https://andamanbazaar.in";
const W = 1080;
const H = 1920;

function sanitizeHandle(v: string) {
  return v.trim().replace(/^@+/, "").toLowerCase().replace(/[^a-z0-9_.-]/g, "");
}

function buildShareUrl(storySlug: string, handle: string) {
  if (!storySlug) return SITE_URL;
  const path = storySlug.startsWith("http")
    ? storySlug
    : `${SITE_URL}/blog/${storySlug.replace(/^\/+/, "").replace(/^blog\//, "")}`;
  try {
    const u = new URL(path);
    if (handle) u.searchParams.set("as", handle);
    return u.toString();
  } catch {
    return path;
  }
}

export default function FeaturedBadge() {
  const [params] = useSearchParams();
  const [name, setName] = useState(params.get("name") ?? "");
  const [handle, setHandle] = useState(sanitizeHandle(params.get("handle") ?? ""));
  const [story, setStory] = useState(params.get("story") ?? "");
  const [storySlug, setStorySlug] = useState(params.get("slug") ?? "");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [rendering, setRendering] = useState(false);

  const shareUrl = useMemo(() => buildShareUrl(storySlug, handle), [storySlug, handle]);

  useEffect(() => {
    void renderBadge();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, handle, story, shareUrl]);

  async function renderBadge() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setRendering(true);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = W;
    canvas.height = H;

    // Background gradient — deep ocean → sunset
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, "#0a1f3a");
    grad.addColorStop(0.55, "#1f4068");
    grad.addColorStop(1, "#e07a5f");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Soft radial highlight
    const rg = ctx.createRadialGradient(W / 2, H * 0.25, 50, W / 2, H * 0.25, 700);
    rg.addColorStop(0, "rgba(255,255,255,0.18)");
    rg.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, W, H);

    // Top eyebrow
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font = "600 34px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("ANDAMAN BAZAAR  ·  FEATURED", W / 2, 180);

    // Divider
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(W / 2 - 120, 220);
    ctx.lineTo(W / 2 + 120, 220);
    ctx.stroke();

    // Name
    ctx.fillStyle = "#ffffff";
    ctx.font = "800 96px 'Playfair Display', Georgia, serif";
    ctx.textAlign = "center";
    wrapText(ctx, name || "Your Name", W / 2, 380, W - 160, 110);

    // Handle
    if (handle) {
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.font = "500 44px Inter, system-ui, sans-serif";
      ctx.fillText(`@${handle}`, W / 2, 540);
    }

    // Big quote mark
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.font = "900 280px Georgia, serif";
    ctx.fillText("\u201C", W / 2, 820);

    // Story title
    ctx.fillStyle = "#ffffff";
    ctx.font = "600 56px Inter, system-ui, sans-serif";
    const storyY = wrapText(
      ctx,
      story || "Featured in an Andaman Bazaar story",
      W / 2,
      980,
      W - 200,
      72,
    );

    // Tagline
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.font = "italic 400 38px Georgia, serif";
    ctx.fillText("— hand-picked tastemakers of the islands", W / 2, storyY + 80);

    // QR card
    const qrSize = 360;
    const qrX = (W - qrSize) / 2;
    const qrY = H - qrSize - 280;
    ctx.fillStyle = "#ffffff";
    roundRect(ctx, qrX - 30, qrY - 30, qrSize + 60, qrSize + 60, 28);
    ctx.fill();
    try {
      const qrDataUrl = await QRCode.toDataURL(shareUrl, {
        margin: 0,
        width: qrSize,
        color: { dark: "#0a1f3a", light: "#ffffff" },
      });
      const img = await loadImage(qrDataUrl);
      ctx.drawImage(img, qrX, qrY, qrSize, qrSize);
    } catch {
      /* ignore */
    }

    // CTA under QR
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 42px Inter, system-ui, sans-serif";
    ctx.fillText("Scan to read the full story", W / 2, qrY + qrSize + 120);

    // Domain
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.font = "500 36px Inter, system-ui, sans-serif";
    ctx.fillText("andamanbazaar.in", W / 2, H - 90);

    setRendering(false);
  }

  function downloadPng() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `andaman-bazaar-featured-${handle || "badge"}.png`;
    a.click();
  }

  return (
    <>
      <SeoHead
        title="Featured badge generator | Andaman Bazaar"
        description="Generate a 1080×1920 Instagram-story badge for featured creators, DJs, venue owners and contributors."
        url={`${SITE_URL}/badge`}
      />
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        <header className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" /> For featured friends
          </div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Get your "Featured" badge
          </h1>
          <p className="text-muted-foreground">
            Fill the fields, download the PNG, and post it to your Instagram story with the
            QR pointing back to the article. Every scan you drive is tracked to your handle.
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-[1fr_1.1fr]">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Your name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="DJ Nobody XO"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="handle">Instagram handle (no @)</Label>
              <Input
                id="handle"
                value={handle}
                onChange={(e) => setHandle(sanitizeHandle(e.target.value))}
                placeholder="dj_nobody_xo"
              />
              <p className="text-xs text-muted-foreground">
                Used for traffic attribution — share links you generate will tag visits as
                <code className="mx-1 rounded bg-muted px-1">utm_source={handle || "your_handle"}</code>
                in our analytics.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="story">Story title</Label>
              <Input
                id="story"
                value={story}
                onChange={(e) => setStory(e.target.value)}
                placeholder="Port Blair Nightlife 2026"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="slug">Story slug or full URL</Label>
              <Input
                id="slug"
                value={storySlug}
                onChange={(e) => setStorySlug(e.target.value)}
                placeholder="port-blair-nightlife-2026"
              />
              <p className="break-all text-xs text-muted-foreground">
                QR will point to: <span className="text-foreground">{shareUrl}</span>
              </p>
            </div>

            <Button onClick={downloadPng} disabled={rendering} className="w-full" size="lg">
              <Download className="mr-2 h-4 w-4" />
              Download badge (1080 × 1920)
            </Button>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border bg-muted/40 p-3">
            <canvas
              ref={canvasRef}
              className="aspect-[9/16] w-full rounded-xl bg-black"
              aria-label="Featured badge preview"
            />
          </div>
        </div>
      </div>
    </>
  );
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
): number {
  const words = text.split(/\s+/);
  let line = "";
  let cursorY = y;
  for (let i = 0; i < words.length; i++) {
    const test = line ? `${line} ${words[i]}` : words[i];
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, cursorY);
      line = words[i];
      cursorY += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, cursorY);
  return cursorY;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}