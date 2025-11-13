"use client";

import { NextStudioLayout } from "next-sanity/studio";
import type { ReactNode } from "react";

export default function StudioLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <NextStudioLayout>{children}</NextStudioLayout>;
}

