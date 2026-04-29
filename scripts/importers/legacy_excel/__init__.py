from pathlib import Path
import sys


ROOT = Path(__file__).resolve().parents[3]
VENDOR = ROOT / "vendor" / "python"

if str(VENDOR) not in sys.path:
  sys.path.insert(0, str(VENDOR))
