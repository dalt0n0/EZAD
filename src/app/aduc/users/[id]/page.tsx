"use client";

import { useState, use, type ElementType } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Building2,
  Shield,
  Edit3,
  CheckCircle2,
  XCircle,
  Lock,
  Clock,
  MapPin,
  Users,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { TopBar } from "@/components/layout/TopBar";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { formatDate } from "@/lib/utils";
import type { ADUser } from "@/types/ad";
import type { RSoPResult } from "@/types/gpo";

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

const editSchema = z.object({
  DisplayName: z.string().optional(),
  GivenName: z.string().optional(),
  Surname: z.string().optional(),
  EmailAddress: z.string().email().optional().or(z.literal("")),
  Title: z.string().optional(),
  Department: z.string().optional(),
  Company: z.string().optional(),
  Description: z.string().optional(),
  OfficePhone: z.string().optional(),
  MobilePhone: z.string().optional(),
  Enabled: z.boolean().optional(),
});
type EditForm = z.infer<typeof editSchema>;

export default function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [rsopComputer, setRsopComputer] = useState("");

  const { data: user, isLoading, error } = useQuery<ADUser>({
    queryKey: ["user", id],
    queryFn: () => fetch(`/api/ad/users/${encodeURIComponent(id)}`).then((r) => r.json()),
  });

  const { data: rsop, isLoading: rsopLoading } = useQuery<RSoPResult | null>({
    queryKey: ["rsop", id],
    queryFn: async () => {
      const res = await fetch(`/api/rsop/${encodeURIComponent(id)}`);
      if (!res.ok) return null;
      return res.json() as Promise<RSoPResult>;
    },
    enabled: !!user,
    retry: false,
  });

  const { register, handleSubmit, reset, formState: { isDirty, isSubmitting } } = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    values: user ? {
      DisplayName: user.DisplayName ?? "",
      GivenName: user.GivenName ?? "",
      Surname: user.Surname ?? "",
      EmailAddress: user.EmailAddress ?? "",
      Title: user.Title ?? "",
      Department: user.Department ?? "",
      Company: user.Company ?? "",
      Description: user.Description ?? "",
      OfficePhone: user.OfficePhone ?? "",
      MobilePhone: user.MobilePhone ?? "",
      Enabled: user.Enabled,
    } : undefined,
  });

  const updateMutation = useMutation({
    mutationFn: (data: EditForm) =>
      fetch(`/api/ad/users/${encodeURIComponent(id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: (updated) => {
      queryClient.setQueryData(["user", id], updated);
      toast.success("User updated successfully");
      reset(updated);
    },
    onError: (err) => {
      toast.error(`Failed to update: ${err instanceof Error ? err.message : "Unknown error"}`);
    },
  });

  if (isLoading) return (
    <div className="flex flex-col min-h-screen">
      <TopBar />
      <div className="pt-14"><LoadingSpinner message="Loading user…" /></div>
    </div>
  );

  if (error || !user) return (
    <div className="flex flex-col min-h-screen">
      <TopBar />
      <div className="pt-14 p-6">
        <div className="flex items-center gap-3 bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <AlertCircle className="w-5 h-5 text-destructive" />
          <p className="text-sm text-destructive">User not found or access denied.</p>
        </div>
      </div>
    </div>
  );

  const groups = (user.MemberOf ?? []).map((dn) => {
    const match = dn.match(/^CN=([^,]+)/);
    return { dn, name: match?.[1] ?? dn };
  });

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar />
      <div className="pt-14 p-6 max-w-5xl">
        {/* Back + header */}
        <button
          onClick={() => router.push("/aduc")}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to ADUC
        </button>

        <div className="flex items-center gap-4 mb-6">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-500/10 border border-blue-500/20">
            <User className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">{user.DisplayName ?? user.Name}</h1>
            <p className="text-sm text-muted-foreground">
              {user.SamAccountName}
              {user.UserPrincipalName && ` · ${user.UserPrincipalName}`}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Badge variant={user.Enabled ? "success" : "destructive"}>
              {user.Enabled ? "Enabled" : "Disabled"}
            </Badge>
            {user.LockedOut && <Badge variant="warning">Locked Out</Badge>}
          </div>
        </div>

        <Tabs defaultValue="properties">
          <TabsList className="mb-4 w-full justify-start">
            <TabsTrigger value="properties">Properties</TabsTrigger>
            <TabsTrigger value="groups">Groups ({groups.length})</TabsTrigger>
            <TabsTrigger value="gpos">GPOs</TabsTrigger>
            <TabsTrigger value="edit">Edit</TabsTrigger>
          </TabsList>

          {/* Properties Tab */}
          <TabsContent value="properties">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-card border border-border rounded-lg p-4">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Identity</h3>
                <PropRow label="Full Name" value={user.DisplayName ?? user.Name} icon={User} />
                <PropRow label="First Name" value={user.GivenName} />
                <PropRow label="Last Name" value={user.Surname} />
                <PropRow label="SAM Account" value={user.SamAccountName} />
                <PropRow label="UPN" value={user.UserPrincipalName} />
                <PropRow label="Email" value={user.EmailAddress} icon={Mail} />
              </div>

              <div className="bg-card border border-border rounded-lg p-4">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Organization</h3>
                <PropRow label="Title" value={user.Title} />
                <PropRow label="Department" value={user.Department} icon={Building2} />
                <PropRow label="Company" value={user.Company} />
                <PropRow label="Manager" value={user.Manager ? user.Manager.match(/^CN=([^,]+)/)?.[1] : undefined} />
                <PropRow label="Office" value={user.Office} />
                <PropRow label="Phone" value={user.OfficePhone} icon={Phone} />
                <PropRow label="Mobile" value={user.MobilePhone} icon={Phone} />
              </div>

              <div className="bg-card border border-border rounded-lg p-4">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Account</h3>
                <div className="flex items-center gap-2 py-2.5 border-b border-border/50">
                  {user.Enabled
                    ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    : <XCircle className="w-3.5 h-3.5 text-red-400" />}
                  <span className="text-sm">{user.Enabled ? "Account enabled" : "Account disabled"}</span>
                </div>
                {user.LockedOut && (
                  <div className="flex items-center gap-2 py-2.5 border-b border-border/50">
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-sm text-amber-400">Account locked out</span>
                  </div>
                )}
                <PropRow label="Password Expired" value={user.PasswordExpired ? "Yes" : "No"} icon={Shield} />
                <PropRow label="Password Never Expires" value={user.PasswordNeverExpires ? "Yes" : "No"} />
                <PropRow label="Last Logon" value={formatDate(user.LastLogonDate)} icon={Clock} />
                <PropRow label="Created" value={formatDate(user.Created)} />
                <PropRow label="Modified" value={formatDate(user.Modified)} />
              </div>

              <div className="bg-card border border-border rounded-lg p-4">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Location & AD</h3>
                <PropRow label="Street Address" value={user.StreetAddress} icon={MapPin} />
                <PropRow label="City" value={user.City} />
                <PropRow label="State" value={user.State} />
                <PropRow label="Country" value={user.Country} />
                <Separator className="my-2" />
                <PropRow label="Distinguished Name" value={user.DistinguishedName} />
                <PropRow label="Canonical Name" value={user.CanonicalName} />
                <PropRow label="Object GUID" value={user.ObjectGUID} />
              </div>
            </div>
          </TabsContent>

          {/* Groups Tab */}
          <TabsContent value="groups">
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="px-4 py-2.5 border-b border-border">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Group Memberships ({groups.length})
                </p>
              </div>
              <ScrollArea className="h-[400px]">
                {groups.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No group memberships</p>
                ) : (
                  <div className="divide-y divide-border/50">
                    {groups.map((g) => (
                      <button
                        key={g.dn}
                        onClick={() => {
                          const sam = g.dn.match(/^CN=([^,]+)/)?.[1];
                          if (sam) router.push(`/aduc/groups/${encodeURIComponent(sam)}`);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-secondary transition-colors text-left"
                      >
                        <Users className="w-4 h-4 text-purple-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{g.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{g.dn}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </TabsContent>

          {/* GPOs Tab */}
          <TabsContent value="gpos">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Specify a computer for RSoP (optional)…"
                  value={rsopComputer}
                  onChange={(e) => setRsopComputer(e.target.value)}
                  className="max-w-sm h-8 text-xs"
                />
              </div>

              {rsopLoading ? (
                <LoadingSpinner message="Calculating resultant set of policy…" />
              ) : rsop ? (
                <div className="space-y-4">
                  {/* Applied GPOs */}
                  <div className="bg-card border border-border rounded-lg overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-border flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Applied GPOs ({rsop.appliedGPOs.length})
                      </p>
                    </div>
                    <ScrollArea className="h-[280px]">
                      {rsop.appliedGPOs.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">No GPOs applied</p>
                      ) : (
                        <table className="w-full text-xs">
                          <thead className="bg-muted/30 border-b border-border">
                            <tr>
                              <th className="px-4 py-2 text-left text-muted-foreground font-medium">#</th>
                              <th className="px-4 py-2 text-left text-muted-foreground font-medium">GPO Name</th>
                              <th className="px-4 py-2 text-left text-muted-foreground font-medium">Link Location</th>
                              <th className="px-4 py-2 text-left text-muted-foreground font-medium">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rsop.appliedGPOs.map((gpo, i) => (
                              <tr key={i} className="border-b border-border/50 hover:bg-secondary/50">
                                <td className="px-4 py-2 text-muted-foreground">{gpo.Precedence || i + 1}</td>
                                <td className="px-4 py-2">
                                  <button
                                    onClick={() => router.push(`/gpo/${encodeURIComponent(gpo.Id)}`)}
                                    className="font-medium hover:text-primary transition-colors text-left"
                                  >
                                    {gpo.Name}
                                  </button>
                                </td>
                                <td className="px-4 py-2 text-muted-foreground">{gpo.LinkLocation || "—"}</td>
                                <td className="px-4 py-2">
                                  <div className="flex gap-1">
                                    {gpo.Enforced && <Badge variant="warning" className="text-[10px] py-0">Enforced</Badge>}
                                    {!gpo.Enabled && <Badge variant="secondary" className="text-[10px] py-0">Disabled</Badge>}
                                    {gpo.Enabled && !gpo.Enforced && <Badge variant="success" className="text-[10px] py-0">Active</Badge>}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </ScrollArea>
                  </div>

                  {/* Denied GPOs */}
                  {rsop.deniedGPOs.length > 0 && (
                    <div className="bg-card border border-border rounded-lg overflow-hidden">
                      <div className="px-4 py-2.5 border-b border-border flex items-center gap-2">
                        <XCircle className="w-3.5 h-3.5 text-red-400" />
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Denied / Filtered GPOs ({rsop.deniedGPOs.length})
                        </p>
                      </div>
                      <div className="divide-y divide-border/50">
                        {rsop.deniedGPOs.map((gpo, i) => (
                          <div key={i} className="flex items-center gap-3 px-4 py-2.5 text-xs">
                            <Shield className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <span className="flex-1 text-muted-foreground">{gpo.Name}</span>
                            <span className="text-muted-foreground/60">{gpo.Reason ?? "Access denied"}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  <p className="text-sm text-muted-foreground">
                    RSoP data unavailable. This requires the Group Policy module and may need a target computer.
                  </p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Edit Tab */}
          <TabsContent value="edit">
            <form
              onSubmit={handleSubmit((data) => updateMutation.mutate(data))}
              className="space-y-4 max-w-2xl"
            >
              <div className="bg-card border border-border rounded-lg p-4">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Identity</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Display Name</Label>
                    <Input {...register("DisplayName")} className="h-8 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Email</Label>
                    <Input {...register("EmailAddress")} type="email" className="h-8 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">First Name</Label>
                    <Input {...register("GivenName")} className="h-8 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Last Name</Label>
                    <Input {...register("Surname")} className="h-8 text-xs" />
                  </div>
                </div>
              </div>

              <div className="bg-card border border-border rounded-lg p-4">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Organization</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Title</Label>
                    <Input {...register("Title")} className="h-8 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Department</Label>
                    <Input {...register("Department")} className="h-8 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Company</Label>
                    <Input {...register("Company")} className="h-8 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Description</Label>
                    <Input {...register("Description")} className="h-8 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Office Phone</Label>
                    <Input {...register("OfficePhone")} className="h-8 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Mobile Phone</Label>
                    <Input {...register("MobilePhone")} className="h-8 text-xs" />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  type="submit"
                  disabled={!isDirty || isSubmitting}
                  className="gap-2"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  {isSubmitting ? "Saving…" : "Save Changes"}
                </Button>
                {isDirty && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => reset()}
                    className="text-muted-foreground"
                  >
                    Discard
                  </Button>
                )}
              </div>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
