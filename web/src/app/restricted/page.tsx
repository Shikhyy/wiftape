import { Glass } from "@/components/ui";
import { RESTRICTED_COUNTRIES } from "@/lib/restricted";

export const metadata = { title: "Not available in your region · WIF Tape" };

export default function RestrictedPage() {
  return (
    <div className="mx-auto max-w-[900px] px-4 pb-24 pt-32 sm:px-6">
      <Glass tone="ember" className="p-8 sm:p-12">
        <p className="caps">HTTP 451 · unavailable for legal reasons</p>
        <h1 className="mt-4 font-serif text-[clamp(2.6rem,6vw,4.6rem)] leading-[1] tracking-[-0.02em]">Not Open Where You Are.</h1>
        <p className="mt-6 max-w-xl leading-relaxed text-ink/75">
          WIF Tape uses Stock Tokens on Robinhood Chain. Those products may not be offered to US persons or in the places listed below, so we do not serve this site to
          visitors there. This is about where you are connecting from, not about you.
        </p>
        <ul className="mt-6 flex flex-wrap gap-2">
          {Object.values(RESTRICTED_COUNTRIES).map((name) => (
            <li key={name} className="pill">{name}</li>
          ))}
        </ul>
        <p className="mt-6 text-sm text-ink/55">
          The list follows{" "}
          <a className="text-flame underline underline-offset-4" href="https://docs.robinhood.com/rhj/restricted-jurisdictions" target="_blank" rel="noreferrer">
            Robinhood&apos;s restricted jurisdictions page
          </a>{" "}
          and may change. WIF Tape is not affiliated with, endorsed by, or connected to Robinhood Markets, Inc.
        </p>
      </Glass>
    </div>
  );
}
