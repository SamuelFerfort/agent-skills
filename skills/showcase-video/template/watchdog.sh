#!/usr/bin/env bash
# Stops ONE render (the node PID given + its chrome/ffmpeg descendants) when memory
# gets tight, before the OOM killer takes the whole desktop session with it.
# Never kill renders by name pattern: other sessions may be rendering their own videos.
# Usage: ./watchdog.sh <node-pid>   (MIN_MB=1200 MAX_PSI=25 to tune; Linux and macOS)
PID=$1; MIN_MB=${MIN_MB:-1200}; MAX_PSI=${MAX_PSI:-25}
desc() { for c in $(pgrep -P "$1"); do echo "$c"; desc "$c"; done; }
avail_mb() {
  if [ -r /proc/meminfo ]; then awk '/MemAvailable/ {print int($2/1024)}' /proc/meminfo
  else vm_stat | awk '/page size of/ {ps=$8} /Pages (free|inactive|speculative)/ {gsub(/\./,"",$NF); n+=$NF} END {print int(n*ps/1048576)}'
  fi
}
psi() { [ -r /proc/pressure/memory ] && awk '/^some/ {split($2,a,"="); print int(a[2])}' /proc/pressure/memory || echo 0; }
while kill -0 "$PID" 2>/dev/null; do
  avail=$(avail_mb); p=$(psi)
  if [ "${avail:-99999}" -lt "$MIN_MB" ] || [ "${p:-0}" -gt "$MAX_PSI" ]; then
    kill $(desc "$PID") "$PID" 2>/dev/null
    echo "WATCHDOG STOPPED RENDER: avail=${avail}MB psi=${p}"; exit 1
  fi
  sleep 2
done
