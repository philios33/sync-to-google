# Sync to Google

This project aims to watch a directory for newly created files and upload them as soon as they appear.
The upload should start even before the file has finished being written to decrease latency.
The system does not need to support altering existing files on the remote side since only new data will be appended.
The system should have a configurable retention period which will remove items from the remote side.
For now the remote side is a Google Storage bucket written by the node SDK.
The local side is some configurable directory.

# Rethink

We need to rethink how we do this because hashing all files in FS takes up too much memory.


npm run build

node ./dist/index.js

