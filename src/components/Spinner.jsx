// components/Spinner.jsx
// Small inline spinner shown inside a submit button while a request is in flight.

export default function Spinner({ label = "Loading" }) {
  return <span className="spinner" role="status" aria-label={label} />;
}
