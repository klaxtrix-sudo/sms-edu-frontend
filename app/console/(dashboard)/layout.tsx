import { redirect } from "next/navigation";
import { verifyConsoleSessionServer, getConsoleTokenFromCookie } from "@/app/actions/console-actions";
import { ConsoleAuthProvider } from "@/components/console/console-auth-provider";
import { ConsoleSidebar } from "@/components/console/console-sidebar";

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
      <div className="flex h-screen bg-[#050505] text-slate-200 overflow-hidden font-sans selection:bg-cyan-500/30">
        {/* Mobile Sidebar Overlay/Backdrop — client-side toggle handled by sidebar */}
        <ConsoleSidebar />

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col relative overflow-hidden">
          {/* Background Ambient Glows */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-500/5 blur-[120px] -z-10 rounded-full pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-purple-500/5 blur-[100px] -z-10 rounded-full pointer-events-none" />

          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8">
            {children}
          </div>
        </main>
      </div>
    </ConsoleAuthProvider>
  );
}
