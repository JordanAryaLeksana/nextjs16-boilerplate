"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { getHttpErrorDetails } from "@/lib/axios";

import {
  getOAuthLoginUrl,
  loginSchema,
  useLogin,
  type LoginInput,
} from "./api";

// Form
export function LoginForm() {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Mutation
  const login = useLogin({
    mutationConfig: {
      onSuccess: () => router.replace("/dashboard"),
    },
  });

  // Error Details
  const errorDetails = login.isError ? getHttpErrorDetails(login.error) : null;

  return (
    <section className="space-y-4 rounded-lg border p-5">
      <form
        noValidate
        onSubmit={handleSubmit((values) => login.mutate(values))}
      >
        <FieldGroup>
          {/* Email */}
          <Field data-invalid={!!errors.email}>
            <FieldLabel htmlFor="login-email">Email</FieldLabel>

            <Input
              id="login-email"
              type="email"
              autoComplete="email"
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? "login-email-error" : undefined}
              {...register("email")}
            />

            {errors.email && (
              <FieldError id="login-email-error">
                {errors.email.message}
              </FieldError>
            )}
          </Field>

          {/* Password */}
          <Field data-invalid={!!errors.password}>
            <FieldLabel htmlFor="login-password">Password</FieldLabel>

            <Input
              id="login-password"
              type="password"
              autoComplete="current-password"
              aria-invalid={!!errors.password}
              aria-describedby={
                errors.password ? "login-password-error" : undefined
              }
              {...register("password")}
            />

            {errors.password && (
              <FieldError id="login-password-error">
                {errors.password.message}
              </FieldError>
            )}
          </Field>

          <Button type="submit" disabled={login.isPending}>
            {login.isPending ? "Signing in..." : "Sign in"}
          </Button>

          <FieldSeparator>or</FieldSeparator>

          {/* OAuth */}
          <Button asChild variant="outline">
            <a href={getOAuthLoginUrl("google")}>Continue with Google</a>
          </Button>
        </FieldGroup>
      </form>

      {/* Mutation Result */}
      {errorDetails && (
        <div role="alert" className="space-y-2">
          <p className="text-sm text-destructive">
            Sign in failed (HTTP {errorDetails.status ?? "N/A"}).
          </p>

          <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs whitespace-pre-wrap">
            {JSON.stringify(
              errorDetails.data ?? {
                message: login.error?.message,
                code: errorDetails.code,
              },
              null,
              2,
            )}
          </pre>
        </div>
      )}
    </section>
  );
}
