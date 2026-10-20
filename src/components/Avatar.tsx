import { UserRound } from "lucide-react";
import styles from "./Avatar.module.css";

export function Avatar({ photo, size = 44 }: { photo: string | null; size?: number }) {
  return (
    <span className={styles.avatar} style={{ width: size, height: size }}>
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo} alt="Foto de perfil" />
      ) : (
        <UserRound size={size / 2} />
      )}
    </span>
  );
}
