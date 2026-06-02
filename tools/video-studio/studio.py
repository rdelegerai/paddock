from __future__ import annotations

import argparse
import json
import os
import secrets
import signal
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path


ROOT = Path(__file__).resolve().parent
STATE_DIR = ROOT / "output" / "_server"
DEFAULT_PID_FILE = STATE_DIR / "server-8765.json"


def request_json(url: str, timeout: float = 1.0) -> dict | None:
    try:
        with urllib.request.urlopen(url, timeout=timeout) as response:
            return json.loads(response.read().decode("utf-8"))
    except (OSError, urllib.error.URLError, json.JSONDecodeError):
        return None


def read_state(pid_file: Path) -> dict | None:
    if not pid_file.exists():
        return None
    try:
        return json.loads(pid_file.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return None


def write_state(pid_file: Path, state: dict) -> None:
    pid_file.parent.mkdir(parents=True, exist_ok=True)
    pid_file.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")


def health_url(host: str, port: int) -> str:
    return f"http://{host}:{port}/health"


def wait_for_health(host: str, port: int, seconds: float = 8.0) -> dict | None:
    deadline = time.time() + seconds
    while time.time() < deadline:
        health = request_json(health_url(host, port), timeout=1.0)
        if health and health.get("ok"):
            return health
        time.sleep(0.25)
    return None


def status(args: argparse.Namespace) -> int:
    state = read_state(args.pid_file)
    health = request_json(health_url(args.host, args.port), timeout=1.0)
    if health and health.get("ok"):
        print(f"Lecteur actif : http://{args.host}:{args.port}/")
        print(f"Video : {health.get('video')}")
        return 0
    if state:
        print(f"Aucun lecteur ne repond sur http://{args.host}:{args.port}/, ancien PID : {state.get('pid')}")
        return 1
    print(f"Aucun lecteur actif sur http://{args.host}:{args.port}/")
    return 1


def start(args: argparse.Namespace) -> int:
    video = args.video.resolve()
    if not video.exists():
        raise SystemExit(f"Video introuvable : {video}")
    analysis_dir = args.analysis_dir.resolve() if args.analysis_dir else None
    if analysis_dir and not analysis_dir.exists():
        raise SystemExit(f"Dossier d'analyse introuvable : {analysis_dir}")

    existing = request_json(health_url(args.host, args.port), timeout=1.0)
    if existing and existing.get("ok"):
        print(f"Lecteur deja actif : http://{args.host}:{args.port}/")
        return 0

    token = secrets.token_urlsafe(24)
    log_dir = ROOT / "output" / video.stem
    log_dir.mkdir(parents=True, exist_ok=True)
    stdout_path = log_dir / "server.log"
    stderr_path = log_dir / "server.err.log"
    command = [
        sys.executable,
        str(ROOT / "serve_video.py"),
        str(video),
        "--host",
        args.host,
        "--port",
        str(args.port),
        "--token",
        token,
    ]
    if analysis_dir:
        command.extend(["--analysis-dir", str(analysis_dir)])

    creationflags = 0
    if os.name == "nt":
        creationflags = subprocess.CREATE_NEW_PROCESS_GROUP | subprocess.DETACHED_PROCESS

    with stdout_path.open("ab") as stdout, stderr_path.open("ab") as stderr:
        process = subprocess.Popen(
            command,
            cwd=str(ROOT.parent.parent),
            stdin=subprocess.DEVNULL,
            stdout=stdout,
            stderr=stderr,
            close_fds=True,
            creationflags=creationflags,
        )

    state = {
        "pid": process.pid,
        "host": args.host,
        "port": args.port,
        "url": f"http://{args.host}:{args.port}/",
        "video": str(video),
        "analysis_dir": str(analysis_dir) if analysis_dir else None,
        "token": token,
        "started_at": time.strftime("%Y-%m-%d %H:%M:%S"),
    }
    write_state(args.pid_file, state)

    health = wait_for_health(args.host, args.port)
    if not health:
        print(f"Le serveur a ete lance avec le PID {process.pid}, mais il ne repond pas encore.")
        print(f"Logs : {stderr_path}")
        return 1

    print(f"Lecteur local pret : http://{args.host}:{args.port}/")
    print(f"PID : {process.pid}")
    return 0


def stop(args: argparse.Namespace) -> int:
    state = read_state(args.pid_file)
    if not state:
        print("Aucun fichier d'etat serveur trouve.")
        return 0

    host = state.get("host", args.host)
    port = int(state.get("port", args.port))
    token = state.get("token", "")
    shutdown_url = f"http://{host}:{port}/shutdown?token={urllib.parse.quote(token)}"
    request_json(shutdown_url, timeout=2.0)
    time.sleep(0.5)

    if request_json(health_url(host, port), timeout=1.0):
        pid = state.get("pid")
        if pid:
            try:
                os.kill(int(pid), signal.SIGTERM)
            except OSError:
                pass
    if args.pid_file.exists():
        args.pid_file.unlink()
    print("Lecteur local arrete.")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Lanceur du studio video local.")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8765)
    parser.add_argument("--pid-file", type=Path, default=DEFAULT_PID_FILE)
    subparsers = parser.add_subparsers(dest="command", required=True)

    start_parser = subparsers.add_parser("start")
    start_parser.add_argument("video", type=Path)
    start_parser.add_argument("--analysis-dir", type=Path, default=None)
    start_parser.set_defaults(func=start)

    stop_parser = subparsers.add_parser("stop")
    stop_parser.set_defaults(func=stop)

    status_parser = subparsers.add_parser("status")
    status_parser.set_defaults(func=status)

    args = parser.parse_args()
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
