import { redirect } from "next/navigation";
import { getCurrentSession } from "@/modules/access/server/session-cookie";
import { LandingPage } from "@/app/_landing/landing-page";
import { getPlanConfigsAction } from "@/modules/billing/server/billing-actions";

export default async function HomePage() {
  const session = await getCurrentSession();

  if (session) {
    redirect("/dashboard");
  }

  const plans = await getPlanConfigsAction();

  return <LandingPage plans={plans} />;
}
