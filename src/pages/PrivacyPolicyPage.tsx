import { useEffect, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ExternalLink, ShieldCheck } from "lucide-react";
import { buildBuyForMeMessengerUrl } from "../lib/messenger";

const EFFECTIVE_DATE = "July 13, 2026";

interface PolicySectionProps {
  title: string;
  children: ReactNode;
}

function PolicySection({ title, children }: PolicySectionProps) {
  return (
    <section className="border-b border-slate-100 py-6 last:border-b-0">
      <h2 className="text-lg font-bold text-slate-900">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-7 text-slate-600">{children}</div>
    </section>
  );
}

export function PrivacyPolicyPage() {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = "Privacy Policy | Buy For Me";
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
              <ShieldCheck className="h-6 w-6 text-indigo-300" />
            </span>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                Privacy Policy
              </h1>
              <p className="mt-1 text-sm text-slate-400">Effective {EFFECTIVE_DATE}</p>
            </div>
          </div>
          <p className="mt-6 max-w-2xl text-sm leading-7 text-slate-300">
            Buy For Me (“BFM”, “we”, “us”, or “our”) helps customers save product
            links and request shopping support between Thailand and Myanmar. This
            policy explains what information we collect, why we use it, and the
            choices available to you.
          </p>
        </header>

        <div className="px-6 sm:px-10">
          <PolicySection title="1. Information we collect">
            <p>We may collect the following information when you use BFM:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong className="text-slate-800">Google account information:</strong>{" "}
                your name, email address, profile photo, and account identifier when
                you choose Sign in with Google.
              </li>
              <li>
                <strong className="text-slate-800">Profile and order information:</strong>{" "}
                your name, phone number, delivery address, city, order notes, and
                product details when you submit them.
              </li>
              <li>
                <strong className="text-slate-800">Wishlist content:</strong> product
                URLs, titles, images, shop names, prices, personal notes, and the
                lists you choose to share.
              </li>
              <li>
                <strong className="text-slate-800">Technical information:</strong>{" "}
                authentication session data, basic server logs, and browser storage
                used to remember settings and recent Lazada searches.
              </li>
            </ul>
          </PolicySection>

          <PolicySection title="2. How we use information">
            <p>We use this information to:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>Authenticate you and maintain your account session.</li>
              <li>Save and display your wishlist, profile, shared lists, and orders.</li>
              <li>Fetch product previews and provide Lazada product search.</li>
              <li>Estimate prices, coordinate purchases, delivery, and customer support.</li>
              <li>Protect the service, diagnose errors, and improve BFM.</li>
            </ul>
            <p>
              Google account information is used only to identify you and provide
              account features. BFM does not post to your Google account or send
              marketing email through your Google account.
            </p>
          </PolicySection>

          <PolicySection title="3. How information is shared">
            <p>We do not sell or rent your personal information.</p>
            <p>
              We may share information with service providers that operate BFM,
              including Supabase for authentication and data storage, Google for
              sign-in, and our hosting and product-data providers. They process
              information only as needed to provide their services.
            </p>
            <p>
              If you intentionally create a public shared list, its product details
              and the owner name or profile image you select may be visible to anyone
              with that link. When you choose to contact us through Messenger, Meta’s
              own privacy terms apply to information sent through Messenger.
            </p>
            <p>
              We may also disclose information when required by law or when reasonably
              necessary to protect users, BFM, or the public.
            </p>
          </PolicySection>

          <PolicySection title="4. Cookies and local storage">
            <p>
              BFM and Supabase use browser storage necessary to keep you signed in.
              BFM also uses local storage to remember language preferences and cache
              recent product-search results. You can clear this information through
              your browser settings, although doing so may sign you out or reset
              preferences.
            </p>
          </PolicySection>

          <PolicySection title="5. Data retention and deletion">
            <p>
              We retain account and service information while your account is active
              and for as long as reasonably necessary to provide orders, resolve
              disputes, meet legal obligations, and protect the service.
            </p>
            <p>
              You can remove wishlist items in the app. To request access, correction,
              or deletion of your account and personal information, contact us using
              the method below. We may need to verify your identity before completing
              a request.
            </p>
          </PolicySection>

          <PolicySection title="6. Data security and international processing">
            <p>
              We use reasonable technical and organizational safeguards to protect
              information. No online system is completely secure, so we cannot
              guarantee absolute security.
            </p>
            <p>
              BFM supports shopping between Thailand and Myanmar, and our technology
              providers may process information in other countries where they operate.
            </p>
          </PolicySection>

          <PolicySection title="7. Children’s privacy">
            <p>
              BFM is not directed to children under 13, and we do not knowingly
              collect personal information from children under 13. A parent or
              guardian who believes a child provided information should contact us.
            </p>
          </PolicySection>

          <PolicySection title="8. Changes to this policy">
            <p>
              We may update this policy as BFM changes. We will publish the revised
              policy on this page and update the effective date. Continued use of BFM
              after an update means the revised policy applies.
            </p>
          </PolicySection>

          <PolicySection title="9. Contact us">
            <p>
              For privacy questions or data requests, contact Buy For Me through our
              Messenger page and include “Privacy Request” in your message.
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
          </PolicySection>
        </div>
      </article>
    </div>
  );
}
