import { AddressesClient } from "./addresses-client";

interface AddressesPageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function AddressesPage({ params }: AddressesPageProps) {
  const { tenantSlug } = await params;
  return <AddressesClient tenantSlug={tenantSlug} />;
}
