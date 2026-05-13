import { API_BASE_URL } from "@/lib/env";
import {
  ActionItem,
  ActionItemSchema,
  Client,
  ClientSchema,
  Comment,
  CommentSchema,
  CreateActionItemInput,
  PostCommentInput,
  PostSubCommentInput,
  UpdateActionItemInput,
} from "@/lib/schemas";
import { z } from "zod";

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, body: unknown, message?: string) {
    super(message ?? `Request failed with status ${status}`);
    this.status = status;
    this.body = body;
  }
}

type FetchOpts = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  cache?: RequestCache;
  next?: { revalidate?: number; tags?: string[] };
};

async function request<T = unknown>(path: string, opts: FetchOpts = {}): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const headers: Record<string, string> = {
    "ngrok-skip-browser-warning": "true",
  };
  if (opts.body) headers["Content-Type"] = "application/json";

  const res = await fetch(url, {
    method: opts.method ?? "GET",
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    cache: opts.cache ?? "no-store",
    next: opts.next,
  });

  const text = await res.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }

  if (!res.ok) {
    throw new ApiError(res.status, parsed, `${opts.method ?? "GET"} ${path} failed`);
  }
  return parsed as T;
}

function parseList<T>(schema: z.ZodType<T>, data: unknown): T[] {
  const arr = Array.isArray(data) ? data : [];
  return arr
    .map((row) => {
      const r = schema.safeParse(row);
      return r.success ? r.data : null;
    })
    .filter((x): x is T => x !== null);
}

export type ListParams = {
  page?: number;
  limit?: number;
  order?: "asc" | "desc";
};

function listQuery({ page = 1, limit = 10, order = "desc" }: ListParams = {}): string {
  const qs = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    order,
  });
  return `?${qs.toString()}`;
}

export const api = {
  actionItems: {
    list: async (params?: ListParams): Promise<ActionItem[]> => {
      const data = await request<unknown>(`/action-items/${listQuery(params)}`);
      return parseList(ActionItemSchema, data);
    },

    search: async (query: string, params?: ListParams): Promise<ActionItem[]> => {
      const qs = new URLSearchParams({
        query,
        page: String(params?.page ?? 1),
        limit: String(params?.limit ?? 10),
        order: params?.order ?? "desc",
      });
      const data = await request<unknown>(`/action-items/search/?${qs.toString()}`);
      return parseList(ActionItemSchema, data);
    },

    byClient: async (clientId: number, params?: ListParams): Promise<ActionItem[]> => {
      const data = await request<unknown>(
        `/action-items/client/${clientId}${listQuery(params)}`,
      );
      return parseList(ActionItemSchema, data);
    },

    get: async (id: number): Promise<ActionItem | null> => {
      const data = await request<unknown>(`/action-items/id/${id}`);
      const r = ActionItemSchema.safeParse(data);
      return r.success ? r.data : null;
    },

    create: async (input: CreateActionItemInput): Promise<unknown> => {
      return request(`/action-items/new/`, { method: "POST", body: input });
    },

    update: async (id: number, input: UpdateActionItemInput): Promise<unknown> => {
      return request(`/action-items/update/${id}`, { method: "POST", body: input });
    },

    remove: async (id: number): Promise<unknown> => {
      return request(`/action-items/delete/${id}`, { method: "GET" });
    },
  },

  comments: {
    list: async (actionItemId: number): Promise<Comment[]> => {
      const data = await request<unknown>(`/comments/loop/${actionItemId}`);
      const arr = Array.isArray(data) ? data : (data as { data?: unknown[] })?.data ?? [];
      return parseList(CommentSchema, arr);
    },

    thread: async (parentId: number): Promise<Comment[]> => {
      const data = await request<unknown>(`/comments/thread/${parentId}`);
      const arr = Array.isArray(data) ? data : (data as { data?: unknown[] })?.data ?? [];
      return parseList(CommentSchema, arr);
    },

    post: async (input: PostCommentInput): Promise<unknown> => {
      return request(`/comments/post/`, { method: "POST", body: input });
    },

    postSub: async (input: PostSubCommentInput): Promise<unknown> => {
      return request(`/comments/post-sub/`, { method: "POST", body: input });
    },
  },

  clients: {
    all: async (): Promise<Client[]> => {
      const data = await request<unknown>(`/clients/all/`);
      const arr = Array.isArray(data) ? data : (data as { data?: unknown[] })?.data ?? [];
      return parseList(ClientSchema, arr);
    },
  },
};
