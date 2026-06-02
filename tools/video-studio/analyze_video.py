from __future__ import annotations

import argparse
import csv
import glob
import json
import os
import shutil
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path

import cv2
import numpy as np
import pytesseract
from PIL import Image, ImageDraw, ImageFont
from scenedetect import SceneManager, open_video
from scenedetect.detectors import ContentDetector


ROOT = Path(__file__).resolve().parent


@dataclass
class ToolPaths:
    ffmpeg: Path
    ffprobe: Path
    tesseract: Path | None


def find_executable(name: str, extra_globs: list[str]) -> Path | None:
    found = shutil.which(name)
    if found:
        return Path(found)

    env_key = name.upper().replace(".", "_")
    if os.environ.get(env_key):
        candidate = Path(os.environ[env_key])
        if candidate.exists():
            return candidate

    for pattern in extra_globs:
        for candidate_name in sorted(glob.glob(pattern)):
            candidate = Path(candidate_name)
            if candidate.exists():
                return candidate.resolve()
    return None


def find_tools() -> ToolPaths:
    local = Path(os.environ.get("LOCALAPPDATA", ""))
    ffmpeg_globs = [
        str(local / "Microsoft/WinGet/Packages/Gyan.FFmpeg*/ffmpeg-*/bin/ffmpeg.exe"),
    ]
    ffprobe_globs = [
        str(local / "Microsoft/WinGet/Packages/Gyan.FFmpeg*/ffmpeg-*/bin/ffprobe.exe"),
    ]
    tesseract_globs = [
        "C:/Program Files/Tesseract-OCR/tesseract.exe",
        "C:/Program Files (x86)/Tesseract-OCR/tesseract.exe",
    ]

    ffmpeg = find_executable("ffmpeg", ffmpeg_globs)
    ffprobe = find_executable("ffprobe", ffprobe_globs)
    tesseract = find_executable("tesseract", tesseract_globs)

    if not ffmpeg or not ffprobe:
        raise SystemExit("FFmpeg/ffprobe introuvables. Reinstaller FFmpeg avant d'analyser une video.")

    return ToolPaths(ffmpeg=ffmpeg, ffprobe=ffprobe, tesseract=tesseract)


def run_json(command: list[str]) -> dict:
    result = subprocess.run(command, capture_output=True, text=True, check=True)
    return json.loads(result.stdout)


def probe_video(video_path: Path, tools: ToolPaths) -> dict:
    return run_json(
        [
            str(tools.ffprobe),
            "-hide_banner",
            "-v",
            "error",
            "-show_entries",
            "format=duration,size,bit_rate:stream=index,codec_type,codec_name,width,height,r_frame_rate,avg_frame_rate,duration,bit_rate",
            "-of",
            "json",
            str(video_path),
        ]
    )


def duration_from_metadata(metadata: dict) -> float:
    duration = metadata.get("format", {}).get("duration")
    if duration:
        return float(duration)
    for stream in metadata.get("streams", []):
        if stream.get("duration"):
            return float(stream["duration"])
    return 0.0


def format_time(seconds: float) -> str:
    seconds = max(0.0, float(seconds))
    minutes = int(seconds // 60)
    secs = seconds - minutes * 60
    return f"{minutes:02d}:{secs:05.2f}"


def extract_frame(video_path: Path, timestamp: float, output_path: Path) -> bool:
    capture = cv2.VideoCapture(str(video_path))
    if not capture.isOpened():
        return False
    capture.set(cv2.CAP_PROP_POS_MSEC, max(0.0, timestamp) * 1000)
    ok, frame = capture.read()
    capture.release()
    if not ok:
        return False
    output_path.parent.mkdir(parents=True, exist_ok=True)
    return bool(cv2.imwrite(str(output_path), frame))


def detect_scenes(video_path: Path, threshold: float) -> list[dict]:
    video = open_video(str(video_path))
    scene_manager = SceneManager()
    scene_manager.add_detector(ContentDetector(threshold=threshold))
    scene_manager.detect_scenes(video)
    scenes = []
    for index, (start, end) in enumerate(scene_manager.get_scene_list(), start=1):
        start_seconds = start.seconds if hasattr(start, "seconds") else start.get_seconds()
        end_seconds = end.seconds if hasattr(end, "seconds") else end.get_seconds()
        scenes.append(
            {
                "index": index,
                "start": start_seconds,
                "end": end_seconds,
                "duration": end_seconds - start_seconds,
            }
        )
    return scenes


def extract_sample_frames(video_path: Path, out_dir: Path, duration: float, interval: float) -> list[dict]:
    frames_dir = out_dir / "frames"
    frames_dir.mkdir(parents=True, exist_ok=True)
    samples = []
    timestamp = 0.0
    index = 1
    while timestamp <= duration + 0.01:
        frame_path = frames_dir / f"sample_{index:04d}_{timestamp:07.2f}s.jpg"
        if extract_frame(video_path, timestamp, frame_path):
            samples.append({"index": index, "time": timestamp, "path": str(frame_path.relative_to(out_dir))})
        timestamp += interval
        index += 1
    return samples


def extract_scene_frames(video_path: Path, out_dir: Path, scenes: list[dict]) -> None:
    scene_dir = out_dir / "scene-frames"
    scene_dir.mkdir(parents=True, exist_ok=True)
    for scene in scenes:
        timestamp = min(scene["start"] + 0.2, scene["end"])
        frame_path = scene_dir / f"scene_{scene['index']:03d}_{timestamp:07.2f}s.jpg"
        if extract_frame(video_path, timestamp, frame_path):
            scene["frame"] = str(frame_path.relative_to(out_dir))


def write_tsv(path: Path, rows: list[dict], fields: list[str]) -> None:
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields, delimiter="\t", extrasaction="ignore")
        writer.writeheader()
        for row in rows:
            writer.writerow(row)


