import Link from "next/link";

export default function RootPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-8">
      <div className="max-w-lg rounded-2xl border bg-card p-8 shadow-sm">
        <h1 className="font-bold text-2xl">E-Commerce Storefront</h1>
        <p className="mt-2 text-muted-foreground text-sm">
          Mağazayı görüntülemek için bir tenant seçin. Örnek tenant:
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <Link
            className="rounded-xl bg-primary px-4 py-3 text-center font-semibold text-primary-foreground hover:bg-primary/90"
            href="/admin-a00000/shop"
          >
            → admin-a00000 / Mağazaya Git
          </Link>
          <p className="text-center text-muted-foreground text-xs">
            URL: <code>http://localhost:3001/admin-a00000/shop</code>
          </p>
        </div>
        <p className="mt-6 text-muted-foreground text-xs">
          Diğer tenant’lar için: <code>/[tenantSlug]/shop</code> — örn.{" "}
          <code>/acme/shop</code>, <code>/demo/shop</code>
        </p>
        <div className="mt-4 rounded-lg bg-muted p-3 text-xs">
          <div className="font-semibold">Hızlı linkler</div>
          <ul className="mt-1 list-disc pl-4">
            <li>
              <Link className="underline" href="/admin-a00000/shop">
                Katalog
              </Link>
            </li>
            <li>
              <Link className="underline" href="/admin-a00000/cart">
                Sepet
              </Link>
            </li>
            <li>
              <Link className="underline" href="/admin-a00000/my-orders">
                Hesabım
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
