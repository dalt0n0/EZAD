"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Users, Monitor, Shield, RefreshCw, Plus } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { OUTree } from "@/components/aduc/OUTree";
import { ObjectTable } from "@/components/aduc/ObjectTable";
import { CreateUserDialog } from "@/components/aduc/CreateUserDialog";
import { CreateGroupDialog } from "@/components/aduc/CreateGroupDialog";
import { SearchInput } from "@/components/shared/SearchInput";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { ADOU, ADUser, ADComputer, ADGroup } from "@/types/ad";

type TabType = "users" | "computers" | "groups";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tabs: { id: TabType; label: string; icon: any; color: string }[] = [
  { id: "users", label: "Users", icon: Users, color: "text-blue-400" },
  { id: "computers", label: "Computers", icon: Monitor, color: "text-green-400" },
  { id: "groups", label: "Groups", icon: Shield, color: "text-purple-400" },
];

function ADUCContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const activeTab = (searchParams.get("tab") as TabType) ?? "users";
  const selectedOU = searchParams.get("ou") ?? null;

  function setTab(tab: TabType) {
    const ps = new URLSearchParams(searchParams.toString());
    ps.set("tab", tab);
    router.push(`/aduc?${ps}`);
  }

  function selectOU(dn: string | null) {
    const ps = new URLSearchParams(searchParams.toString());
    if (dn) ps.set("ou", dn); else ps.delete("ou");
    router.push(`/aduc?${ps}`);
  }

  const { data: ousRaw, isLoading: ousLoading } = useQuery({
    queryKey: ["ous"],
    queryFn: () => fetch("/api/ad/ous").then((r) => r.json()),
  });
  const ous: ADOU[] = Array.isArray(ousRaw) ? ousRaw : [];

  const { data: usersRaw, isLoading: usersLoading, refetch: refetchUsers } = useQuery({
    queryKey: ["users", selectedOU, search],
    queryFn: () => {
      const params = new URLSearchParams();
      if (selectedOU) params.set("ou", selectedOU);
      if (search) params.set("search", search);
      return fetch(`/api/ad/users?${params}`).then((r) => r.json());
    },
  });
  const users: ADUser[] = Array.isArray(usersRaw) ? usersRaw : [];

  const { data: computersRaw, isLoading: computersLoading, refetch: refetchComputers } = useQuery({
    queryKey: ["computers", selectedOU, search],
    queryFn: () => {
      const params = new URLSearchParams();
      if (selectedOU) params.set("ou", selectedOU);
      if (search) params.set("search", search);
      return fetch(`/api/ad/computers?${params}`).then((r) => r.json());
    },
  });
  const computers: ADComputer[] = Array.isArray(computersRaw) ? computersRaw : [];

  const { data: groupsRaw, isLoading: groupsLoading, refetch: refetchGroups } = useQuery({
    queryKey: ["groups", selectedOU, search],
    queryFn: () => {
      const params = new URLSearchParams();
      if (selectedOU) params.set("ou", selectedOU);
      if (search) params.set("search", search);
      return fetch(`/api/ad/groups?${params}`).then((r) => r.json());
    },
  });
  const groups: ADGroup[] = Array.isArray(groupsRaw) ? groupsRaw : [];

  const isLoading = activeTab === "users" ? usersLoading : activeTab === "computers" ? computersLoading : groupsLoading;

  function refetch() {
    if (activeTab === "users") refetchUsers();
    else if (activeTab === "computers") refetchComputers();
    else refetchGroups();
  }

  const counts = {
    users: Array.isArray(users) ? users.length : 0,
    computers: Array.isArray(computers) ? computers.length : 0,
    groups: Array.isArray(groups) ? groups.length : 0,
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* OU Tree Panel */}
      <aside className="w-56 border-r border-border bg-card flex flex-col shrink-0">
        <div className="px-3 py-2 border-b border-border">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Organizational Units
          </p>
        </div>
        <ScrollArea className="flex-1">
          {ousLoading ? (
            <LoadingSpinner className="py-8" message="Loading OUs…" />
          ) : (
            <OUTree ous={ous} selectedDN={selectedOU} onSelect={selectOU} />
          )}
        </ScrollArea>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="border-b border-border px-4 py-2 flex items-center gap-3">
          {/* Tabs */}
          <div className="flex items-center gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setTab(tab.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                    isActive
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  )}
                >
                  <Icon className={cn("w-3.5 h-3.5", isActive && tab.color)} />
                  {tab.label}
                  <span className="ml-1 text-muted-foreground">
                    ({counts[tab.id]})
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex-1" />

          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder={`Search ${activeTab}…`}
            className="w-56"
          />

          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={refetch}>
            <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
          </Button>

          {activeTab === "users" && (
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={() => setCreateUserOpen(true)}
            >
              <Plus className="w-3.5 h-3.5" />
              New User
            </Button>
          )}
          {activeTab === "groups" && (
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={() => setCreateGroupOpen(true)}
            >
              <Plus className="w-3.5 h-3.5" />
              New Group
            </Button>
          )}
        </div>

        <CreateUserDialog open={createUserOpen} onOpenChange={setCreateUserOpen} defaultOU={selectedOU ?? undefined} />
        <CreateGroupDialog open={createGroupOpen} onOpenChange={setCreateGroupOpen} defaultOU={selectedOU ?? undefined} />

        {/* Table */}
        <div className="flex-1 overflow-hidden">
          {isLoading ? (
            <LoadingSpinner message={`Loading ${activeTab}…`} />
          ) : (
            <ObjectTable
              tab={activeTab}
              users={Array.isArray(users) ? users : []}
              computers={Array.isArray(computers) ? computers : []}
              groups={Array.isArray(groups) ? groups : []}
              globalFilter={search}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default function ADUCPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <TopBar title="AD Users & Computers" />
      <div className="flex-1 pt-14">
        <Suspense fallback={<LoadingSpinner message="Loading…" />}>
          <ADUCContent />
        </Suspense>
      </div>
    </div>
  );
}
