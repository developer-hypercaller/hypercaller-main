"use client";

import { useState, FormEvent } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BusinessSearchBarProps {
  className?: string;
}

export function BusinessSearchBar({ className }: BusinessSearchBarProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // TODO: Implement search functionality
    console.log("Searching for:", searchQuery);
    // You can navigate to a search results page or trigger a search API call here
  };

  return (
    <div className={cn("w-full", className)}>
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative flex items-center">
          <Search className="absolute left-4 h-5 w-5 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            placeholder="Search for businesses, industries, locations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 pr-32 h-14 text-base rounded-lg border-2 border-input/50 focus-visible:ring-1 focus-visible:ring-primary/20 focus-visible:ring-offset-0 focus-visible:border-primary/30"
          />
          <Button
            type="submit"
            size="lg"
            className="absolute right-2 h-10 px-6 rounded-md"
          >
            Search
          </Button>
        </div>
      </form>
      <p className="mt-3 text-sm text-center text-muted-foreground">
        Discover businesses by name, industry, location, or keywords
      </p>
    </div>
  );
}

