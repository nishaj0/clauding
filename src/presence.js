#!/usr/bin/env node
// Entry point.  no args: Claude Code hook (JSON on stdin)   |   `daemon`: hold the Discord connection
require(process.argv[2] === 'daemon' ? './daemon' : './hook').run();
