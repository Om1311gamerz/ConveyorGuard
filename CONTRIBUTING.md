# Contributing

Read the [architecture](docs/architecture.md) and [API contract](docs/api.md) before changing ingestion or source selection. Preserve working hardware protocols and historical rows.

1. Make an incremental change with explicit source provenance and sensor units.
2. Use `config/defaults.json` for shared prototype defaults. Persist user configuration through the backend.
3. Run `npm run check`. Use `.venv/Scripts/python.exe -m unittest discover -s vision -p "test_*.py"` on Windows for vision packet contracts.
4. Document changes to status, thresholds, schema, and limitations. A green software test does not validate hardware or model accuracy.
5. Review `git diff --cached` before committing. Keep secrets, Python environments, SQLite runtime files, and future training runs out of Git.

Use a new capture session, belt, lighting condition, or site as an independent evaluation split; do not distribute augmented versions of the same scene across training and evaluation partitions. Record false positives and false negatives.

Motor actuation is outside routine software verification. Preserve stop latches and watchdogs. Changes affecting physical control require independent electrical and mechanical review by the project team.
