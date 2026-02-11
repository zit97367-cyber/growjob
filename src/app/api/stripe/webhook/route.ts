import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { logEvent } from "@/lib/events";
import { prisma } from "@/lib/prisma";

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-01-28.clover",
    })
  : null;

export async function POST(req: NextRequest) {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Stripe webhook not configured" }, { status: 400 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const payload = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId ?? session.client_reference_id ?? undefined;

    if (userId) {
      await prisma.user.update({ where: { id: userId }, data: { isPremium: true } });
      await logEvent({
        eventType: "premium_upgrade",
        userId,
        metadata: { mode: "webhook", checkoutSessionId: session.id },
      });
    }
  }

  return NextResponse.json({ received: true });
}
