import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { type InsertCommunityPost } from "@shared/schema";

export function useCommunityPosts() {
  return useQuery({
    queryKey: [api.community.list.path],
    queryFn: async () => {
      const res = await fetch(api.community.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch community posts");
      return api.community.list.responses[200].parse(await res.json());
    },
  });
}

export function useLikePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (postId: number) => {
      // Mock like functionality as it's not in schema yet
      return { success: true, id: postId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.community.list.path] });
    },
  });
}

export function useCreateCommunityPost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertCommunityPost) => {
      const validated = api.community.create.input.parse(data);
      const res = await fetch(api.community.create.path, {
        method: api.community.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create post");
      return api.community.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.community.list.path] });
    },
  });
}
