/**
 * Synchronizes active budget spent_amount when an expense or disbursement posts.
 * Runs inside an existing database transaction client.
 */
const syncBudgetSpend = async (client, { churchId, branchId = null, amount, transactionDate = new Date(), budgetId = null }) => {
  const numAmount = Number(amount || 0);
  if (!churchId || !numAmount || numAmount <= 0) return;

  if (budgetId) {
    await client.query(
      `UPDATE budgets
       SET spent_amount = COALESCE(spent_amount, 0) + $1, updated_at = NOW()
       WHERE id = $2 AND church_id = $3`,
      [numAmount, budgetId, churchId]
    );
    return;
  }

  const txDate = transactionDate instanceof Date
    ? transactionDate.toISOString().slice(0, 10)
    : String(transactionDate).slice(0, 10);

  await client.query(
    `UPDATE budgets
     SET spent_amount = COALESCE(spent_amount, 0) + $1, updated_at = NOW()
     WHERE church_id = $2
       AND status = 'active'
       AND start_date <= $3::date
       AND end_date >= $3::date
       AND ($4::uuid IS NULL OR branch_id IS NULL OR branch_id = $4::uuid)`,
    [numAmount, churchId, txDate, branchId]
  );
};

module.exports = { syncBudgetSpend };

