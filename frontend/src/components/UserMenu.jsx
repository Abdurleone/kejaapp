import { useEffect, useRef, useState } from "react";

// Replaces a separate always-visible "Demo Tenant" pill + "Sign out" button
// in the header - on narrow viewports those two plus the mode toggle forced
// three full-width stacked rows before any nav/content appeared at all.
// Folding sign-out behind the name pill itself gets the signed-in header
// back to one row everywhere, not just desktop.
export default function UserMenu({ label, onSignOut }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div className="user-menu" ref={menuRef}>
      <button
        type="button"
        className="user-pill user-menu-trigger"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        {label}
      </button>
      {open && (
        <div className="user-menu-panel" role="menu">
          <button
            type="button"
            role="menuitem"
            className="text-button"
            onClick={() => {
              setOpen(false);
              onSignOut();
            }}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
