import { Suspense } from "react";
import { MessageView } from "./MessageView";

export default function MensagemPage() {
  return (
    <Suspense>
      <MessageView />
    </Suspense>
  );
}
