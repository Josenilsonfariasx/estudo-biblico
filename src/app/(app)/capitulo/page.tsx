import { Suspense } from "react";
import { ChapterView } from "./ChapterView";

export default function CapituloPage() {
  return (
    <Suspense>
      <ChapterView />
    </Suspense>
  );
}
