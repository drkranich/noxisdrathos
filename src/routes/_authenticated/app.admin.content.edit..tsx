import { createFileRoute } from "@tanstack/react-router";
import { PublishingStudio } from "@/components/admin/PublishingStudio";

export const Route = createFileRoute("/_authenticated/app/admin/content/edit/")({
  head: () => ({ meta: [{ title: "Editar conteúdo — CMS" }, { name: "robots", content: "noindex" }] }),
  component: EditContentRoute,
});

function EditContentRoute() {
  const { id } = Route.useParams();
  return <PublishingStudio contentId={id} />;
}
