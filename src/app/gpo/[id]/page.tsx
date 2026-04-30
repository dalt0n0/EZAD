"use client";

import { use, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Shield,
  Link2,
  Settings,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Search,
  Building2,
} from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDate } from "@/lib/utils";
import type { GPOReport } from "@/types/gpo";

const statusVariant = {
  AllSettingsEnabled: "success" as const,
  UserSettingsDisabled: "warning" as const,
  ComputerSettingsDisabled: "warning" as const,
  AllSettingsDisabled: "destructive" as const,
};

function PropRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-start py-2.5 border-b border-border/50 last:border-0">
      <p className="text-xs text-muted-foreground w-40 shrink-0 mt-0.5">{label}</p>
      <p className="text-sm text-foreground flex-1 break-all">{value ?? "—"}</p>
    </div>
  );
}

export default function GPODetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [settingSearch, setSettingSearch] = useState("");

  const { data: report, isLoading, error } = useQuery<GPOReport>({
    queryKey: ["gpo-report", id],
    queryFn: () => fetch(`/api/gpo/${encodeURIComponent(id)}?report=true`).then((r) => r.json()),
  });

  const filteredSettings = useMemo(() => {
    if (!report?.settings) return [];
    if (!settingSearch) return report.settings;
    const q = settingSearch.toLowerCase();
    return report.settings.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.section.toLowerCase().includes(q) ||
        s.value?.toLowerCase().includes(q)
    );
  }, [report?.settings, settingSearch]);

  const settingsByCategory = useMemo(() => {
    const map = new Map<string, typeof filteredSettings>();
    for (const s of filteredSettings) {
      const key = s.category;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return map;
  }, [filteredSettings]);

  if (isLoading) return (
    <div className="flex flex-col min-h-screen">
      <TopBar />
      <div className="pt-14"><LoadingSpinner message="Loading GPO report…" /></div>
    </div>
  );

  if (error || !report) return (
    <div className="flex flex-col min-h-screen">
      <TopBar />
      <div className="pt-14 p-6">
        <div className="flex items-center gap-3 bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <AlertCircle className="w-5 h-5 text-destructive" />
          <p className="text-sm text-destructive">GPO not found or access denied.</p>
        </div>
      </div>
    </div>
  );

  const { gpo, links, settings } = report;

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar />
      <div className="pt-14 p-6 max-w-6xl">
        <button
          onClick={() => router.push("/gpo")}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to GPO Management
        </button>

        <div className="flex items-center gap-4 mb-6">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-500/10 border border-blue-500/20">
            <Shield className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">{gpo.DisplayName}</h1>
            <p className="text-sm text-muted-foreground font-mono text-xs">{gpo.Id}</p>
          </div>
          <div className="ml-auto">
            <Badge variant={statusVariant[gpo.GpoStatus] ?? "secondary"}>
              {gpo.GpoStatus?.replace(/([A-Z])/g, " $1").trim() ?? "Unknown"}
            </Badge>
          </div>
        </div>

        <Tabs defaultValue="overview">
          <TabsList className="mb-4 w-full justify-start">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="links">
              <Link2 className="w-3.5 h-3.5 mr-1.5" />
              Links ({links.length})
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="w-3.5 h-3.5 mr-1.5" />
              Settings ({settings.length})
            </TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-card border border-border rounded-lg p-4">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">General</h3>
                <PropRow label="Display Name" value={gpo.DisplayName} />
                <PropRow label="GUID" value={gpo.Id} />
                <PropRow label="Domain" value={gpo.DomainName} />
                <PropRow label="Owner" value={gpo.Owner?.match(/^CN=([^,]+)/)?.[1] ?? gpo.Owner} />
                <PropRow label="Description" value={gpo.Description} />
              </div>

              <div className="bg-card border border-border rounded-lg p-4">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Status & Versions</h3>
                <div className="py-2.5 border-b border-border/50">
                  <p className="text-xs text-muted-foreground mb-1">GPO Status</p>
                  <Badge variant={statusVariant[gpo.GpoStatus] ?? "secondary"}>
                    {gpo.GpoStatus?.replace(/([A-Z])/g, " $1").trim()}
                  </Badge>
                </div>
                <PropRow label="Created" value={formatDate(gpo.CreationTime)} />
                <PropRow label="Modified" value={formatDate(gpo.ModificationTime)} />
                {gpo.UserVersion && (
                  <PropRow
                    label="User Version"
                    value={`AD: ${gpo.UserVersion.AD}  ·  Sysvol: ${gpo.UserVersion.Template}`}
                  />
                )}
                {gpo.ComputerVersion && (
                  <PropRow
                    label="Computer Version"
                    value={`AD: ${gpo.ComputerVersion.AD}  ·  Sysvol: ${gpo.ComputerVersion.Template}`}
                  />
                )}
              </div>
            </div>
          </TabsContent>

          {/* Links */}
          <TabsContent value="links">
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="px-4 py-2.5 border-b border-border">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Linked To ({links.length} OUs / containers)
                </p>
              </div>
              {links.length === 0 ? (
                <div className="flex items-center gap-3 m-4 bg-secondary/50 border border-border rounded-lg p-4">
                  <AlertCircle className="w-4 h-4 text-muted-foreground shrink-0" />
                  <p className="text-sm text-muted-foreground">
                    No links found. The GPO may not be linked to any OU, or link data requires additional permissions.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {links.map((link, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors">
                      <Building2 className="w-4 h-4 text-amber-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{link.Target}</p>
                        <p className="text-xs text-muted-foreground">Order: {link.Order}</p>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        {link.Enabled ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-400" />
                        )}
                        {link.Enforced && <Badge variant="warning" className="text-[10px] py-0">Enforced</Badge>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Settings */}
          <TabsContent value="settings">
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex-1">
                  Policy Settings ({settings.length})
                </p>
                <div className="relative w-72">
                  <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search settings by name or value…"
                    value={settingSearch}
                    onChange={(e) => setSettingSearch(e.target.value)}
                    className="pl-8 h-8 text-xs"
                  />
                </div>
              </div>

              {settings.length === 0 ? (
                <div className="flex items-center gap-3 m-4 bg-secondary/50 border border-border rounded-lg p-4">
                  <AlertCircle className="w-4 h-4 text-muted-foreground shrink-0" />
                  <p className="text-sm text-muted-foreground">
                    No settings found. GPO settings require the Group Policy module and appropriate permissions.
                  </p>
                </div>
              ) : filteredSettings.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No settings match your search</p>
              ) : (
                <ScrollArea className="h-[500px]">
                  {Array.from(settingsByCategory.entries()).map(([category, catSettings]) => (
                    <div key={category}>
                      <div className="px-4 py-2 bg-muted/30 border-b border-border sticky top-0 z-10">
                        <p className="text-xs font-semibold text-primary">{category}</p>
                      </div>
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-muted/10 border-b border-border">
                            <th className="px-4 py-2 text-left text-muted-foreground font-medium w-48">Section</th>
                            <th className="px-4 py-2 text-left text-muted-foreground font-medium">Setting</th>
                            <th className="px-4 py-2 text-left text-muted-foreground font-medium w-48">Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {catSettings.map((s, i) => (
                            <tr key={i} className="border-b border-border/50 hover:bg-secondary/30">
                              <td className="px-4 py-2 text-muted-foreground">{s.section}</td>
                              <td className="px-4 py-2 font-medium">
                                {settingSearch ? (
                                  <span dangerouslySetInnerHTML={{
                                    __html: s.name.replace(
                                      new RegExp(`(${settingSearch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"),
                                      "<mark class=\"bg-primary/20 text-primary rounded px-0.5\">$1</mark>"
                                    )
                                  }} />
                                ) : s.name}
                              </td>
                              <td className="px-4 py-2 text-muted-foreground break-all">{s.value ?? "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </ScrollArea>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
