"use client"

import { useRouter } from "next/navigation"
import { type FormEvent, useState, useTransition } from "react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { Button } from "@/components/ui/button"
import { ApiError, login } from "@/lib/api"

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
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4 py-10 sm:px-8">
      <div className="relative w-full max-w-md">
        <Card className="shadow-lg">
          <CardHeader className="space-y-1 border-b pb-6">
            <div className="flex flex-col gap-1">
              <div className="flex items-baseline gap-2">
                <CardTitle className="text-3xl font-bold tracking-tight">
                  rook
                </CardTitle>
                <span className="text-xs font-mono font-semibold tracking-widest text-muted-foreground">
                  DIGITAL TWIN
                </span>
              </div>
              <p className="text-sm text-muted-foreground">Locomotive Telemetry Control Center</p>
            </div>
          </CardHeader>

          <CardContent className="space-y-6 pt-6">
            {error ? (
              <Alert variant="destructive">
                <AlertTitle>Sign-in failed</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-widest">
                  Email address
                </Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="operator@rook.local"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={isSubmitting || isPending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-widest">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
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
                    <Spinner className="mr-2 h-4 w-4" />
                    Authenticating
                  </>
                ) : (
                  "Sign in"
                )}
              </Button>
            </form>

            <div className="border-t pt-4">
              <p className="text-xs text-muted-foreground text-center">
                <span className="font-mono">Default credentials:</span>
                <br />
                admin@rook.local / ChangeMe123!
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
