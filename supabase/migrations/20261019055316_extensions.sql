-- Extensions live in the "extensions" schema so nothing extra lands in public.
create extension if not exists postgis with schema extensions;
create extension if not exists pg_trgm with schema extensions;
