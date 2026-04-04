"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { type FormEvent, useState, useTransition } from "react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
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
import { Button } from "@/components/ui/button"
import { ApiError, login } from "@/lib/api"

const demoAccounts = [
  {
    role: "Admin",
    email: "admin@rook.local",
    password: "ChangeMe123!",
  },
  {
    role: "Staff",
    email: "staff@rook.local",
    password: "ChangeMe123!",
  },
] as const

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    return error.message
  }
  if (error instanceof Error) {
    return error.message
  }
  return "Unable to sign in right now."
}

export function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isPending, startTransition] = useTransition()

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      await login(email, password)
      startTransition(() => {
        router.replace("/profile")
      })
    } catch (submitError) {
      setError(getErrorMessage(submitError))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="relative isolate flex min-h-svh items-center justify-center overflow-hidden px-5 py-10 sm:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(237,173,54,0.28),transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(22,132,149,0.2),transparent_34%)]" />
      <div className="pointer-events-none absolute inset-y-0 right-[-14%] hidden w-[34rem] rounded-full bg-[radial-gradient(circle,_rgba(15,23,42,0.15),transparent_68%)] blur-3xl lg:block" />

      <div className="relative z-10 grid w-full max-w-6xl gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-[2rem] border border-border/60 bg-background/75 p-6 shadow-[0_24px_90px_rgba(15,23,42,0.14)] backdrop-blur-xl sm:p-8 lg:p-10">
          <div className="flex flex-wrap items-center gap-3">
            <Badge className="bg-primary/90 text-primary-foreground">Session auth</Badge>
            <Badge variant="outline" className="border-foreground/10 bg-background/70">
              Locomotive digital twin
            </Badge>
          </div>

          <div className="mt-8 max-w-2xl space-y-5">
            <p className="text-sm font-medium uppercase tracking-[0.32em] text-muted-foreground">
              Rook operations cockpit
            </p>
            <h1 className="font-heading text-4xl leading-tight font-semibold text-balance sm:text-5xl">
              Sign in with your email and open the crew profile workspace.
            </h1>
            <p className="max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
              This frontend now uses real cookie-backed sessions from the backend,
              so staff accounts can manage users while operators keep a private
              profile and access-controlled tools.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            <Card size="sm" className="border border-border/70 bg-card/80 shadow-none">
              <CardHeader>
                <CardTitle>Cookie sessions</CardTitle>
                <CardDescription>
                  HTTP-only session cookies with role-based checks.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card size="sm" className="border border-border/70 bg-card/80 shadow-none">
              <CardHeader>
                <CardTitle>Staff directory</CardTitle>
                <CardDescription>
                  Staff and admin accounts can review the full team roster.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card size="sm" className="border border-border/70 bg-card/80 shadow-none">
              <CardHeader>
                <CardTitle>Admin controls</CardTitle>
                <CardDescription>
                  Admin users can create more viewer and staff accounts.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          <div className="mt-10 rounded-[1.75rem] border border-dashed border-border/70 bg-background/65 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Bootstrap demo accounts</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Change these environment defaults before deploying anywhere public.
                </p>
              </div>
              <Badge variant="outline">Local setup</Badge>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {demoAccounts.map((account) => (
                <div
                  key={account.email}
                  className="rounded-[1.5rem] border border-border/60 bg-card/85 p-4"
                >
                  <p className="text-sm font-medium">{account.role}</p>
                  <p className="mt-3 font-mono text-sm">{account.email}</p>
                  <p className="mt-1 font-mono text-sm text-muted-foreground">
                    {account.password}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <Card className="border border-border/60 bg-card/90 shadow-[0_24px_90px_rgba(15,23,42,0.12)] backdrop-blur-xl">
          <CardHeader className="gap-3">
            <Badge variant="outline" className="w-fit border-primary/30 bg-primary/10 text-primary">
              Account access
            </Badge>
            <CardTitle className="text-2xl">Welcome back</CardTitle>
            <CardDescription>
              Use your email and password to start a new authenticated session.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            {error ? (
              <Alert variant="destructive">
                <AlertTitle>Sign-in failed</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={isSubmitting || isPending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={isSubmitting || isPending}
                />
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={isSubmitting || isPending}
              >
                {isSubmitting || isPending ? (
                  <>
                    <Spinner />
                    Signing in
                  </>
                ) : (
                  "Open profile workspace"
                )}
              </Button>
            </form>

            <div className="rounded-[1.5rem] border border-border/70 bg-background/70 p-4 text-sm text-muted-foreground">
              Profile and user-management tools become available after the backend
              sets the session cookie. Browser credentials must be enabled for the
              API origin.
            </div>

            <p className="text-sm text-muted-foreground">
              API base URL:{" "}
              <Link
                href={process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}
                className="font-medium text-foreground underline decoration-primary/40 underline-offset-4"
                target="_blank"
                rel="noreferrer"
              >
                {process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
