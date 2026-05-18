import { createFileRoute } from "@tanstack/react-router";
import { PublishingStudio } from "@/components/admin/PublishingStudio";

export const Route = createFileRoute("/_authenticated/app/admin/content/$id")({
  head: () => ({ meta: [{ title: "Editor — CMS" }, { name: "robots", content: "noindex" }] }),
  component: ContentEditorRoute,
});

function ContentEditorRoute() {
  const { id } = Route.useParams();
  return <PublishingStudio contentId={id} />;
}
