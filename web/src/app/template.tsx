/**
 * Next.js re-mounts a `template` on every navigation (a layout does not). The header and backdrop live in the layout, so they stay put
 * and only the page content fades and rises in. That is what makes landing → app feel like one continuous surface instead of a cut.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div style={{ animation: "fadein 0.4s cubic-bezier(0.2, 0.7, 0.2, 1) both" }}>{children}</div>;
}
