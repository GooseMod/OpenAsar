#!/bin/sh

channel=$1
echo $channel

path=""
if [[ $channel == "stable" ]]; then
  path="/opt/discord"
else
  path="/opt/discord-$channel"
fi

path+="/resources/app.asar"

echo $path

mv "$path" "$path.backup"
wget https://github.com/GooseMod/OpenAsar/releases/download/nightly/app.asar -O "$path"