"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { GPO } from "@/types/gpo";

const schema = z.object({
  GpoStatus: z.enum(["AllSettingsEnabled", "UserSettingsDisabled", "ComputerSettingsDisabled", "AllSettingsDisabled"]),
  Description: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

interface EditGPODialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gpo: GPO;
}

export function EditGPODialog({ open, onOpenChange, gpo }: EditGPODialogProps) {
  const queryClient = useQueryClient();
  const {
    handleSubmit,
    control,
    register,
    reset,
    formState: { isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      GpoStatus: gpo.GpoStatus,
      Description: gpo.Description ?? "",
    },
  });

  useEffect(() => {
    if (open) {
      reset({ GpoStatus: gpo.GpoStatus, Description: gpo.Description ?? "" });
    }
  }, [open, gpo, reset]);

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      fetch(`/api/gpo/${encodeURIComponent(gpo.Id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then(async (r) => {
        const json = await r.json();
        if (!r.ok) throw new Error(json.error ?? "Update failed");
        return json;
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gpos"] });
      queryClient.invalidateQueries({ queryKey: ["gpo-report", gpo.Id] });
      toast.success("GPO updated");
      onOpenChange(false);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Update failed");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit GPO: {gpo.DisplayName}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Status</Label>
            <Controller
              name="GpoStatus"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AllSettingsEnabled">All Settings Enabled</SelectItem>
                    <SelectItem value="UserSettingsDisabled">User Settings Disabled</SelectItem>
                    <SelectItem value="ComputerSettingsDisabled">Computer Settings Disabled</SelectItem>
                    <SelectItem value="AllSettingsDisabled">All Settings Disabled</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Description</Label>
            <Textarea
              {...register("Description")}
              className="text-xs resize-none"
              rows={3}
              placeholder="Optional description"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
