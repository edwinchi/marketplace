// Entry point Plesk's LiteSpeed Node.js runner (lsnode.js) expects at the app root — confirmed
// from this server's own stderr.log, which was failing on `Cannot find module '.../app.js'`.
// The actual server is Next's generated standalone server.js; this just hands off to it. Must be
// copied into .next/standalone/ on every build/deploy — see agents.md §11.
require("./server.js");
