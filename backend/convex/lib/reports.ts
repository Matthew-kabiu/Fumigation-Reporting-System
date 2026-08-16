import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

export async function createReport(
  ctx: MutationCtx,
  job: Doc<"jobs">,
  submission: Doc<"fieldSubmissions">,
  approvedBy: Id<"users">,
) {
  const reports = await ctx.db.query("reports").withIndex("by_job_version", (q) => q.eq("jobId", job._id)).order("desc").take(100);
  const existing = reports.find((report) => report.fieldSubmissionId === submission._id);
  if (existing) return existing._id;

  const evidence = await ctx.db.query("evidenceFiles").withIndex("by_submissionKey", (q) => q.eq("submissionKey", submission.submissionKey)).take(20);
  const checklistLabels = new Map(job.snapshot.checklistItems.map((item) => [item.key, item.label]));
  const version = (reports[0]?.version ?? 0) + 1;

  return await ctx.db.insert("reports", {
    reportNumber: `FV-${String(job._id).slice(-8).toUpperCase()}-V${version}`,
    jobId: job._id,
    customerId: job.customerId,
    branchId: job.branchId,
    fieldSubmissionId: submission._id,
    version,
    status: "approved",
    snapshot: {
      customerName: job.snapshot.customerName,
      siteName: job.snapshot.siteName,
      siteAddress: job.snapshot.siteAddress,
      serviceType: job.serviceType,
      targetPest: job.targetPest,
      actualStart: submission.actualStart,
      actualEnd: submission.actualEnd,
      method: submission.method,
      treatedAreas: submission.treatedAreas,
      dosage: submission.dosage,
      durationMinutes: submission.durationMinutes,
      observations: submission.observations,
      checklistAnswers: submission.checklistAnswers.map((answer) => ({ ...answer, label: checklistLabels.get(answer.key) ?? answer.key })),
      evidence: evidence.filter((file) => file.jobId === job._id && file.uploadedBy === submission.submittedBy).map((file) => ({ evidenceId: file._id, kind: file.kind, storageId: file.storageId, mimeType: file.mimeType, size: file.size })),
      chemicalUsage: submission.chemicalUsage.map((usage) => ({
        productName: usage.productName,
        activeIngredient: usage.activeIngredient,
        quantity: usage.quantity,
        unit: usage.unit,
        batchNumber: usage.batchNumber,
      })),
      technicianSignerName: submission.technicianSignerName,
      customerSignerName: submission.customerSignerName,
      technicianSignaturePresent: Boolean(submission.technicianSignature),
      customerSignaturePresent: Boolean(submission.customerSignature),
      representativeAbsentReason: submission.representativeAbsentReason,
      location: submission.location,
      submittedAt: submission.submittedAt,
    },
    approvedBy,
    approvedAt: Date.now(),
  });
}
