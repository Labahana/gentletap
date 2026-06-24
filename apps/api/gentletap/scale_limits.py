"""Central batch sizes and throughput limits for background work."""

# Reminder beat dispatcher — jobs enqueued per tick (workers process in parallel).
REMINDER_DISPATCH_BATCH = 100

# WhatsApp follow-up dispatcher.
WHATSAPP_DISPATCH_BATCH = 100

# Max invoices activated per auto-activate run (after each sync/import).
AUTO_ACTIVATE_BATCH = 25

# Max invoices activated per go-live / approve-all request.
ACTIVATION_BATCH = 50

# QuickBooks sync progress written to Redis at most every N invoices.
QB_SYNC_REDIS_EVERY_N = 10

# CSV / spreadsheet import row cap.
CSV_IMPORT_MAX_ROWS = 2000

# Commit imported rows every N records.
CSV_IMPORT_COMMIT_EVERY = 250

# QB client reprofile batch size (Intuit API rate limits).
PROFILE_CLIENT_BATCH = 5
