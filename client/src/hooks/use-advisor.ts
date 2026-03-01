import { useMutation } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { z } from "zod";

// Custom error to handle 403 easily
export class AdvisorProRequiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdvisorProRequiredError";
  }
}

export function useAdvisorAsk() {
  return useMutation({
    mutationFn: async (query: string) => {
      const validated = api.advisor.ask.input.parse({ query });
      const res = await fetch(api.advisor.ask.path, {
        method: api.advisor.ask.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      
      if (!res.ok) {
        if (res.status === 403) {
          const errData = api.advisor.ask.responses[403].parse(await res.json());
          throw new AdvisorProRequiredError(errData.message);
        }
        throw new Error("Failed to get advisor response");
      }
      
      return api.advisor.ask.responses[200].parse(await res.json());
    },
  });
}
