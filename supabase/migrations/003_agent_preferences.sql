begin;
create function private.persist_profile() returns trigger language plpgsql security definer set search_path='' as $$begin
 if new.kind='profile' and not new.deleted then update public.users set name=left(new.data->>'title',80),language=new.data->>'language',currency=new.data->>'currency',preferences=new.data-'tripPreferences' where id=new.owner_id;end if;return new;end;$$;
revoke all on function private.persist_profile() from public;
create trigger profile_preferences after insert or update on public.travel_records for each row execute function private.persist_profile();
create table private.agent_limits(user_id uuid primary key,window_at timestamptz not null,hits integer not null);
create function public.reserve_agent_request() returns boolean language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();count_now integer;begin
 if actor is null then return false;end if;
 insert into private.agent_limits values(actor,now(),1) on conflict(user_id) do update set hits=case when agent_limits.window_at<now()-interval '1 hour' then 1 else agent_limits.hits+1 end,window_at=case when agent_limits.window_at<now()-interval '1 hour' then now() else agent_limits.window_at end returning hits into count_now;
 return count_now<=30;end;$$;
revoke all on function public.reserve_agent_request() from public,anon;
grant execute on function public.reserve_agent_request() to authenticated;
commit;
