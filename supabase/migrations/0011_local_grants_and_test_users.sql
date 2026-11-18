-- 1) API role grants. Newer Supabase CLI versions no longer auto-grant public
--    tables to the API roles, so every REST call returned 403 on a fresh
--    local stack. Hosted projects already have these grants; this is a no-op there.
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables    in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all functions in schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables    to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;

-- 2) Local test logins, one per role (password: LocalDev#12345).
--    LOCAL DEVELOPMENT ONLY: guarded so it only runs on a local Supabase stack
--    (the local CLI stack uses the well-known default JWT secret; anywhere else
--    this block is skipped). Skips users that already exist.
do $$
declare
  u record;
  v_id uuid;
begin
  if coalesce(current_setting('app.settings.jwt_secret', true), '') <> 'super-secret-jwt-token-with-at-least-32-characters-long' then
    raise notice 'Skipping local test users: not a local Supabase stack';
    return;
  end if;

  for u in select * from (values
      ('l1@local.test',    'Local L1 Agent', 'l1'),
      ('admin@local.test', 'Local Admin',    'admin')
    ) as t(email, full_name, role)
  loop
    continue when exists (select 1 from auth.users where email = u.email);
    v_id := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change,
      email_change_token_current, reauthentication_token, phone_change, phone_change_token
    ) values (
      '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated', u.email,
      extensions.crypt('LocalDev#12345', extensions.gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}', jsonb_build_object('full_name', u.full_name),
      now(), now(), '', '', '', '', '', '', '', ''
    );
    insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), v_id, v_id::text, 'email',
            jsonb_build_object('sub', v_id::text, 'email', u.email, 'email_verified', true), now(), now(), now());
    insert into public.profiles (id, full_name, role) values (v_id, u.full_name, u.role);
  end loop;
end $$;
