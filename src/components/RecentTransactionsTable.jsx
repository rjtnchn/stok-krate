// components/RecentTransactionsTable.jsx
// Shared "last N transactions" table for the Admin and Staff dashboards.
// Admin dashboard shows all transactions; Staff dashboard's own (API-filtered).

function formatTimestamp(value) {
  return value ? new Date(value).toLocaleString() : "—";
}

export default function RecentTransactionsTable({ transactions, showUser = true }) {
  if (transactions.length === 0) {
    return <p className="state-msg">No recent transactions.</p>;
  }

  return (
    <table className="admin-table">
      <thead>
        <tr>
          <th>Item name</th>
          <th>Lot number</th>
          <th>Type</th>
          <th>Quantity</th>
          {showUser && <th>User</th>}
          <th>Timestamp</th>
        </tr>
      </thead>
      <tbody>
        {transactions.map((tx) => (
          <tr key={tx.id}>
            <td>{tx.item_name}</td>
            <td>{tx.lot_number}</td>
            <td>{tx.transaction_type}</td>
            <td>{tx.quantity}</td>
            {showUser && <td>{tx.user}</td>}
            <td>{formatTimestamp(tx.timestamp)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
