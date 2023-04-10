#!/bin/sh

echo "$(git rev-parse HEAD | cut -c 1-7) | $(git log -1 --pretty=%B)"

size_old=$(stat -c "%s" old.asar)
size_new=$(stat -c "%s" app.asar)

# echo "print(\"%+2.3f KB\" % (($size_new-$size_old)/1024))" | python3