def make_contact_sheet(out_dir: Path, samples: list[dict], columns: int = 4) -> Path | None:
    if not samples:
        return None
    thumbs = []
    for sample in samples:
        path = out_dir / sample["path"]
        if not path.exists():
            continue
        image = Image.open(path).convert("RGB")
        image.thumbnail((360, 203))
        canvas = Image.new("RGB", (360, 235), (24, 24, 24))
        canvas.paste(image, ((360 - image.width) // 2, 0))
        draw = ImageDraw.Draw(canvas)
        label = f"{sample['index']:02d}  {format_time(sample['time'])}"
        draw.text((10, 210), label, fill=(255, 255, 255), font=ImageFont.load_default())
        thumbs.append(canvas)

    rows = int(np.ceil(len(thumbs) / columns))
    sheet = Image.new("RGB", (columns * 360, rows * 235), (20, 20, 20))
    for index, thumb in enumerate(thumbs):
        x = (index % columns) * 360
        y = (index // columns) * 235
        sheet.paste(thumb, (x, y))

    output = out_dir / "contact-sheet.jpg"
    sheet.save(output, quality=90)
    return output


def configure_tesseract(tools: ToolPaths) -> str:
    if tools.tesseract:
        pytesseract.pytesseract.tesseract_cmd = str(tools.tesseract)
    tessdata = ROOT / "tessdata"
    if tessdata.exists():
        return f"--tessdata-dir {tessdata}"
    return ""


def run_ocr(samples: list[dict], out_dir: Path, tools: ToolPaths) -> list[dict]:
    config = configure_tesseract(tools)
    rows = []
    for sample in samples:
        image_path = out_dir / sample["path"]
        try:
            text = pytesseract.image_to_string(Image.open(image_path), lang="fra+eng", config=config)
        except Exception as exc:
            text = ""
            print(f"OCR ignore a {format_time(sample['time'])}: {exc}", file=sys.stderr)
        text = " ".join(text.split())
        if text:
            rows.append({"time": sample["time"], "timecode": format_time(sample["time"]), "text": text})
    return rows


def transcribe(video_path: Path, out_dir: Path, model_size: str, language: str) -> list[dict]:
    from faster_whisper import WhisperModel

    models_dir = ROOT / "models"
    models_dir.mkdir(parents=True, exist_ok=True)
    os.environ["HF_HOME"] = str(models_dir)
    os.environ["HUGGINGFACE_HUB_CACHE"] = str(models_dir / "hub")

    model = WhisperModel(model_size, device="cpu", compute_type="int8", download_root=str(models_dir))
    segments, info = model.transcribe(str(video_path), language=language if language else None, vad_filter=True)
    rows = []
    for segment in segments:
        rows.append(
            {
                "start": segment.start,
                "end": segment.end,
                "start_timecode": format_time(segment.start),
                "end_timecode": format_time(segment.end),
                "text": segment.text.strip(),
            }
        )
    (out_dir / "transcript-info.json").write_text(
        json.dumps({"language": info.language, "language_probability": info.language_probability}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return rows


def write_srt(path: Path, rows: list[dict]) -> None:
    def srt_time(seconds: float) -> str:
        millis = int(round((seconds - int(seconds)) * 1000))
        total = int(seconds)
        hours = total // 3600
        minutes = (total % 3600) // 60
        secs = total % 60
        return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"

    lines = []
    for index, row in enumerate(rows, start=1):
        lines.append(str(index))
        lines.append(f"{srt_time(row['start'])} --> {srt_time(row['end'])}")
        lines.append(row["text"])
        lines.append("")
    path.write_text("\n".join(lines), encoding="utf-8")


def build_timeline(scenes: list[dict], ocr_rows: list[dict], transcript_rows: list[dict]) -> list[dict]:
    timeline = []
    for scene in scenes:
        timeline.append(
            {
                "time": scene["start"],
                "timecode": format_time(scene["start"]),
                "type": "scene",
                "text": f"Scene {scene['index']} ({scene['duration']:.1f}s)",
            }
        )
    for row in ocr_rows:
        timeline.append({"time": row["time"], "timecode": row["timecode"], "type": "ocr", "text": row["text"]})
    for row in transcript_rows:
        timeline.append({"time": row["start"], "timecode": row["start_timecode"], "type": "transcript", "text": row["text"]})
    return sorted(timeline, key=lambda item: (float(item["time"]), item["type"]))


def write_review_template(out_dir: Path, video_path: Path, timeline: list[dict]) -> None:
    lines = [
        f"# Revue video - {video_path.name}",
        "",
        "## Avis general",
        "",
        "- Ce qui marche :",
        "- Ce qui bloque :",
        "- Correction prioritaire :",
        "",
        "## Revue par timecode",
        "",
        "| Timecode | Type | Observation | Correction proposee |",
        "| --- | --- | --- | --- |",
    ]
    for item in timeline[:80]:
        lines.append(f"| {item['timecode']} | {item['type']} | {item['text'].replace('|', '/')} | |")
    lines.append("")
    (out_dir / "review-template.md").write_text("\n".join(lines), encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description="Analyse locale d'une video Paddock.")
    parser.add_argument("video", type=Path)
    parser.add_argument("--out", type=Path, default=None)
    parser.add_argument("--sample-interval", type=float, default=3.0)
    parser.add_argument("--scene-threshold", type=float, default=27.0)
    parser.add_argument("--ocr", action="store_true")
    parser.add_argument("--transcribe", action="store_true")
    parser.add_argument("--whisper-model", default="small")
    parser.add_argument("--language", default="fr")
    args = parser.parse_args()

    video_path = args.video.resolve()
    if not video_path.exists():
        raise SystemExit(f"Video introuvable : {video_path}")

    out_dir = (args.out or (ROOT / "output" / video_path.stem)).resolve()
    out_dir.mkdir(parents=True, exist_ok=True)

    tools = find_tools()
    metadata = probe_video(video_path, tools)
    duration = duration_from_metadata(metadata)
    (out_dir / "metadata.json").write_text(json.dumps(metadata, ensure_ascii=False, indent=2), encoding="utf-8")

    scenes = detect_scenes(video_path, args.scene_threshold)
    if not scenes:
        scenes = [{"index": 1, "start": 0.0, "end": duration, "duration": duration}]
    extract_scene_frames(video_path, out_dir, scenes)
    write_tsv(out_dir / "scenes.tsv", scenes, ["index", "start", "end", "duration", "frame"])

    samples = extract_sample_frames(video_path, out_dir, duration, args.sample_interval)
    write_tsv(out_dir / "samples.tsv", samples, ["index", "time", "path"])
    make_contact_sheet(out_dir, samples)

    ocr_rows: list[dict] = []
    if args.ocr:
        ocr_rows = run_ocr(samples, out_dir, tools)
        write_tsv(out_dir / "ocr.tsv", ocr_rows, ["time", "timecode", "text"])

    transcript_rows: list[dict] = []
    if args.transcribe:
        transcript_rows = transcribe(video_path, out_dir, args.whisper_model, args.language)
        write_tsv(out_dir / "transcript.tsv", transcript_rows, ["start", "end", "start_timecode", "end_timecode", "text"])
        write_srt(out_dir / "transcript.srt", transcript_rows)

    timeline = build_timeline(scenes, ocr_rows, transcript_rows)
    write_tsv(out_dir / "timeline.tsv", timeline, ["time", "timecode", "type", "text"])
    (out_dir / "timeline.json").write_text(json.dumps(timeline, ensure_ascii=False, indent=2), encoding="utf-8")
    write_review_template(out_dir, video_path, timeline)

    print(f"Analyse terminee : {out_dir}")
    print(f"Duree : {format_time(duration)}")
    print(f"Scenes : {len(scenes)}")
    print(f"Images echantillon : {len(samples)}")
    if args.ocr:
        print(f"Lignes OCR : {len(ocr_rows)}")
    if args.transcribe:
        print(f"Segments transcription : {len(transcript_rows)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
