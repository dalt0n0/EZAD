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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Controller } from "react-hook-form";

const schema = z.object({
  Name: z.string().min(1, "Name is required"),
  SamAccountName: z.string().min(1, "SAM account name is required").regex(/^[a-zA-Z0-9._\-$ ]+$/, "Invalid characters"),
  GroupScope: z.enum(["DomainLocal", "Global", "Universal"]),
  GroupCategory: z.enum(["Security", "Distribution"]),
  Description: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

interface CreateGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultOU?: string;
}

export function CreateGroupDialog({ open, onOpenChange, defaultOU }: CreateGroupDialogProps) {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      GroupScope: "Global",
      GroupCategory: "Security",
    },
  });

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      fetch("/api/ad/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, Path: defaultOU }),
      }).then(async (r) => {
        const json = await r.json();
        if (!r.ok) throw new Error(json.error ?? "Failed to create group");
        return json;
      }),
    onSuccess: (group) => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      toast.success(`Group "${group.Name}" created successfully`);
      reset();
      onOpenChange(false);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to create group");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Group</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Group Name <span className="text-destructive">*</span></Label>
            <Input {...register("Name")} className="h-8 text-xs" placeholder="IT-Helpdesk" />
            {errors.Name && <p className="text-xs text-destructive">{errors.Name.message}</p>}
          </div>

          <div className="space-y-1">
            <Label className="text-xs">SAM Account Name <span className="text-destructive">*</span></Label>
            <Input {...register("SamAccountName")} className="h-8 text-xs" placeholder="IT-Helpdesk" />
            {errors.SamAccountName && <p className="text-xs text-destructive">{errors.SamAccountName.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Group Scope</Label>
              <Controller
                name="GroupScope"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Global">Global</SelectItem>
                      <SelectItem value="DomainLocal">Domain Local</SelectItem>
                      <SelectItem value="Universal">Universal</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Group Type</Label>
              <Controller
                name="GroupCategory"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Security">Security</SelectItem>
                      <SelectItem value="Distribution">Distribution</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Description</Label>
            <Input {...register("Description")} className="h-8 text-xs" placeholder="Optional description" />
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
              {isSubmitting ? "Creating…" : "Create Group"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
