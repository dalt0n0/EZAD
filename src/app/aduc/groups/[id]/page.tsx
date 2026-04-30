"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ArrowLeft, Users, User, Monitor, AlertCircle } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SearchInput } from "@/components/shared/SearchInput";
import { useState } from "react";
import { formatDate } from "@/lib/utils";
import type { ADGroup, ADGroupMember } from "@/types/ad";

function PropRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-border/50 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
        <p className="text-sm text-foreground truncate">{value ?? "—"}</p>
      </div>
    </div>
  );
}

const memberIcon = {
  user: User,
  computer: Monitor,
  group: Users,
};

export default function GroupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [memberSearch, setMemberSearch] = useState("");

  const { data: group, isLoading, error } = useQuery<ADGroup>({
    queryKey: ["group", id],
    queryFn: () => fetch(`/api/ad/groups/${encodeURIComponent(id)}`).then((r) => r.json()),
  });

  const { data: members = [], isLoading: membersLoading } = useQuery<ADGroupMember[]>({
    queryKey: ["group-members", id],
    queryFn: () => fetch(`/api/ad/groups/${encodeURIComponent(id)}?members=true`).then((r) => r.json()),
    enabled: !!group,
  });

  if (isLoading) return (
    <div className="flex flex-col min-h-screen">
      <TopBar />
      <div className="pt-14"><LoadingSpinner message="Loading group…" /></div>
    </div>
  );

  if (error || !group) return (
    <div className="flex flex-col min-h-screen">
      <TopBar />
      <div className="pt-14 p-6">
        <div className="flex items-center gap-3 bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <AlertCircle className="w-5 h-5 text-destructive" />
          <p className="text-sm text-destructive">Group not found or access denied.</p>
        </div>
      </div>
    </div>
  );

  const filteredMembers = members.filter((m) =>
    !memberSearch ||
    m.Name.toLowerCase().includes(memberSearch.toLowerCase()) ||
    m.SamAccountName?.toLowerCase().includes(memberSearch.toLowerCase())
  );

  const memberTypes = {
    user: filteredMembers.filter((m) => m.ObjectClass === "user").length,
    computer: filteredMembers.filter((m) => m.ObjectClass === "computer").length,
    group: filteredMembers.filter((m) => m.ObjectClass === "group").length,
  };

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar />
      <div className="pt-14 p-6 max-w-5xl">
        <button
          onClick={() => router.push("/aduc?tab=groups")}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to ADUC
        </button>

        <div className="flex items-center gap-4 mb-6">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-purple-500/10 border border-purple-500/20">
            <Users className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">{group.Name}</h1>
            <p className="text-sm text-muted-foreground">{group.SamAccountName}</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Badge variant="info">{group.GroupScope}</Badge>
            <Badge variant={group.GroupCategory === "Security" ? "warning" : "secondary"}>
              {group.GroupCategory}
            </Badge>
          </div>
        </div>

        <Tabs defaultValue="members">
          <TabsList className="mb-4 w-full justify-start">
            <TabsTrigger value="members">Members ({members.length})</TabsTrigger>
            <TabsTrigger value="properties">Properties</TabsTrigger>
          </TabsList>

          <TabsContent value="members">
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="px-4 py-2.5 border-b border-border flex items-center gap-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex-1">
                  Members
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{memberTypes.user} users</span>
                  <span>·</span>
                  <span>{memberTypes.computer} computers</span>
                  <span>·</span>
                  <span>{memberTypes.group} groups</span>
                </div>
                <SearchInput
                  value={memberSearch}
                  onChange={setMemberSearch}
                  placeholder="Filter members…"
                  className="w-48"
                />
              </div>
              <ScrollArea className="h-[400px]">
                {membersLoading ? (
                  <LoadingSpinner message="Loading members…" />
                ) : filteredMembers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No members found</p>
                ) : (
                  <table className="w-full text-xs">
                    <thead className="bg-muted/30 border-b border-border sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left text-muted-foreground font-medium">Name</th>
                        <th className="px-4 py-2 text-left text-muted-foreground font-medium">SAM Account</th>
                        <th className="px-4 py-2 text-left text-muted-foreground font-medium">Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMembers.map((m) => {
                        const Icon = memberIcon[m.ObjectClass] ?? User;
                        return (
                          <tr
                            key={m.DistinguishedName}
                            onClick={() => {
                              if (m.ObjectClass === "user") router.push(`/aduc/users/${encodeURIComponent(m.SamAccountName)}`);
                              else if (m.ObjectClass === "computer") router.push(`/aduc/computers/${encodeURIComponent(m.Name)}`);
                              else router.push(`/aduc/groups/${encodeURIComponent(m.SamAccountName)}`);
                            }}
                            className="border-b border-border/50 hover:bg-secondary cursor-pointer transition-colors"
                          >
                            <td className="px-4 py-2">
                              <div className="flex items-center gap-2">
                                <Icon className={`w-3.5 h-3.5 shrink-0 ${
                                  m.ObjectClass === "user" ? "text-blue-400" :
                                  m.ObjectClass === "computer" ? "text-green-400" : "text-purple-400"
                                }`} />
                                <span className="font-medium">{m.Name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-2 text-muted-foreground">{m.SamAccountName}</td>
                            <td className="px-4 py-2">
                              <Badge variant={m.ObjectClass === "user" ? "info" : m.ObjectClass === "computer" ? "success" : "secondary"}>
                                {m.ObjectClass}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </ScrollArea>
            </div>
          </TabsContent>

          <TabsContent value="properties">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-card border border-border rounded-lg p-4">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Identity</h3>
                <PropRow label="Name" value={group.Name} />
                <PropRow label="SAM Account" value={group.SamAccountName} />
                <PropRow label="Description" value={group.Description} />
                <PropRow label="Managed By" value={group.ManagedBy?.match(/^CN=([^,]+)/)?.[1]} />
              </div>

              <div className="bg-card border border-border rounded-lg p-4">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Configuration</h3>
                <div className="py-2.5 border-b border-border/50">
                  <p className="text-xs text-muted-foreground mb-0.5">Group Scope</p>
                  <Badge variant="info">{group.GroupScope}</Badge>
                </div>
                <div className="py-2.5 border-b border-border/50">
                  <p className="text-xs text-muted-foreground mb-0.5">Group Category</p>
                  <Badge variant={group.GroupCategory === "Security" ? "warning" : "secondary"}>
                    {group.GroupCategory}
                  </Badge>
                </div>
                <PropRow label="Created" value={formatDate(group.Created)} />
                <PropRow label="Modified" value={formatDate(group.Modified)} />
              </div>

              <div className="bg-card border border-border rounded-lg p-4 col-span-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">AD Location</h3>
                <PropRow label="Distinguished Name" value={group.DistinguishedName} />
                <PropRow label="Canonical Name" value={group.CanonicalName} />
                <PropRow label="Object GUID" value={group.ObjectGUID} />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
