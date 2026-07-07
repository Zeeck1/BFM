-- 013: Allow users to delete their own shared lists (when removing wishlist items).

do $$ begin
  if not exists (
    select 1 from pg_policies
    where policyname = 'Users can delete own shared lists' and tablename = 'shared_lists'
  ) then
    create policy "Users can delete own shared lists" on public.shared_lists
      for delete using (auth.uid() = user_id);
  end if;
end $$;
