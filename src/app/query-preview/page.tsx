"use client";

import { useState } from "react";

import Typography from "@/components/shared/typography";
import { Button } from "@/components/ui/button";
import { useProducts } from "@/features/demo-products/api";
import { CreateProductForm } from "@/features/demo-products/create-product-form";
import { getHttpErrorDetails } from "@/lib/axios";

export default function QueryPreviewPage() {
  const [simulateError, setSimulateError] = useState(false);

  // Query
  const { data, error, isPending, isError, isFetching, refetch } = useProducts({
    simulateError,
  });

  // Error Details
  const errorDetails = isError ? getHttpErrorDetails(error) : null;

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 py-16">
      {/* Header */}
      <section className="space-y-2">
        <Typography as="h1" variant="heading" size="4xl">
          TanStack Query Preview
        </Typography>

        <Typography className="text-muted-foreground">
          Testing forms, validation, queries, and mutations.
        </Typography>
      </section>

      {/* Create Product */}
      <CreateProductForm />

      {/* Query Actions */}
      <section className="flex flex-wrap gap-3">
        <Button onClick={() => setSimulateError(false)}>Success Mode</Button>

        <Button variant="destructive" onClick={() => setSimulateError(true)}>
          Error Mode
        </Button>

        <Button
          variant="outline"
          disabled={isFetching}
          onClick={() => void refetch()}
        >
          {isFetching ? "Fetching..." : "Refetch"}
        </Button>
      </section>

      {/* Loading */}
      {isPending && (
        <Typography className="text-muted-foreground">
          Loading products...
        </Typography>
      )}

      {/* Error */}
      {isError && errorDetails && (
        <section role="alert" className="space-y-2 rounded-lg border p-4">
          <Typography as="h2" variant="heading" size="lg">
            API Error
          </Typography>

          <Typography size="sm">
            HTTP Status: {errorDetails.status ?? "N/A"}
          </Typography>

          <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs whitespace-pre-wrap">
            {JSON.stringify(
              errorDetails.data ?? {
                message:
                  error instanceof Error ? error.message : "Unknown error",
              },
              null,
              2,
            )}
          </pre>
        </section>
      )}

      {/* Products */}
      {data && !isError && (
        <section className="space-y-3">
          <Typography as="h2" variant="heading" size="2xl">
            Products
          </Typography>

          {data.length === 0 ? (
            <Typography>No products found.</Typography>
          ) : (
            data.map((product) => (
              <div
                key={product.id}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <Typography>{product.name}</Typography>

                <Typography>
                  Rp {product.price.toLocaleString("id-ID")}
                </Typography>
              </div>
            ))
          )}
        </section>
      )}

      {isFetching && !isPending && (
        <Typography size="xs" className="text-muted-foreground">
          Fetching latest data...
        </Typography>
      )}
    </main>
  );
}
