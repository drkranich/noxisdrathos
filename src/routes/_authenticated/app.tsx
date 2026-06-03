import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { MobileNav } from "@/components/dashboard/MobileNav";
import { CommandPalette } from "@/components/CommandPalette";
import { SectionBoundary } from "@/components/SectionBoundary";

export const Route = createFileRoute("/_authenticated/app")({
  component: AppLayout,
});

function AppLayout() {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Sidebar desktop */}
      <AppSidebar />

      {/* Navegação mobile (top bar + drawer + bottom bar) */}
      <MobileNav />

      {/* Conteúdo principal */}
      <main className="flex-1 min-w-0 overflow-x-hidden">
        <SectionBoundary label="app-content">
          <Outlet />
        </SectionBoundary>
      </main>

      {/* Command Palette global (⌘K) */}
      <CommandPalette />
    </div>
  );
}
