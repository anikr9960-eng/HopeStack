#!/bin/bash
# HopeStack — Secure Voice Launch Script
# This official script bypasses browser protocol restrictions to enable Microphone & Tone Analysis.

echo "🌿 HopeStack: Launching with Voice Support..."

# 1. Kill any existing servers on port 8000
lsof -ti:8000 | xargs kill -9 2>/dev/null

# 2. Try to start a server using Python 3
if command -v python3 &>/dev/null; then
    echo "✅ Starting local server via Python 3..."
    python3 -m http.server 8000 &
# 3. Fallback to Python 2 (MacOS legacy)
elif command -v python &>/dev/null; then
    echo "✅ Starting local server via Python 2..."
    python -m SimpleHTTPServer 8000 &
# 4. Fallback to PHP (MacOS built-in)
elif command -v php &>/dev/null; then
    echo "✅ Starting local server via PHP..."
    php -S localhost:8000 &
else
    echo "❌ ERROR: No server tools found (Python/PHP). Please install Xcode Command Line Tools."
    exit 1
fi

sleep 2
echo "🌐 Opening HopeStack at http://localhost:8000 ..."
open http://localhost:8000
echo "DONE! If prompted, please click 'Allow' for Microphone access. 🎙️"
