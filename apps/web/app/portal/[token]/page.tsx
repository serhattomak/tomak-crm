import PortalClient from "./PortalClient";

type PortalPageProps = {
  params: Promise<{ token: string }>;
};

export default async function PortalPage({ params }: PortalPageProps) {
  const { token } = await params;
  return <PortalClient initialToken={token} />;
}
