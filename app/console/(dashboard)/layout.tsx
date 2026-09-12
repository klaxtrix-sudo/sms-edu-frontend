import { redirect } from "next/navigation";
import { verifyConsoleSessionServer, getConsoleTokenFromCookie } from "@/app/actions/console-actions";
import { ConsoleAuthProvider } from "@/components/console/console-auth-provider";
import { ConsoleShell } from "@/components/console/console-shell";

export default async function ConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side auth check: verify the httpOnly cookie token
  const user = await verifyConsoleSessionServer();
  if (!user) {
    redirect("/console");
  }

  const token = await getConsoleTokenFromCookie();
  if (!token) {
    redirect("/console");
  }

  return (
    <ConsoleAuthProvider token={token} user={user}>
      <ConsoleShell>
        {children}
      </ConsoleShell>
    </ConsoleAuthProvider>
  );
}
