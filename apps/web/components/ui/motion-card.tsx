"use client";

import { motion } from "framer-motion";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function MotionCard({ className, ...props }: ComponentProps<typeof motion.div>) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className={cn("rounded-xl border border-border bg-surface p-6 text-ink shadow-sm", className)}
      {...props}
    />
  );
}
