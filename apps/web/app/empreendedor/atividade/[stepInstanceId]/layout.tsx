import { ActivityCompactWorkspace } from "@/components/activity-compact-workspace";
import styles from "./layout.module.css";

export default function ActivityLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.activityLayout} data-activity-workspace data-active-section="conteudo">
      <ActivityCompactWorkspace />
      {children}
    </div>
  );
}
