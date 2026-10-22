-- Browser notifications (owner: P3, Oct 22, 2026). Texting needs an adult-owned,
-- carrier-registered Twilio sender, so alerts also go out as Web Push notifications.
-- Each subscribed browser gets a users row with its push subscription instead of a
-- phone number: the push service URL and the two keys that encrypt messages for that
-- browser. No phone, email or address. Deleting the row (on turn-off or when the push
-- service says the subscription expired) removes its bodies, reminders and queue rows.
alter table public.users
  add column push_endpoint text unique,
  add column push_p256dh text,
  add column push_auth text,
  add constraint users_push_complete check (
    (push_endpoint is null and push_p256dh is null and push_auth is null)
    or (push_endpoint is not null and push_p256dh is not null and push_auth is not null)
  );
