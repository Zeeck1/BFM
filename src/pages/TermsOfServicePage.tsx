import { useEffect, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ExternalLink, FileText } from "lucide-react";
import { buildBuyForMeMessengerUrl } from "../lib/messenger";

const EFFECTIVE_DATE = "July 16, 2026";

interface TermsSectionProps {
  title: string;
  children: ReactNode;
}

function TermsSection({ title, children }: TermsSectionProps) {
  return (
    <section className="border-b border-slate-100 py-6 last:border-b-0">
      <h2 className="text-lg font-bold text-slate-900">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-7 text-slate-600">{children}</div>
    </section>
  );
}

export function TermsOfServicePage() {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = "Terms of Service | Buy For Me";
    return () => {
      document.title = previousTitle;
    };
  }, []);

  const messengerUrl = buildBuyForMeMessengerUrl([]);

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-slate-50 px-4 py-8 sm:px-6 sm:py-12">
      <article className="mx-auto max-w-3xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <header className="bg-slate-950 px-6 py-8 text-white sm:px-10 sm:py-10">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-300 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Buy For Me
          </Link>
          <div className="mt-7 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500/20 ring-1 ring-indigo-300/20">
              <FileText className="h-6 w-6 text-indigo-300" />
            </span>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                Terms of Service
              </h1>
              <p className="mt-1 text-sm text-slate-400">Effective {EFFECTIVE_DATE}</p>
            </div>
          </div>
          <p className="mt-6 max-w-2xl text-sm leading-7 text-slate-300">
            These Terms of Service (“Terms”) govern your use of Buy For Me (“BFM”, “we”,
            “us”, or “our”), including our website at buyforme.world and related shopping
            assistance services between Thailand and Myanmar.
          </p>
        </header>

        <div className="px-6 sm:px-10">
          <TermsSection title="1. Acceptance of these Terms">
            <p>
              By accessing or using BFM, creating an account, saving product links, sharing
              lists, or requesting a purchase, you agree to these Terms and our{" "}
              <Link to="/privacy" className="font-semibold text-indigo-600 hover:text-indigo-700">
                Privacy Policy
              </Link>
              . If you do not agree, do not use the service.
            </p>
          </TermsSection>

          <TermsSection title="2. What Buy For Me provides">
            <p>BFM is a shopping-assistance platform that may allow you to:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>Search products and paste product links from supported marketplaces.</li>
              <li>Save items to a wishlist, add notes, and estimate prices in THB/MMK.</li>
              <li>Share wishlists with QR codes or links.</li>
              <li>Contact us through Messenger to request purchasing and delivery support.</li>
            </ul>
            <p>
              BFM is not Lazada, Shopee, Amazon, or any other marketplace. Product listings,
              availability, images, and prices shown in BFM may be incomplete, delayed, or
              inaccurate and are for convenience only.
            </p>
          </TermsSection>

          <TermsSection title="3. Accounts and Google sign-in">
            <p>
              You may sign in with Google to identify your account and use wishlist and related
              features. You are responsible for activity under your account and for keeping
              access to your Google account secure.
            </p>
            <p>
              You must provide accurate information when placing order requests, including your
              name, phone number, and delivery address. We may refuse or cancel requests that
              appear fraudulent, incomplete, or outside our service area.
            </p>
          </TermsSection>

          <TermsSection title="4. Orders, pricing, and payments">
            <p>
              Submitting a wishlist item or “Buy for me” request does not guarantee that we can
              purchase or deliver the product. Final pricing may include product cost, shipping,
              cargo fees, taxes, currency conversion differences, and service charges.
            </p>
            <p>
              We will confirm availability, total cost, and payment instructions before purchase
              whenever reasonably possible. Exchange-rate estimates shown in the app are
              approximate and may differ from the final amount charged.
            </p>
            <p>
              Payment terms, delivery timelines, and refund or cancellation conditions for a
              specific order will be communicated through Messenger or another channel we
              designate for that order.
            </p>
          </TermsSection>

          <TermsSection title="5. User responsibilities">
            <p>You agree that you will not:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>Use BFM for unlawful, deceptive, or prohibited goods or activities.</li>
              <li>Attempt to disrupt, scrape, overload, or reverse engineer the service.</li>
              <li>Share misleading product information or abuse shared lists.</li>
              <li>Impersonate another person or misuse another user’s account.</li>
            </ul>
            <p>
              You are responsible for checking product details, sizes, models, and seller terms
              on the original marketplace before requesting a purchase.
            </p>
          </TermsSection>

          <TermsSection title="6. Third-party services">
            <p>
              BFM relies on third-party services such as Google sign-in, Supabase, marketplace
              websites, hosting providers, and Messenger/Facebook. Their own terms and privacy
              policies apply to your use of those services. We are not responsible for outages,
              policy changes, or content on third-party platforms.
            </p>
          </TermsSection>

          <TermsSection title="7. Intellectual property">
            <p>
              BFM branding, logos, and the software interface are owned by Buy For Me or its
              licensors. Product names, images, and trademarks belong to their respective owners
              and are shown only to help you identify items you want to purchase.
            </p>
          </TermsSection>

          <TermsSection title="8. Disclaimers">
            <p>
              BFM is provided on an “as is” and “as available” basis. To the fullest extent
              permitted by law, we disclaim warranties of merchantability, fitness for a
              particular purpose, and non-infringement.
            </p>
            <p>
              We do not warrant that product information, exchange rates, search results, or
              delivery estimates will always be accurate, complete, or uninterrupted.
            </p>
          </TermsSection>

          <TermsSection title="9. Limitation of liability">
            <p>
              To the fullest extent permitted by law, Buy For Me and its operators are not liable
              for indirect, incidental, special, consequential, or punitive damages, or for lost
              profits, lost data, or business interruption arising from your use of the service.
            </p>
            <p>
              Our total liability for any claim relating to BFM will not exceed the fees you paid
              to us for the specific order giving rise to the claim, if any.
            </p>
          </TermsSection>

          <TermsSection title="10. Suspension and termination">
            <p>
              We may suspend or terminate access to BFM if you violate these Terms, misuse the
              service, or create risk for users, partners, or our operations. You may stop using
              BFM at any time and may request account-related data actions as described in our
              Privacy Policy.
            </p>
          </TermsSection>

          <TermsSection title="11. Changes to these Terms">
            <p>
              We may update these Terms as the service changes. The revised Terms will be posted
              on this page with an updated effective date. Continued use of BFM after changes
              means you accept the revised Terms.
            </p>
          </TermsSection>

          <TermsSection title="12. Contact us">
            <p>
              For questions about these Terms, contact Buy For Me through Messenger and include
              “Terms of Service” in your message.
            </p>
            <a
              href={messengerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 font-semibold text-indigo-600 transition hover:text-indigo-700"
            >
              Contact Buy For Me on Messenger
              <ExternalLink className="h-4 w-4" />
            </a>
            <p className="pt-2">
              Also see our{" "}
              <Link to="/privacy" className="font-semibold text-indigo-600 hover:text-indigo-700">
                Privacy Policy
              </Link>
              .
            </p>
          </TermsSection>
        </div>
      </article>
    </div>
  );
}
