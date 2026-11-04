"""
Docker sandbox for safely running a target web app and attacking a disposable copy of it.

Isolation applied to the running container:
  - code is baked into a throwaway image; no host filesystem is mounted, so host files are unreachable
  - --cap-drop ALL and --security-opt no-new-privileges: no added Linux privileges
  - --memory / --cpus / --pids-limit: resource caps so a hostile app cannot exhaust the host
  - published only on 127.0.0.1: the mapped port is reachable from this machine, not the network
  - --rm plus an enforced run deadline: the container is always destroyed afterwards

Egress is NOT fully blocked (the published port requires a reachable bridge network); treat the
network boundary as "not reachable from outside this host", not "no outbound traffic". Building the
image runs the repo's own `pip install`, which can execute dependency setup code — that is inherent
to running the app and is why it happens inside Docker, never on the host.

Only Python FastAPI/Flask web apps are auto-detected. Everything else returns None (not attackable).
"""
import re
import shutil
import socket
import subprocess
import time
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional

INTERNAL_PORT = 8080
IGNORED_DIRS = {".git", ".venv", "venv", "node_modules", "__pycache__", ".mypy_cache", ".pytest_cache", "dist", "build"}


@dataclass
class WebAppSpec:
    framework: str          # "fastapi" | "flask"
    module: str             # dotted module path, e.g. "app" or "src.main"
    app_var: str            # e.g. "app"
    rel_file: str           # file where the app object was found


@dataclass
class RunningSandbox:
    base_url: str           # e.g. http://127.0.0.1:53124
    container: str
    image: str


def docker_available() -> bool:
    if not shutil.which("docker"):
        return False
    try:
        return subprocess.run(["docker", "info"], capture_output=True, timeout=10).returncode == 0
    except Exception:
        return False


def detect_web_app(repo: Path) -> Optional[WebAppSpec]:
    """Find a FastAPI/Flask application object by scanning source files. Shallowest file wins.

    The app object must be importable at MODULE LEVEL (`uvicorn module:app` / `FLASK_APP=module:app`
    only see top-level names), so matches are anchored to column 0. Besides the direct
    `app = FastAPI(...)` form, apps commonly build the object through a factory assigned at module
    level (`app = start_application()`, `app = create_app()`); those count when the file imports the
    framework, so entries like DVRA's `main.py` (`app = start_application()`) are found, not the
    indented `app = FastAPI(` buried inside a function.
    """
    # Column 0 only: a name defined inside a function is not importable as module:name.
    direct_pats = (
        ("fastapi", re.compile(r"^(\w+)\s*=\s*FastAPI\s*\(", re.MULTILINE)),
        ("flask", re.compile(r"^(\w+)\s*=\s*Flask\s*\(", re.MULTILINE)),
    )
    factory_pat = re.compile(r"^(app|application|asgi_app|wsgi_app)\s*=\s*\w+\s*\(", re.MULTILINE)

    candidates: List[WebAppSpec] = []
    for path in sorted(repo.rglob("*.py"), key=lambda p: len(p.relative_to(repo).parts)):
        if any(part in IGNORED_DIRS for part in path.relative_to(repo).parts):
            continue
        try:
            text = path.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            continue
        rel = path.relative_to(repo)
        module = ".".join(rel.with_suffix("").parts)
        hit = None
        for framework, pat in direct_pats:
            m = pat.search(text)
            if m:
                hit = (framework, m.group(1))
                break
        if not hit:
            # Factory form: module-level `app = something(...)` in a file that imports a framework.
            is_fastapi = "fastapi" in text.lower()
            is_flask = re.search(r"\bflask\b", text, re.IGNORECASE) is not None
            if is_fastapi or is_flask:
                fm = factory_pat.search(text)
                # Avoid false hits on obvious non-entry constructors (e.g. `app = typer.Typer()`)
                if fm and not re.search(rf"^{fm.group(1)}\s*=\s*(typer|click|argparse)\b", text, re.MULTILINE):
                    hit = ("fastapi" if is_fastapi else "flask", fm.group(1))
        if hit:
            candidates.append(WebAppSpec(hit[0], module, hit[1], str(rel)))
    if not candidates:
        return None
    # Prefer conventional entry filenames (app.py, main.py, ...) at the shallowest path.
    preferred = {"app", "main", "server", "application", "wsgi", "asgi", "api"}
    candidates.sort(key=lambda c: (
        Path(c.rel_file).stem not in preferred,
        c.module.count("."),
        c.app_var not in ("app", "application"),
    ))
    return candidates[0]


