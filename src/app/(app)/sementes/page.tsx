import { Suspense } from "react";
import { SeedsView } from "./SeedsView";

export default function SementesPage() {
  return (
    <Suspense>
      <SeedsView />
    </Suspense>
  );
}
