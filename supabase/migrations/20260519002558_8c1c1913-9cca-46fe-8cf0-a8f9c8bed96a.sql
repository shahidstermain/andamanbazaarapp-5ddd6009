-- Ensure required extensions
create extension if not exists pg_net with schema extensions;
create extension if not exists supabase_vault with schema vault;

-- Helper: read alert secret from vault (callable by service role from edge function)
create or replace function public.get_publish_alert_secret()
returns text
language sql
security definer
set search_path = public, vault
as $$
  select decrypted_secret
  from vault.decrypted_secrets
  where name = 'publish_alert_secret'
  limit 1;
$$;

revoke all on function public.get_publish_alert_secret() from public, anon, authenticated;
grant execute on function public.get_publish_alert_secret() to service_role;

-- Internal trigger function for posts
create or replace function public.tg_notify_post_published()
returns trigger
language plpgsql
security definer
set search_path = public, vault, extensions
as $$
declare
  v_secret text;
  v_author text;
begin
  -- Only fire when transitioning to (or inserting as) published
  if NEW.status <> 'published' then
    return NEW;
  end if;
  if TG_OP = 'UPDATE' and OLD.status = 'published' then
    return NEW;
  end if;

  select decrypted_secret into v_secret
  from vault.decrypted_secrets where name = 'publish_alert_secret' limit 1;

  if v_secret is null then
    return NEW;
  end if;

  select coalesce(name, email) into v_author
  from public.profiles where id = NEW.author_id;

  perform net.http_post(
    url := 'https://tsduibmoqntxqdaswbef.supabase.co/functions/v1/notify-publish-alert',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-alert-secret', v_secret,
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRzZHVpYm1vcW50eHFkYXN3YmVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwNTIxMzYsImV4cCI6MjA5MjYyODEzNn0.R1B7cuzxY_sZczpm1reiPcpQTXBZPU5AXoXA65dcKb8'
    ),
    body := jsonb_build_object(
      'kind', 'post',
      'id', NEW.id,
      'title', NEW.title,
      'slug', NEW.slug,
      'category', NEW.category,
      'author', v_author
    )
  );

  return NEW;
end;
$$;

drop trigger if exists trg_notify_post_published on public.posts;
create trigger trg_notify_post_published
after insert or update of status on public.posts
for each row execute function public.tg_notify_post_published();

-- Internal trigger function for listings
create or replace function public.tg_notify_listing_published()
returns trigger
language plpgsql
security definer
set search_path = public, vault, extensions
as $$
declare
  v_secret text;
  v_author text;
begin
  if NEW.status <> 'active' then
    return NEW;
  end if;

  select decrypted_secret into v_secret
  from vault.decrypted_secrets where name = 'publish_alert_secret' limit 1;

  if v_secret is null then
    return NEW;
  end if;

  select coalesce(name, email) into v_author
  from public.profiles where id = NEW.seller_id;

  perform net.http_post(
    url := 'https://tsduibmoqntxqdaswbef.supabase.co/functions/v1/notify-publish-alert',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-alert-secret', v_secret,
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRzZHVpYm1vcW50eHFkYXN3YmVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwNTIxMzYsImV4cCI6MjA5MjYyODEzNn0.R1B7cuzxY_sZczpm1reiPcpQTXBZPU5AXoXA65dcKb8'
    ),
    body := jsonb_build_object(
      'kind', 'listing',
      'id', NEW.id,
      'title', NEW.title,
      'category', NEW.category,
      'city', NEW.city,
      'price', NEW.price,
      'author', v_author
    )
  );

  return NEW;
end;
$$;

drop trigger if exists trg_notify_listing_published on public.listings;
create trigger trg_notify_listing_published
after insert on public.listings
for each row execute function public.tg_notify_listing_published();