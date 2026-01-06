import { redirect } from "next/navigation";

export default function StoryIndexPage() {
    redirect("/story/feed");
}
