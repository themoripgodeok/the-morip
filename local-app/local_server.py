from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from datetime import datetime
import json
import os
import threading
import webbrowser

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "local-app" / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)
LOCK = threading.Lock()

def read_json(name, default):
    path = DATA_DIR / name
    if not path.exists():
        return default
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return default

def write_json(name, value):
    path = DATA_DIR / name
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding="utf-8")
    tmp.replace(path)

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def send_json(self, code, value):
        raw = json.dumps(value, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def do_OPTIONS(self):
        origin = self.headers.get("Origin", "")
        if not origin.startswith("chrome-extension://"):
            self.send_error(403)
            return
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", origin)
        self.send_header("Vary", "Origin")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Max-Age", "600")
        self.end_headers()

    def do_GET(self):
        if self.path == "/api/state":
            with LOCK:
                data = read_json("classup.json", {})
            return self.send_json(200, data)
        if self.path == "/api/layout":
            with LOCK:
                data = read_json("layout.json", {"version": 1, "seats": []})
            return self.send_json(200, data)
        return super().do_GET()

    def do_POST(self):
        origin = self.headers.get("Origin", "")
        if not origin.startswith("chrome-extension://"):
            self.send_error(403, "Extension origin required")
            return
        if self.path not in ("/api/classup", "/api/layout"):
            self.send_error(404)
            return
        try:
            size = int(self.headers.get("Content-Length", "0"))
            if size <= 0 or size > 5_000_000:
                raise ValueError("Invalid request size")
            payload = json.loads(self.rfile.read(size).decode("utf-8"))
            if self.path == "/api/classup":
                # Store only the sanitized fields supplied by the extension.
                payload["receivedAt"] = datetime.now().astimezone().isoformat(timespec="seconds")
                filename = "classup.json"
            else:
                filename = "layout.json"
            with LOCK:
                write_json(filename, payload)
            return self.send_json(200, {"ok": True, "saved": filename})
        except Exception as exc:
            return self.send_json(400, {"ok": False, "error": str(exc)})

    def log_message(self, fmt, *args):
        print("[local]", fmt % args)

if __name__ == "__main__":
    os.chdir(ROOT)
    server = ThreadingHTTPServer(("127.0.0.1", 8765), Handler)
    print("더몰입 로컬 좌석표: http://127.0.0.1:8765/seat-map.html")
    print("이 창을 닫으면 자동 수집 및 좌석표 연결이 중단됩니다.")
    try:
        webbrowser.open("http://127.0.0.1:8765/seat-map.html")
    except Exception:
        pass
    server.serve_forever()
