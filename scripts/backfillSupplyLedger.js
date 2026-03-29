/*
  Script to backfill member ledgers with supply request details for all requests with receiptSent = true.
  Usage: node scripts/backfillSupplyLedger.js
*/
import { SupplyRequest, FinancialLedger } from "../models/index.js";

(async () => {
  try {
    const requests = await SupplyRequest.findAll({ where: { receiptSent: true } });
    let count = 0;
    for (const request of requests) {
      let items = request.items;
      if (typeof items === 'string') {
        try { items = JSON.parse(items); } catch { items = []; }
      }
      const ledgerDate = new Date(request.updatedAt || request.requestDate || Date.now());
      for (const item of items) {
        // Check if a ledger entry for this item already exists
        const exists = await FinancialLedger.findOne({
          where: {
            memberId: request.memberId,
            description: `${item.itemName} (${item.quantity} ${item.unit})`,
            ledgerDate
          }
        });
        if (!exists) {
          await FinancialLedger.create({
            memberId: request.memberId,
            entryType: 'debit',
            amount: item.price,
            balance: 0, // Update with running balance logic if needed
            category: 'supply',
            description: `${item.itemName} (${item.quantity} ${item.unit})`,
            ledgerDate,
            productName: item.itemName,
            quantity: item.quantity,
            totalAmount: item.price
          });
          count++;
        }
      }
    }
    console.log(`Backfilled ${count} ledger entries for supply requests with receipts.`);
    process.exit(0);
  } catch (err) {
    console.error("Error backfilling supply ledger entries:", err);
    process.exit(1);
  }
})();
