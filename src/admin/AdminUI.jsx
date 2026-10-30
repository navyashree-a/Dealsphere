import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import Icon from "../components/Icon";

/* ---------- Status badge ----------
   Status labels follow ARD Appendix C. The colour is always paired with the
   text label and a dot, so state never relies on colour alone. */
const TONES = {
  good: ["Active", "Completed", "Paid", "Approved", "Reconciled", "Enabled", "Visible", "Verified"],
  warning: ["Pending Review", "Pending", "Needs Review", "Estimated", "Onboarding", "Scheduled", "Recorded"],
  info: ["In Progress", "Proposed"],
  critical: ["Rejected", "Overdue", "Reversed", "Suspended", "Disputed", "Difference found"],
};

const toneFor = (status) =>
  Object.entries(TONES).find(([, list]) => list.includes(status))?.[0] || "neutral";

export function StatusBadge({ status }) {
  return (
    <span className={`adm-badge adm-badge--${toneFor(status)}`}>
      <span className="adm-badge__dot" aria-hidden="true" />
      {status}
    </span>
  );
}

/* ---------- Data source tag ----------
   ARD §8: "distinguish live data from estimates and partner-reported figures";
   unavailable metrics are labelled unavailable rather than fabricated. */
const SOURCES = {
  demo: { label: "Demo", tip: "Illustrative sample data - not collected from real users or partners." },
  estimate: { label: "Demo · estimate", tip: "Sample estimate. Real estimates need tracking data." },
  partner: { label: "Demo · partner-reported", tip: "Sample of figures a partner would report." },
  record: { label: "Demo record", tip: "Computed from the demo records in this admin panel." },
  unavailable: { label: "Unavailable", tip: "Requires a backend, analytics or partner integration." },
};

export function SourceTag({ kind }) {
  const source = SOURCES[kind] || SOURCES.demo;
  return (
    <span className={`adm-source adm-source--${kind}`} title={source.tip}>
      {source.label}
    </span>
  );
}

/* ---------- Stat tile ---------- */
export function Stat({ label, value, delta, deltaLabel = "vs previous period", source = "demo", unavailable, icon, onClick }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag type={onClick ? "button" : undefined} className={`adm-stat ${onClick ? "adm-stat--link" : ""}`} onClick={onClick}>
      <div className="adm-stat__top">
        <span className="adm-stat__label">
          {icon && <Icon name={icon} size={16} />}
          {label}
        </span>
        <SourceTag kind={unavailable ? "unavailable" : source} />
      </div>
      {unavailable ? (
        <>
          <strong className="adm-stat__value adm-stat__value--na">Unavailable</strong>
          <span className="adm-stat__note">{unavailable}</span>
        </>
      ) : (
        <>
          <strong className="adm-stat__value">{value}</strong>
          {delta !== undefined && delta !== null && Number.isFinite(delta) && (
            <span className={`adm-stat__delta ${delta >= 0 ? "is-up" : "is-down"}`}>
              <Icon name={delta >= 0 ? "chevronUp" : "chevronDown"} size={14} />
              {Math.abs(delta * 100).toFixed(1)}% <span>{deltaLabel}</span>
            </span>
          )}
        </>
      )}
    </Tag>
  );
}

/* ---------- Layout pieces ---------- */
export function PageHeader({ eyebrow, title, description, actions }) {
  return (
    <header className="adm-page-head">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p className="adm-page-head__desc">{description}</p>}
      </div>
      {actions && <div className="adm-page-head__actions">{actions}</div>}
    </header>
  );
}

