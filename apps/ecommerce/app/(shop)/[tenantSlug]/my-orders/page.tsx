import { MyOrdersClient } from "./my-orders-client";

interface MyOrdersPageProps {
  params: Promise<{ tenantSlug: string }>;
}

export const revalidate = 0;

export default async function MyOrdersPage({ params }: MyOrdersPageProps) {
  const { tenantSlug } = await params;
  return <MyOrdersClient tenantSlug={tenantSlug} />;
}
