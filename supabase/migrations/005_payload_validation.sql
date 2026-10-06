begin;
create function private.validate_record_payload() returns trigger language plpgsql set search_path='' as $$
declare shape jsonb;field record;v jsonb;key text;
begin
 if new.deleted then return new;end if;
 shape:=case new.kind
 when 'activity' then '{"date":"string","time":"string","period":"string","duration":"number","fixed":"boolean","placeId":"string","address":"string","participants":"array","notes":"string","order":"number","status":"string","reservationId":"string"}'
 when 'reservation' then '{"category":"string","date":"string","endDate":"string","time":"string","endTime":"string","city":"string","address":"string","code":"string","price":"number","currency":"string","status":"string","notes":"string","documentId":"string","addToItinerary":"boolean"}'
 when 'expense' then '{"date":"string","amount":"number","currency":"string","rate":"number","category":"string","payer":"string","split":"array","shoppingId":"string","notes":"string"}'
 when 'shopping' then '{"brand":"string","image":"string","price":"number","targetPrice":"number","currency":"string","store":"string","url":"string","priority":"string","size":"string","notes":"string","bought":"boolean","actualPrice":"number","bagId":"string","weight":"number"}'
 when 'bag' then '{"traveler":"string","type":"string","limit":"number","actualWeight":"number"}'
 when 'packing' then '{"bagId":"string","traveler":"string","category":"string","weight":"number","quantity":"number","packed":"boolean","returnPacked":"boolean","shoppingId":"string"}'
 when 'checklist' then '{"phase":"string","due":"string","assignee":"string","done":"boolean","suggested":"boolean"}'
 when 'document' then '{"category":"string","expires":"string","notes":"string","filePath":"string","fileName":"string","mime":"string","essential":"boolean","fictitious":"boolean"}'
 when 'memory' then '{"date":"string","notes":"string","rating":"number","placeId":"string","favorite":"boolean","photoIds":"array"}'
 when 'saved' then '{"placeId":"string","notes":"string","tags":"array","priority":"string"}'
 when 'budget' then '{"total":"number","currency":"string","categories":"object"}'
 when 'profile' then '{"language":"string","currency":"string","interests":"array","priorities":"string","shoeSize":"string","clothesSize":"string","height":"number","preferences":"string","tripPreferences":"string","theme":"string","notifications":"object"}'
 when 'emergency' then '{"contactName":"string","contactPhone":"string","insurance":"string","policy":"string","insurancePhone":"string","medicalNotes":"string","cardEnglish":"string"}'
 when 'day' then '{"date":"string","intensity":"string","notes":"string"}'
 when 'note' then '{"date":"string","notes":"string"}'
 when 'proposal' then '{"rationale":"string","changes":"array","status":"string","createdAt":"string"}'
 when 'message' then '{"role":"string","text":"string","at":"string","proposalId":"string"}' end;
 for field in select * from jsonb_each_text(shape) loop
  v:=new.data->field.key;
  if jsonb_typeof(v) is distinct from field.value then raise exception 'Invalid field: %',field.key;end if;
  if field.value='array' and field.key<>'changes' and exists(select 1 from jsonb_array_elements(v) a where jsonb_typeof(a)<>'string') then raise exception 'Invalid list: %',field.key;end if;
 end loop;
 foreach key in array array['amount','price','targetPrice','actualPrice','weight','actualWeight','limit','total','duration','rate','quantity','height'] loop
  if new.data?key and (new.data->>key)::numeric<0 then raise exception 'Negative value: %',key;end if;
 end loop;
 foreach key in array array['date','endDate','due','expires'] loop
  if coalesce(new.data->>key,'')<>'' then perform (new.data->>key)::date;end if;
 end loop;
 if new.kind='activity' then
  if new.data->>'period' not in ('morning','afternoon','evening') or new.data->>'status' not in ('planned','done') or (new.data->>'fixed')::boolean and new.data->>'time'='' then raise exception 'Invalid activity';end if;
  foreach key in array array['lat','lng'] loop if not new.data?key or jsonb_typeof(new.data->key) not in ('number','null') then raise exception 'Invalid coordinate';end if;end loop;
  if abs((new.data->>'lat')::numeric)>90 or abs((new.data->>'lng')::numeric)>180 then raise exception 'Invalid coordinate range';end if;
 end if;
 if new.kind='memory' and ((new.data->>'rating')::numeric not between 1 and 5 or (new.data->>'rating')::numeric<>trunc((new.data->>'rating')::numeric)) then raise exception 'Invalid rating';end if;
 if new.kind='packing' and (new.data->>'quantity')::numeric<1 then raise exception 'Invalid quantity';end if;
 return new;
end;$$;
revoke all on function private.validate_record_payload() from public;
create trigger validate_payload before insert or update on public.travel_records for each row execute function private.validate_record_payload();
commit;
