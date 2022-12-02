#!/bin/sh

echo "Packing asar..."
asar pack src app.asar # Package asar
# asar list app.asar # List asar for debugging / testing

echo "Copying asar..."
cp app.asar /opt/discord-canary/resources/app.asar # Overwrite app.asar for Linux Canary

echo "Running discord..."
echo ""

discord-canary "$@" # Run it
