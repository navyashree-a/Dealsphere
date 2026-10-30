import { useState } from "react";
import Icon from "../../components/Icon";
import { useAdmin } from "../adminContext";
import { makeId } from "../adminUtils";
import { Field, Modal, Notice, PageHeader, Panel, StatusBadge, Toggle } from "../AdminUI";

function CategoryForm({ category, onClose, onRename }) {
  const { state, add, patch, notify } = useAdmin();
  const [form, setForm] = useState(category || { name: "", icon: "", description: "" });
  const [error, setError] = useState("");

  const save = (e) => {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) {
      setError("Category name is required.");
      return;
    }
    if (state.categories.some((c) => c.name.toLowerCase() === name.toLowerCase() && c.id !== category?.id)) {
      setError("A category with this name already exists.");
      return;
    }
    if (category) {
      onRename(category.name, name);
      patch("categories", category.id, { ...form, name }, { module: "categories", action: "Edited category", target: name });
      notify("Category updated.");
    } else {
      add(
        "categories",
        { id: makeId("CAT"), name, icon: form.icon.trim() || "🏷️", description: form.description.trim(), visible: false, order: state.categories.length },
        { module: "categories", action: "Added category (hidden)", target: name },
        true
      );
      notify("Category added. It stays hidden until you make it visible.");
    }
    onClose();
  };

  return (
    <Modal
      title={category ? `Edit ${category.name}` : "Add category"}
      onClose={onClose}
      footer={
        <div className="adm-modal__actions">
          <button type="button" className="btn btn--ghost btn--sm" onClick={onClose}>Cancel</button>
          <button type="submit" form="cat-form" className="btn btn--lime btn--sm">Save</button>
        </div>
      }
    >
      <form id="cat-form" className="adm-form" onSubmit={save} noValidate>
        <Field label="Name" htmlFor="cat-name" required>
          <input id="cat-name" className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} maxLength={40} />
        </Field>
        <div className="adm-form-grid">
          <Field label="Icon" htmlFor="cat-icon" hint="An emoji, as on the public site.">
            <input id="cat-icon" className="input" value={form.icon} onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))} maxLength={4} />
          </Field>
          <Field label="Description" htmlFor="cat-desc">
            <input id="cat-desc" className="input" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} maxLength={60} />
          </Field>
        </div>
        {category && category.name !== form.name.trim() && (
          <Notice tone="warning" icon="alert">Renaming affects every offer in this category. Offer records are updated with the new name.</Notice>
        )}
        {error && <Notice tone="critical" icon="alert">{error}</Notice>}
      </form>
    </Modal>
  );
}

