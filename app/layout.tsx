import type { Metadata } from "next";
import { Shell } from "@/components/shell";
import { data } from "@/lib/data";
import "./globals.css";

export const metadata: Metadata = {
  title: "ZUMIQ | Enterprise Data Intelligence Platform",
  description:
    "Turning enterprise operational data into trusted, governed and actionable intelligence. " +
    "Incident management, scenario simulation, data quality and cost control over a BigQuery warehouse.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Shell source={data.source}>{children}</Shell>
      </body>
    </html>
  );
}
