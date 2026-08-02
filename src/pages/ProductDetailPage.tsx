import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useOutletContext, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  BookmarkCheck,
  BookmarkPlus,
  ExternalLink,
  ImageOff,
  Loader2,
  Pencil,
  QrCode,
  Receipt,
  Star,
  StickyNote,
  Store,
} from "lucide-react";
import type { AppOutletContext } from "../components/AppLayout";
import { ImageLightbox } from "../components/ImageLightbox";
import { LinkSlipModal } from "../components/LinkSlipModal";
import { ProductNotesModal } from "../components/ProductNotesModal";
import { QRCodeModal } from "../components/QRCodeModal";
import { SiteAvatar } from "../components/SiteAvatar";
import { useSavedItems } from "../contexts/SavedItemsProvider";
import { findSavedLinkByUrl } from "../lib/savedLinkMatch";
import { useExchangeRate } from "../hooks/useExchangeRate";
import { userAvatarUrl, userDisplayName } from "../lib/auth";
import { BFM_ERRORS, toBfmUserError } from "../lib/bfmMessages";
import { fetchPreview } from "../lib/preview";
import { splitProductCopy } from "../lib/productCopy";
import { getOrCreateSharedList, shareUrl, timeRemaining } from "../lib/shareList";
import { formatMMK, formatSoldCount, formatTHB } from "../lib/utils";
import type { ProductPreview, ProductSearchResult, SavedLink } from "../types";

type DetailLocationState = {
  product?: ProductSearchResult;
  from?: string;
};

function detectProductLanguage(text: string): string {
  if (/[\u0E00-\u0E7F]/u.test(text)) return "th";
  if (/[\u1000-\u109F]/u.test(text)) return "my";
  if (/[\u3040-\u30FF]/u.test(text)) return "ja";
  if (/[\uAC00-\uD7AF]/u.test(text)) return "ko";
  if (/[\u3400-\u9FFF]/u.test(text)) return "zh";
  return "en";
}

