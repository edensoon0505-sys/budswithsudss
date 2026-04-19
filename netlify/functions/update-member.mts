import { getStore } from "@netlify/blobs";
import type { Config, Context } from "@netlify/functions";

export default async (req: Request, context: Context) => {
  const store = getStore({ name: "members", consistency: "strong" });
  const body = await req.json() as Record<string, unknown>;

  if (body.action === "delete") {
    await store.delete(String(body.id));
    return Response.json({ success: true });
  }

  if (body.action === "create") {
    const id = String(Date.now());
    const member = {
      id,
      name: String(body.name || ""),
      phone: String(body.phone || ""),
      email: String(body.email || ""),
      tier: String(body.tier || "maintain"),
      tierLabel: String(body.tierLabel || ""),
      price: Number(body.price || 0),
      startDate: String(body.startDate || new Date().toISOString().slice(0, 10)),
      source: "in-person",
      notes: String(body.notes || ""),
      status: "active",
      createdAt: new Date().toISOString(),
    };
    await store.setJSON(id, member);
    return Response.json({ success: true, member });
  }

  const existing = await store.get(String(body.id), { type: "json" }) as Record<string, unknown> | null;
  if (existing) {
    if (body.status) existing.status = body.status;
    if (body.notes !== undefined) existing.notes = String(body.notes);
    await store.setJSON(String(body.id), existing);
  }

  return Response.json({ success: true });
};

export const config: Config = {
  path: "/api/members",
  method: "POST",
};
