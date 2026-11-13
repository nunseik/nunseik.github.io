#!/usr/bin/env python3
"""wavebars.py LABEL=FILE.wav ... -> one row of block characters per file (loudness envelope), for terminal clips."""
import sys, wave, array

BARS = " ▁▂▃▄▅▆▇█"

def envelope(path, cols):
    with wave.open(path) as w:
        n, ch, width = w.getnframes(), w.getnchannels(), w.getsampwidth()
        data = array.array({2: "h", 4: "i"}[width], w.readframes(n))
        rate = w.getframerate()
    mono = data[::ch]
    step = max(1, len(mono) // cols)
    peaks = [max((abs(x) for x in mono[i:i + step]), default=0) for i in range(0, step * cols, step)]
    top = max(peaks) or 1
    return "".join(BARS[min(8, round(8 * p / top))] for p in peaks), len(mono) / rate

cols = 64
for arg in sys.argv[1:]:
    label, path = arg.split("=", 1)
    bars, secs = envelope(path, cols)
    print(f"\033[38;2;131;142;127m{label:<10}\033[0m \033[38;2;147;196;125m{bars}\033[0m \033[38;2;131;142;127m{secs:4.1f}s\033[0m")
