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
      input: z.object({ query: z.string() }),
      responses: {
        200: z.object({ response: z.string() }),
        403: z.object({ message: z.string(), requiresPro: z.boolean() }), // Pro required error
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
