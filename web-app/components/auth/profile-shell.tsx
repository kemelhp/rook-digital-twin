"use client"

import { type FormEvent, useDeferredValue, useState } from "react"
import { useRouter } from "next/navigation"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ApiError,
  createUser,
  fetchCurrentUser,
  fetchUsers,
  logout,
  type CreateUserRequest,
  type UserRole,
  type UserSummary,
} from "@/lib/api"

const defaultCreateForm: CreateUserRequest = {
  email: "",
  password: "",
  full_name: "",
  role: "viewer",
}

const roleVariants: Record<UserRole, "default" | "secondary" | "outline" | "destructive"> = {
  admin: "default",
  staff: "secondary",
  viewer: "outline",
}

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    return error.message
  }
  if (error instanceof Error) {
    return error.message
  }
  return "Something went wrong."
}

function formatDate(value: number | null) {
  if (!value) {
    return "Never"
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value * 1000))
}

interface ProfileShellProps {
  initialUser: UserSummary
  initialUsers: UserSummary[]
}

export function ProfileShell({ initialUser, initialUsers }: ProfileShellProps) {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<UserSummary | null>(initialUser)
  const [users, setUsers] = useState<UserSummary[]>(initialUsers)
  const [pageError, setPageError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [createForm, setCreateForm] = useState<CreateUserRequest>(defaultCreateForm)
  const [createError, setCreateError] = useState<string | null>(null)
  const [createSuccess, setCreateSuccess] = useState<string | null>(null)
  const [isCreatingUser, setIsCreatingUser] = useState(false)
  const [search, setSearch] = useState("")
  const deferredSearch = useDeferredValue(search)

  const canReviewUsers = currentUser?.role === "staff" || currentUser?.role === "admin"
  const canCreateUsers = currentUser?.role === "admin"

  const filteredUsers = users.filter((user) => {
    const query = deferredSearch.trim().toLowerCase()
    if (!query) {
      return true
    }

    return [user.full_name, user.email, user.role].some((value) =>
      value.toLowerCase().includes(query)
    )
  })

  async function loadProfile(options?: { silent?: boolean }) {
    const silent = options?.silent ?? false
    setPageError(null)
    setCreateError(null)

    if (silent) {
      setIsRefreshing(true)
    }

    try {
      const user = await fetchCurrentUser()
      let nextUsers: UserSummary[] = []

      if (user.role === "staff" || user.role === "admin") {
        nextUsers = await fetchUsers()
      }

      setCurrentUser(user)
      setUsers(nextUsers)
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        router.replace("/login")
        return
      }
      setPageError(getErrorMessage(error))
    } finally {
      setIsRefreshing(false)
    }
  }

  async function handleLogout() {
    setPageError(null)
    setIsLoggingOut(true)

    try {
      await logout()
      router.replace("/login")
    } catch (error) {
      setPageError(getErrorMessage(error))
    } finally {
      setIsLoggingOut(false)
    }
  }

  async function handleCreateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setCreateError(null)
    setCreateSuccess(null)
    setIsCreatingUser(true)

    try {
      const created = await createUser(createForm)
      setCreateForm(defaultCreateForm)
      setCreateSuccess(`${created.full_name} can now sign in as ${created.role}.`)
      await loadProfile({ silent: true })
    } catch (error) {
      setCreateError(getErrorMessage(error))
    } finally {
      setIsCreatingUser(false)
    }
  }

  if (!currentUser) {
    return null
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <Card className="shadow-lg">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-3">
              <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                  {currentUser.full_name}
                </h1>
                <p className="text-sm text-muted-foreground font-mono">{currentUser.email}</p>
              </div>
              <Badge variant={roleVariants[currentUser.role]}>
                {currentUser.role.toUpperCase()}
              </Badge>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => void loadProfile({ silent: true })}
                disabled={isRefreshing || isLoggingOut}
              >
                {isRefreshing ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />
                    Refreshing
                  </>
                ) : (
                  "Refresh"
                )}
              </Button>
              <Button
                variant="destructive"
                onClick={() => void handleLogout()}
                disabled={isLoggingOut}
              >
                {isLoggingOut ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />
                    Signing out
                  </>
                ) : (
                  "Sign out"
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {pageError ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to load profile</AlertTitle>
          <AlertDescription>{pageError}</AlertDescription>
        </Alert>
      ) : null}

      <Card className="shadow-lg">
        <CardHeader className="border-b pb-4">
          <CardTitle>Profile Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 pt-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border bg-muted p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Role</p>
            <p className="mt-3 text-base font-semibold capitalize">{currentUser.role}</p>
          </div>
          <div className="rounded-lg border bg-muted p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Last login</p>
            <p className="mt-3 text-base font-semibold">{formatDate(currentUser.last_login_at)}</p>
          </div>
          <div className="rounded-lg border bg-muted p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Member since</p>
            <p className="mt-3 text-base font-semibold">{formatDate(currentUser.created_at)}</p>
          </div>
          <div className="rounded-lg border bg-muted p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Status</p>
            <p className="mt-3 text-base font-semibold">
              {currentUser.is_active ? (
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-green-500" />
                  Active
                </span>
              ) : (
                <span className="text-muted-foreground">Disabled</span>
              )}
            </p>
          </div>
        </CardContent>
      </Card>

      {canReviewUsers ? (
        <Card className="shadow-lg">
          <CardHeader className="border-b pb-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle>Team Members</CardTitle>
              <div className="w-full sm:w-64">
                <Label htmlFor="team-search" className="sr-only">
                  Search users
                </Label>
                <Input
                  id="team-search"
                  placeholder="Search by name, email, or role..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {filteredUsers.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Last login</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.full_name}</TableCell>
                        <TableCell className="font-mono text-xs sm:text-sm text-muted-foreground">{user.email}</TableCell>
                        <TableCell>
                          <Badge variant={roleVariants[user.role]}>
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{formatDate(user.last_login_at)}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {user.is_active ? (
                            <span className="flex items-center gap-2">
                              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                              Active
                            </span>
                          ) : (
                            <span>Disabled</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed bg-muted p-8 text-center text-sm text-muted-foreground">
                No users matched the current search.
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      {canCreateUsers ? (
        <Card className="shadow-lg">
          <CardHeader className="border-b pb-4">
            <CardTitle>Create User</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            {createError ? (
              <Alert variant="destructive">
                <AlertTitle>User creation failed</AlertTitle>
                <AlertDescription>{createError}</AlertDescription>
              </Alert>
            ) : null}

            {createSuccess ? (
              <Alert>
                <AlertTitle>User created</AlertTitle>
                <AlertDescription>{createSuccess}</AlertDescription>
              </Alert>
            ) : null}

            <form className="grid gap-4 md:grid-cols-2" onSubmit={handleCreateUser}>
              <div className="space-y-2">
                <Label htmlFor="full_name" className="text-xs font-semibold uppercase tracking-widest">
                  Full name
                </Label>
                <Input
                  id="full_name"
                  value={createForm.full_name}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      full_name: event.target.value,
                    }))
                  }
                  placeholder="John Doe"
                  disabled={isCreatingUser}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new_email" className="text-xs font-semibold uppercase tracking-widest">
                  Email
                </Label>
                <Input
                  id="new_email"
                  type="email"
                  value={createForm.email}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                  placeholder="operator@rook.local"
                  disabled={isCreatingUser}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new_password" className="text-xs font-semibold uppercase tracking-widest">
                  Temporary password
                </Label>
                <Input
                  id="new_password"
                  type="password"
                  value={createForm.password}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      password: event.target.value,
                    }))
                  }
                  placeholder="At least 8 characters"
                  disabled={isCreatingUser}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role" className="text-xs font-semibold uppercase tracking-widest">
                  Role
                </Label>
                <select
                  id="role"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition-all"
                  value={createForm.role}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      role: event.target.value as UserRole,
                    }))
                  }
                  disabled={isCreatingUser}
                >
                  <option value="viewer">Viewer</option>
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="flex flex-wrap justify-end gap-3 md:col-span-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setCreateForm(defaultCreateForm)
                    setCreateError(null)
                    setCreateSuccess(null)
                  }}
                  disabled={isCreatingUser}
                >
                  Reset
                </Button>
                <Button
                  type="submit"
                  disabled={isCreatingUser}
                >
                  {isCreatingUser ? (
                    <>
                      <Spinner className="mr-2 h-4 w-4" />
                      Creating user
                    </>
                  ) : (
                    "Create user"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
