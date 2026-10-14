import { useState, useEffect, useCallback } from "react";
import { api, getErrorMessage } from "@/api/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Table, THead, TBody, Tr, Th, Td } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Label, Input, FieldError } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export default function UserListPanel() {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Modal states
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", email: "", role: "Staff", is_active: true });
  const [editErrors, setEditErrors] = useState({});
  const [isUpdating, setIsUpdating] = useState(false);

  const [deactivatingUser, setDeactivatingUser] = useState(null);
  const [isDeactivating, setIsDeactivating] = useState(false);

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

  function startEdit(user) {
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
    setEditErrors({});
    setActionError(null);
    setIsUpdating(true);

    try {
      await api.updateUser(editingUser.id, editForm);
      setEditingUser(null);
      loadUsers();
    } catch (err) {
      if (err.data?.errors) {
        setEditErrors(err.data.errors);
      } else {
        setActionError(getErrorMessage(err));
      }
    } finally {
      setIsUpdating(false);
    }
  }

  async function confirmDeactivate() {
    if (!deactivatingUser) return;
    setActionError(null);
    setIsDeactivating(true);

    try {
      await api.deleteUser(deactivatingUser.id);
      setDeactivatingUser(null);
      loadUsers();
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setIsDeactivating(false);
    }
  }

  if (isLoading && users.length === 0) {
    return <p className="p-4 text-sm text-steel">Loading users…</p>;
  }

  if (error) {
    return <p className="p-4 text-sm text-red-600">Failed to load users: {error}</p>;
  }

  return (
    <div>
      <PageHeader title="Users" />

      {actionError && (
        <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
          {actionError}
        </p>
      )}

      {/* Edit Modal Popup */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md shadow-lg">
            <CardContent className="pt-6">
              <h3 className="mb-4 font-display text-lg font-bold text-ink">
                Edit User: {editingUser.name}
              </h3>
              <form onSubmit={handleUpdate}>
                <Field>
                  <Label htmlFor="edit-name">Full name</Label>
                  <Input
                    id="edit-name"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  />
                  <FieldError>{editErrors.name?.[0]}</FieldError>
                </Field>

                <Field>
                  <Label htmlFor="edit-email">Email address</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  />
                  <FieldError>{editErrors.email?.[0]}</FieldError>
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
                  <FieldError>{editErrors.role?.[0]}</FieldError>
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

                <div className="mt-6 flex justify-end gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setEditingUser(null)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="signal" size="sm" disabled={isUpdating}>
                    {isUpdating ? "Saving..." : "Save changes"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Deactivate Confirmation Modal Popup */}
      {deactivatingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-sm shadow-lg">
            <CardContent className="pt-6">
              <h3 className="mb-2 font-display text-lg font-bold text-ink">
                Confirm Deactivation
              </h3>
              <p className="mb-6 text-sm text-steel">
                Are you sure you want to deactivate <span className="font-semibold text-ink">{deactivatingUser.name}</span>? This will revoke their active sessions and prevent login.
              </p>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setDeactivatingUser(null)}
                  disabled={isDeactivating}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={confirmDeactivate}
                  disabled={isDeactivating}
                >
                  {isDeactivating ? "Deactivating..." : "Deactivate"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {users.length === 0 ? (
        <p className="p-4 text-sm text-steel">No users found.</p>
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
