#!/bin/sh

find src -type f -name "*.js" -exec sed -i -E 's@[[:blank:]]*([^:]//).*@@;T;/./!d' {} + # Remove // comments (ignore URLs)
find src -type f -name "*.js" -exec sed -i '/^[[:space:]]*$/d' {} + # Remove whitespace