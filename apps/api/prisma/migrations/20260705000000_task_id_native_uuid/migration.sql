-- Store the primary key as a native `uuid` instead of `text`. Existing ids are already
-- valid UUID strings, so the explicit `USING id::uuid` cast converts them in place
-- (and is a no-op on a fresh, empty table). No FKs reference this column.
ALTER TABLE "tasks" ALTER COLUMN "id" SET DATA TYPE UUID USING "id"::uuid;
