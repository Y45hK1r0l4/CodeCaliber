import React, { useEffect, useRef, useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router";
import { useDispatch, useSelector } from "react-redux";
import { logoutUser } from "../authSlice";
import { ArrowUpRight, ChevronDown, LogOut, Menu, UserRound, X } from "lucide-react";

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const close = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const logout = () => {
    dispatch(logoutUser());
    setOpen(false);
    navigate("/login");
  };

  const isStaff = ["admin", "evaluator"].includes(user?.role);

  // Hide the navbar completely when taking/giving a test
  if (location.pathname.startsWith("/test/")) {
    return null;
  }

  return (
    <header className="site-nav sticky top-0 z-50">
      <div className="mx-auto flex h-[60px] max-w-[1380px] items-center justify-between px-5 sm:px-8 lg:px-12">
        {/* Brand */}
        <NavLink to="/" className="flex items-center gap-2.5" onClick={() => setMobileOpen(false)}>
          <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#1c1b19] text-base font-bold">C</span>
          <span className="text-[16px] font-bold tracking-[-.04em]">codeCaliber</span>
        </NavLink>

        {/* Right Actions */}
        <div className="hidden items-center gap-2.5 md:flex" ref={dropdownRef}>
          {user ? (
            <div className="flex items-center gap-2.5">
              <NavLink to="/assessments" className="nav-link px-2.5 py-1 text-[13px] font-semibold">
                Assessments
              </NavLink>

              {isStaff && (
                <NavLink to="/admin" className="nav-link px-2.5 py-1 text-[13px] font-semibold">
                  Dashboard
                </NavLink>
              )}

              <div className="relative">
                <button
                  onClick={() => setOpen(!open)}
                  className="flex items-center gap-1.5 rounded-full border border-[rgba(28,27,25,.16)] px-2.5 py-1.5 text-xs font-semibold"
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#68765d] text-[11px] font-bold text-white">
                    {user?.firstName?.[0]?.toUpperCase() || "U"}
                  </span>
                  {user?.firstName}
                  <ChevronDown className="h-3 w-3" />
                </button>

                {open && (
                  <div className="absolute right-0 mt-2 w-48 rounded-2xl border border-[rgba(28,27,25,.12)] bg-[#faf7f1] p-2 shadow-xl">
                    <NavLink
                      to="/profile"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-[#e6e0d6]"
                    >
                      <UserRound className="h-4 w-4" />
                      My profile
                    </NavLink>

                    {isStaff && (
                      <NavLink
                        to="/admin"
                        onClick={() => setOpen(false)}
                        className="block rounded-xl px-3 py-2 text-sm hover:bg-[#e6e0d6]"
                      >
                        Dashboard
                      </NavLink>
                    )}

                    <button
                      onClick={logout}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-[#a94e34] hover:bg-[#f0d9d0]"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              <NavLink to="/assessments" className="nav-link px-2.5 text-[13px] font-semibold">
                Enter code
              </NavLink>
              <NavLink to="/login" className="nav-link px-2 text-[13px] font-semibold">
                Sign in
              </NavLink>
              <NavLink
                to="/signup?role=participant"
                className="ink-button flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-semibold"
              >
                Sign up <ArrowUpRight className="h-3.5 w-3.5" />
              </NavLink>
            </>
          )}
        </div>

        {/* Mobile menu toggle */}
        <button
          className="rounded-full border border-[rgba(28,27,25,.16)] p-2 md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle navigation"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu dropdown */}
      {mobileOpen && (
        <div className="border-t border-[rgba(28,27,25,.12)] bg-[#f2eee7] px-5 pb-5 pt-3 md:hidden">
          {user ? (
            <div className="space-y-2">
              <NavLink
                to="/assessments"
                onClick={() => setMobileOpen(false)}
                className="block border-b border-[rgba(28,27,25,.1)] py-3 text-sm font-semibold"
              >
                Assessments
              </NavLink>
              {isStaff && (
                <NavLink
                  to="/admin"
                  onClick={() => setMobileOpen(false)}
                  className="block border-b border-[rgba(28,27,25,.1)] py-3 text-sm font-semibold"
                >
                  Dashboard
                </NavLink>
              )}
              <NavLink
                to="/profile"
                onClick={() => setMobileOpen(false)}
                className="block border-b border-[rgba(28,27,25,.1)] py-3 text-sm font-semibold"
              >
                My Profile
              </NavLink>
              <div className="pt-3">
                <button onClick={logout} className="ink-button rounded-full px-4 py-2 text-sm">
                  Sign out
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 pt-2">
              <NavLink
                to="/assessments"
                onClick={() => setMobileOpen(false)}
                className="rounded-full border border-[rgba(28,27,25,.2)] px-4 py-2 text-sm"
              >
                Enter code
              </NavLink>
              <NavLink
                to="/login"
                onClick={() => setMobileOpen(false)}
                className="rounded-full border border-[rgba(28,27,25,.2)] px-4 py-2 text-sm"
              >
                Sign in
              </NavLink>
              <NavLink
                to="/signup?role=participant"
                onClick={() => setMobileOpen(false)}
                className="ink-button rounded-full px-4 py-2 text-sm"
              >
                Sign up
              </NavLink>
            </div>
          )}
        </div>
      )}
    </header>
  );
};

export default Navbar;
