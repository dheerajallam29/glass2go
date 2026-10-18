#!/usr/bin/env bash
# Re-renders only the waypoint stills (the frames the homepage rests on) at full 1920x1200 quality into renders_hi/.
# The moving frames stay at 1280 wide; at rest the page shows these sharp frames.
#   blender/render_stills.sh [samples]
HERE="$(cd "$(dirname "$0")" && pwd)"
OUT="$HERE/../renders_hi"
B="${BLENDER:-/c/Program Files/Blender Foundation/Blender 5.2/blender.exe}"
S="${1:-160}"
for f in 1 49 157 205 253; do
  echo "=== frame $f [$(date +%T)]"
  "$B" -b -P "$HERE/flight.py" -- "$OUT" --set landscape --mode frames --quality final --samples 20 --still-samples "$S" --final-width 1920 --frames "$f-$f" 2>&1 | grep -E "Error|Traceback|DONE" | grep -v CUEW
done
echo "=== STILLS DONE [$(date +%T)]"
touch "$OUT/STILLS_DONE.txt"
