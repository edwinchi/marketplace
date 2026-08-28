# Migration order

Run `00` through `10` in numeric order. `database.types.ts` is application code, not a migration.

Important: `08_nl_geography.sql` includes all 12 provinces and an official-data staging/merge process. Load the latest CBS municipality export at deployment time so municipal reorganizations do not become stale in source control. `07_vehicle_catalog.sql` intentionally contains starter makes/models and a normalized catalog schema; populate the exhaustive production catalog through RDW ETL.

The taxonomy is an original, marketplace-oriented structure and is not represented as an exact copy of any third-party site's proprietary taxonomy.
