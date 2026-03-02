import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { apiFetch } from "@/lib/api";

export interface ReadinessComponent {
  key: string;
  label: string;
  weight: number;
  rawValue?: number | string;
  normalized: number;
  weighted: number;
  status: string;
  notes?: string[];
  suggestedActions?: string[];
}

export interface ReadinessResultData {
  tier: string;
  score: number;
  rawTotal: number;
  scorePreCap: number;
  delta?: number;
  capApplied: { capValue: number; reasons: string[] } | null;
  breakdown: {
    documentation: { pointsEarned: number; pointsMax: number };
    fitness: { pointsEarned: number; pointsMax: number };
    eligibility: { pointsEarned: number; pointsMax: number };
    admin: { pointsEarned: number; pointsMax: number };
  };
  explanation: string[];
  components: ReadinessComponent[];
  missingCritical: string[];
  nextBestActions: string[];
}

export function useReadinessResult() {
  return useQuery({
    queryKey: [api.readiness.get.path],
    queryFn: async () => {
      const res = await apiFetch(api.readiness.get.path);
      if (!res.ok) throw new Error("Failed to fetch readiness");
      const data = await res.json();
      return data as ReadinessResultData | null;
    },
  });
}
