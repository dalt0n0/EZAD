"use client";

import { useState, useRef, useEffect } from "react";
import { Search, User, Monitor, Users, Shield, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import type { ADSearchResult } from "@/types/ad";

export function TopBar({ title }: { title?: string }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ADSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout>>(null);
  const router = useRouter();

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    if (query.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    debounce.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(Array.isArray(data) ? data.slice(0, 10) : []);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, [query]);

  function navigateTo(result: ADSearchResult) {
    setOpen(false);
    setQuery("");
    if (result.type === "user") {
      router.push(`/aduc/users/${encodeURIComponent(result.samAccountName ?? result.name)}`);
    } else if (result.type === "computer") {
      router.push(`/aduc/computers/${encodeURIComponent(result.samAccountName ?? result.name)}`);
    } else if (result.type === "group") {
      router.push(`/aduc/groups/${encodeURIComponent(result.samAccountName ?? result.name)}`);
    }
  }

  const typeIcon = {
    user: <User className="w-3.5 h-3.5 text-blue-400" />,
    computer: <Monitor className="w-3.5 h-3.5 text-green-400" />,
    group: <Users className="w-3.5 h-3.5 text-purple-400" />,
    ou: <Shield className="w-3.5 h-3.5 text-amber-400" />,
  };

  return (
    <header className="fixed top-0 left-56 right-0 h-14 border-b border-border bg-card/80 backdrop-blur flex items-center px-6 gap-4 z-30">
      {title && <h1 className="text-sm font-semibold text-foreground shrink-0">{title}</h1>}

      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
        <Input
          placeholder="Search users, computers, groups…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onFocus={() => results.length > 0 && setOpen(true)}
          className="pl-8 h-8 text-xs bg-background"
        />
        {loading && (
          <Loader2 className="absolute right-2.5 top-2 w-4 h-4 animate-spin text-muted-foreground" />
        )}

        {open && results.length > 0 && (
          <div className="absolute top-full mt-1 w-full bg-popover border border-border rounded-md shadow-lg z-50 overflow-hidden">
            {results.map((r, i) => (
              <button
                key={i}
                onMouseDown={() => navigateTo(r)}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-accent hover:text-accent-foreground transition-colors text-left"
              >
                {typeIcon[r.type]}
                <span className="flex-1 font-medium truncate">{r.name}</span>
                {r.samAccountName && r.samAccountName !== r.name && (
                  <span className="text-muted-foreground shrink-0">{r.samAccountName}</span>
                )}
                <span className="text-muted-foreground shrink-0 capitalize">{r.type}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}
