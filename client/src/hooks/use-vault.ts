import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { type InsertVaultItem } from "@shared/schema";
import { apiFetch } from "@/lib/api";

export function useVaultItems() {
  return useQuery({
    queryKey: [api.vault.list.path],
    queryFn: async () => {
      const res = await apiFetch(api.vault.list.path);
      if (!res.ok) throw new Error("Failed to fetch vault items");
      return api.vault.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateVaultItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertVaultItem) => {
      const validated = api.vault.create.input.parse(data);
      const res = await apiFetch(api.vault.create.path, {
        method: api.vault.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const err = new Error(typeof body?.message === "string" ? body.message : "Failed to create vault item") as Error & { code?: string };
        if (body?.code) err.code = body.code;
        throw err;
      }
      return api.vault.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.vault.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.profile.get.path] });
      queryClient.invalidateQueries({ queryKey: [api.readiness.get.path] });
      queryClient.invalidateQueries({ queryKey: [api.alerts.list.path] });
    },
  });
}
