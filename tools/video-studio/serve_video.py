from __future__ import annotations

import argparse
import json
import mimetypes
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse


HTML = """<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Studio video local</title>
  <style>
    body { margin: 0; font-family: Arial, sans-serif; background: #111; color: #f4f4f4; }
    main { display: grid; grid-template-columns: minmax(0, 1fr) 360px; min-height: 100vh; }
    .player { padding: 16px; }
    video { width: 100%; max-height: 76vh; background: #000; }
    .controls { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; align-items: center; }
    button { background: #2d2d2d; color: #fff; border: 1px solid #555; border-radius: 6px; padding: 8px 10px; cursor: pointer; }
    button:hover { background: #3c3c3c; }
    .time { font-variant-numeric: tabular-nums; color: #ddd; }
    aside { border-left: 1px solid #333; padding: 14px; overflow: auto; max-height: 100vh; }
    h1 { font-size: 18px; margin: 0 0 10px; }
    .hint { color: #aaa; font-size: 13px; line-height: 1.4; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    td, th { border-bottom: 1px solid #333; padding: 7px 5px; vertical-align: top; }
    tr { cursor: pointer; }
    tr:hover { background: #202020; }
    .type { color: #9cc; white-space: nowrap; }
    textarea { width: 100%; min-height: 140px; margin-top: 12px; background: #171717; color: #f4f4f4; border: 1px solid #444; border-radius: 6px; padding: 8px; }
    @media (max-width: 900px) { main { display: block; } aside { border-left: 0; border-top: 1px solid #333; max-height: none; } }
  </style>
</head>
<body>
<main>
  <section class="player">
    <video id="video" src="/video" controls playsinline></video>
    <div class="controls">
      <button data-jump="-5">-5s</button>
      <button data-jump="-1">-1s</button>
      <button id="play">Play/Pause</button>
      <button data-jump="1">+1s</button>
      <button data-jump="5">+5s</button>
      <button data-speed="0.5">0.5x</button>
      <button data-speed="1">1x</button>
      <button data-speed="1.5">1.5x</button>
      <button data-speed="2">2x</button>
      <span class="time" id="clock">00:00.00</span>
    </div>
    <textarea id="notes" placeholder="Notes de revue avec timecodes..."></textarea>
  </section>
  <aside>
    <h1>Timeline</h1>
    <p class="hint">Clique sur une ligne pour aller au timecode. Raccourcis : espace, fleches gauche/droite, touches 1/2/3/4 pour la vitesse.</p>
    <table>
      <thead><tr><th>Temps</th><th>Type</th><th>Texte</th></tr></thead>
      <tbody id="timeline"><tr><td colspan="3">Chargement...</td></tr></tbody>
    </table>
  </aside>
</main>
<script>
const video = document.querySelector("#video");
const clock = document.querySelector("#clock");
const notes = document.querySelector("#notes");
const timelineBody = document.querySelector("#timeline");

const fmt = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = seconds - m * 60;
  return `${String(m).padStart(2, "0")}:${s.toFixed(2).padStart(5, "0")}`;
};

video.addEventListener("timeupdate", () => { clock.textContent = fmt(video.currentTime); });
document.querySelector("#play").addEventListener("click", () => video.paused ? video.play() : video.pause());
document.querySelectorAll("[data-jump]").forEach((button) => {
  button.addEventListener("click", () => { video.currentTime = Math.max(0, video.currentTime + Number(button.dataset.jump)); });
});
document.querySelectorAll("[data-speed]").forEach((button) => {
  button.addEventListener("click", () => { video.playbackRate = Number(button.dataset.speed); });
});

document.addEventListener("keydown", (event) => {
  if (event.target === notes) return;
  if (event.code === "Space") { event.preventDefault(); video.paused ? video.play() : video.pause(); }
  if (event.key === "ArrowLeft") video.currentTime = Math.max(0, video.currentTime - 1);
  if (event.key === "ArrowRight") video.currentTime = video.currentTime + 1;
  if (event.key === "1") video.playbackRate = 0.5;
  if (event.key === "2") video.playbackRate = 1;
  if (event.key === "3") video.playbackRate = 1.5;
  if (event.key === "4") video.playbackRate = 2;
});

fetch("/timeline")
  .then((response) => response.ok ? response.json() : [])
  .then((rows) => {
    if (!rows.length) {
      timelineBody.innerHTML = '<tr><td colspan="3">Aucune timeline trouvee.</td></tr>';
      return;
    }
    timelineBody.innerHTML = "";
    rows.forEach((row) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${row.timecode || fmt(Number(row.time || 0))}</td><td class="type">${row.type || ""}</td><td>${row.text || ""}</td>`;
      tr.addEventListener("click", () => { video.currentTime = Number(row.time || 0); video.pause(); });
      timelineBody.appendChild(tr);
    });
  });
</script>
</body>
</html>
"""


