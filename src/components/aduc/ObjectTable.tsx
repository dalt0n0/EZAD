"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowUpDown, ArrowUp, ArrowDown, User, Monitor, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn, formatDate } from "@/lib/utils";
import type { ADUser, ADComputer, ADGroup } from "@/types/ad";

type TabType = "users" | "computers" | "groups";

// --- Users table ---
const userColHelper = createColumnHelper<ADUser>();
const userColumns = [
  userColHelper.accessor("Name", {
    header: "Name",
    cell: (info) => (
      <div className="flex items-center gap-2">
        <User className="w-3.5 h-3.5 text-blue-400 shrink-0" />
        <span className="font-medium">{info.getValue()}</span>
      </div>
    ),
  }),
  userColHelper.accessor("SamAccountName", { header: "SAM Account" }),
  userColHelper.accessor("EmailAddress", {
    header: "Email",
    cell: (info) => info.getValue() ?? "—",
  }),
  userColHelper.accessor("Department", {
    header: "Department",
    cell: (info) => info.getValue() ?? "—",
  }),
  userColHelper.accessor("Title", {
    header: "Title",
    cell: (info) => info.getValue() ?? "—",
  }),
  userColHelper.accessor("Enabled", {
    header: "Status",
    cell: (info) => (
      <Badge variant={info.getValue() ? "success" : "destructive"}>
        {info.getValue() ? "Enabled" : "Disabled"}
      </Badge>
    ),
  }),
  userColHelper.accessor("LastLogonDate", {
    header: "Last Logon",
    cell: (info) => <span className="text-muted-foreground">{formatDate(info.getValue())}</span>,
  }),
];

// --- Computers table ---
const compColHelper = createColumnHelper<ADComputer>();
const computerColumns = [
  compColHelper.accessor("Name", {
    header: "Name",
    cell: (info) => (
      <div className="flex items-center gap-2">
        <Monitor className="w-3.5 h-3.5 text-green-400 shrink-0" />
        <span className="font-medium">{info.getValue()}</span>
      </div>
    ),
  }),
  compColHelper.accessor("DNSHostName", {
    header: "DNS Name",
    cell: (info) => info.getValue() ?? "—",
  }),
  compColHelper.accessor("OperatingSystem", {
    header: "OS",
    cell: (info) => info.getValue() ?? "—",
  }),
  compColHelper.accessor("IPv4Address", {
    header: "IP Address",
    cell: (info) => info.getValue() ?? "—",
  }),
  compColHelper.accessor("Enabled", {
    header: "Status",
    cell: (info) => (
      <Badge variant={info.getValue() ? "success" : "destructive"}>
        {info.getValue() ? "Enabled" : "Disabled"}
      </Badge>
    ),
  }),
  compColHelper.accessor("LastLogonDate", {
    header: "Last Logon",
    cell: (info) => <span className="text-muted-foreground">{formatDate(info.getValue())}</span>,
  }),
];

// --- Groups table ---
const groupColHelper = createColumnHelper<ADGroup>();
const groupColumns = [
  groupColHelper.accessor("Name", {
    header: "Name",
    cell: (info) => (
      <div className="flex items-center gap-2">
        <Users className="w-3.5 h-3.5 text-purple-400 shrink-0" />
        <span className="font-medium">{info.getValue()}</span>
      </div>
    ),
  }),
  groupColHelper.accessor("SamAccountName", { header: "SAM Account" }),
  groupColHelper.accessor("GroupScope", {
    header: "Scope",
    cell: (info) => <Badge variant="info">{info.getValue()}</Badge>,
  }),
  groupColHelper.accessor("GroupCategory", {
    header: "Category",
    cell: (info) => (
      <Badge variant={info.getValue() === "Security" ? "warning" : "secondary"}>
        {info.getValue()}
      </Badge>
    ),
  }),
  groupColHelper.accessor("Description", {
    header: "Description",
    cell: (info) => <span className="text-muted-foreground">{info.getValue() ?? "—"}</span>,
  }),
];

interface ObjectTableProps {
  tab: TabType;
  users: ADUser[];
  computers: ADComputer[];
  groups: ADGroup[];
  globalFilter: string;
}

export function ObjectTable({ tab, users, computers, groups, globalFilter }: ObjectTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const router = useRouter();

  const data = useMemo(() => {
    if (tab === "users") return users;
    if (tab === "computers") return computers;
    return groups;
  }, [tab, users, computers, groups]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const columns = tab === "users" ? userColumns : tab === "computers" ? computerColumns : groupColumns as any;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const table = useReactTable<any>({
    data,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  function handleRowClick(row: { original: ADUser | ADComputer | ADGroup }) {
    const obj = row.original;
    if (tab === "users") {
      router.push(`/aduc/users/${encodeURIComponent((obj as ADUser).SamAccountName)}`);
    } else if (tab === "computers") {
      router.push(`/aduc/computers/${encodeURIComponent((obj as ADComputer).Name)}`);
    } else {
      router.push(`/aduc/groups/${encodeURIComponent((obj as ADGroup).SamAccountName)}`);
    }
  }

  return (
    <div className="overflow-auto h-full">
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-card border-b border-border z-10">
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((header) => (
                <th
                  key={header.id}
                  onClick={header.column.getToggleSortingHandler()}
                  className="px-3 py-2.5 text-left text-muted-foreground font-medium whitespace-nowrap cursor-pointer hover:text-foreground select-none"
                >
                  <div className="flex items-center gap-1">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {header.column.getIsSorted() === "asc" ? (
                      <ArrowUp className="w-3 h-3" />
                    ) : header.column.getIsSorted() === "desc" ? (
                      <ArrowDown className="w-3 h-3" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-30" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.length === 0 && (
            <tr>
              <td
                colSpan={columns.length}
                className="px-3 py-8 text-center text-muted-foreground"
              >
                No results found
              </td>
            </tr>
          )}
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              onClick={() => handleRowClick(row)}
              className={cn(
                "border-b border-border/50 cursor-pointer transition-colors",
                "hover:bg-secondary"
              )}
            >
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-3 py-2 text-foreground">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
