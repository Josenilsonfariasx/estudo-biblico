import { Suspense } from "react";
import { PlanView } from "./PlanView";

export default function PlanoPage() {
  return (
    <Suspense>
      <PlanView />
    </Suspense>
  );
}
