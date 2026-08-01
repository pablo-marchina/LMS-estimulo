import styles from "./layout.module.css";

export default function ActivityLayout({ children }: { children: React.ReactNode }) {
  return <div className={styles.activityLayout}>{children}</div>;
}
