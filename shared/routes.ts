import { z } from 'zod';
import { 
  insertProfileSchema, 
  insertVaultItemSchema, 
  insertAlertSchema, 
  insertCommunityPostSchema,
  profiles,
  vaultItems,
  alerts,
  communityPosts
} from './schema';

export const errorSchemas = {
  validation: z.object({ message: z.string(), field: z.string().optional() }),
  notFound: z.object({ message: z.string() }),
  internal: z.object({ message: z.string() }),
};

export const api = {
  profile: {
    get: {
      method: 'GET' as const,
      path: '/api/profile' as const,
      responses: {
        200: z.custom<typeof profiles.$inferSelect>(),
        404: errorSchemas.notFound,
      }
    },
    update: {
      method: 'PUT' as const,
      path: '/api/profile' as const,
      input: insertProfileSchema.partial(),
      responses: {
        200: z.custom<typeof profiles.$inferSelect>(),
        400: errorSchemas.validation,
      }
    }
  },
  vault: {
    list: {
      method: 'GET' as const,
      path: '/api/vault' as const,
      responses: {
        200: z.array(z.custom<typeof vaultItems.$inferSelect>()),
      }
    },
    create: {
      method: 'POST' as const,
      path: '/api/vault' as const,
      input: insertVaultItemSchema,
      responses: {
        201: z.custom<typeof vaultItems.$inferSelect>(),
        400: errorSchemas.validation,
      }
    }
  },
  alerts: {
    list: {
      method: 'GET' as const,
      path: '/api/alerts' as const,
      responses: {
        200: z.array(z.custom<typeof alerts.$inferSelect>()),
      }
    },
    resolve: {
      method: 'POST' as const,
      path: '/api/alerts/resolve' as const,
      input: z.object({ alertId: z.number() }),
      responses: {
        200: z.custom<typeof alerts.$inferSelect>(),
        404: errorSchemas.notFound,
        400: errorSchemas.validation,
      }
    }
  },
  readiness: {
    check: {
      method: 'POST' as const,
      path: '/api/readiness/check' as const,
      responses: {
        200: z.object({ ok: z.boolean() }),
      }
    },
    get: {
      method: 'GET' as const,
      path: '/api/readiness' as const,
      responses: {
        200: z.object({
          tier: z.string(),
          score: z.number(),
          rawTotal: z.number(),
          scorePreCap: z.number(),
          delta: z.number().optional(),
          capApplied: z.object({
            capValue: z.number(),
            reasons: z.array(z.string()),
          }).nullable(),
          breakdown: z.object({
            documentation: z.object({ pointsEarned: z.number(), pointsMax: z.number() }),
            fitness: z.object({ pointsEarned: z.number(), pointsMax: z.number() }),
            eligibility: z.object({ pointsEarned: z.number(), pointsMax: z.number() }),
            admin: z.object({ pointsEarned: z.number(), pointsMax: z.number() }),
          }),
          explanation: z.array(z.string()),
          components: z.array(z.object({
            key: z.string(),
            label: z.string(),
            weight: z.number(),
            rawValue: z.union([z.number(), z.string()]).optional(),
            normalized: z.number(),
            weighted: z.number(),
            status: z.string(),
            notes: z.array(z.string()).optional(),
            suggestedActions: z.array(z.string()).optional(),
          })),
          missingCritical: z.array(z.string()),
          nextBestActions: z.array(z.string()),
        }).nullable(),
        404: errorSchemas.notFound,
      }
    }
  },
  community: {
    list: {
      method: 'GET' as const,
      path: '/api/community' as const,
      responses: {
        200: z.array(z.custom<typeof communityPosts.$inferSelect>()),
      }
    },
    create: {
      method: 'POST' as const,
      path: '/api/community' as const,
      input: insertCommunityPostSchema,
      responses: {
        201: z.custom<typeof communityPosts.$inferSelect>(),
        400: errorSchemas.validation,
      }
    }
  },
  advisor: {
    ask: {
      method: 'POST' as const,
      path: '/api/advisor/ask' as const,
      input: z.object({ 
        query: z.string(),
        attachedVaultItemId: z.number().optional()
      }),
      responses: {
        200: z.object({ 
          response: z.string(),
          suggestions: z.array(z.string()).optional(),
          tokensRemaining: z.number().optional(),
        }),
        403: z.object({ message: z.string(), requiresPro: z.boolean(), tokensRemaining: z.number().optional() }),
        400: errorSchemas.validation,
      }
    }
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
