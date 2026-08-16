import { StaffReportDetail } from "@/components/reports/staff-report-detail";

export default async function ReportDetailPage({ params }: { params: Promise<{ reportId: string }> }) {
  const { reportId } = await params;
  return <StaffReportDetail reportId={reportId} />;
}
