import { redirect } from "next/navigation";

export default async function AssemblyPage() {
  redirect("/fichas/nova?scope=finais");
}
