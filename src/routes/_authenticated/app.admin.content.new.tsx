import { createFileRoute } from "@tanstack/react-router";
import { PublishingStudio } from "@/components/admin/PublishingStudio";

export const Route = createFileRoute("/_authenticated/app/admin/content/new")({
  head: () => ({ meta: [{ title: "Novo conteúdo — CMS" }, { name: "robots", content: "noindex" }] }),
  component: NewContentRoute,
});

function NewContentRoute() {
  return <PublishingStudio contentId="new" />;
}
