import Link from "next/link";

interface AccountAddressesPageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function AccountAddressesPage({
  params,
}: AccountAddressesPageProps) {
  const { tenantSlug } = await params;
  return (
    <div className="space-y-4 p-4">
      <p className="text-xs text-zinc-500">
        Alias: <code>/account/addresses</code> →{" "}
        <code>/my-orders/addresses</code>
      </p>
      <Link
        className="inline-flex rounded-xl bg-violet-600 px-4 py-2 font-semibold text-white text-xs"
        href={`/${tenantSlug}/my-orders/addresses`}
      >
        Adreslerime git
      </Link>
    </div>
  );
}
