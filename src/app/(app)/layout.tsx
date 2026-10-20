import { BottomNav } from "@/components/BottomNav";
import { DialogHost } from "@/components/Dialog";
import { SyncProvider } from "@/components/SyncProvider";
import styles from "./layout.module.css";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <main className={styles.main}>
        <SyncProvider>{children}</SyncProvider>
      </main>
      <BottomNav />
      <DialogHost />
    </>
  );
}
