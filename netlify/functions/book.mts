import { getStore } from "@netlify/blobs";
import type { Config, Context } from "@netlify/functions";

interface BookingData {
  "client-name": string;
  "client-phone": string;
  "booking-date": string;
  "vehicle-size": string;
  package: string;
  addons: string;
  notes: string;
  total: string;
}

function formatE164(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("1") && digits.length === 11) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  return `+${digits}`;
}

async function sendSMS(to: string, body: string): Promise<boolean> {
  const accountSid = Netlify.env.get("TWILIO_ACCOUNT_SID");
  const authToken = Netlify.env.get("TWILIO_AUTH_TOKEN");
  const fromNumber = Netlify.env.get("TWILIO_FROM_NUMBER");

  if (!accountSid || !authToken || !fromNumber) {
    console.error(
      "Twilio credentials not configured — SMS skipped. " +
      "Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER in Netlify environment variables."
    );
    return false;
  }

  const toE164 = formatE164(to);
  const fromE164 = formatE164(fromNumber);

  console.log(`Sending SMS to ${toE164} from ${fromE164}`);

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const params = new URLSearchParams({ To: toE164, From: fromE164, Body: body });

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: "Basic " + btoa(`${accountSid}:${authToken}`),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    console.error(`Twilio SMS failed (${res.status}): ${errorBody}`);
    return false;
  }

  console.log("SMS sent successfully");
  return true;
}

export default async (req: Request, context: Context) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const data: BookingData = await req.json();

  const store = getStore({ name: "bookings", consistency: "strong" });
  const id = String(Date.now());

  const booking = {
    id,
    name: data["client-name"] || "",
    phone: data["client-phone"] || "",
    date: data["booking-date"] || "",
    vehicleSize: data["vehicle-size"] || "",
    size: data.package || "",
    addons: data.addons ? data.addons.split(", ").filter(Boolean) : [],
    notes: data.notes || "",
    total: data.total || "$0",
    status: "pending",
    createdAt: new Date().toISOString(),
  };

  await store.setJSON(id, booking);

  const ownerPhone = Netlify.env.get("OWNER_PHONE") || "+17789037078";
  const smsBody =
    `New Raven Details Booking!\n` +
    `Name: ${booking.name}\n` +
    `Phone: ${booking.phone}\n` +
    `Date: ${booking.date}\n` +
    `Vehicle: ${booking.vehicleSize}\n` +
    `Package: ${booking.size}\n` +
    (booking.addons.length ? `Add-ons: ${booking.addons.join(", ")}\n` : "") +
    (booking.notes ? `Notes: ${booking.notes}\n` : "") +
    `Total: ${booking.total}`;

  const smsSent = await sendSMS(ownerPhone, smsBody);

  return Response.json({ success: true, id: booking.id, smsSent });
};

export const config: Config = {
  path: "/.netlify/functions/book",
};
