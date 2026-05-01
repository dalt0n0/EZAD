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
import { Textarea } from "@/components/ui/textarea";

const schema = z.object({
  Name: z.string().min(1, "Name is required").max(255),
  Comment: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

interface CreateGPODialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (id: string) => void;
}

export function CreateGPODialog({ open, onOpenChange, onCreated }: CreateGPODialogProps) {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      fetch("/api/gpo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then(async (r) => {
        const json = await r.json();
        if (!r.ok) throw new Error(json.error ?? "Failed to create GPO");
        return json;
      }),
    onSuccess: (gpo) => {
      queryClient.invalidateQueries({ queryKey: ["gpos"] });
      toast.success(`GPO "${gpo.DisplayName}" created`);
      reset();
      onOpenChange(false);
      onCreated?.(gpo.Id);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to create GPO");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create New GPO</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">GPO Name <span className="text-destructive">*</span></Label>
            <Input {...register("Name")} className="h-8 text-xs" placeholder="My New Policy" />
            {errors.Name && <p className="text-xs text-destructive">{errors.Name.message}</p>}
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Description</Label>
            <Textarea
              {...register("Comment")}
              className="text-xs resize-none"
              rows={3}
              placeholder="Optional description"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => { reset(); onOpenChange(false); }}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating…" : "Create GPO"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
