import { redirect } from "next/navigation";
import { getCurrentSession } from "@/modules/access/server/session-cookie";
import { LandingPage } from "@/app/_landing/landing-page";

export default async function HomePage() {
  const session = await getCurrentSession();

  if (session) {
    redirect("/dashboard");
  }

  return <LandingPage />;
}
