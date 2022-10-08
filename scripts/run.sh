#/bin/bash

# To compile the ../src use npm install in ../src directory

if [ -z "$1" ]; then
	printf "discord-canaty app.asar directory must be suplied as the first argument!\nuse find / -name app.asar 2>/dev/null to locate it\nthe path should look like that:\n\t/opt/discord-canary/resources/app.asar\n\t/usr/share/discord-canary/resources/app.asar"
	exit 1
fi
echo "Packing asar..."
./injectPolyfills.sh
npx asar pack src app.asar # Package asar
# asar list app.asar # List asar for debugging / testing

echo "Copying asar..."
#old #cp app.asar /opt/discord-canary/resources/app.asar # Overwrite app.asar for Linux Canary
cp app.asar $1 || exit 1

echo "Running discord..."
echo ""

discord-canary "$@" # Run it
