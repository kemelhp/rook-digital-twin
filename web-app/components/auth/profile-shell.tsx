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
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4 sm:p-5 lg:p-6">
        <header className="flex flex-col gap-4 rounded-2xl border border-[#1E2640] bg-[#0D1220] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-[#E2E8F0] sm:text-2xl">{currentUser.full_name}</h1>
              <Badge className={roleStyles[currentUser.role]}>{currentUser.role}</Badge>
            </div>
            <p className="font-mono text-xs text-[#94A3B8] sm:text-sm">{currentUser.email}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => void loadProfile({ silent: true })}
              disabled={isRefreshing || isLoggingOut}
              className="border-[#1E2640] bg-[#141929] text-[#94A3B8] hover:bg-[#1A2339] hover:text-[#E2E8F0]"
            >
              {isRefreshing ? (
                <>
                  <Spinner />
                  Refreshing
                </>
              ) : (
                "Refresh"
              )}
            </Button>
            <Button
              variant="secondary"
              onClick={() => void handleLogout()}
              disabled={isLoggingOut}
              className="border border-[#2D4A80] bg-[#1E2D50] text-[#60A5FA] hover:bg-[#223761]"
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
          <Alert variant="destructive" className="border-red-500/50 bg-red-500/10 text-red-200">
            <AlertTitle>Unable to load profile</AlertTitle>
            <AlertDescription>{pageError}</AlertDescription>
          </Alert>
        ) : null}

        <Card className="border border-[#1E2640] bg-[#0D1220]">
          <CardHeader>
            <CardTitle className="text-[#E2E8F0]">Profile</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-[#1E2640] bg-[#0A0E1A] p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-[#64748B]">Role</p>
              <p className="mt-2 text-base font-semibold capitalize text-[#E2E8F0]">{currentUser.role}</p>
            </div>
            <div className="rounded-xl border border-[#1E2640] bg-[#0A0E1A] p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-[#64748B]">Last login</p>
              <p className="mt-2 text-base font-semibold text-[#E2E8F0]">{formatDate(currentUser.last_login_at)}</p>
            </div>
            <div className="rounded-xl border border-[#1E2640] bg-[#0A0E1A] p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-[#64748B]">Member since</p>
              <p className="mt-2 text-base font-semibold text-[#E2E8F0]">{formatDate(currentUser.created_at)}</p>
            </div>
            <div className="rounded-xl border border-[#1E2640] bg-[#0A0E1A] p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-[#64748B]">Status</p>
              <p className="mt-2 text-base font-semibold text-[#E2E8F0]">{currentUser.is_active ? "Active" : "Disabled"}</p>
            </div>
          </CardContent>
        </Card>

        {canReviewUsers ? (
          <Card className="border border-[#1E2640] bg-[#0D1220]">
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="text-[#E2E8F0]">Team users</CardTitle>
                <div className="w-full sm:w-72">
                  <Label htmlFor="team-search" className="sr-only">
                    Search users
                  </Label>
                  <Input
                    id="team-search"
                    placeholder="Search by name, email, or role"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="border-[#1E2640] bg-[#0A0E1A] text-[#E2E8F0] placeholder:text-[#64748B]"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredUsers.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow className="border-[#1E2640] hover:bg-transparent">
                      <TableHead className="text-[#64748B]">Name</TableHead>
                      <TableHead className="text-[#64748B]">Email</TableHead>
                      <TableHead className="text-[#64748B]">Role</TableHead>
                      <TableHead className="text-[#64748B]">Last login</TableHead>
                      <TableHead className="text-[#64748B]">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id} className="border-[#1E2640] text-[#E2E8F0]">
                        <TableCell className="font-medium">{user.full_name}</TableCell>
                        <TableCell className="font-mono text-xs sm:text-sm">{user.email}</TableCell>
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
                <div className="rounded-xl border border-dashed border-[#1E2640] bg-[#0A0E1A] p-8 text-center text-sm text-[#64748B]">
                  No users matched the current search.
                </div>
              )}
            </CardContent>
          </Card>
        ) : null}

        {canCreateUsers ? (
          <Card className="border border-[#1E2640] bg-[#0D1220]">
            <CardHeader>
              <CardTitle className="text-[#E2E8F0]">Create user</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {createError ? (
                <Alert variant="destructive" className="border-red-500/50 bg-red-500/10 text-red-200">
                  <AlertTitle>User creation failed</AlertTitle>
                  <AlertDescription>{createError}</AlertDescription>
                </Alert>
              ) : null}

              {createSuccess ? (
                <Alert className="border-[#166534] bg-[#0D2A1A] text-[#86EFAC]">
                  <AlertTitle>User created</AlertTitle>
                  <AlertDescription>{createSuccess}</AlertDescription>
                </Alert>
              ) : null}

              <form className="grid gap-4 md:grid-cols-2" onSubmit={handleCreateUser}>
                <div className="space-y-2">
                  <Label htmlFor="full_name" className="text-[#94A3B8]">Full name</Label>
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
                    className="border-[#1E2640] bg-[#0A0E1A] text-[#E2E8F0] placeholder:text-[#64748B]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new_email" className="text-[#94A3B8]">Email</Label>
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
                    className="border-[#1E2640] bg-[#0A0E1A] text-[#E2E8F0] placeholder:text-[#64748B]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new_password" className="text-[#94A3B8]">Temporary password</Label>
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
                    className="border-[#1E2640] bg-[#0A0E1A] text-[#E2E8F0] placeholder:text-[#64748B]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role" className="text-[#94A3B8]">Role</Label>
                  <select
                    id="role"
                    className="h-9 w-full rounded-3xl border border-[#1E2640] bg-[#0A0E1A] px-3 text-sm text-[#E2E8F0] outline-none transition-[box-shadow,border-color] focus-visible:border-[#3B82F6] focus-visible:ring-3 focus-visible:ring-[#3B82F6]/30"
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
                    className="border-[#1E2640] bg-[#141929] text-[#94A3B8] hover:bg-[#1A2339] hover:text-[#E2E8F0]"
                  >
                    Reset form
                  </Button>
                  <Button
                    type="submit"
                    disabled={isCreatingUser}
                    className="border border-[#2D4A80] bg-[#1E2D50] text-[#60A5FA] hover:bg-[#223761]"
                  >
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
  )
}
