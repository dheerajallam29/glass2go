#!/usr/bin/env bash
# Renders everything the homepage needs, in the order that makes the site testable soonest.
# Resumable: re-run and it skips frames already on disk.
#   layout bounds -> phone frames -> desktop hover-tilt crops -> desktop frames
#   Needs the laptop PLUGGED IN: on battery Windows throttles the CPU roughly 10x.
HERE="$(cd "$(dirname "$0")" && pwd)"
OUT="${1:-$HERE/../renders}"
B="${BLENDER:-/c/Program Files/Blender Foundation/Blender 5.2/blender.exe}"
FINALW="${G2G_FINAL_WIDTH:-1920}"   # desktop frame width (1920 = full quality)
MOTION="${G2G_MOTION_SAMPLES:-32}"     # frames in motion: seen for 40 ms each
STILL="${G2G_STILL_SAMPLES:-128}"      # waypoint stills and tilt crops: the frames people stare at

run() {
  echo "=== $* [$(date +%T)]"
  "$B" -b -P "$HERE/flight.py" -- "$OUT" "$@" 2>&1 | grep -E "Error|Traceback|DONE" | grep -v CUEW
}

rm -f "$OUT/ALL_DONE.txt"
run --set landscape --mode bounds --quality final
run --set portrait  --mode bounds --quality final
run --set portrait  --mode frames --quality final --samples "$MOTION" --still-samples "$STILL"
run --set landscape --mode tilt   --quality final --still-samples "$STILL" --final-width "$FINALW"
run --set landscape --mode frames --quality final --samples "$MOTION" --still-samples "$STILL" --final-width "$FINALW"
echo "=== ALL DONE [$(date +%T)]"
touch "$OUT/ALL_DONE.txt"
