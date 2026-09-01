/**
 * Realtime subscriptions for e-commerce storefront (Q13).
 *
 * - Supabase Realtime postgres_changes for orders / shipments / helpdesk_tickets
 * - 30s polling fallback when websocket unavailable (mobile / background tab)
 * - Email webhook is server-side placeholder: POST /api/webhooks/email (not in this file)
 *
 * Rules:
 * - Only public API via HTTP, no direct DB writes.
 * - Realtime is read-only subscription; fallback uses EcommerceClient polling.
 * - Tenant isolation via tenantSlug + channel filter; RLS still enforced server-side.
 */

import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Types — mirror public API shapes (kept local to avoid BuildingBlocks import)
// ---------------------------------------------------------------------------

export interface RealtimeOrderEvent {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new: {
    id: string;
    tenant_id: string;
    customer_id: string | null;
    order_number: string;
    status: string;
    payment_status: string;
    total_amount: number;
    updated_at: string;
  };
  old: Record<string, unknown> | null;
}

export interface RealtimeShipmentEvent {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new: {
    id: string;
    tenant_id: string;
    order_id: string | null;
    shipment_number: string;
    status: string;
    tracking_number: string | null;
    updated_at: string;
  };
  old: Record<string, unknown> | null;
}

export interface RealtimeTicketEvent {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new: {
    id: string;
    tenant_id: string;
    customer_id: string;
    ticket_number: string;
    status: string;
    priority: string;
    updated_at: string;
  };
  old: Record<string, unknown> | null;
}

export interface RealtimeCallbacks {
  onError?: (error: Error) => void;
  onOrderChange?: (event: RealtimeOrderEvent) => void;
  onShipmentChange?: (event: RealtimeShipmentEvent) => void;
  onTicketChange?: (event: RealtimeTicketEvent) => void;
}

export interface PollingOptions {
  accessToken?: string;
  intervalMs?: number;
  onError?: (error: Error) => void;
  onOrders?: (orders: unknown) => void;
  tenantSlug: string;
}

// ---------------------------------------------------------------------------
// Supabase Realtime: postgres_changes subscriptions
// Docs: https://supabase.com/docs/guides/realtime/postgres-changes
// Channel naming: `ecommerce:${tenantSlug}:customer:${customerId}` keeps
// per-tenant + per-customer isolation. RLS still enforces tenant_id filter
// server-side; channel filter is defense-in-depth only.
// ---------------------------------------------------------------------------

/**
 * Create and subscribe to realtime channels for orders / shipments / tickets.
 *
 * Usage (Client Component):
 * ```ts
 * const supabase = createClient();
 * const { channel, unsubscribe } = subscribeEcommerceRealtime(
 *   supabase, tenantSlug, customerId, { onOrderChange: refetchOrders }
 * );
 * // cleanup
 * return () => unsubscribe();
 * ```
 */
