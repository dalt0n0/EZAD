"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  Shield,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronRight,
} from "lucide-react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { SearchInput } from "@/components/shared/SearchInput";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, formatDate } from "@/lib/utils";
import type { GPO } from "@/types/gpo";

const colHelper = createColumnHelper<GPO>();

const statusVariant = {
  AllSettingsEnabled: "success" as const,
  UserSettingsDisabled: "warning" as const,
  ComputerSettingsDisabled: "warning" as const,
  AllSettingsDisabled: "destructive" as const,
};

const statusLabel = {
  AllSettingsEnabled: "All Enabled",
  UserSettingsDisabled: "User Disabled",
  ComputerSettingsDisabled: "Computer Disabled",
  AllSettingsDisabled: "All Disabled",
};

const columns = [
  colHelper.accessor("DisplayName", {
    header: "GPO Name",
    cell: (info) => (
      <div className="flex items-center gap-2">
        <Shield className="w-3.5 h-3.5 text-blue-400 shrink-0" />
        <span className="font-medium">{info.getValue()}</span>
      </div>
    ),
  }),
  colHelper.accessor("GpoStatus", {
    header: "Status",
    cell: (info) => {
      const v = info.getValue();
      return <Badge variant={statusVariant[v] ?? "secondary"}>{statusLabel[v] ?? v}</Badge>;
    },
  }),
  colHelper.accessor("Owner", {
    header: "Owner",
    cell: (info) => {
      const owner = info.getValue();
      return <span className="text-muted-foreground">{owner?.match(/^CN=([^,]+)/)?.[1] ?? owner ?? "—"}</span>;
    },
  }),
  colHelper.accessor("CreationTime", {
    header: "Created",
    cell: (info) => <span className="text-muted-foreground">{formatDate(info.getValue())}</span>,
  }),
  colHelper.accessor("ModificationTime", {
    header: "Modified",
    cell: (info) => <span className="text-muted-foreground">{formatDate(info.getValue())}</span>,
  }),
  colHelper.display({
    id: "actions",
    cell: () => <ChevronRight className="w-4 h-4 text-muted-foreground" />,
  }),
];

export default function GPOPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);

  const { data: gpos = [], isLoading, error, refetch } = useQuery<GPO[]>({
    queryKey: ["gpos"],
    queryFn: () => fetch("/api/gpo").then((r) => r.json()),
  });

  const table = useReactTable({
    data: Array.isArray(gpos) ? gpos : [],
    columns,
    state: { sorting, globalFilter: search },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const stats = {
    total: (Array.isArray(gpos) ? gpos : []).length,
    enabled: (Array.isArray(gpos) ? gpos : []).filter((g) => g.GpoStatus === "AllSettingsEnabled").length,
    disabled: (Array.isArray(gpos) ? gpos : []).filter((g) => g.GpoStatus === "AllSettingsDisabled").length,
  };

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar title="Group Policy Management" />
      <main className="flex-1 pt-14 p-6">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-card border border-border rounded-lg px-4 py-3 flex items-center gap-3">
            <Shield className="w-5 h-5 text-blue-400" />
            <div>
              <p className="text-xl font-bold text-foreground">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total GPOs</p>
            </div>
          </div>
          <div className="bg-card border border-border rounded-lg px-4 py-3 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <div>
              <p className="text-xl font-bold text-foreground">{stats.enabled}</p>
              <p className="text-xs text-muted-foreground">All settings enabled</p>
            </div>
          </div>
          <div className="bg-card border border-border rounded-lg px-4 py-3 flex items-center gap-3">
            <XCircle className="w-5 h-5 text-red-400" />
            <div>
              <p className="text-xl font-bold text-foreground">{stats.disabled}</p>
              <p className="text-xs text-muted-foreground">Fully disabled</p>
            </div>
          </div>
        </div>

        {/* Table card */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex-1">
              Group Policy Objects
            </p>
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search GPOs…"
              className="w-64"
            />
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => refetch()}>
              <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
            </Button>
          </div>

          {error && (
            <div className="flex items-center gap-3 m-4 bg-destructive/10 border border-destructive/20 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
              <p className="text-xs text-destructive">
                {error instanceof Error ? error.message : "Failed to load GPOs"}
              </p>
            </div>
          )}

          {isLoading ? (
            <LoadingSpinner message="Loading GPOs…" />
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/30 border-b border-border">
                  {table.getHeaderGroups().map((hg) => (
                    <tr key={hg.id}>
                      {hg.headers.map((header) => (
                        <th
                          key={header.id}
                          onClick={header.column.getToggleSortingHandler()}
                          className="px-4 py-2.5 text-left text-muted-foreground font-medium whitespace-nowrap cursor-pointer hover:text-foreground select-none"
                        >
                          <div className="flex items-center gap-1">
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {header.column.getIsSorted() === "asc" ? (
                              <ArrowUp className="w-3 h-3" />
                            ) : header.column.getIsSorted() === "desc" ? (
                              <ArrowDown className="w-3 h-3" />
                            ) : header.column.columnDef.header !== undefined ? (
                              <ArrowUpDown className="w-3 h-3 opacity-30" />
                            ) : null}
                          </div>
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {table.getRowModel().rows.length === 0 && (
                    <tr>
                      <td colSpan={columns.length} className="px-4 py-8 text-center text-muted-foreground">
                        No GPOs found
                      </td>
                    </tr>
                  )}
                  {table.getRowModel().rows.map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => router.push(`/gpo/${encodeURIComponent(row.original.Id)}`)}
                      className="border-b border-border/50 cursor-pointer hover:bg-secondary transition-colors"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-4 py-2.5 text-foreground">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
