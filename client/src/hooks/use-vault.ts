import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { type InsertVaultItem } from "@shared/schema";

export function useVaultItems() {
  return useQuery({
    queryKey: [api.vault.list.path],
    queryFn: async () => {
      const res = await fetch(api.vault.list.path, { credentials: "include" });
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
      const res = await fetch(api.vault.create.path, {
        method: api.vault.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create vault item");
      return api.vault.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.vault.list.path] });
      // Might affect readiness score
      queryClient.invalidateQueries({ queryKey: [api.profile.get.path] });
    },
  });
}
