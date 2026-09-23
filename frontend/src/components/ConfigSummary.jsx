/** Chips listing a configured item's options, e.g. "Wood: American Walnut". */
const GROUP_LABEL = { wood: 'Wood', finish: 'Finish', frame: 'Frame', legs: 'Legs', upholstery: 'Upholstery' };
const ORDER = Object.keys(GROUP_LABEL); // JSONB doesn't preserve key order, so sort explicitly

export default function ConfigSummary({ labels = {}, colors = {} }) {
  return (
    <ul className="config-summary">
      {Object.entries(labels).sort(([a], [b]) => ORDER.indexOf(a) - ORDER.indexOf(b)).map(([g, label]) => (
        <li key={g}>
          {colors[g] && colors[g] !== '#000000' && <span className="dot" style={{ background: colors[g] }} />}
          <span className="muted">{GROUP_LABEL[g] || g}:</span> {label}
        </li>
      ))}
    </ul>
  );
}