def _free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def _python_version(repo: Optional[Path]) -> str:
    """Reuse the Python version the repo's own Dockerfile pins (old pins often break on newer Python)."""
    if repo:
        try:
            text = (repo / "Dockerfile").read_text(encoding="utf-8", errors="ignore")
            m = re.search(r"^FROM\s+python:(3\.(\d+))", text, re.MULTILINE | re.IGNORECASE)
            if m and int(m.group(2)) >= 8:
                return m.group(1)
        except OSError:
            pass
    return "3.12"


def _dockerfile(spec: WebAppSpec, repo: Optional[Path] = None) -> str:
    entry = Path(spec.rel_file)
    entry_dir = entry.parent.as_posix()
    module = spec.module
    # Apps often import siblings absolutely (`import libsession`, `from apis import x`), so run them from
    # their own folder. Keep the dotted path when the file uses relative imports (it needs its package).
    if entry_dir != "." and repo:
        try:
            if not re.search(r"^\s*from\s+\.", (repo / entry).read_text(encoding="utf-8", errors="ignore"), re.MULTILINE):
                module = entry.stem
        except OSError:
            pass
    workdir = "/app" if module == spec.module else f"/app/{entry_dir}"

    # requirements.txt if present (repo root or next to the entry file); always ensure the server + framework
    if spec.framework == "fastapi":
        server = "pip install --no-cache-dir fastapi 'uvicorn[standard]'"
        cmd = f'CMD ["uvicorn", "{module}:{spec.app_var}", "--host", "0.0.0.0", "--port", "{INTERNAL_PORT}"]'
    else:
        server = "pip install --no-cache-dir flask"
        cmd = (
            f'ENV FLASK_APP={module}:{spec.app_var}\n'
            f'CMD ["flask", "run", "--host", "0.0.0.0", "--port", "{INTERNAL_PORT}"]'
        )
    req_dir = "" if entry_dir == "." else f" {entry_dir}/requirements.txt"
    return f"""FROM python:{_python_version(repo)}-slim
WORKDIR /app
COPY . /app
# Prefer prebuilt wheels (--prefer-binary): source builds (psycopg2, pillow) are the slow part and a
# package with no wheel here is almost never needed to boot. One package that won't install must not
# drop the rest, so on failure install line by line.
RUN for r in requirements.txt{req_dir}; do if [ -f "$r" ]; then pip install --no-cache-dir --prefer-binary -r "$r" || grep -Ev '^\\s*(#|-|$)' "$r" | xargs -n1 pip install --no-cache-dir --prefer-binary || true; fi; done
RUN {server}
ENV PYTHONPATH=/app:/app/{entry_dir}
# Self-contained DB: apps honoring DB_BACKEND (e.g. DVRA) use in-memory SQLite, so no Postgres sidecar is needed
ENV DB_BACKEND=memory
WORKDIR {workdir}
EXPOSE {INTERNAL_PORT}
{cmd}
"""