export function Panel({ title, subtitle, actions, children, className = "", flush = false }) {
  return (
    <section className={`adm-panel ${flush ? "adm-panel--flush" : ""} ${className}`}>
      {(title || actions) && (
        <div className="adm-panel__head">
          <div>
            {title && <h2>{title}</h2>}
            {subtitle && <p>{subtitle}</p>}
          </div>
          {actions && <div className="adm-panel__actions">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export function FilterBar({ children }) {
  return (
    <div className="adm-filters" role="group" aria-label="Filters">
      {children}
    </div>
  );
}

export function SelectField({ label, value, onChange, options, id }) {
  const autoId = useId();
  const fieldId = id || autoId;
  return (
    <label className="adm-select" htmlFor={fieldId}>
      <span>{label}</span>
      <select id={fieldId} value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) =>
          typeof option === "string" ? (
            <option key={option} value={option}>
              {option}
            </option>
          ) : (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          )
        )}
      </select>
    </label>
  );
}

export function Field({ label, hint, children, htmlFor, required }) {
  return (
    <div className="adm-field">
      <label htmlFor={htmlFor} className="field-label">
        {label}
        {required && <span className="adm-required"> *</span>}
      </label>
      {children}
      {hint && <p className="adm-field__hint">{hint}</p>}
    </div>
  );
}

export function Toggle({ checked, onChange, label, disabled, describedBy }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      aria-describedby={describedBy}
      className={`adm-toggle ${checked ? "is-on" : ""}`}
      onClick={() => onChange(!checked)}
      disabled={disabled}
    >
      <span className="adm-toggle__knob" />
    </button>
  );
}

export function Tabs({ tabs, value, onChange, label }) {
  return (
    <div className="adm-tabs" role="tablist" aria-label={label}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={value === tab.id}
          className={`adm-tab ${value === tab.id ? "is-active" : ""}`}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
          {tab.count !== undefined && <span className="adm-tab__count">{tab.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function EmptyBlock({ icon = "file", title, children, action }) {
  return (
    <div className="adm-empty">
      <span className="adm-empty__icon" aria-hidden="true">
        <Icon name={icon} size={22} />
      </span>
      <strong>{title}</strong>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

export function Unavailable({ title = "Data unavailable", children }) {
  return (
    <div className="adm-unavailable" role="note">
      <Icon name="lock" size={18} />
      <div>
        <strong>{title}</strong>
        <p>{children}</p>
      </div>
    </div>
  );
}

export function Notice({ children, tone = "info", icon = "info" }) {
  return (
    <p className={`adm-notice adm-notice--${tone}`}>
      <Icon name={icon} size={16} />
      <span>{children}</span>
    </p>
  );
}

/* ---------- Modal ---------- */
export function Modal({ title, onClose, children, footer, size = "md", description }) {
  const dialogRef = useRef(null);
  const titleId = useId();

  useEffect(() => {
    const previous = document.activeElement;
    const dialog = dialogRef.current;
    const focusable = dialog?.querySelector("input, select, textarea, button:not(.adm-modal__close)");
    (focusable || dialog)?.focus();

    const onKey = (event) => {
      if (event.key === "Escape") onClose();
      if (event.key === "Tab" && dialog) {
        const items = [...dialog.querySelectorAll("button, input, select, textarea, a[href]")].filter((el) => !el.disabled);
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      previous?.focus?.();
    };
  }, [onClose]);

  return (
    <div className="adm-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div
        className={`adm-modal adm-modal--${size}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        ref={dialogRef}
        tabIndex={-1}
      >
        <div className="adm-modal__head">
          <div>
            <h2 id={titleId}>{title}</h2>
            {description && <p>{description}</p>}
          </div>
          <button type="button" className="icon-btn adm-modal__close" onClick={onClose} aria-label="Close dialog">
            <Icon name="x" size={18} />
          </button>
        </div>
        <div className="adm-modal__body">{children}</div>
        {footer && <div className="adm-modal__foot">{footer}</div>}
      </div>
    </div>
  );
}

/* ---------- Charts ----------
   Built to the dataviz mark specs: 2px lines, ~10% area wash, recessive 1px
   grid, crosshair + one tooltip listing every series, keyboard access, a
   legend for 2+ series, and a table view. Series colours validated against
   the #242424 card surface (lime #79a00c / blue #3987e5 for comparisons). */
const useWidth = () => {
  const ref = useRef(null);
  const [width, setWidth] = useState(640);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(260, entry.contentRect.width)));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return [ref, width];
};

// Smallest "clean" axis maximum (4 equal steps) with ~5% headroom above the data.
const niceMax = (value) => {
  if (value <= 0) return 1;
  const target = value * 1.05;
  const magnitude = 10 ** Math.floor(Math.log10(target));
  const step = [0.25, 0.5, 1, 2, 2.5, 5, 10].find((s) => s * magnitude * 4 >= target) * magnitude;
  return step * 4;
};

const shortDate = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

export function LineChart({ series, format = (v) => v, height = 240, label }) {
  const [wrapRef, width] = useWidth();
  const [active, setActive] = useState(null);
  const [showTable, setShowTable] = useState(false);
  const pad = { top: 16, right: 16, bottom: 28, left: 56 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const length = series[0]?.points.length || 0;
  const max = niceMax(Math.max(...series.flatMap((s) => s.points.map((p) => p.y)), 0));
  const x = (i) => pad.left + (length <= 1 ? innerW / 2 : (i / (length - 1)) * innerW);
  const y = (v) => pad.top + innerH - (v / max) * innerH;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);
  const labelIdx = length > 2 ? [0, Math.floor((length - 1) / 2), length - 1] : [0, length - 1];

  const onMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const px = ((event.clientX - rect.left) / rect.width) * width;
    const index = Math.round(((px - pad.left) / innerW) * (length - 1));
    setActive(Math.min(length - 1, Math.max(0, index)));
  };

  const onKey = (event) => {
    if (event.key === "ArrowRight") setActive((i) => Math.min(length - 1, (i ?? -1) + 1));
    if (event.key === "ArrowLeft") setActive((i) => Math.max(0, (i ?? length) - 1));
    if (event.key === "Escape") setActive(null);
  };

  return (
    <div className="adm-chart">
      {series.length > 1 && (
        <ul className="adm-legend">
          {series.map((s) => (
            <li key={s.name}>
              <span className="adm-legend__line" style={{ background: s.color }} />
              {s.name}
            </li>
          ))}
        </ul>
      )}
      <div className="adm-chart__plot" ref={wrapRef}>
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={`${label}. Use left and right arrow keys to read values.`}
          tabIndex={0}
          onPointerMove={onMove}
          onPointerLeave={() => setActive(null)}
          onKeyDown={onKey}
          onBlur={() => setActive(null)}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line x1={pad.left} x2={width - pad.right} y1={y(t)} y2={y(t)} className="adm-chart__grid" />
              <text x={pad.left - 10} y={y(t)} className="adm-chart__tick" textAnchor="end" dominantBaseline="middle">
                {format(t)}
              </text>
            </g>
          ))}
          {labelIdx.map((i) =>
            series[0]?.points[i] ? (
              <text key={i} x={x(i)} y={height - 8} className="adm-chart__tick" textAnchor={i === 0 ? "start" : i === length - 1 ? "end" : "middle"}>
                {shortDate(series[0].points[i].x)}
              </text>
            ) : null
          )}
          {series.map((s, si) => {
            const path = s.points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.y).toFixed(1)}`).join("");
            return (
              <g key={s.name}>
                {si === 0 && (
                  <path
                    d={`${path}L${x(length - 1)},${y(0)}L${x(0)},${y(0)}Z`}
                    fill={s.color}
                    opacity="0.1"
                  />
                )}
                <path d={path} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
              </g>
            );
          })}
          {active !== null && (
            <g>
              <line x1={x(active)} x2={x(active)} y1={pad.top} y2={pad.top + innerH} className="adm-chart__cross" />
              {series.map((s) => (
                <circle key={s.name} cx={x(active)} cy={y(s.points[active].y)} r="4.5" fill={s.color} className="adm-chart__dot" />
              ))}
            </g>
          )}
        </svg>
        {active !== null && series[0]?.points[active] && (
          <div
            className="adm-tooltip"
            style={{
              left: Math.min(Math.max(x(active), 90), width - 90),
              top: pad.top,
            }}
            aria-hidden="true"
          >
            <span className="adm-tooltip__title">{shortDate(series[0].points[active].x)}</span>
            {series.map((s) => (
              <span key={s.name} className="adm-tooltip__row">
                <span className="adm-tooltip__key" style={{ background: s.color }} />
                <strong>{format(s.points[active].y)}</strong>
                <span>{s.name}</span>
              </span>
            ))}
          </div>
        )}
      </div>
      <button type="button" className="text-btn adm-chart__table-toggle" onClick={() => setShowTable((v) => !v)} aria-expanded={showTable}>
        <Icon name="grid" size={14} /> {showTable ? "Hide table" : "View as table"}
      </button>
      {showTable && (
        <div className="adm-table-wrap adm-chart__table">
          <table className="adm-table">
            <thead>
              <tr>
                <th scope="col">Date</th>
                {series.map((s) => (
                  <th key={s.name} scope="col" className="is-num">{s.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {series[0].points.map((p, i) => (
                <tr key={p.x}>
                  <td>{shortDate(p.x)}</td>
                  {series.map((s) => (
                    <td key={s.name} className="is-num">{format(s.points[i].y)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Horizontal single-hue bars for ranking one measure (categories, stores).
export function BarList({ items, format = (v) => v, label }) {
  const max = Math.max(...items.map((item) => item.value), 1);
  return (
    <ul className="adm-bars" aria-label={label}>
      {items.map((item) => (
        <li key={item.label} className="adm-bars__row" tabIndex={0} aria-label={`${item.label}: ${format(item.value)}`}>
          <span className="adm-bars__label">{item.label}</span>
          <span className="adm-bars__track">
            <span className="adm-bars__fill" style={{ width: `${(item.value / max) * 100}%` }} />
          </span>
          <span className="adm-bars__value">{format(item.value)}</span>
        </li>
      ))}
    </ul>
  );
}
