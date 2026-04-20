import { getStore } from "@netlify/blobs";
import type { Context } from "@netlify/functions";

interface FormPayload {
  form_name: string;
  data: Record<string, string>;
  created_at: string;
}

export default async (req: Request, context: Context) => {
  const { payload } = (await req.json()) as { payload: FormPayload };

  if (payload.form_name === "booking") {
    const store = getStore({ name: "bookings", consistency: "strong" });
    const id = String(Date.now());

    const booking = {
      id,
      name: payload.data["client-name"] || "",
      phone: payload.data["client-phone"] || "",
      date: payload.data["booking-date"] || "",
      size: payload.data["package"] || "",
      vehicleSize: payload.data["vehicle-size"] || "",
      sizeSurcharge: parseInt(payload.data["size-surcharge"] || "0", 10),
      addons: payload.data["addons"] ? payload.data["addons"].split(", ").filter(Boolean) : [],
      total: parseInt(payload.data["total"] || "0", 10),
      status: "pending",
      createdAt: payload.created_at,
    };

    await store.setJSON(id, booking);
    return new Response("OK");
  }

  if (payload.form_name === "membership") {
    const store = getStore({ name: "members", consistency: "strong" });
    const id = String(Date.now());

    const member = {
      id,
      name: payload.data["member-name"] || "",
      phone: payload.data["member-phone"] || "",
      email: payload.data["member-email"] || "",
      tier: payload.data["tier"] || "maintain",
      tierLabel: payload.data["tier-label"] || "",
      price: parseInt(payload.data["tier-price"] || "0", 10),
      startDate: payload.data["start-date"] || new Date(payload.created_at).toISOString().slice(0, 10),
      source: "online",
      notes: payload.data["notes"] || "",
      status: "pending",
      createdAt: payload.created_at,
    };

    await store.setJSON(id, member);
    return new Response("OK");
  }

  return new Response("OK");
};