export function subscribeEcommerceRealtime(
  supabase: SupabaseClient,
  tenantSlug: string,
  customerId: string | null,
  callbacks: RealtimeCallbacks
): { channel: RealtimeChannel; unsubscribe: () => void } {
  if (!tenantSlug) {
    throw new Error("tenantSlug is required for realtime subscription");
  }

  // Sanitize for channel name (supabase channel names must be simple)
  const safeSlug = tenantSlug.replace(/[^a-z0-9-]/gi, "-");
  const safeCustomer = customerId ?? "guest";
  const channelName = `ecommerce:${safeSlug}:${safeCustomer}`;

  const channel = supabase.channel(channelName, {
    config: {
      broadcast: { self: false },
      presence: { enabled: false },
    },
  });

  // 1) orders — filter by customer_id when known, otherwise tenant channel (fallback polling covers guest)
  channel.on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "orders",
      // Supabase Realtime supports filter like `customer_id=eq.<uuid>`; we add when customerId present
      ...(customerId ? { filter: `customer_id=eq.${customerId}` } : {}),
    },
    (payload) => {
      try {
        const evt: RealtimeOrderEvent = {
          eventType: payload.eventType as RealtimeOrderEvent["eventType"],
          new: payload.new as RealtimeOrderEvent["new"],
          old: payload.old as RealtimeOrderEvent["old"],
        };
        callbacks.onOrderChange?.(evt);
      } catch (error) {
        callbacks.onError?.(
          error instanceof Error ? error : new Error(String(error))
        );
      }
    }
  );

  // 2) shipments — bound to customer_id (shipments.customer_id)
  channel.on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "shipments",
      ...(customerId ? { filter: `customer_id=eq.${customerId}` } : {}),
    },
    (payload) => {
      try {
        const evt: RealtimeShipmentEvent = {
          eventType: payload.eventType as RealtimeShipmentEvent["eventType"],
          new: payload.new as RealtimeShipmentEvent["new"],
          old: payload.old as RealtimeShipmentEvent["old"],
        };
        callbacks.onShipmentChange?.(evt);
      } catch (error) {
        callbacks.onError?.(
          error instanceof Error ? error : new Error(String(error))
        );
      }
    }
  );

  // 3) helpdesk_tickets — support threads (CRM agent replies appear as ticket row updates + chat_messages insert)
  channel.on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "helpdesk_tickets",
      ...(customerId ? { filter: `customer_id=eq.${customerId}` } : {}),
    },
    (payload) => {
      try {
        const evt: RealtimeTicketEvent = {
          eventType: payload.eventType as RealtimeTicketEvent["eventType"],
          new: payload.new as RealtimeTicketEvent["new"],
          old: payload.old as RealtimeTicketEvent["old"],
        };
        callbacks.onTicketChange?.(evt);
      } catch (error) {
        callbacks.onError?.(
          error instanceof Error ? error : new Error(String(error))
        );
      }
    }
  );

  // Subscribe — caller should handle status
  channel.subscribe((status, err) => {
    if (err) {
      callbacks.onError?.(err instanceof Error ? err : new Error(String(err)));
    }
    // Supabase statuses: SUBSCRIBED | TIMED_OUT | CLOSED | CHANNEL_ERROR
    if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
      callbacks.onError?.(new Error(`Realtime channel ${status}`));
    }
  });

  const unsubscribe = () => {
    try {
      supabase.removeChannel(channel);
    } catch {
      // ignore cleanup error
    }
  };

  return { channel, unsubscribe };
}

/**
 * Convenience: subscribe only to ticket message inserts (CRM replies).
 * Helpdesk ticket replies are stored as chat_messages with channel_id = ticket.channel_id
 * and SenderType = User (agent). Listening to chat_messages gives real-time replies.
 */
