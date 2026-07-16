# Redis
Database is the source of truth.

Write flow:
1. Update DB
2. Invalidate/update cache
3. Read updated record
4. Refresh cache
5. Return fresh data
