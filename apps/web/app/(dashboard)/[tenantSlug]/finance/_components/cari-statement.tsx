/* Cari hesap ekstresi — drawer önizlemesi ve print rotası AYNI gövdeyi render eder.
   Print deseni: ayrı rota (docs/crm-ui-roadmap.md #21). `@page` globalden gelir (A4/12mm);
   buraya kopyalanmaz. */
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import type { CariAccountDto, CariTransactionDto } from "@/lib/api-client";

interface StatementTableBodyProps {
  isLoading: boolean;
  statementTx: CariTransactionDto[];
}

function StatementTableBody({
  isLoading,
  statementTx,
}: StatementTableBodyProps) {
  if (isLoading) {
    return (
      <TableRow>
        <TableCell
          className="py-8 text-center text-muted-foreground"
          colSpan={5}
        >
          Ekstre yükleniyor...
        </TableCell>
      </TableRow>
    );
  }

  if (statementTx.length === 0) {
    return (
      <TableRow>
        <TableCell
          className="py-8 text-center text-muted-foreground"
          colSpan={5}
        >
          Bu cari hesaba ait hareket bulunamadı.
        </TableCell>
      </TableRow>
    );
  }

  return (
    <>
      {statementTx.map((tx) => (
        <TableRow key={tx.id}>
          <TableCell className="py-2 font-mono text-muted-foreground">
            {new Date(tx.transactionDate).toLocaleDateString("tr-TR")}
          </TableCell>
          <TableCell className="py-2">
            <div className="font-medium text-zinc-800 dark:text-zinc-200">
              {tx.description}
            </div>
            {tx.documentNumber ? (
              <div className="font-mono text-3xs text-muted-foreground">
                {tx.documentNumber}
              </div>
            ) : null}
          </TableCell>
          <TableCell className="py-2 text-right font-mono text-zinc-700 dark:text-zinc-300">
            {tx.debit > 0
              ? tx.debit.toLocaleString("tr-TR", {
                  minimumFractionDigits: 2,
                })
              : "—"}
          </TableCell>
          <TableCell className="py-2 text-right font-mono text-zinc-700 dark:text-zinc-300">
            {tx.credit > 0
              ? tx.credit.toLocaleString("tr-TR", {
                  minimumFractionDigits: 2,
                })
              : "—"}
          </TableCell>
          <TableCell className="py-2 text-right font-bold font-mono text-zinc-900 dark:text-zinc-100">
            {tx.balanceAfter.toLocaleString("tr-TR", {
              minimumFractionDigits: 2,
            })}
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

export function CariStatement({
  cari,
  statementTx,
  isLoading,
}: {
  cari: CariAccountDto;
  statementTx: CariTransactionDto[];
  isLoading: boolean;
}) {
  return (
    <div className="space-y-6">
      {/* Account Overview Header */}
      <div className="flex items-start justify-between border-border border-b pb-4">
        <div>
          <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-100">
            {cari?.title}
          </h3>
          <div className="font-mono text-xs text-muted-foreground">
            Cari Kodu: {cari?.code} • VKN:{" "}
            {cari?.taxNumber || "—"}
          </div>
        </div>
        <div className="text-right">
          <span className="block font-medium text-2xs text-muted-foreground uppercase tracking-wider">
            Güncel Bakiye
          </span>
          <span className="font-bold font-mono text-lg text-blue-600 dark:text-blue-400">
            {cari?.balance.toLocaleString("tr-TR", {
              minimumFractionDigits: 2,
            })}{" "}
            {cari?.currency}
          </span>
        </div>
      </div>

      {/* Transactions Table */}
      <div>
        <Table>
          <TableHeader>
            <TableRow className="border-border font-semibold text-muted-foreground">
              <TableHead className="py-2 h-auto">Tarih</TableHead>
              <TableHead className="py-2 h-auto">
                İşlem / Evrak
              </TableHead>
              <TableHead className="py-2 text-right h-auto">
                Borç
              </TableHead>
              <TableHead className="py-2 text-right h-auto">
                Alacak
              </TableHead>
              <TableHead className="py-2 text-right h-auto">
                Bakiye
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-zinc-100 dark:divide-zinc-800/40">
            <StatementTableBody
              isLoading={isLoading}
              statementTx={statementTx}
            />
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
