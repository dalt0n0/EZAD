"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  BadgeCheck,
  RefreshCw,
  Download,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  ShieldOff,
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn, formatDate } from "@/lib/utils";
import type { Certificate, CertTemplate } from "@/types/adcs";

const colHelper = createColumnHelper<Certificate>();
const templateColHelper = createColumnHelper<CertTemplate>();

function CertTable({
  certs,
  search,
  actions,
}: {
  certs: Certificate[];
  search: string;
  actions?: (cert: Certificate) => React.ReactNode;
}) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const columns = [
    colHelper.accessor("RequestId", {
      header: "ID",
      cell: (info) => <span className="font-mono text-muted-foreground">#{info.getValue()}</span>,
    }),
    colHelper.accessor("CommonName", {
      header: "Common Name",
      cell: (info) => <span className="font-medium">{info.getValue() || "—"}</span>,
    }),
    colHelper.accessor("Template", {
      header: "Template",
      cell: (info) => <span className="text-muted-foreground">{info.getValue() || "—"}</span>,
    }),
    colHelper.accessor("IssuedTo", {
      header: "Requester",
      cell: (info) => <span className="text-muted-foreground">{info.getValue() || "—"}</span>,
    }),
    colHelper.accessor("NotBefore", {
      header: "Issued / Submitted",
      cell: (info) => <span className="text-muted-foreground">{formatDate(info.getValue())}</span>,
    }),
    colHelper.accessor("NotAfter", {
      header: "Expires",
      cell: (info) => {
        const v = info.getValue();
        if (!v) return <span className="text-muted-foreground">—</span>;
        const expired = new Date(v) < new Date();
        return <span className={cn("text-muted-foreground", expired && "text-destructive")}>{formatDate(v)}</span>;
      },
    }),
    ...(actions
      ? [
          colHelper.display({
            id: "actions",
            cell: (info) => actions(info.row.original),
          }),
        ]
      : []),
  ];

  const table = useReactTable({
    data: certs,
    columns,
    state: { sorting, globalFilter: search },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  if (certs.length === 0) {
    return (
      <div className="flex items-center gap-3 m-4 bg-secondary/50 border border-border rounded-lg p-4">
        <AlertCircle className="w-4 h-4 text-muted-foreground shrink-0" />
        <p className="text-sm text-muted-foreground">No certificates found.</p>
      </div>
    );
  }

  return (
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
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="border-b border-border/50 hover:bg-secondary transition-colors">
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
  );
}

export default function ADCSPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: issuedRaw = [], isLoading: issuedLoading, refetch: refetchIssued } = useQuery<Certificate[]>({
    queryKey: ["adcs-certs", "issued"],
    queryFn: () => fetch("/api/adcs/certs?status=issued").then((r) => r.json()),
  });

  const { data: pendingRaw = [], isLoading: pendingLoading, refetch: refetchPending } = useQuery<Certificate[]>({
    queryKey: ["adcs-certs", "pending"],
    queryFn: () => fetch("/api/adcs/certs?status=pending").then((r) => r.json()),
  });

  const { data: revokedRaw = [], isLoading: revokedLoading, refetch: refetchRevoked } = useQuery<Certificate[]>({
    queryKey: ["adcs-certs", "revoked"],
    queryFn: () => fetch("/api/adcs/certs?status=revoked").then((r) => r.json()),
  });

  const { data: templatesRaw = [], isLoading: templatesLoading } = useQuery<CertTemplate[]>({
    queryKey: ["adcs-templates"],
    queryFn: () => fetch("/api/adcs/templates").then((r) => r.json()),
  });

  const issued: Certificate[] = Array.isArray(issuedRaw) ? issuedRaw : [];
  const pending: Certificate[] = Array.isArray(pendingRaw) ? pendingRaw : [];
  const revoked: Certificate[] = Array.isArray(revokedRaw) ? revokedRaw : [];
  const templates: CertTemplate[] = Array.isArray(templatesRaw) ? templatesRaw : [];

  const approveMut = useMutation({
    mutationFn: (id: number) =>
      fetch(`/api/adcs/certs/${id}/approve`, { method: "POST" }).then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error ?? "Approve failed");
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adcs-certs"] });
      toast.success("Certificate approved");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Approve failed"),
  });

  const revokeMut = useMutation({
    mutationFn: ({ serial, reason }: { serial: string; reason: string }) =>
      fetch(`/api/adcs/certs/${serial}/revoke`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      }).then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error ?? "Revoke failed");
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adcs-certs"] });
      toast.success("Certificate revoked");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Revoke failed"),
  });

  function downloadCert(requestId: number) {
    window.open(`/api/adcs/certs/${requestId}/download`, "_blank");
  }

  const [templateSearch, setTemplateSearch] = useState("");
  const [templateSorting, setTemplateSorting] = useState<SortingState>([]);
  const templateCols = [
    templateColHelper.accessor("DisplayName", {
      header: "Display Name",
      cell: (info) => <span className="font-medium">{info.getValue()}</span>,
    }),
    templateColHelper.accessor("Name", {
      header: "Name",
      cell: (info) => <span className="text-muted-foreground">{info.getValue()}</span>,
    }),
    templateColHelper.accessor("OID", {
      header: "OID",
      cell: (info) => <span className="font-mono text-muted-foreground text-[10px]">{info.getValue()}</span>,
    }),
  ];
  const templateTable = useReactTable({
    data: templates,
    columns: templateCols,
    state: { sorting: templateSorting, globalFilter: templateSearch },
    onSortingChange: setTemplateSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar title="Certificate Services" />
      <main className="flex-1 pt-14 p-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-card border border-border rounded-lg px-4 py-3 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <div>
              <p className="text-xl font-bold text-foreground">{issued.length}</p>
              <p className="text-xs text-muted-foreground">Issued Certificates</p>
            </div>
          </div>
          <div className="bg-card border border-border rounded-lg px-4 py-3 flex items-center gap-3">
            <Clock className="w-5 h-5 text-amber-400" />
            <div>
              <p className="text-xl font-bold text-foreground">{pending.length}</p>
              <p className="text-xs text-muted-foreground">Pending Requests</p>
            </div>
          </div>
          <div className="bg-card border border-border rounded-lg px-4 py-3 flex items-center gap-3">
            <ShieldOff className="w-5 h-5 text-red-400" />
            <div>
              <p className="text-xl font-bold text-foreground">{revoked.length}</p>
              <p className="text-xs text-muted-foreground">Revoked Certificates</p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="issued">
          <div className="flex items-center gap-3 mb-4">
            <TabsList>
              <TabsTrigger value="issued">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                Issued ({issued.length})
              </TabsTrigger>
              <TabsTrigger value="pending">
                <Clock className="w-3.5 h-3.5 mr-1.5" />
                Pending ({pending.length})
              </TabsTrigger>
              <TabsTrigger value="revoked">
                <XCircle className="w-3.5 h-3.5 mr-1.5" />
                Revoked ({revoked.length})
              </TabsTrigger>
              <TabsTrigger value="templates">
                <BadgeCheck className="w-3.5 h-3.5 mr-1.5" />
                Templates ({templates.length})
              </TabsTrigger>
            </TabsList>
            <div className="flex-1" />
            <SearchInput value={search} onChange={setSearch} placeholder="Search certificates…" className="w-64" />
          </div>

          {/* Issued */}
          <TabsContent value="issued">
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex-1">
                  Issued Certificates
                </p>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => refetchIssued()}>
                  <RefreshCw className={cn("w-3.5 h-3.5", issuedLoading && "animate-spin")} />
                </Button>
              </div>
              {issuedLoading ? (
                <LoadingSpinner message="Loading issued certificates…" />
              ) : (
                <CertTable
                  certs={issued}
                  search={search}
                  actions={(cert) => (
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={() => downloadCert(cert.RequestId)}
                      >
                        <Download className="w-3 h-3" /> Download
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs gap-1 text-destructive hover:text-destructive"
                        disabled={revokeMut.isPending}
                        onClick={() => revokeMut.mutate({ serial: cert.SerialNumber, reason: "Unspecified" })}
                      >
                        <XCircle className="w-3 h-3" /> Revoke
                      </Button>
                    </div>
                  )}
                />
              )}
            </div>
          </TabsContent>

          {/* Pending */}
          <TabsContent value="pending">
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex-1">
                  Pending Requests
                </p>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => refetchPending()}>
                  <RefreshCw className={cn("w-3.5 h-3.5", pendingLoading && "animate-spin")} />
                </Button>
              </div>
              {pendingLoading ? (
                <LoadingSpinner message="Loading pending requests…" />
              ) : (
                <CertTable
                  certs={pending}
                  search={search}
                  actions={(cert) => (
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs gap-1 text-emerald-400 hover:text-emerald-400"
                        disabled={approveMut.isPending}
                        onClick={() => approveMut.mutate(cert.RequestId)}
                      >
                        <CheckCircle2 className="w-3 h-3" /> Approve
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs gap-1 text-destructive hover:text-destructive"
                        disabled={revokeMut.isPending}
                        onClick={() => revokeMut.mutate({ serial: String(cert.RequestId), reason: "Unspecified" })}
                      >
                        <XCircle className="w-3 h-3" /> Deny
                      </Button>
                    </div>
                  )}
                />
              )}
            </div>
          </TabsContent>

          {/* Revoked */}
          <TabsContent value="revoked">
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex-1">
                  Revoked Certificates
                </p>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => refetchRevoked()}>
                  <RefreshCw className={cn("w-3.5 h-3.5", revokedLoading && "animate-spin")} />
                </Button>
              </div>
              {revokedLoading ? (
                <LoadingSpinner message="Loading revoked certificates…" />
              ) : (
                <CertTable
                  certs={revoked}
                  search={search}
                  actions={(cert) => (
                    <div className="flex items-center gap-1.5">
                      <Badge variant="destructive" className="text-[10px]">
                        {cert.RevokedReason ?? "Revoked"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{formatDate(cert.RevokedDate)}</span>
                    </div>
                  )}
                />
              )}
            </div>
          </TabsContent>

          {/* Templates */}
          <TabsContent value="templates">
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex-1">
                  Certificate Templates
                </p>
                <SearchInput value={templateSearch} onChange={setTemplateSearch} placeholder="Search templates…" className="w-56" />
              </div>
              {templatesLoading ? (
                <LoadingSpinner message="Loading templates…" />
              ) : templates.length === 0 ? (
                <div className="flex items-center gap-3 m-4 bg-secondary/50 border border-border rounded-lg p-4">
                  <AlertCircle className="w-4 h-4 text-muted-foreground shrink-0" />
                  <p className="text-sm text-muted-foreground">No templates found.</p>
                </div>
              ) : (
                <div className="overflow-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/30 border-b border-border">
                      {templateTable.getHeaderGroups().map((hg) => (
                        <tr key={hg.id}>
                          {hg.headers.map((h) => (
                            <th
                              key={h.id}
                              onClick={h.column.getToggleSortingHandler()}
                              className="px-4 py-2.5 text-left text-muted-foreground font-medium whitespace-nowrap cursor-pointer hover:text-foreground select-none"
                            >
                              <div className="flex items-center gap-1">
                                {flexRender(h.column.columnDef.header, h.getContext())}
                                {h.column.getIsSorted() === "asc" ? <ArrowUp className="w-3 h-3" /> : h.column.getIsSorted() === "desc" ? <ArrowDown className="w-3 h-3" /> : h.column.columnDef.header !== undefined ? <ArrowUpDown className="w-3 h-3 opacity-30" /> : null}
                              </div>
                            </th>
                          ))}
                        </tr>
                      ))}
                    </thead>
                    <tbody>
                      {templateTable.getRowModel().rows.map((row) => (
                        <tr key={row.id} className="border-b border-border/50 hover:bg-secondary transition-colors">
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
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
