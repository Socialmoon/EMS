import { redirect } from "next/navigation";

// Root "/" → redirect to dashboard; middleware bounces unauthenticated users to /login
export default function RootPage() {
  redirect("/dashboard");
}