export function subscribeTicketMessages(
  supabase: SupabaseClient,
  tenantSlug: string,
  channelId: string,
  onMessage: (message: {
    id: string;
    sender_name: string;
    sender_type: string;
    content: string;
    created_at: string;
  }) => void,
  onError?: (error: Error) => void
): { channel: RealtimeChannel; unsubscribe: () => void } {
  const safeSlug = tenantSlug.replace(/[^a-z0-9-]/gi, "-");
  const channel = supabase.channel(`ticket-messages:${safeSlug}:${channelId}`);

  channel.on(
    "postgres_changes",
    {
      event: "INSERT",
      filter: `channel_id=eq.${channelId}`,
      schema: "public",
      table: "chat_messages",
    },
    (payload) => {
      try {
        const row = payload.new as {
          id: string;
          sender_name: string;
          sender_type: string;
          content: string;
          created_at: string;
        };
        onMessage(row);
      } catch (error) {
        onError?.(error instanceof Error ? error : new Error(String(error)));
      }
    }
  );

  channel.subscribe((status, err) => {
    if (err) {
      onError?.(err instanceof Error ? err : new Error(String(err)));
    }
    if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
      onError?.(new Error(`Ticket message channel ${status}`));
    }
  });

  return {
    channel,
    unsubscribe: () => {
      try {
        supabase.removeChannel(channel);
      } catch {
        // ignore
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Polling fallback — 30s interval, hits GET /api/public/orders/mine?poll=true
// ---------------------------------------------------------------------------

let pollingTimer: ReturnType<typeof setInterval> | null = null;

/**
 * 30s polling fallback for when Realtime websocket is unavailable.
 *
 * Calls GET /api/public/orders/mine?poll=true&tenantSlug=... with tenant + auth.
 * The `poll=true` query tells the API to set Cache-Control: no-store and return
 * fresh data (branch already handles it as alias to mine; `poll` is informational).
 *
 * Usage:
 * ```ts
 * const stop = startOrdersPolling({ tenantSlug, accessToken, onOrders: setOrders });
 * // later
 * stop();
 * ```
 */
export function startOrdersPolling(options: PollingOptions): () => void {
  const intervalMs = options.intervalMs ?? 30_000;

  // Import lazily to avoid circular dep with ecommerce-client.ts
  const doPoll = async () => {
    try {
      const { EcommerceClient } = await import("./ecommerce-client");
      // EcommerceClient.getMyOrders already does tenantSlug + HMAC + apikey + 429 handling.
      // We pass poll=true as query hint — API maps it to mine with no-cache.
      const result = await EcommerceClient.request<unknown>(
        `/api/public/orders/mine?tenantSlug=${encodeURIComponent(options.tenantSlug)}&poll=true`,
        options.tenantSlug,
        {
          headers: options.accessToken
            ? { Authorization: `Bearer ${options.accessToken}` }
            : {},
          method: "GET",
        }
      );
      if (result.success && result.data) {
        options.onOrders?.(result.data);
      } else if (!result.success && result.errorCode !== "RATE_LIMITED") {
        // Rate limit is expected — don't surface as error
        options.onError?.(new Error(result.message ?? "Polling failed"));
      }
    } catch (error) {
      options.onError?.(
        error instanceof Error ? error : new Error(String(error))
      );
    }
  };

  // Immediate first poll after 2s (allow realtime to connect first)
  const initialTimeout = setTimeout(() => {
    void doPoll();
  }, 2000);

  pollingTimer = setInterval(() => {
    void doPoll();
  }, intervalMs);

  return () => {
    clearTimeout(initialTimeout);
    if (pollingTimer) {
      clearInterval(pollingTimer);
      pollingTimer = null;
    }
  };
}

/**
 * Polling for tickets/mine — same 30s interval, separate channel.
 */
export function startTicketsPolling(
  options: PollingOptions & { onTickets?: (tickets: unknown) => void }
): () => void {
  const intervalMs = options.intervalMs ?? 30_000;

  const doPoll = async () => {
    try {
      const { EcommerceClient } = await import("./ecommerce-client");
      const result = await EcommerceClient.request<unknown>(
        `/api/public/tickets/mine?tenantSlug=${encodeURIComponent(options.tenantSlug)}&poll=true`,
        options.tenantSlug,
        {
          headers: options.accessToken
            ? { Authorization: `Bearer ${options.accessToken}` }
            : {},
          method: "GET",
        }
      );
      if (result.success && result.data) {
        options.onTickets?.(result.data);
      }
    } catch (error) {
      options.onError?.(
        error instanceof Error ? error : new Error(String(error))
      );
    }
  };

  const initialTimeout = setTimeout(() => {
    void doPoll();
  }, 2000);

  const timer = setInterval(() => {
    void doPoll();
  }, intervalMs);

  return () => {
    clearTimeout(initialTimeout);
    clearInterval(timer);
  };
}

// ---------------------------------------------------------------------------
// Email webhook placeholder route — server should expose
// POST /api/webhooks/email → CRM helpdesk_tickets source=Email
// This file only documents the contract; implementation lives in
// apps/ecommerce/app/api/webhooks/email/route.ts (create when email provider chosen).
// ---------------------------------------------------------------------------

export const EMAIL_WEBHOOK_CONTRACT = {
  body: {
    from: "string (customer email)",
    subject: "string",
    text: "string (email body -> ticket description)",
    to_tenantSlug:
      "string (parsed from inbound address, e.g. support+<tenantSlug>@domain)",
  },
  description:
    "Inbound email webhook (Resend/Postmark) -> creates helpdesk_tickets source=Email via POST /api/public/tickets",
  headers: ["X-Webhook-Signature (HMAC)", "X-Tenant-Slug"],
  route: "POST /api/webhooks/email",
} as const;
