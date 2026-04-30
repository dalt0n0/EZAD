"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z.object({
  Name: z.string().min(1, "Name is required"),
  SamAccountName: z
    .string()
    .min(1, "SAM account name is required")
    .max(20, "Must be 20 chars or fewer")
    .regex(/^[a-zA-Z0-9._\-$ ]+$/, "Invalid characters"),
  GivenName: z.string().optional(),
  Surname: z.string().optional(),
  UserPrincipalName: z.string().email("Invalid email").optional().or(z.literal("")),
  EmailAddress: z.string().email("Invalid email").optional().or(z.literal("")),
  Title: z.string().optional(),
  Department: z.string().optional(),
  AccountPassword: z.string().min(8, "Password must be at least 8 characters"),
  Enabled: z.boolean().default(true),
});
type FormData = z.infer<typeof schema>;

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultOU?: string;
}

export function CreateUserDialog({ open, onOpenChange, defaultOU }: CreateUserDialogProps) {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { Enabled: true },
  });

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      fetch("/api/ad/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, Path: defaultOU }),
      }).then(async (r) => {
        const json = await r.json();
        if (!r.ok) throw new Error(json.error ?? "Failed to create user");
        return json;
      }),
    onSuccess: (user) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success(`User "${user.Name}" created successfully`);
      reset();
      onOpenChange(false);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to create user");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New User</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">
                Full Name <span className="text-destructive">*</span>
              </Label>
              <Input {...register("Name")} className="h-8 text-xs" placeholder="John Smith" />
              {errors.Name && <p className="text-xs text-destructive">{errors.Name.message}</p>}
            </div>
            <div className="space-y-1">
              <Label className="text-xs">
                SAM Account Name <span className="text-destructive">*</span>
              </Label>
              <Input {...register("SamAccountName")} className="h-8 text-xs" placeholder="jsmith" />
              {errors.SamAccountName && <p className="text-xs text-destructive">{errors.SamAccountName.message}</p>}
            </div>
            <div className="space-y-1">
              <Label className="text-xs">First Name</Label>
              <Input {...register("GivenName")} className="h-8 text-xs" placeholder="John" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Last Name</Label>
              <Input {...register("Surname")} className="h-8 text-xs" placeholder="Smith" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">UPN (email login)</Label>
              <Input {...register("UserPrincipalName")} className="h-8 text-xs" placeholder="jsmith@domain.com" />
              {errors.UserPrincipalName && <p className="text-xs text-destructive">{errors.UserPrincipalName.message}</p>}
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Email Address</Label>
              <Input {...register("EmailAddress")} className="h-8 text-xs" placeholder="jsmith@company.com" />
              {errors.EmailAddress && <p className="text-xs text-destructive">{errors.EmailAddress.message}</p>}
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Title</Label>
              <Input {...register("Title")} className="h-8 text-xs" placeholder="Software Engineer" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Department</Label>
              <Input {...register("Department")} className="h-8 text-xs" placeholder="Engineering" />
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">
                Initial Password <span className="text-destructive">*</span>
              </Label>
              <Input
                {...register("AccountPassword")}
                type="password"
                className="h-8 text-xs"
                placeholder="Min 8 characters"
              />
              {errors.AccountPassword && <p className="text-xs text-destructive">{errors.AccountPassword.message}</p>}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => { reset(); onOpenChange(false); }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="gap-2">
              {isSubmitting ? "Creating…" : "Create User"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
