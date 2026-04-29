import { redirect } from "next/navigation";
import { getCurrentSession } from "@/modules/access/server/session-cookie";

export default async function HomePage() {
  const session = await getCurrentSession();

  redirect(session ? "/dashboard" : "/login");
}
