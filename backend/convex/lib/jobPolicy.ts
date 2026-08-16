export type JobStatus =
  | "draft" | "scheduled" | "assigned" | "in_progress" | "submitted"
  | "under_review" | "approved" | "delivered" | "accepted" | "closed"
  | "rejected" | "cancelled";

const transitions: Record<string, readonly JobStatus[]> = {
  assign: ["scheduled", "assigned", "rejected"],
  reschedule: ["scheduled", "assigned", "rejected"],
  cancel: ["scheduled", "assigned", "rejected"],
  start: ["assigned"],
  submit: ["assigned", "in_progress", "rejected"],
  reject: ["under_review"],
  approve: ["under_review"],
  close: ["approved", "delivered", "accepted"],
};

export function canTransition(action: keyof typeof transitions, status: JobStatus) {
  return transitions[action].includes(status);
}

export function validSchedule(start: number, end: number) {
  return Number.isFinite(start) && Number.isFinite(end) && end > start;
}
