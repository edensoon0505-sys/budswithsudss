import { getStore } from "@netlify/blobs";
import type { Config, Context } from "@netlify/functions";

export default async (req: Request, context: Context) => {
  const store = getStore({ name: "members", consistency: "strong" });
  const { blobs } = await store.list();

  const members = [];
  for (const blob of blobs) {
    const data = await store.get(blob.key, { type: "json" });
    if (data) {
      members.push(data);
    }
  }

  return Response.json(members);
};

export const config: Config = {
  path: "/api/members",
  method: "GET",
};
