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

function normalizeSavedLink(row: SavedLink): SavedLink {
  const normalized: SavedLink = {
    ...row,
    price_thb: row.price_thb == null ? undefined : Number(row.price_thb),
    price_mmk: row.price_mmk == null ? undefined : Number(row.price_mmk),
    review_count: row.review_count == null ? undefined : Number(row.review_count),
    average_score: row.average_score == null ? undefined : Number(row.average_score),
    sold_count: row.sold_count == null ? undefined : Number(row.sold_count),
    product_colors: Array.isArray(row.product_colors) ? row.product_colors : undefined,
    product_sizes: Array.isArray(row.product_sizes) ? row.product_sizes : undefined,
  };
  if (row.shop_name == null) delete normalized.shop_name;
  return normalized;
}

interface SavedItemsContextValue {
  items: SavedLink[];
  loading: boolean;
  saving: boolean;
  save: (preview: ProductPreview, exchangeRate: number) => Promise<SavedLink | null>;
  updateNotes: (id: string, notes: string) => Promise<boolean>;
  updatePrice: (id: string, price_mmk: number | null, price_thb: number | null) => Promise<boolean>;
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
    const richResult = await supabase
      .from("saved_links")
      .select("id,user_id,url,title,description,image_url,price_thb,price_mmk,site_name,shop_name,review_count,average_score,sold_count,product_colors,product_sizes,notes,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    let rows = (richResult.data ?? []) as SavedLink[];
    let fetchError = richResult.error;
    if (fetchError) {
      const fallback = await supabase
        .from("saved_links")
        .select("id,user_id,url,title,description,image_url,price_thb,price_mmk,site_name,notes,created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      rows = (fallback.data ?? []) as SavedLink[];
      fetchError = fallback.error;
    }
    if (fetchError) console.error("[useSavedItems] fetch failed:", fetchError.message);
    setItems(rows.map(normalizeSavedLink));
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

      const basePayload = {
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
      };
      const metadataPayload = {
        shop_name: preview.shop_name ?? null,
        review_count: preview.review_count ?? null,
        average_score: preview.average_score ?? null,
        sold_count: preview.sold_count ?? null,
        product_colors: preview.product_colors ?? null,
        product_sizes: preview.product_sizes ?? null,
      };

      let { data, error } = await supabase
        .from("saved_links")
        .upsert(
          {
            ...basePayload,
            ...metadataPayload,
          },
          { onConflict: "user_id,url" },
        )
        .select()
        .single();
      if (error) {
        const fallback = await supabase
          .from("saved_links")
          .upsert(basePayload, { onConflict: "user_id,url" })
          .select()
          .single();
        data = fallback.data;
        error = fallback.error;
      }

      setSaving(false);
      if (error || !data) return null;

      const saved = normalizeSavedLink(data as SavedLink);
      setItems((prev) => {
        const exists = prev.findIndex((i) => i.id === saved.id);
        if (exists >= 0) {
          const next = [...prev];
          next[exists] = saved;
          return next;
        }
        return [saved, ...prev];
      });

      try {
        await syncSavedItemInSharedLists(userId, saved);
      } catch (err) {
        console.error("[useSavedItems] sync saved item failed:", err);
      }
      return saved;
    },
    [userId],
  );

  const updatePrice = useCallback(
    async (id: string, price_mmk: number | null, price_thb: number | null): Promise<boolean> => {
      const { data, error } = await supabase
        .from("saved_links")
        .update({ price_mmk, price_thb })
        .eq("id", id)
        .select()
        .single();

      if (error || !data) return false;

      const updated = normalizeSavedLink(data as SavedLink);
      setItems((prev) => prev.map((item) => (item.id === id ? updated : item)));

      if (userId) {
        try {
          await syncSavedItemInSharedLists(userId, updated);
        } catch (err) {
          console.error("[useSavedItems] sync price failed:", err);
        }
      }
      return true;
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

      const updated = normalizeSavedLink(data as SavedLink);
      setItems((prev) => prev.map((item) => (item.id === id ? updated : item)));

      if (userId) {
        try {
          await syncSavedItemInSharedLists(userId, updated);
        } catch (err) {
          console.error("[useSavedItems] sync notes failed:", err);
        }
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
      updatePrice,
      remove,
      removeMany,
      refetch: fetchItems,
    }),
    [items, loading, saving, save, updateNotes, updatePrice, remove, removeMany, fetchItems],
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
