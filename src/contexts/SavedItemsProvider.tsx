import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  removeItemsFromSharedLists,
  syncSavedItemInSharedLists,
} from "../lib/shareList";
import { supabase } from "../lib/supabase";
import type { ProductPreview, SavedLink } from "../types";

interface SavedItemsContextValue {
  items: SavedLink[];
  loading: boolean;
  saving: boolean;
  save: (preview: ProductPreview, exchangeRate: number) => Promise<SavedLink | null>;
  updateNotes: (id: string, notes: string) => Promise<boolean>;
  remove: (id: string) => Promise<boolean>;
  removeMany: (ids: string[]) => Promise<boolean>;
  refetch: () => Promise<void>;
}

const SavedItemsContext = createContext<SavedItemsContextValue | null>(null);

export function SavedItemsProvider({
  userId,
  children,
}: {
  userId: string | null;
  children: ReactNode;
}) {
  const [items, setItems] = useState<SavedLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchItems = useCallback(async () => {
    if (!userId) {
      setItems([]);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("saved_links")
      .select("id,user_id,url,title,image_url,price_thb,price_mmk,site_name,notes,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    setItems((data ?? []) as SavedLink[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const save = useCallback(
    async (preview: ProductPreview, exchangeRate: number): Promise<SavedLink | null> => {
      if (!userId) return null;
      setSaving(true);

      const price_mmk =
        preview.price_thb != null
          ? Math.round(preview.price_thb * exchangeRate)
          : undefined;

      const { data, error } = await supabase
        .from("saved_links")
        .upsert(
          {
            user_id: userId,
            url: preview.url,
            title: preview.title ?? null,
            description: preview.description ?? null,
            image_url: preview.image_url ?? null,
            ...(preview.price_thb != null
              ? {
                  price_thb: preview.price_thb,
                  price_mmk: price_mmk ?? null,
                }
              : {}),
            site_name: preview.site_name ?? null,
          },
          { onConflict: "user_id,url" },
        )
        .select()
        .single();

      setSaving(false);
      if (error || !data) return null;

      const saved = data as SavedLink;
      setItems((prev) => {
        const exists = prev.findIndex((i) => i.id === saved.id);
        if (exists >= 0) {
          const next = [...prev];
          next[exists] = saved;
          return next;
        }
        return [saved, ...prev];
      });

      await syncSavedItemInSharedLists(userId, saved);
      return saved;
    },
    [userId],
  );

  const remove = useCallback(
    async (id: string): Promise<boolean> => {
      if (!userId) return false;

      setItems((prev) => prev.filter((item) => item.id !== id));
      await removeItemsFromSharedLists(userId, [id]);

      const { error } = await supabase.from("saved_links").delete().eq("id", id);
      if (error) {
        console.error("[useSavedItems] remove failed:", error.message);
        await fetchItems();
        return false;
      }

      return true;
    },
    [userId, fetchItems],
  );

  const removeMany = useCallback(
    async (ids: string[]): Promise<boolean> => {
      if (!userId || ids.length === 0) return false;

      const idSet = new Set(ids);
      setItems((prev) => prev.filter((item) => !idSet.has(item.id)));
      await removeItemsFromSharedLists(userId, ids);

      const { error } = await supabase.from("saved_links").delete().in("id", ids);
      if (error) {
        console.error("[useSavedItems] removeMany failed:", error.message);
        await fetchItems();
        return false;
      }

      return true;
    },
    [userId, fetchItems],
  );

  const updateNotes = useCallback(
    async (id: string, notes: string): Promise<boolean> => {
      const trimmed = notes.trim();
      const { data, error } = await supabase
        .from("saved_links")
        .update({ notes: trimmed || null })
        .eq("id", id)
        .select()
        .single();

      if (error || !data) return false;

      const updated = data as SavedLink;
      setItems((prev) => prev.map((item) => (item.id === id ? updated : item)));

      if (userId) {
        await syncSavedItemInSharedLists(userId, updated);
      }
      return true;
    },
    [userId],
  );

  const value = useMemo(
    () => ({
      items,
      loading,
      saving,
      save,
      updateNotes,
      remove,
      removeMany,
      refetch: fetchItems,
    }),
    [items, loading, saving, save, updateNotes, remove, removeMany, fetchItems],
  );

  return <SavedItemsContext.Provider value={value}>{children}</SavedItemsContext.Provider>;
}

export function useSavedItems(): SavedItemsContextValue {
  const ctx = useContext(SavedItemsContext);
  if (!ctx) {
    throw new Error("useSavedItems must be used within SavedItemsProvider");
  }
  return ctx;
}
