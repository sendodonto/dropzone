import "server-only";
// Provider-agnostic payment layer. The rest of the app only talks to this
// interface, so swapping providers (Mercado Pago, Stripe, Pagar.me…) means
// adding one adapter file.
//
// REAL PAYMENTS ARE OFF. No adapter is registered. Enabling entry fees or
// paid plans requires: legal validation of the prize model, a compatible
// provider contract, an adapter here, a webhook route that calls
// record_payment_status(..., 'provider_webhook') with the service role, and
// an admin switching `payments_enabled` in /admin/configuracoes.
// Card data must never touch this server: use provider-hosted checkout.

import type { PaymentStatus } from "@/lib/types";

export interface CheckoutRequest {
  paymentId: string; // row in public.payments, created as 'pending' before redirecting
  amountCents: number;
  description: string;
  payerEmail: string;
  returnUrl: string;
}

export interface PaymentProvider {
  id: string;
  createCheckout(req: CheckoutRequest): Promise<{ checkoutUrl: string; providerRef: string }>;
  /** Verifies a webhook signature and maps it to our status vocabulary. */
  parseWebhook(rawBody: string, headers: Headers): Promise<{ providerRef: string; status: PaymentStatus } | null>;
  refund(providerRef: string, amountCents: number): Promise<{ providerRef: string }>;
}

const providers: Record<string, PaymentProvider> = {};

export function getPaymentProvider(): PaymentProvider | null {
  const id = process.env.PAYMENT_PROVIDER;
  return (id && providers[id]) || null;
}

export class PaymentsDisabledError extends Error {
  constructor() {
    super("Pagamentos ainda não estão habilitados nesta plataforma.");
  }
}
