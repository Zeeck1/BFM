-- 014: Allow users to update their own shared lists (for live item removal).

do $$ begin
  if not exists (
    select 1 from pg_policies
    where policyname = 'Users can update own shared lists' and tablename = 'shared_lists'
  ) then
    create policy "Users can update own shared lists" on public.shared_lists
      for update using (auth.uid() = user_id);
  end if;
end $$;
