import { Suspense } from "react";
import { ReviewView } from "./ReviewView";

export default function RevisaoPage() {
  return (
    <Suspense>
      <ReviewView />
    </Suspense>
  );
}
