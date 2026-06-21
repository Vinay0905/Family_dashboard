import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

type AppShellProps = {
  children: React.ReactNode;
  familyName: string;
  displayName: string;
  inviteCode?: string;
};

export function AppShell({ children, familyName, displayName, inviteCode }: AppShellProps) {
  return (
    <div className="min-h-screen bg-background text-on-background">
      <Sidebar familyName={familyName} displayName={displayName} inviteCode={inviteCode} />
      <div className="md:ml-64 flex flex-col min-h-screen">
        <TopBar familyName={familyName} />
        <main className="flex-1 px-4 md:px-16 py-8 pb-12 md:pb-8 relative">
          {children}
        </main>
      </div>
    </div>
  );
}