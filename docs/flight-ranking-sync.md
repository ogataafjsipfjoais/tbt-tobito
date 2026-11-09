# Shared practice ranking

The browser reads GET api/flight-ranking.php and POSTs completed flights and name updates as JSON. The script URL determines the API URL for both the standalone page and the WordPress theme package.

Persistent server data is data/flight-ranking-store.php. A PHP exit guard prevents direct HTTP disclosure of private ownership hashes. A separate flock lock and atomic rename protect concurrent writes. Build/deployment must never replace this runtime file; rsync deployments exclude it and the lock file. Existing ranking.json is retained; exact old sample records are excluded during migration.

Scores are immutable after insertion. The browser's randomly generated ownership token permits renaming its own entry, not someone else's. Public responses contain no token/hash. This is an unauthenticated, client-submitted practice leaderboard, not verified contest results or an anti-cheat system. Each owner may create up to 60 entries/hour; the server retains the best 1000 and returns the top ten.

Pending writes survive reload in browser storage. Failed writes retry when the browser regains focus/connectivity or the refresh button is used. The browser marks synchronization complete only after an accepted-ID response. The historical local leaderboard remains in its original storage; the explicit import button uploads those records idempotently. Server dates use Asia/Tokyo.

Tests use a separate temporary data directory via TBT_RANKING_DATA_DIR, never production ranking data. On the deployment host the PHP process needs write access to data/.