// ARD §6.3, §8 Category Controls, §8.2 workflow and FR-14.
function Categories() {
  const { state, patch, set, notify, can } = useAdmin();
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const canEdit = can("categories", "edit");

  const ordered = [...state.categories].sort((a, b) => a.order - b.order);
  const countFor = (name, status) => state.deals.filter((d) => d.category === name && (!status || d.status === status)).length;

  const applyVisibility = (category, visible) => {
    patch("categories", category.id, { visible }, {
      module: "categories",
      action: visible ? "Enabled category" : "Disabled category",
      target: `${category.name} (${countFor(category.name, "Active")} active offers)`,
    });
    notify(visible ? `${category.name} is visible again.` : `${category.name} hidden from public navigation.`);
  };

  const requestToggle = (category, visible) => {
    if (!visible && countFor(category.name, "Active") > 0) setConfirm(category);
    else applyVisibility(category, visible);
  };

  const move = (category, direction) => {
    const index = ordered.findIndex((c) => c.id === category.id);
    const swap = ordered[index + direction];
    if (!swap) return;
    const next = state.categories.map((c) =>
      c.id === category.id ? { ...c, order: swap.order } : c.id === swap.id ? { ...c, order: category.order } : c
    );
    set("categories", next, { module: "categories", action: "Changed display order", target: `${category.name} ${direction < 0 ? "up" : "down"}` });
  };

  const renameDeals = (before, after) => {
    if (before === after) return;
    set("deals", state.deals.map((d) => (d.category === before ? { ...d, category: after } : d)));
  };

  return (
    <>
      <PageHeader
        eyebrow="Content"
        title="Categories"
        description="Public visibility, display order and associated offers."
        actions={
          can("categories", "create") && (
            <button type="button" className="btn btn--lime btn--sm" onClick={() => setEditing("new")}>
              <Icon name="plus" size={16} /> Add category
            </button>
          )
        }
      />

      <Panel title="Public navigation preview" subtitle="What customers would see, in display order">
        <div className="adm-preview-chips">
          {ordered.filter((c) => c.visible).map((c) => (
            <span key={c.id} className="adm-preview-chip">
              <span aria-hidden="true">{c.icon}</span> {c.name}
            </span>
          ))}
          {!ordered.some((c) => c.visible) && <span className="muted">No visible categories.</span>}
        </div>
        <Notice>
          Preview only. In this frontend-only build, the customer website reads its own demo data and is not changed by the
          admin panel. Publishing changes to the live site requires the backend (ARD §16).
        </Notice>
      </Panel>

      <Panel flush>
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th scope="col">Order</th>
                <th scope="col">Category</th>
                <th scope="col" className="is-num">Active offers</th>
                <th scope="col" className="is-num">All offers</th>
                <th scope="col">Status</th>
                <th scope="col">Public visibility</th>
                <th scope="col"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {ordered.map((c, i) => (
                <tr key={c.id}>
                  <td>
                    <div className="adm-order">
                      <button type="button" className="icon-btn" disabled={!canEdit || i === 0} onClick={() => move(c, -1)} aria-label={`Move ${c.name} up`}>
                        <Icon name="chevronUp" size={16} />
                      </button>
                      <button type="button" className="icon-btn" disabled={!canEdit || i === ordered.length - 1} onClick={() => move(c, 1)} aria-label={`Move ${c.name} down`}>
                        <Icon name="chevronDown" size={16} />
                      </button>
                    </div>
                  </td>
                  <td>
                    <span className="adm-cat">
                      <span className="adm-cat__icon" aria-hidden="true">{c.icon}</span>
                      <span>
                        <strong>{c.name}</strong>
                        <span className="adm-sub">{c.description}</span>
                      </span>
                    </span>
                  </td>
                  <td className="is-num">{countFor(c.name, "Active")}</td>
                  <td className="is-num">{countFor(c.name)}</td>
                  <td><StatusBadge status={c.visible ? "Visible" : "Hidden"} /></td>
                  <td>
                    <Toggle
                      checked={c.visible}
                      onChange={(v) => requestToggle(c, v)}
                      label={`${c.name} public visibility`}
                      disabled={!canEdit}
                    />
                  </td>
                  <td>
                    {canEdit && (
                      <button type="button" className="btn btn--ghost btn--sm" onClick={() => setEditing(c)}>
                        Edit
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {editing && (
        <CategoryForm
          category={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onRename={renameDeals}
        />
      )}

      {confirm && (
        <Modal
          title={`Hide ${confirm.name}?`}
          description="ARD §8.2 category toggle workflow"
          onClose={() => setConfirm(null)}
          footer={
            <div className="adm-modal__actions">
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => setConfirm(null)}>Keep visible</button>
              <button
                type="button"
                className="btn btn--ghost btn--sm adm-danger-btn"
                onClick={() => {
                  applyVisibility(confirm, false);
                  setConfirm(null);
                }}
              >
                Hide category
              </button>
            </div>
          }
        >
          <Notice tone="warning" icon="alert">
            {countFor(confirm.name, "Active")} active offer(s) are in this category.
          </Notice>
          <ul className="adm-bullets">
            <li>The category is removed from public category navigation.</li>
            <li>It becomes unavailable for new deal assignment.</li>
            <li>No offer records are deleted.</li>
            <li>
              What happens to existing offers (hide, reassign, or keep in direct links) is <strong>pending a management decision</strong>{" "}
              (ARD §6.3). Current setting: <em>{state.settings.categoryPolicy}</em>. Until it's decided, the demo leaves those offers unchanged.
            </li>
            <li>The change is recorded in the audit log.</li>
          </ul>
        </Modal>
      )}
    </>
  );
}

export default Categories;
