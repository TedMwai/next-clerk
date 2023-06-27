import { db } from "@/lib/db";
import { IncomingHttpHeaders } from "http";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { Webhook, WebhookRequiredHeaders } from "svix";

const webhookSecret = process.env.WEBHOOK_SECRET || "";

export async function POST(request: Request) {
  const payload = await request.json();
  const headersList = headers();
  const heads = {
    "svix-id": headersList.get("svix-id"),
    "svix-timestamp": headersList.get("svix-timestamp"),
    "svix-signature": headersList.get("svix-signature"),
  };
  const wh = new Webhook(webhookSecret);
  let evt: Event | null = null;

  try {
    evt = wh.verify(
      JSON.stringify(payload),
      heads as IncomingHttpHeaders & WebhookRequiredHeaders
    ) as Event;
  } catch (err) {
    console.error((err as Error).message);
    return NextResponse.json({}, { status: 400 });
  }
  const eventType: EventType = evt.type;
  if (eventType === "user.created") {
    const { id, first_name, last_name, ...attributes } = evt.data;
    const email = attributes.email_addresses[0].email_address;
    const name = `${first_name} ${last_name}`;

    try {
      await db.user.create({
        data: {
          id,
          email,
          name,
        },
      });
      return NextResponse.json({}, { status: 200 });
    } catch (err) {
      console.error((err as Error).message);
      return NextResponse.json({}, { status: 400 });
    }
  }
}

type EventType = "user.created" | "user.updated" | "*";

type Event = {
  data: any;
  object: "event";
  type: EventType;
};
