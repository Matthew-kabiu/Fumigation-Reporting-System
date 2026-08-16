import { PortalReportDetail } from "@/components/portal/portal-report-detail";

export default async function PortalReportPage({ params }: { params: Promise<{ reportId: string }> }) {
  const { reportId } = await params;
  return <PortalReportDetail reportId={reportId} />;
}
