import os
import sys
import tempfile
from pathlib import Path

# Tests get their own throwaway SQLite DB so they never add "Engine …"/"Hook Test …" workspaces
# to the real sentinel.db. Must be set before any `app` import reads settings.
os.environ["DATABASE_URL"] = f"sqlite:///{Path(tempfile.mkdtemp(prefix='sentinel-test-')) / 'test.db'}"

# Add backend directory to sys.path so app is importable
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))
