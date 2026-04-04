"use client"

import { type FormEvent, useDeferredValue, useState } from "react"
import { useRouter } from "next/navigation"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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

const roleStyles: Record<UserRole, string> = {
  admin: "border-transparent bg-primary text-primary-foreground",
  staff: "border-transparent bg-[rgba(22,132,149,0.14)] text-[rgb(16,94,105)]",
  viewer: "border-border bg-background text-foreground",
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
    return "Not yet"
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value * 1000))
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}

interface ProfileShellProps {
  initialUser: UserSummary
  initialUsers: UserSummary[]
}

export function ProfileShell({
  initialUser,
  initialUsers,
}: ProfileShellProps) {
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

  const canReviewUsers =
    currentUser?.role === "staff" || currentUser?.role === "admin"
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
    <div className="relative isolate min-h-svh overflow-hidden px-5 py-8 sm:px-8 lg:px-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(237,173,54,0.24),transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(22,132,149,0.18),transparent_34%)]" />

      <div className="relative z-10 mx-auto flex max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-4 rounded-[2rem] border border-border/60 bg-background/75 p-6 shadow-[0_24px_90px_rgba(15,23,42,0.12)] backdrop-blur-xl lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <Badge className={roleStyles[currentUser.role]}>
                {currentUser.role}
              </Badge>
              <Badge variant="outline" className="border-border/70 bg-background/70">
                Session active
              </Badge>
            </div>
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.32em] text-muted-foreground">
                Crew profile
              </p>
              <h1 className="mt-2 font-heading text-3xl font-semibold text-balance sm:text-4xl">
                Welcome, {currentUser.full_name}
              </h1>
            </div>
            <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
              This page is connected to the backend session layer, so access changes
              with your role. Staff can inspect the directory and admins can add
              new accounts without leaving the app.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={() => void loadProfile({ silent: true })}
              disabled={isRefreshing || isLoggingOut}
            >
              {isRefreshing ? (
                <>
                  <Spinner />
                  Refreshing
                </>
              ) : (
                "Refresh data"
              )}
            </Button>
            <Button
              variant="secondary"
              onClick={() => void handleLogout()}
              disabled={isLoggingOut}
            >
              {isLoggingOut ? (
                <>
                  <Spinner />
                  Signing out
                </>
              ) : (
                "Logout"
              )}
            </Button>
          </div>
        </header>

        {pageError ? (
          <Alert variant="destructive">
            <AlertTitle>Unable to load the full workspace</AlertTitle>
            <AlertDescription>{pageError}</AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Card className="border border-border/60 bg-card/90 shadow-[0_20px_80px_rgba(15,23,42,0.1)]">
            <CardHeader>
              <CardTitle>Identity card</CardTitle>
              <CardDescription>
                Profile details resolved from the active session.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <Avatar size="lg" className="size-16 bg-primary/10">
                  <AvatarFallback className="bg-primary/10 text-lg font-semibold text-primary">
                    {initials(currentUser.full_name)}
                  </AvatarFallback>
                </Avatar>

                <div className="space-y-1">
                  <p className="text-2xl font-semibold">{currentUser.full_name}</p>
                  <p className="font-mono text-sm text-muted-foreground">
                    {currentUser.email}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[1.5rem] border border-border/70 bg-background/75 p-4">
                  <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
                    Access level
                  </p>
                  <p className="mt-3 text-lg font-semibold capitalize">
                    {currentUser.role}
                  </p>
                </div>
                <div className="rounded-[1.5rem] border border-border/70 bg-background/75 p-4">
                  <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
                    Last login
                  </p>
                  <p className="mt-3 text-lg font-semibold">
                    {formatDate(currentUser.last_login_at)}
                  </p>
                </div>
                <div className="rounded-[1.5rem] border border-border/70 bg-background/75 p-4">
                  <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
                    Member since
                  </p>
                  <p className="mt-3 text-lg font-semibold">
                    {formatDate(currentUser.created_at)}
                  </p>
                </div>
                <div className="rounded-[1.5rem] border border-border/70 bg-background/75 p-4">
                  <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
                    Status
                  </p>
                  <p className="mt-3 text-lg font-semibold">
                    {currentUser.is_active ? "Active" : "Disabled"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border/60 bg-card/90 shadow-[0_20px_80px_rgba(15,23,42,0.1)]">
            <CardHeader>
              <CardTitle>Role permissions</CardTitle>
              <CardDescription>
                Quick view of what your current session can do.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-[1.5rem] border border-border/70 bg-background/75 p-4">
                <p className="font-medium">Viewer</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Sign in, keep a profile, and access authenticated exports.
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-border/70 bg-background/75 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">Staff</p>
                  {canReviewUsers ? <Badge className={roleStyles.staff}>Enabled</Badge> : null}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Review the full user directory and staff-level protected tools.
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-border/70 bg-background/75 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">Admin</p>
                  {canCreateUsers ? <Badge className={roleStyles.admin}>Enabled</Badge> : null}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Create new viewer, staff, and admin accounts directly from the profile.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border border-border/60 bg-card/92 shadow-[0_20px_80px_rgba(15,23,42,0.1)]">
          <CardHeader className="gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <CardTitle>Team directory</CardTitle>
              <CardDescription>
                Visible to staff and admin sessions. Search updates without blocking the page.
              </CardDescription>
            </div>

            {canReviewUsers ? (
              <div className="w-full max-w-sm">
                <Label htmlFor="team-search" className="sr-only">
                  Search users
                </Label>
                <Input
                  id="team-search"
                  placeholder="Search by name, email, or role"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
            ) : null}
          </CardHeader>

          <CardContent>
            {canReviewUsers ? (
              filteredUsers.length > 0 ? (
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
                        <TableCell className="font-mono text-xs sm:text-sm">
                          {user.email}
                        </TableCell>
                        <TableCell>
                          <Badge className={roleStyles[user.role]}>{user.role}</Badge>
                        </TableCell>
                        <TableCell>{formatDate(user.last_login_at)}</TableCell>
                        <TableCell>{user.is_active ? "Active" : "Disabled"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="rounded-[1.5rem] border border-dashed border-border/70 bg-background/70 p-8 text-center text-sm text-muted-foreground">
                  No users matched the current search.
                </div>
              )
            ) : (
              <div className="rounded-[1.5rem] border border-dashed border-border/70 bg-background/70 p-8 text-center text-sm text-muted-foreground">
                Your current role can view only the personal profile card.
              </div>
            )}
          </CardContent>
        </Card>

        {canCreateUsers ? (
          <Card className="border border-border/60 bg-card/92 shadow-[0_20px_80px_rgba(15,23,42,0.1)]">
            <CardHeader>
              <CardTitle>Create a new user</CardTitle>
              <CardDescription>
                Admin-only user provisioning for viewer, staff, and admin accounts.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
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
                  <Label htmlFor="full_name">Full name</Label>
                  <Input
                    id="full_name"
                    value={createForm.full_name}
                    onChange={(event) =>
                      setCreateForm((current) => ({
                        ...current,
                        full_name: event.target.value,
                      }))
                    }
                    placeholder="Aruzhan Bekova"
                    disabled={isCreatingUser}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new_email">Email</Label>
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
                    placeholder="aruzhan@rook.local"
                    disabled={isCreatingUser}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new_password">Temporary password</Label>
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
                  <Label htmlFor="role">Role</Label>
                  <select
                    id="role"
                    className="h-9 w-full rounded-3xl border border-transparent bg-input/50 px-3 text-sm outline-none transition-[box-shadow,border-color] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
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

                <div className="md:col-span-2 flex flex-wrap justify-end gap-3">
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
                    Reset form
                  </Button>
                  <Button type="submit" disabled={isCreatingUser}>
                    {isCreatingUser ? (
                      <>
                        <Spinner />
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
    </div>
  )
}
