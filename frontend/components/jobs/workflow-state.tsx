import { AlertCircle, Inbox, LoaderCircle } from "lucide-react";
import styles from "./workflows.module.css";

export function WorkflowState({ kind, title, detail }: { kind: "loading" | "empty" | "error"; title: string; detail: string }) {
  const Icon = kind === "loading" ? LoaderCircle : kind === "error" ? AlertCircle : Inbox;
  return <div className={`${styles.state} ${kind === "error" ? styles.error : ""}`} role={kind === "error" ? "alert" : "status"}><Icon aria-hidden="true" className={kind === "loading" ? "spin" : ""} size={25} /><strong>{title}</strong><span>{detail}</span></div>;
}
