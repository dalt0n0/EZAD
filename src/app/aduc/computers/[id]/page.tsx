"use client";

import { use, type ElementType } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ArrowLeft, Monitor, Network, HardDrive, Clock, Shield, AlertCircle } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDate } from "@/lib/utils";
import type { ADComputer } from "@/types/ad";

function PropRow({ label, value, icon: Icon }: { label: string; value?: string | null; icon?: ElementType }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-border/50 last:border-0">
      {Icon && <Icon className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
        <p className="text-sm text-foreground truncate">{value ?? "—"}</p>
      </div>
    </div>
  );
}

export default function ComputerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const { data: computer, isLoading, error } = useQuery<ADComputer>({
    queryKey: ["computer", id],
    queryFn: () => fetch(`/api/ad/computers/${encodeURIComponent(id)}`).then((r) => r.json()),
  });

  if (isLoading) return (
    <div className="flex flex-col min-h-screen">
      <TopBar />
      <div className="pt-14"><LoadingSpinner message="Loading computer…" /></div>
    </div>
  );

  if (error || !computer) return (
    <div className="flex flex-col min-h-screen">
      <TopBar />
      <div className="pt-14 p-6">
        <div className="flex items-center gap-3 bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <AlertCircle className="w-5 h-5 text-destructive" />
          <p className="text-sm text-destructive">Computer not found or access denied.</p>
        </div>
      </div>
    </div>
  );

  const groups = (computer.MemberOf ?? []).map((dn) => {
    const match = dn.match(/^CN=([^,]+)/);
    return { dn, name: match?.[1] ?? dn };
  });

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar />
      <div className="pt-14 p-6 max-w-5xl">
        <button
          onClick={() => router.push("/aduc?tab=computers")}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to ADUC
        </button>

        <div className="flex items-center gap-4 mb-6">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-500/10 border border-green-500/20">
            <Monitor className="w-6 h-6 text-green-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">{computer.Name}</h1>
            <p className="text-sm text-muted-foreground">{computer.DNSHostName ?? computer.SamAccountName}</p>
          </div>
          <div className="ml-auto">
            <Badge variant={computer.Enabled ? "success" : "destructive"}>
              {computer.Enabled ? "Enabled" : "Disabled"}
            </Badge>
          </div>
        </div>

        <Tabs defaultValue="properties">
          <TabsList className="mb-4 w-full justify-start">
            <TabsTrigger value="properties">Properties</TabsTrigger>
            <TabsTrigger value="groups">Groups ({groups.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="properties">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-card border border-border rounded-lg p-4">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Identity</h3>
                <PropRow label="Name" value={computer.Name} icon={Monitor} />
                <PropRow label="SAM Account" value={computer.SamAccountName} />
                <PropRow label="DNS Host Name" value={computer.DNSHostName} icon={Network} />
                <PropRow label="IPv4 Address" value={computer.IPv4Address} />
                <PropRow label="Description" value={computer.Description} />
              </div>

              <div className="bg-card border border-border rounded-lg p-4">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Operating System</h3>
                <PropRow label="OS" value={computer.OperatingSystem} icon={HardDrive} />
                <PropRow label="Version" value={computer.OperatingSystemVersion} />
                <PropRow label="Last Logon" value={formatDate(computer.LastLogonDate)} icon={Clock} />
                <PropRow label="Created" value={formatDate(computer.Created)} />
                <PropRow label="Modified" value={formatDate(computer.Modified)} />
              </div>

              <div className="bg-card border border-border rounded-lg p-4 col-span-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">AD Location</h3>
                <PropRow label="Distinguished Name" value={computer.DistinguishedName} icon={Shield} />
                <PropRow label="Canonical Name" value={computer.CanonicalName} />
                <PropRow label="Object GUID" value={computer.ObjectGUID} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="groups">
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="px-4 py-2.5 border-b border-border">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Group Memberships ({groups.length})
                </p>
              </div>
              <ScrollArea className="h-[300px]">
                {groups.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No group memberships</p>
                ) : (
                  <div className="divide-y divide-border/50">
                    {groups.map((g) => (
                      <div key={g.dn} className="flex items-center gap-3 px-4 py-2.5 text-xs">
                        <Shield className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium">{g.name}</p>
                          <p className="text-muted-foreground truncate">{g.dn}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
