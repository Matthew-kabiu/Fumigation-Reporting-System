import { FieldJobForm } from "@/components/field/field-job-form";

export default async function FieldJobPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  return <FieldJobForm jobId={jobId} />;
}
