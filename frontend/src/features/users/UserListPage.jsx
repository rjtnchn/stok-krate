import { useCallback, useEffect, useState } from "react";
import { api, getErrorMessage } from "@/api/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Table, THead, TBody, Tr, Th, Td, EmptyState } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Label, Input, FieldError } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const ROLES = [
  { value: "Staff", label: "Staff", description: "Places and fulfils orders" },
  { value: "Admin", label: "Admin", description: "Full system access" },
];

function firstMessage(value) {
  return Array.isArray(value) ? value[0] : value;
}

function ModalShell({ title, children, onClose, maxWidth = "max-w-md" }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className={`w-full ${maxWidth} shadow-lg`}>
        <CardContent className="pt-6">
          <div className="mb-4 flex items-start justify-between gap-3">
            <h3 className="font-display text-lg font-bold text-ink">{title}</h3>
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
          {children}
        </CardContent>
      </Card>
    </div>
  );
}

export default function UserListPanel() {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", email: "", password: "", role: "Staff" });
  const [addErrors, setAddErrors] = useState({});
  const [adding, setAdding] = useState(false);

  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", email: "", role: "Staff", is_active: true });
  const [editErrors, setEditErrors] = useState({});
  const [updating, setUpdating] = useState(false);

  const [deactivatingUser, setDeactivatingUser] = useState(null);
  const [deactivating, setDeactivating] = useState(false);

  const [actionError, setActionError] = useState(null);

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.getUsers();
      setUsers(res.data || res);
      setError(null);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  function openAddModal() {
    setActionError(null);
    setAddErrors({});
    setAddForm({ name: "", email: "", password: "", role: "Staff" });
    setShowAddModal(true);
  }

  async function handleAddSubmit(e) {
    e.preventDefault();
    setActionError(null);
    setAddErrors({});
    setAdding(true);

    try {
      await api.createUser(addForm);
      setShowAddModal(false);
      await loadUsers();
    } catch (err) {
      if (err.body?.errors) {
        setAddErrors(err.body.errors);
      } else {
        setActionError(getErrorMessage(err));
      }
    } finally {
      setAdding(false);
    }
  }

  function startEdit(user) {
    setActionError(null);
    setEditingUser(user);
    setEditForm({
      name: user.name,
      email: user.email,
      role: user.role,
      is_active: user.is_active,
    });
    setEditErrors({});
  }

  async function handleUpdate(e) {
    e.preventDefault();
    setActionError(null);
    setEditErrors({});
    setUpdating(true);

    try {
      await api.updateUser(editingUser.id, editForm);
      setEditingUser(null);
      await loadUsers();
    } catch (err) {
      if (err.body?.errors) {
        setEditErrors(err.body.errors);
      } else {
        setActionError(getErrorMessage(err));
      }
    } finally {
      setUpdating(false);
    }
  }

  async function confirmDeactivate() {
    if (!deactivatingUser) return;
    setActionError(null);
    setDeactivating(true);

    try {
      await api.deleteUser(deactivatingUser.id);
      setDeactivatingUser(null);
      await loadUsers();
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setDeactivating(false);
    }
  }

  if (isLoading && users.length === 0) {
    return <p className="p-4 text-sm text-steel">Loading users…</p>;
  }

  if (error) {
    return <p className="p-4 text-sm text-rust">Failed to load users: {error}</p>;
  }

  return (
    <div>
      <PageHeader
        title="Users"
        actions={
          <Button variant="signal" size="sm" onClick={openAddModal}>
            Add user
          </Button>
        }
      />

      {actionError && (
        <p className="mb-4 rounded-md bg-rust-bg px-3 py-2 text-sm text-rust">{actionError}</p>
      )}

      {showAddModal && (
        <ModalShell title="Add user" onClose={() => setShowAddModal(false)}>
          <form onSubmit={handleAddSubmit}>
            <Field>
              <Label htmlFor="add-name">Full name</Label>
              <Input
                id="add-name"
                value={addForm.name}
                onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                placeholder="e.g. Juan Garcia"
              />
              <FieldError>{firstMessage(addErrors.name)}</FieldError>
            </Field>

            <Field>
              <Label htmlFor="add-email">Email address</Label>
              <Input
                id="add-email"
                type="email"
                value={addForm.email}
                onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                placeholder="e.g. jgarcia@wb.com"
              />
              <FieldError>{firstMessage(addErrors.email)}</FieldError>
            </Field>

            <Field>
              <Label htmlFor="add-password">Password</Label>
              <Input
                id="add-password"
                type="password"
                value={addForm.password}
                onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                placeholder="At least 8 characters"
              />
              <FieldError>{firstMessage(addErrors.password)}</FieldError>
            </Field>

            <Field>
              <Label>Role</Label>
              <div className="grid grid-cols-2 gap-2">
                {ROLES.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setAddForm({ ...addForm, role: r.value })}
                    className={cn(
                      "rounded-md border px-3 py-2.5 text-left",
                      addForm.role === r.value ? "border-signal bg-teal-bg" : "border-line bg-white hover:border-steel-soft"
                    )}
                  >
                    <div className="text-sm font-semibold text-ink">{r.label}</div>
                    <div className="text-xs text-steel">{r.description}</div>
                  </button>
                ))}
              </div>
              <FieldError>{firstMessage(addErrors.role)}</FieldError>
            </Field>

            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowAddModal(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="signal" size="sm" disabled={adding}>
                {adding ? "Adding…" : "Add user"}
              </Button>
            </div>
          </form>
        </ModalShell>
      )}

      {editingUser && (
        <ModalShell title={`Edit user: ${editingUser.name}`} onClose={() => setEditingUser(null)}>
          <form onSubmit={handleUpdate}>
            <Field>
              <Label htmlFor="edit-name">Full name</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
              <FieldError>{firstMessage(editErrors.name)}</FieldError>
            </Field>

            <Field>
              <Label htmlFor="edit-email">Email address</Label>
              <Input
                id="edit-email"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              />
              <FieldError>{firstMessage(editErrors.email)}</FieldError>
            </Field>

            <Field>
              <Label>Role</Label>
              <div className="grid grid-cols-2 gap-2">
                {["Staff", "Admin"].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setEditForm({ ...editForm, role: r })}
                    className={cn(
                      "rounded-md border px-3 py-2.5 text-left text-sm font-semibold",
                      editForm.role === r ? "border-signal bg-teal-bg text-ink" : "border-line bg-white text-steel"
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <FieldError>{firstMessage(editErrors.role)}</FieldError>
            </Field>

            <Field>
              <label className="flex items-center gap-2 text-sm font-medium text-ink">
                <input
                  type="checkbox"
                  checked={editForm.is_active}
                  onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                  className="rounded border-line"
                />
                Active account
              </label>
            </Field>

            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setEditingUser(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="signal" size="sm" disabled={updating}>
                {updating ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </form>
        </ModalShell>
      )}

      {deactivatingUser && (
        <ModalShell title="Confirm deactivation" onClose={() => setDeactivatingUser(null)} maxWidth="max-w-sm">
          <p className="mb-6 text-sm text-steel">
            Deactivate <span className="font-semibold text-ink">{deactivatingUser.name}</span>? This will revoke access and prevent login.
          </p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setDeactivatingUser(null)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" size="sm" onClick={confirmDeactivate} disabled={deactivating}>
              {deactivating ? "Deactivating…" : "Deactivate"}
            </Button>
          </div>
        </ModalShell>
      )}

      {users.length === 0 ? (
        <EmptyState>No users found.</EmptyState>
      ) : (
        <Table>
          <THead>
            <Tr>
              <Th>Name</Th>
              <Th>Email</Th>
              <Th>Role</Th>
              <Th>Status</Th>
              <Th className="text-right">Actions</Th>
            </Tr>
          </THead>
          <TBody>
            {users.map((user) => (
              <Tr key={user.id}>
                <Td className="font-medium">{user.name}</Td>
                <Td className="code text-[12px] text-steel">{user.email}</Td>
                <Td>
                  <Badge tone={user.role === "Admin" ? "ink" : "neutral"} className="capitalize">
                    {user.role}
                  </Badge>
                </Td>
                <Td>
                  <Badge tone={user.is_active ? "good" : "neutral"} className="capitalize">
                    {user.is_active ? "Active" : "Deactivated"}
                  </Badge>
                </Td>
                <Td className="text-right">
                  <div className="inline-flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => startEdit(user)}>
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setDeactivatingUser(user)}
                      disabled={!user.is_active}
                    >
                      {user.is_active ? "Deactivate" : "Deactivated"}
                    </Button>
                  </div>
                </Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}
