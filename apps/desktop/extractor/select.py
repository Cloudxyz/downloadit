"""Offline extraction of directly offered formats in a public watch document."""
import hashlib
import io
import json
import os
import re
import resource
import signal
import sys
from urllib.parse import parse_qs, urlsplit

ARCHIVE = "/app/yt-dlp.zip"
DIGEST = "e8665ed64d6b9172773e812f891fb707a0cb1ee8d9ef4fc1acb00cabee4c5256"


def main():
    signal.alarm(20)
    for limit, cap in [(resource.RLIMIT_AS, 384 << 20), (resource.RLIMIT_CPU, 10),
                       (resource.RLIMIT_NPROC, 0), (resource.RLIMIT_FSIZE, 0),
                       (resource.RLIMIT_NOFILE, 32), (resource.RLIMIT_CORE, 0)]:
        resource.setrlimit(limit, (cap, cap))
    if os.geteuid() == 0 or sys.version_info < (3, 10):
        raise ValueError("runtime")
    with open(ARCHIVE, "rb") as source:
        if hashlib.sha256(source.read(3073121)).hexdigest() != DIGEST:
            raise ValueError("archive")
    sys.path.insert(0, ARCHIVE)
    from yt_dlp import YoutubeDL
    from yt_dlp.extractor.youtube import YoutubeIE
    from yt_dlp.networking import Response
    from yt_dlp.networking.exceptions import TransportError

    header = json.loads(sys.stdin.buffer.readline(512))
    video_id = header["id"]
    if not re.fullmatch(r"[A-Za-z0-9_-]{11}", video_id):
        raise ValueError("id")
    html = sys.stdin.buffer.read(4194305)
    if not 0 < len(html) <= 4194304:
        raise ValueError("size")
    watch = "https://www.youtube.com/watch?v=" + video_id

    class OfflineDL(YoutubeDL):
        def urlopen(self, request):
            url = urlsplit(request.url)
            if (request.method == "GET" and url.scheme == "https" and
                    url.netloc == "www.youtube.com" and url.path == "/watch" and
                    parse_qs(url.query).get("v") == [video_id]):
                return Response(io.BytesIO(html), watch, {"Content-Type": "text/html; charset=utf-8"})
            raise TransportError("offline")

    opts = {"quiet": True, "no_warnings": True, "noprogress": True, "cachedir": False,
            "js_runtimes": {}, "remote_components": [], "noplaylist": True,
            "skip_download": True, "extractor_retries": 0,
            "extractor_args": {"youtube": {"player_client": ["web"], "player_skip": ["js", "configs"],
                                           "skip": ["dash", "hls", "translated_subs"]}}}
    with OfflineDL(opts, auto_init=False) as engine:
        engine.add_info_extractor(YoutubeIE(engine))
        info = engine.extract_info(watch, download=False, process=False)
        if info.get("id") != video_id or info.get("is_live") or (info.get("age_limit") or 0) >= 18:
            raise ValueError("unavailable")
        urls = []
        for stream in info.get("formats", []):
            url = stream.get("url", "")
            if (url.startswith("https://") and stream.get("protocol") in (None, "https") and not stream.get("has_drm") and
                    0 < len(url) <= 8192 and len(urls) < 128):
                urls.append(url)
        data = json.dumps(urls).encode()
        if len(data) > 262144:
            raise ValueError("size")
        sys.stdout.buffer.write(data)


if __name__ == "__main__":
    try:
        main()
    except Exception:
        sys.exit(1)