class VideoHandler(BaseHTTPRequestHandler):
    video_path: Path
    analysis_dir: Path | None
    shutdown_token: str
    started_at: float

    def log_message(self, format: str, *args) -> None:
        return

    def do_GET(self) -> None:
        route = urlparse(self.path).path
        if route in {"/", "/index.html"}:
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            self.wfile.write(HTML.encode("utf-8"))
            return
        if route == "/timeline":
            self.serve_timeline()
            return
        if route == "/health":
            self.serve_health()
            return
        if route == "/shutdown":
            self.serve_shutdown()
            return
        if route == "/video":
            self.serve_video()
            return
        self.send_error(404)

    def serve_health(self) -> None:
        payload = json.dumps(
            {
                "ok": True,
                "video": str(self.video_path),
                "analysis_dir": str(self.analysis_dir) if self.analysis_dir else None,
                "uptime_seconds": round(time.time() - self.started_at, 2),
            },
            ensure_ascii=False,
        ).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def serve_shutdown(self) -> None:
        query = parse_qs(urlparse(self.path).query)
        token = query.get("token", [""])[0]
        if not self.shutdown_token or token != self.shutdown_token:
            self.send_error(403)
            return
        payload = b'{"ok": true}'
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)
        threading.Thread(target=self.server.shutdown, daemon=True).start()

    def serve_timeline(self) -> None:
        timeline = self.analysis_dir / "timeline.json" if self.analysis_dir else None
        if not timeline or not timeline.exists():
            payload = b"[]"
        else:
            payload = timeline.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def serve_video(self) -> None:
        file_size = self.video_path.stat().st_size
        content_type = mimetypes.guess_type(str(self.video_path))[0] or "video/mp4"
        range_header = self.headers.get("Range")
        start = 0
        end = file_size - 1

        if range_header and range_header.startswith("bytes="):
            values = range_header.replace("bytes=", "").split("-", 1)
            if values[0]:
                start = int(values[0])
            if values[1]:
                end = int(values[1])
            end = min(end, file_size - 1)
            self.send_response(206)
            self.send_header("Content-Range", f"bytes {start}-{end}/{file_size}")
        else:
            self.send_response(200)

        chunk_size = end - start + 1
        self.send_header("Content-Type", content_type)
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Content-Length", str(chunk_size))
        self.end_headers()

        with self.video_path.open("rb") as handle:
            handle.seek(start)
            remaining = chunk_size
            while remaining > 0:
                data = handle.read(min(1024 * 1024, remaining))
                if not data:
                    break
                try:
                    self.wfile.write(data)
                except (BrokenPipeError, ConnectionAbortedError, ConnectionResetError):
                    break
                remaining -= len(data)


def main() -> int:
    parser = argparse.ArgumentParser(description="Lecteur web local pour revue video.")
    parser.add_argument("video", type=Path)
    parser.add_argument("--analysis-dir", type=Path, default=None)
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8765)
    parser.add_argument("--token", default="")
    args = parser.parse_args()

    video_path = args.video.resolve()
    if not video_path.exists():
        raise SystemExit(f"Video introuvable : {video_path}")

    analysis_dir = args.analysis_dir.resolve() if args.analysis_dir else None
    if analysis_dir and not analysis_dir.exists():
        raise SystemExit(f"Dossier d'analyse introuvable : {analysis_dir}")

    VideoHandler.video_path = video_path
    VideoHandler.analysis_dir = analysis_dir
    VideoHandler.shutdown_token = args.token
    VideoHandler.started_at = time.time()
    server = ThreadingHTTPServer((args.host, args.port), VideoHandler)
    print(f"Lecteur local : http://{args.host}:{args.port}/")
    print("Ctrl+C pour arreter.")
    server.serve_forever()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
