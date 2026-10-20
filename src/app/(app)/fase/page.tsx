import { Suspense } from "react";
import { PhaseView } from "./PhaseView";

export default function FasePage() {
  return (
    <Suspense>
      <PhaseView />
    </Suspense>
  );
}
