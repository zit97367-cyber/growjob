import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getAuthSession } from "@/lib/auth";
import { logEvent } from "@/lib/events";
import { prisma } from "@/lib/prisma";

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-01-28.clover",
    })
  : null;

export async function POST(req: NextRequest) {
  const session = await getAuthSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (process.env.PREMIUM_FEATURE_FLAG === "true") {
    await prisma.user.update({ where: { id: session.user.id }, data: { isPremium: true } });
    await logEvent({ eventType: "premium_upgrade", userId: session.user.id, metadata: { mode: "flag" } });
    return NextResponse.json({ ok: true, upgraded: true });
  }

  if (!stripe) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 400 });
  }

  const origin = req.headers.get("origin") ?? "http://localhost:3000";
  const checkout = await stripe.checkout.sessions.create({
    mode: "payment",
    success_url: `${origin}/?upgrade=success`,
    cancel_url: `${origin}/?upgrade=cancelled`,
    client_reference_id: session.user.id,
    metadata: {
      userId: session.user.id,
    },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: 1200,
          product_data: {
            name: "GrowJob Premium Monthly",
          },
          recurring: {
            interval: "month",
          },
        },
      },
    ],
    customer_email: session.user.email ?? undefined,
  });

  return NextResponse.json({ url: checkout.url });
}
