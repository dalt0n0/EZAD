"use client";

import { useState } from "react";
import { ChevronRight, Building2, Folder } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ADOU } from "@/types/ad";

interface OUTreeProps {
  ous: ADOU[];
  selectedDN: string | null;
  onSelect: (dn: string | null) => void;
}

interface OUNodeProps {
  ou: ADOU;
  depth: number;
  selectedDN: string | null;
  onSelect: (dn: string | null) => void;
}

function OUNode({ ou, depth, selectedDN, onSelect }: OUNodeProps) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = ou.children && ou.children.length > 0;
  const isSelected = selectedDN === ou.DistinguishedName;

  return (
    <div>
      <button
        onClick={() => {
          onSelect(isSelected ? null : ou.DistinguishedName);
          if (hasChildren) setExpanded((v) => !v);
        }}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        className={cn(
          "w-full flex items-center gap-1.5 py-1.5 pr-3 text-xs rounded-md transition-colors",
          isSelected
            ? "bg-primary/15 text-primary"
            : "text-muted-foreground hover:text-foreground hover:bg-secondary"
        )}
      >
        {hasChildren ? (
          <ChevronRight
            className={cn("w-3 h-3 shrink-0 transition-transform", expanded && "rotate-90")}
          />
        ) : (
          <span className="w-3 h-3 shrink-0" />
        )}
        {depth === 0 ? (
          <Building2 className="w-3.5 h-3.5 shrink-0 text-amber-400" />
        ) : (
          <Folder className={cn("w-3.5 h-3.5 shrink-0", isSelected ? "text-primary" : "text-amber-400/70")} />
        )}
        <span className="truncate flex-1 text-left">{ou.Name}</span>
      </button>

      {hasChildren && expanded && (
        <div>
          {ou.children!.map((child) => (
            <OUNode
              key={child.DistinguishedName}
              ou={child}
              depth={depth + 1}
              selectedDN={selectedDN}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function OUTree({ ous, selectedDN, onSelect }: OUTreeProps) {
  return (
    <div className="space-y-0.5 py-1">
      <button
        onClick={() => onSelect(null)}
        className={cn(
          "w-full flex items-center gap-2 px-3 py-1.5 text-xs rounded-md transition-colors mb-1",
          selectedDN === null
            ? "bg-primary/15 text-primary font-medium"
            : "text-muted-foreground hover:text-foreground hover:bg-secondary"
        )}
      >
        <Building2 className="w-3.5 h-3.5 shrink-0 text-primary" />
        <span>All Objects</span>
      </button>
      {ous.map((ou) => (
        <OUNode
          key={ou.DistinguishedName}
          ou={ou}
          depth={0}
          selectedDN={selectedDN}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
