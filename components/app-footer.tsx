"use client";

import Link from "next/link";
import { Zap } from "lucide-react";

export function AppFooter() {
  return (
    <footer className="relative border-t border-border/40 mt-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold">Hypercaller</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-muted-foreground">
            <Link href="/pricing" className="transition-colors hover:text-foreground">
              Pricing
            </Link>
            <Link href="/contact" className="transition-colors hover:text-foreground">
              Contact
            </Link>
            <a href="#" className="transition-colors hover:text-foreground">
              Privacy
            </a>
            <a href="#" className="transition-colors hover:text-foreground">
              Terms
            </a>
          </div>

          <p className="text-sm text-muted-foreground">© 2024 Hypercaller</p>
        </div>
      </div>
    </footer>
  );
}

