-- Rate limiting (owner: P5). Counts calls per key in fixed time windows.
-- Called only by server code with the secret key (lib/rateLimit.ts), never by browsers.

create or replace function public.increment_rate_limit(p_key text, p_window_start timestamptz)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  new_count integer;
begin
  insert into public.rate_limits (key, window_start, count)
  values (p_key, p_window_start, 1)
  on conflict (key, window_start) do update set count = public.rate_limits.count + 1
  returning count into new_count;

  -- About 1 call in 100 also clears out windows older than two days,
  -- so hashed IP keys are kept no longer than the privacy policy says.
  if random() < 0.01 then
    delete from public.rate_limits where window_start < now() - interval '2 days';
  end if;

  return new_count;
end;
$$;

revoke execute on function public.increment_rate_limit(text, timestamptz) from public, anon, authenticated;
