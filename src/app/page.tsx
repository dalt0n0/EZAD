"use client";

import type { ElementType } from "react";
import { useQuery } from "@tanstack/react-query";
import { Users, Monitor, Shield, Building2, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import type { ADStats } from "@/types/ad";

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color = "blue",
}: {
  icon: ElementType;
  label: string;
  value: number | string;
  sub?: string;
  color?: "blue" | "green" | "purple" | "amber";
}) {
  const colors = {
    blue: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    green: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    purple: "text-purple-400 bg-purple-500/10 border-purple-500/20",
    amber: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  };

  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-muted-foreground">{label}</span>
        <div className={`p-2 rounded-md border ${colors[color]}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="text-2xl font-bold text-foreground">{value}</div>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const { data: stats, isLoading, error } = useQuery<ADStats>({
    queryKey: ["domain", "stats"],
    queryFn: () => fetch("/api/ad/domain?stats=true").then((r) => r.json()),
    staleTime: 60_000,
  });

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar title="Dashboard" />
      <main className="flex-1 pt-14 p-6">
        {/* Domain info header */}
        {stats?.domain && (
          <div className="mb-6 bg-card border border-border rounded-lg px-5 py-4 flex items-center gap-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 border border-primary/20">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">{stats.domain.DNSRoot}</h2>
              <p className="text-xs text-muted-foreground">
                {stats.domain.DomainMode} · Forest: {stats.domain.Forest} · PDC: {stats.domain.PDCEmulator}
              </p>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center h-40">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground">Connecting to Active Directory…</p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-3 bg-destructive/10 border border-destructive/20 rounded-lg p-4">
            <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
            <div>
              <p className="text-sm font-medium text-destructive">Failed to connect to Active Directory</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {error instanceof Error ? error.message : "Ensure RSAT and the AD PowerShell module are installed."}
              </p>
            </div>
          </div>
        )}

        {stats && (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
              <StatCard
                icon={Users}
                label="Total Users"
                value={stats.userCount.toLocaleString()}
                sub={`${stats.enabledUsers} enabled · ${stats.disabledUsers} disabled`}
                color="blue"
              />
              <StatCard
                icon={Monitor}
                label="Computers"
                value={stats.computerCount.toLocaleString()}
                color="green"
              />
              <StatCard
                icon={Shield}
                label="Groups"
                value={stats.groupCount.toLocaleString()}
                color="purple"
              />
              <StatCard
                icon={Building2}
                label="OUs"
                value={stats.ouCount.toLocaleString()}
                color="amber"
              />
            </div>

            {/* User health */}
            <div className="bg-card border border-border rounded-lg p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4">User Account Health</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Enabled accounts</span>
                      <span className="text-foreground font-medium">
                        {stats.userCount > 0
                          ? Math.round((stats.enabledUsers / stats.userCount) * 100)
                          : 0}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{
                          width: `${stats.userCount > 0 ? (stats.enabledUsers / stats.userCount) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                  <span className="text-xs text-foreground font-medium w-10 text-right">
                    {stats.enabledUsers}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Disabled accounts</span>
                      <span className="text-foreground font-medium">
                        {stats.userCount > 0
                          ? Math.round((stats.disabledUsers / stats.userCount) * 100)
                          : 0}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-500 rounded-full"
                        style={{
                          width: `${stats.userCount > 0 ? (stats.disabledUsers / stats.userCount) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                  <span className="text-xs text-foreground font-medium w-10 text-right">
                    {stats.disabledUsers}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