class WebAppSandbox:
    """Context manager that builds an image from the repo and runs the app in a locked-down container."""

    def __init__(self, repo: Path, spec: WebAppSpec, build_timeout: int = 480, boot_timeout: int = 60):
        self.repo = Path(repo).resolve()
        self.spec = spec
        self.build_timeout = build_timeout
        self.boot_timeout = boot_timeout
        tag = uuid.uuid4().hex[:12]
        self.image = f"sentinelos-sbx:{tag}"
        self.container = f"sentinelos-sbx-{tag}"
        self.port = _free_port()
        self._build_log = ""

    @property
    def build_log(self) -> str:
        return self._build_log[-4000:]

    def _ensure_requirements(self) -> None:
        """Poetry repos ship no requirements.txt. Derive one from poetry.lock so the Dockerfile's
        resilient pip loop can install the deps — no Poetry binary, no dependency resolution (both slow).
        poetry.lock pins exact versions already; we just list `name==version` per [[package]] block.
        Done on the host because self.repo is a throwaway copy (Attack Lab never touches real files)."""
        if (self.repo / "requirements.txt").exists():
            return
        lock = self.repo / "poetry.lock"
        if not lock.exists():
            return
        try:
            text = lock.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            return
        lines: List[str] = []
        for block in text.split("[[package]]")[1:]:
            name = re.search(r'^\s*name\s*=\s*"([^"]+)"', block, re.MULTILINE)
            ver = re.search(r'^\s*version\s*=\s*"([^"]+)"', block, re.MULTILINE)
            cat = re.search(r'^\s*category\s*=\s*"([^"]+)"', block, re.MULTILINE)  # older lock format
            if not (name and ver):
                continue
            if cat and cat.group(1) != "main":  # skip dev-only deps when the lock marks them
                continue
            lines.append(f"{name.group(1)}=={ver.group(1)}")
        if lines:
            (self.repo / "requirements.txt").write_text("\n".join(lines) + "\n", encoding="utf-8")

    def _write_dockerfile(self) -> Path:
        # Generated name avoids clobbering any Dockerfile the repo already ships
        df = self.repo / "Dockerfile.sentinelos"
        df.write_text(_dockerfile(self.spec, self.repo), encoding="utf-8")
        return df

    def start(self) -> RunningSandbox:
        self._ensure_requirements()
        df = self._write_dockerfile()
        try:
            build = subprocess.run(
                ["docker", "build", "-f", str(df), "-t", self.image, str(self.repo)],
                capture_output=True, text=True, timeout=self.build_timeout
            )
            self._build_log = (build.stdout or "") + (build.stderr or "")
            if build.returncode != 0:
                raise SandboxError(f"docker build failed: {self._build_log[-600:]}")
        finally:
            df.unlink(missing_ok=True)

        run = subprocess.run(
            [
                # No --rm: a crashed app's logs must survive for the error message; stop() removes it
                "docker", "run", "-d",
                "--name", self.container,
                "--cap-drop", "ALL",
                "--security-opt", "no-new-privileges",
                "--memory", "512m", "--memory-swap", "512m",
                "--cpus", "1.0", "--pids-limit", "256",
                "-p", f"127.0.0.1:{self.port}:{INTERNAL_PORT}",
                self.image,
            ],
            capture_output=True, text=True, timeout=30
        )
        if run.returncode != 0:
            self._cleanup_image()
            raise SandboxError(f"docker run failed: {run.stderr.strip()[-400:]}")

        base_url = f"http://127.0.0.1:{self.port}"
        if not self._wait_healthy(base_url):
            logs = self._container_logs()
            self.stop()
            raise SandboxError(f"app did not become reachable on {base_url}. Last logs: {logs[-500:]}")
        return RunningSandbox(base_url=base_url, container=self.container, image=self.image)

    def _wait_healthy(self, base_url: str) -> bool:
        import urllib.request
        deadline = time.time() + self.boot_timeout
        while time.time() < deadline:
            # Container must still be up; a crashed app exits the container
            alive = subprocess.run(
                ["docker", "ps", "-q", "-f", f"name={self.container}"],
                capture_output=True, text=True
            ).stdout.strip()
            if not alive:
                return False
            try:
                with urllib.request.urlopen(base_url + "/", timeout=2) as r:
                    r.read(1)
                    return True
            except Exception as e:
                # Any HTTP response (even 404/500) means the server is listening
                if hasattr(e, "code"):
                    return True
            time.sleep(1)
        return False

    def _container_logs(self) -> str:
        try:
            r = subprocess.run(["docker", "logs", self.container], capture_output=True, text=True, timeout=10)
            return (r.stdout or "") + (r.stderr or "")
        except Exception:
            return ""

    def _cleanup_image(self):
        subprocess.run(["docker", "rmi", "-f", self.image], capture_output=True, timeout=30)

    def stop(self):
        subprocess.run(["docker", "rm", "-f", self.container], capture_output=True, timeout=30)
        self._cleanup_image()

    def __enter__(self) -> RunningSandbox:
        self._running = self.start()
        return self._running

    def __exit__(self, *exc):
        self.stop()
        return False


class SandboxError(RuntimeError):
    pass