export function ProductDetailPage() {
  const { user, onSignIn } = useOutletContext<AppOutletContext>();
  const { items, loading: itemsLoading, save, saving, updateNotes } = useSavedItems();
  const { rate } = useExchangeRate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as DetailLocationState | null;
  const savedId = searchParams.get("id");
  const productUrl = searchParams.get("url");
  const [fetchedProduct, setFetchedProduct] = useState<ProductPreview | null>(null);
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [slipItem, setSlipItem] = useState<SavedLink | null>(null);
  const [qrOpen, setQrOpen] = useState(false);
  const [qrShareUrl, setQrShareUrl] = useState("");
  const [qrExpiresIn, setQrExpiresIn] = useState("");
  const [creatingQr, setCreatingQr] = useState(false);
  const wasSignedIn = useRef(Boolean(user));

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [savedId, productUrl]);

  const transientProduct = state?.product;
  const savedItem = useMemo(() => {
    if (savedId) {
      const byId = items.find((item) => item.id === savedId);
      if (byId) return byId;
    }
    for (const candidate of [productUrl, transientProduct?.url, fetchedProduct?.url]) {
      const byUrl = findSavedLinkByUrl(items, candidate);
      if (byUrl) return byUrl;
    }
    return null;
  }, [items, savedId, productUrl, transientProduct?.url, fetchedProduct?.url]);
  const product = savedItem
    ? { ...fetchedProduct, ...transientProduct, ...savedItem }
    : transientProduct
      ? { ...fetchedProduct, ...transientProduct }
      : fetchedProduct;
  const productIsSaved = savedItem != null;
  const returnTo = state?.from === "/wishlist" ? "/wishlist" : "/";
  const productLanguage = detectProductLanguage(
    `${product?.title ?? ""} ${product?.description ?? ""}`,
  );
  const apiHighlights = Array.isArray((product as ProductPreview | null)?.highlights)
    ? ((product as ProductPreview).highlights ?? [])
    : [];
  // Re-split client-side: Lazada OG often mashes Highlights + Description into one
  // string with no headers, so the API may return everything under description.
  const splitCopy = splitProductCopy(product?.description, product?.title);
  const productHighlights =
    apiHighlights.length > 0 ? apiHighlights : splitCopy.highlights;
  const descriptionText =
    (splitCopy.highlights.length > 0
      ? splitCopy.description
      : (product?.description ?? "").trim() || splitCopy.description) || "";

  useEffect(() => {
    if (wasSignedIn.current && !user) {
      setFetchedProduct(null);
      setLightboxOpen(false);
      setNotesOpen(false);
      setSlipItem(null);
      setQrOpen(false);
      navigate("/", { replace: true });
    }
    wasSignedIn.current = Boolean(user);
  }, [navigate, user]);

  useEffect(() => {
    if (!product || productLanguage === "en") return;
    const previousLanguage = document.documentElement.lang;
    document.documentElement.lang = productLanguage;
    return () => {
      document.documentElement.lang = previousLanguage || "en";
    };
  }, [product, productLanguage]);

  useEffect(() => {
    const urlToFetch = productUrl ?? savedItem?.url;
    if (!urlToFetch) return;

    const controller = new AbortController();
    setFetching(true);
    setFetchError("");
    setFetchedProduct(null);

    fetchPreview(urlToFetch)
      .then((data) => {
        if (!controller.signal.aborted) setFetchedProduct(data);
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setFetchError(toBfmUserError(error, BFM_ERRORS.productUnavailable));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setFetching(false);
      });

    return () => controller.abort();
  }, [productUrl, savedItem?.url]);

  // Keep detail route in sync when this product is already in the wishlist.
  useEffect(() => {
    if (!savedItem || savedId === savedItem.id) return;
    navigate(`/product-detail?id=${encodeURIComponent(savedItem.id)}`, {
      replace: true,
      state: {
        product: transientProduct ?? fetchedProduct ?? savedItem,
        from: state?.from ?? "/",
      } satisfies DetailLocationState,
    });
  }, [savedItem, savedId, navigate, transientProduct, fetchedProduct, state?.from]);

  async function handleSave() {
    if (!product || !user) {
      onSignIn();
      return;
    }

    const saved = await save(product, rate);
    if (saved) {
      navigate(`/product-detail?id=${encodeURIComponent(saved.id)}`, {
        replace: true,
        state: { product, from: "/" } satisfies DetailLocationState,
      });
    }
  }

  async function ensureSavedProduct(): Promise<SavedLink | null> {
    if (!product || !user) {
      onSignIn();
      return null;
    }
    if (savedProduct) return savedProduct;
    return save(product, rate);
  }

  async function handleLinkSlip() {
    const saved = await ensureSavedProduct();
    if (saved) setSlipItem(saved);
  }

  async function handleQrCode() {
    if (!savedProduct || !user) return;

    setCreatingQr(true);
    const shared = await getOrCreateSharedList(
      user.id,
      userDisplayName(user),
      [savedProduct],
      userAvatarUrl(user),
    );
    setCreatingQr(false);
    if (!shared) return;
    setQrShareUrl(shareUrl(shared.id));
    setQrExpiresIn(timeRemaining(shared));
    setQrOpen(true);
  }

  if (savedId && itemsLoading) {
    return <DetailLoading />;
  }

  if (!savedId && !productUrl) {
    return <DetailUnavailable backTo={returnTo} />;
  }

  if (!product && fetching) {
    return <DetailLoading />;
  }

  if (!product) {
    return <DetailUnavailable backTo={returnTo} error={fetchError} />;
  }

  const isProductWithSoldCount = "sold_count" in product;
  const soldCount = isProductWithSoldCount ? (product as ProductSearchResult).sold_count : undefined;
  const savedProduct = productIsSaved ? (savedItem as SavedLink) : null;
  const estimatedMmk = savedProduct?.price_mmk ?? (product.price_thb != null ? product.price_thb * rate : undefined);
  const hasImage = Boolean(product.image_url);

  return (
    <div
      lang={productLanguage}
      translate="yes"
      className="min-h-[calc(100vh-3.5rem)]"
    >
      <header className="border-b border-slate-200/80 bg-white">
        <div className="mx-auto flex max-w-6xl items-center px-4 py-4 sm:px-6">
          <Link
            to={returnTo}
            className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-8">
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          {/*
            Mobile: flex order → image, title, price, details.
            Desktop: two columns (image+price | title+details) so description
            sits under the title instead of below the tall image row.
          */}
          <div className="flex flex-col md:grid md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] md:items-start">
            <div className="contents md:flex md:flex-col md:border-r md:border-slate-100">
              <section className="order-1 flex w-full items-start justify-center bg-slate-50 px-5 pt-5 pb-2 sm:px-8 sm:pt-8 sm:pb-3">
                {hasImage ? (
                  <button
                    type="button"
                    onClick={() => setLightboxOpen(true)}
                    className="group flex w-full items-start justify-center"
                    title="View full image"
                  >
                    <img
                      src={product.image_url}
                      alt={product.title ?? "Product"}
                      className="max-h-[28rem] max-w-full object-contain object-top transition duration-200 group-hover:scale-[1.02]"
                    />
                  </button>
                ) : (
                  <div className="flex flex-col items-center gap-3 py-8 text-slate-400">
                    <SiteAvatar name={product.site_name} />
                    <span className="flex items-center gap-1.5 text-sm font-medium">
                      <ImageOff className="h-4 w-4" />
                      Image not available
                    </span>
                  </div>
                )}
              </section>

              <section className="order-3 w-full border-t border-slate-100 bg-white px-5 pt-3 pb-5 sm:px-8 sm:pt-4 sm:pb-8 md:border-t-0">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Product price</p>
                  {product.price_thb != null || estimatedMmk != null ? (
                    <div className="mt-1">
                      {product.price_thb != null && (
                        <p className="text-2xl font-bold text-slate-900">{formatTHB(product.price_thb)}</p>
                      )}
                      {estimatedMmk != null && (
                        <p className="mt-0.5 text-sm font-medium text-slate-500">≈ {formatMMK(estimatedMmk)}</p>
                      )}
                    </div>
                  ) : (
                    <p className="mt-1 text-sm font-medium text-slate-400">Price not available</p>
                  )}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  {savedProduct ? (
                    <button
                      type="button"
                      onClick={() => setNotesOpen(true)}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
                    >
                      <StickyNote className="h-4 w-4" />
                      Edit notes
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={saving}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60"
                    >
                      {saving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : user ? (
                        <BookmarkPlus className="h-4 w-4" />
                      ) : (
                        <BookmarkCheck className="h-4 w-4" />
                      )}
                      {saving ? "Saving…" : user ? "Save to Wishlist" : "Sign in to save"}
                    </button>
                  )}
                  <a
                    href={product.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open link
                  </a>
                  {user && (
                    <button
                      type="button"
                      onClick={handleLinkSlip}
                      disabled={saving}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                    >
                      <Receipt className="h-4 w-4" />
                      Link Slip
                    </button>
                  )}
                  {savedProduct && (
                    <button
                      type="button"
                      onClick={handleQrCode}
                      disabled={creatingQr}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                    >
                      {creatingQr ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
                      {creatingQr ? "Creating QR…" : "QR Code"}
                    </button>
                  )}
                </div>

                <div className="mt-5 border-t border-slate-100 pt-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Original product link</p>
                  <a
                    href={product.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 block break-all text-xs leading-relaxed text-indigo-600 hover:underline"
                  >
                    {product.url}
                  </a>
                </div>
              </section>
            </div>

            <div className="contents md:flex md:flex-col">
              <section className="order-2 flex w-full flex-col px-5 pt-4 pb-3 sm:px-8 sm:pt-6 sm:pb-4">
                <div className="flex flex-wrap items-center gap-2">
                  {product.site_name && (
                    <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                      {product.site_name}
                    </span>
                  )}
                  {soldCount != null && soldCount > 0 && (
                    <span className="rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-semibold tracking-wide text-emerald-700">
                      {formatSoldCount(soldCount)} sold
                    </span>
                  )}
                </div>

                <h1 className="mt-2 text-xl font-bold leading-snug text-slate-900 sm:mt-3 sm:text-2xl">
                  {product.title ?? product.url}
                </h1>

                {(product.shop_name || product.average_score != null || product.review_count != null) && (
                  <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm sm:mt-3">
                    {product.shop_name && (
                      <span className="inline-flex items-center gap-1.5 font-semibold text-slate-700">
                        <Store className="h-4 w-4 text-indigo-500" />
                        {product.shop_name}
                      </span>
                    )}
                    {product.average_score != null && (
                      <span className="inline-flex items-center gap-1.5 font-semibold text-slate-700">
                        <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                        {product.average_score.toFixed(1)}
                      </span>
                    )}
                    {product.review_count != null && (
                      <span className="text-slate-500">
                        {product.review_count.toLocaleString("en-US")} review{product.review_count === 1 ? "" : "s"}
                      </span>
                    )}
                  </div>
                )}
              </section>

              <section className="order-4 flex w-full flex-col border-t border-slate-100 p-5 sm:p-8 md:border-t-0 md:pt-0">
                {(productHighlights.length > 0 || descriptionText) && (
                  <div className="space-y-4 md:border-t md:border-slate-100 md:pt-4">
                    {productHighlights.length > 0 && (
                      <div>
                        <h2 className="text-sm font-bold text-slate-900">Highlights</h2>
                        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-slate-600">
                          {productHighlights.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {descriptionText && (
                      <div>
                        <h2 className="text-sm font-bold text-slate-900">Description</h2>
                        <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-600">
                          {descriptionText}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {(product.product_colors?.length || product.product_sizes?.length) && (
                  <div className="mt-5 space-y-4 border-t border-slate-100 pt-5">
                    <h2 className="text-sm font-bold text-slate-900">Product info</h2>
                    {product.product_colors && product.product_colors.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {product.product_colors.map((color) => (
                          <span
                            key={color}
                            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700"
                          >
                            Color: {color}
                          </span>
                        ))}
                      </div>
                    )}
                    {product.product_sizes && product.product_sizes.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {product.product_sizes.map((size) => (
                          <span
                            key={size}
                            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700"
                          >
                            Size: {size}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {savedProduct && (
                  <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50/60 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-800">
                          <StickyNote className="h-3.5 w-3.5" />
                          Your notes
                        </p>
                        <p className="mt-1 whitespace-pre-line text-sm text-amber-900">
                          {savedProduct.notes?.trim() || "No notes added yet."}
                        </p>
                      </div>
                    <button
                      type="button"
                      onClick={() => setNotesOpen(true)}
                      className="shrink-0 rounded-lg p-2 text-amber-700 transition hover:bg-amber-100"
                      aria-label="Edit notes"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </section>
            </div>
          </div>
        </div>
      </main>

      <ProductNotesModal
        item={savedProduct}
        open={notesOpen}
        onClose={() => setNotesOpen(false)}
        onSave={updateNotes}
      />
      <LinkSlipModal
        items={slipItem ? [slipItem] : []}
        open={slipItem != null}
        onClose={() => setSlipItem(null)}
      />
      <QRCodeModal
        open={qrOpen}
        onClose={() => setQrOpen(false)}
        shareUrl={qrShareUrl}
        ownerName={user ? userDisplayName(user) : ""}
        avatarUrl={user ? userAvatarUrl(user) : null}
        itemCount={1}
        expiresIn={qrExpiresIn}
      />
      {lightboxOpen && product.image_url && (
        <ImageLightbox src={product.image_url} alt={product.title ?? "Product"} onClose={() => setLightboxOpen(false)} />
      )}
    </div>
  );
}

function DetailLoading() {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-6xl items-center justify-center px-4">
      <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading product details…
      </div>
    </div>
  );
}

function DetailUnavailable({ backTo, error }: { backTo: string; error?: string }) {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg items-center px-4 py-10 text-center">
      <div className="w-full rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
        <h1 className="text-lg font-bold text-slate-900">Product details unavailable</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          {toBfmUserError(error, BFM_ERRORS.productUnavailable)}
        </p>
        <Link
          to={backTo}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Go back
        </Link>
      </div>
    </div>
  );
}
