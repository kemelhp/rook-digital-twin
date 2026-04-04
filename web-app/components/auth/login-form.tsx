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
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden bg-[#0A0E1A] px-5 py-10 sm:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(59,130,246,0.2),transparent_34%),radial-gradient(circle_at_82%_78%,rgba(14,165,233,0.14),transparent_36%)]" />
      <div className="relative w-full max-w-md">
        <Card className="border border-[#1E2640] bg-[#0D1220]/95 shadow-[0_20px_70px_rgba(2,6,23,0.65)]">
          <CardHeader className="space-y-2 pb-4">
            <CardTitle className="text-2xl text-[#E2E8F0]">Sign in</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error ? (
              <Alert variant="destructive" className="border-red-500/50 bg-red-500/10 text-red-200">
                <AlertTitle>Sign-in failed</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[#94A3B8]">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={isSubmitting || isPending}
                  className="border-[#1E2640] bg-[#0A0E1A] text-[#E2E8F0] placeholder:text-[#64748B]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-[#94A3B8]">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={isSubmitting || isPending}
                  className="border-[#1E2640] bg-[#0A0E1A] text-[#E2E8F0] placeholder:text-[#64748B]"
                />
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full border border-[#2D4A80] bg-[#1E2D50] text-[#60A5FA] hover:bg-[#223761]"
                disabled={isSubmitting || isPending}
              >
                {isSubmitting || isPending ? (
                  <>
                    <Spinner />
                    Signing in
                  </>
                ) : (
                  "Login"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
