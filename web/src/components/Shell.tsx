"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import Backdrop from "./Backdrop";
import Footer from "./Footer";
import Nav from "./Nav";
import NetworkGuard from "./NetworkGuard";

/** Page chrome. The landing page gets the blink-style dock and a bare backdrop; app pages get the floating pill nav and the glow. */
export default function Shell({ children }: { children: ReactNode }) {
  const landing = usePathname() === "/";
  return (
    <>
      <Backdrop variant={landing ? "landing" : "app"} />
      <Nav />
      <NetworkGuard />
      <main>{children}</main>
      <Footer landing={landing} />
    </>
  );
}
