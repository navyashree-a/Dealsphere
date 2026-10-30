import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import { AdminContext } from "./adminContext";
import { ADMIN_USER, buildInitialState } from "./adminData";
import { ROLES, can as canDo, clonePermissions } from "./permissions";
import { makeId, nowISO } from "./adminUtils";

// Demo persistence: the admin prototype keeps its sample records in this
// browser only, so changes survive a reload. This is not shared or durable
// storage - ARD §16 requires a backend and database for that.
const STORAGE_KEY = "dealsphere-admin-demo-v2";

const loadState = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && saved.version === 2) return saved;
  } catch {
    // Storage unavailable or corrupt: fall back to fresh demo data.
  }
  return buildInitialState();
};

const reducer = (state, action) => {
  let next;
  switch (action.type) {
    case "add":
      next = {
        ...state,
        [action.key]: action.append ? [...state[action.key], action.item] : [action.item, ...state[action.key]],
      };
      break;
    case "patch":
      next = {
        ...state,
        [action.key]: state[action.key].map((item) =>
          item.id === action.id
            ? { ...item, ...(typeof action.patch === "function" ? action.patch(item) : action.patch) }
            : item
        ),
      };
      break;
    case "set":
      next = { ...state, [action.key]: action.value };
      break;
    case "replace":
      return action.value;
    default:
      return state;
  }

  // Audit log (ARD FR-18, §18): actor, timestamp, module, action, target.
  if (action.audit) {
    next.audit = [{ id: action.auditId, at: action.at, ...action.actor, ...action.audit }, ...next.audit].slice(0, 400);
  }
  return next;
};

function AdminStore({ children, onNavigate, route }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Private mode or blocked storage: the demo still works for this session.
    }
  }, [state]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(timer);
  }, [toast]);

  const member = state.staff.find((s) => s.id === state.viewerId);
  const session = member ? state.sessions[member.id] : null;
  const viewer = useMemo(() => {
    if (!member) return ADMIN_USER;
    // Permissions come from the member's session, not the live record:
    // ARD §5.1 says role changes take effect after the session is refreshed.
    return { ...member, permissions: session || member.permissions };
  }, [member, session]);

  const permissionsStale = Boolean(member && session) && JSON.stringify(member.permissions) !== JSON.stringify(session);

  const actor = useMemo(
    () => ({ actor: viewer.name, role: ROLES[viewer.role]?.label || "Admin" }),
    [viewer]
  );

  const run = useCallback(
    (action, audit) =>
      dispatch({ ...action, audit, auditId: makeId("A"), at: nowISO(), actor }),
    [actor]
  );

  const api = useMemo(
    () => ({
      add: (key, item, audit, append = false) => run({ type: "add", key, item, append }, audit),
      patch: (key, id, patch, audit) => run({ type: "patch", key, id, patch }, audit),
      set: (key, value, audit) => run({ type: "set", key, value }, audit),
      notify: (message, kind = "success") => setToast({ id: makeId("toast"), message, kind }),
      setViewer: (id) => {
        const next = state.staff.find((s) => s.id === id);
        dispatch({ type: "set", key: "viewerId", value: next ? id : ADMIN_USER.id });
        // First preview of a staff member "signs them in" with their current permissions.
        if (next && !state.sessions[id]) {
          dispatch({ type: "set", key: "sessions", value: { ...state.sessions, [id]: clonePermissions(next.permissions) } });
        }
      },
      refreshSession: () => {
        if (!member) return;
        dispatch({ type: "set", key: "sessions", value: { ...state.sessions, [member.id]: clonePermissions(member.permissions) } });
      },
      setDemoData: (on) => dispatch({ type: "set", key: "demoData", value: on }),
      resetDemo: () => dispatch({ type: "replace", value: buildInitialState() }),
    }),
    [run, state.staff, state.sessions, member]
  );

  const value = {
    state,
    viewer,
    isAdmin: viewer.role === "admin",
    permissionsStale,
    can: (moduleId, action) => canDo(viewer, moduleId, action),
    staffName: (id) => state.staff.find((s) => s.id === id)?.name || (id === "admin" ? ADMIN_USER.name : "Unassigned"),
    toast,
    dismissToast: () => setToast(null),
    navigate: onNavigate,
    route,
    ...api,
  };

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export default AdminStore;
