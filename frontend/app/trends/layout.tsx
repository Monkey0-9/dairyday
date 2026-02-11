"use client";

import "./trends.css";

export default function TrendsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="trends-root">
      {children}
    </div>
  );
}
