import { useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/lib/api";
import { toast } from "sonner";
import { formatApiError } from "@/lib/utils";

export function useOptimisticDailyEntry(dateStr: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { user_id: string; liters: number }[]) => 
      adminApi.saveDailyEntry(dateStr, data),
    
    // Optimistic Update Implementation
    onMutate: async (newData) => {
      // Cancel refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ["daily-entry", dateStr] });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData(["daily-entry", dateStr]);

      // Optimistically update the cache
      queryClient.setQueryData(["daily-entry", dateStr], (old: any) => {
        if (!old) return old;
        return old.map((entry: any) => {
          const updated = newData.find(d => d.user_id === entry.id);
          return updated ? { ...entry, liters: updated.liters } : entry;
        });
      });

      // Return context for rollback
      return { previousData };
    },

    // If mutation fails, rollback
    onError: (err, newData, context: any) => {
      if (context?.previousData) {
        queryClient.setQueryData(["daily-entry", dateStr], context.previousData);
      }
      toast.error(`Sync failed: ${formatApiError(err)}`);
    },

    // Always refetch on success or error to ensure we're in sync
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["daily-entry", dateStr] });
      queryClient.invalidateQueries({ queryKey: ["admin-bills"] });
    },
  });
}
