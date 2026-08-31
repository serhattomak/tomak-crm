import { SupportClient } from "./support-client";

interface SupportPageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function SupportPage({ params }: SupportPageProps) {
  const { tenantSlug } = await params;
  return <SupportClient tenantSlug={tenantSlug} />;
}
