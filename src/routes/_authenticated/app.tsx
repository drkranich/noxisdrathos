import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { SectionBoundary } from "@/components/SectionBoundary";

export const Route = createFileRoute("/_authenticated/app")({
  component: AppLayout,
});

function AppLayout() {
  return (
    <div className="min-h-screen flex">
      <AppSidebar />
      <main className="flex-1 min-w-0 overflow-x-hidden">
        <SectionBoundary label="app-content">
          <Outlet />
        </SectionBoundary>
      </main>
    </div>
  );
}
