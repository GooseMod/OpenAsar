#!/bin/sh

find src -type f -name "*.js" -exec sed -i -E 's@[[:blank:]]*([^:]//).*@@;T;/./!d' {} +