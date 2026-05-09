"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2, KeyRound, Loader2, Search, ShieldCheck, Trash2, UserPlus } from "lucide-react";

type AdminUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  role: string;
  is_active: boolean;
  emailVerified?: string | null;
  wallet_balance: number;
  outstanding_balance: number;
  created_at?: string;
  staffProfile?: { id: string; role: string } | null;
  pets: { id: string; name: string; type: string }[];
  clientBookings: { id: string; status: string; payment_status: string }[];
};

const roles = ["All", "CLIENT", "STAFF", "ADMIN"];

export default function AdminClientsPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [role, setRole] = useState("All");
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [creating, setCreating] = useState(false);
  const [passwords, setPasswords] = useState<Record<string, string>>({});
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", role: "CLIENT" });

  async function fetchUsers() {
    setLoading(true);
    setError("");
    const params = new URLSearchParams();
    if (role !== "All") params.set("role", role);
    if (query) params.set("q", query);
    const res = await fetch(`/api/admin/users?${params.toString()}`);
    if (res.ok) setUsers(await res.json());
    else setError("Unable to load users");
    setLoading(false);
  }

  useEffect(() => {
    fetchUsers();
  }, [role]);

  const filtered = useMemo(() => users, [users]);

  async function createUser() {
    setError("");
    setMessage("");
    setCreating(true);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.message || "Unable to create user");
      setCreating(false);
      return;
    }
    setForm({ name: "", email: "", phone: "", password: "", role: "CLIENT" });
    setMessage("User created successfully.");
    await fetchUsers();
    setCreating(false);
  }

  async function updateUser(id: string, body: Record<string, unknown>) {
    setSavingId(id);
    setError("");
    setMessage("");
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...body }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.message || "Unable to update user");
    } else {
      setMessage("User updated.");
    }
    await fetchUsers();
    setSavingId("");
  }

  async function resetPassword(id: string) {
    const password = passwords[id]?.trim();
    if (!password) {
      setError("Enter a new password first.");
      return;
    }
    await updateUser(id, { password });
    setPasswords((prev) => ({ ...prev, [id]: "" }));
  }

  async function deleteUser(id: string) {
    if (!confirm("Delete this user permanently?")) return;
    setSavingId(id);
    setError("");
    setMessage("");
    const res = await fetch(`/api/admin/users?id=${id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) setError(data.message || "Unable to delete user");
    else if (data.message?.includes("disabled")) setError(data.message);
    else setMessage("User deleted.");
    await fetchUsers();
    setSavingId("");
  }

  const totalUsers = users.length;
  const activeUsers = users.filter((user) => user.is_active).length;
  const staffUsers = users.filter((user) => user.role === "STAFF" || user.role === "ADMIN").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="mt-1 text-sm text-muted-foreground">Create, edit, activate, deactivate, and manage client/staff/admin profiles.</p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div className="rounded-lg border bg-white px-4 py-3">
            <p className="text-muted-foreground">Users</p>
            <p className="text-xl font-bold">{totalUsers}</p>
          </div>
          <div className="rounded-lg border bg-white px-4 py-3">
            <p className="text-muted-foreground">Active</p>
            <p className="text-xl font-bold">{activeUsers}</p>
          </div>
          <div className="rounded-lg border bg-white px-4 py-3">
            <p className="text-muted-foreground">Team</p>
            <p className="text-xl font-bold">{staffUsers}</p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-white p-5">
        <h2 className="mb-4 font-bold">Create User</h2>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-[1fr_1fr_160px_160px_140px_auto]">
          <Input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Input placeholder="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="h-11 rounded-lg border bg-white px-3 text-sm">
            {roles.filter((item) => item !== "All").map((item) => <option key={item}>{item}</option>)}
          </select>
          <Button onClick={createUser} disabled={creating}>
            {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
            Add
          </Button>
        </div>
        {error && <p className="mt-3 text-sm font-medium text-red-600">{error}</p>}
        {message && <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-green-700"><CheckCircle2 className="h-4 w-4" /> {message}</p>}
      </div>

      <div className="rounded-lg border bg-white p-4">
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-[1fr_180px_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && fetchUsers()} placeholder="Search users..." className="pl-9" />
          </div>
          <select value={role} onChange={(e) => setRole(e.target.value)} className="h-11 rounded-lg border bg-white px-3 text-sm">
            {roles.map((item) => <option key={item}>{item}</option>)}
          </select>
          <Button variant="outline" onClick={fetchUsers}>Search</Button>
        </div>
      </div>

      <div className="rounded-lg border bg-white">
        {loading ? (
          <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : users.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">No users found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-250 text-left text-sm">
              <thead className="border-b bg-muted/60 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Wallet</th>
                  <th className="px-4 py-3">Pets/Bookings</th>
                  <th className="px-4 py-3">Password</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((user) => (
                  <tr key={user.id} className="align-top">
                    <td className="px-4 py-4">
                      <Input defaultValue={user.name || ""} onBlur={(e) => updateUser(user.id, { name: e.target.value })} className="mb-2 h-9" />
                      <Input defaultValue={user.email || ""} onBlur={(e) => updateUser(user.id, { email: e.target.value })} className="mb-2 h-9" />
                      <Input defaultValue={user.phone || ""} onBlur={(e) => updateUser(user.id, { phone: e.target.value })} className="mt-2 h-9" />
                      <p className="mt-2 text-xs text-muted-foreground">Joined {user.created_at ? new Date(user.created_at).toLocaleDateString("en-IN") : "-"}</p>
                    </td>
                    <td className="px-4 py-4">
                      <select value={user.role} onChange={(e) => updateUser(user.id, { role: e.target.value })} className="h-9 rounded-lg border bg-white px-2 text-xs">
                        {roles.filter((item) => item !== "All").map((item) => <option key={item}>{item}</option>)}
                      </select>
                      {user.role === "STAFF" && (
                        <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                          <ShieldCheck className="h-3.5 w-3.5" />
                          Staff profile {user.staffProfile ? "linked" : "pending"}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <button onClick={() => updateUser(user.id, { is_active: !user.is_active })} className={`rounded-lg px-3 py-1 text-xs font-bold ${user.is_active ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                        {user.is_active ? "Active" : "Inactive"}
                      </button>
                      <button onClick={() => updateUser(user.id, { emailVerified: !user.emailVerified })} className={`mt-2 block rounded-lg px-3 py-1 text-xs font-bold ${user.emailVerified ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-700"}`}>
                        {user.emailVerified ? "Email verified" : "Mark verified"}
                      </button>
                    </td>
                    <td className="px-4 py-4">
                      <Input type="number" defaultValue={user.wallet_balance} onBlur={(e) => updateUser(user.id, { wallet_balance: e.target.value })} className="mb-2 h-9" />
                      <Input type="number" defaultValue={user.outstanding_balance} onBlur={(e) => updateUser(user.id, { outstanding_balance: e.target.value })} className="h-9" />
                    </td>
                    <td className="px-4 py-4">
                      <p>{user.pets.length} pets</p>
                      <p className="text-xs text-muted-foreground">{user.clientBookings.length} bookings</p>
                      <p className="mt-1 text-xs text-muted-foreground">{user.clientBookings.filter((booking) => booking.payment_status === "Paid").length} paid</p>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex min-w-56 gap-2">
                        <Input
                          type="password"
                          value={passwords[user.id] || ""}
                          onChange={(e) => setPasswords((prev) => ({ ...prev, [user.id]: e.target.value }))}
                          placeholder="New password"
                          className="h-9"
                        />
                        <Button size="sm" variant="outline" disabled={savingId === user.id || !passwords[user.id]} onClick={() => resetPassword(user.id)}>
                          <KeyRound className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <Button size="sm" variant="destructive" disabled={savingId === user.id} onClick={() => deleteUser(user.id)}>
                        {savingId === user.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
