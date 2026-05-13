import { Suspense } from "react";
import { TopBar } from "./top-bar";
import { ClientsSidebar } from "./clients-sidebar";
import { MainTabs } from "./main-tabs";

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col p-4 md:p-8">
        <div className="terminal-frame flex flex-1 flex-col overflow-hidden">
          <TopBar />
          <div className="flex flex-1 overflow-hidden">
            <Suspense fallback={<aside className="w-64 shrink-0 border-r border-border bg-sidebar" />}>
              <ClientsSidebar />
            </Suspense>
            <main className="flex flex-1 flex-col overflow-y-auto">
              <div className="px-6 pt-4">
                <Suspense fallback={<div className="h-12" />}>
                  <MainTabs />
                </Suspense>
              </div>
              <div className="flex-1 px-6 py-6">{children}</div>
            </main>
          </div>
        </div>
      </div>
      <p className="px-6 pb-4 text-center text-[10px] tracking-wider text-muted-foreground">
        This content is generated for the SGE CRM admin. Do not enter sensitive
        information.
      </p>
    </div>
  );
}
