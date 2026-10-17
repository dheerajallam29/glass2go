import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Backdrop from "@/components/fx/Backdrop";
import PageCurtain from "@/components/fx/PageCurtain";
import FxLayer from "@/components/fx/FxLayer";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Glass2Go",
  description: "Free practice for DECA and FBLA: exams built from the real blueprints and roleplays judged like the real thing.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={geist.variable}>
      <body>
        <Backdrop />
        <div className="page-root">{children}</div>
        <FxLayer />
        <PageCurtain />
      </body>
    </html>
  );
}
