"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { getHttpErrorDetails } from "@/lib/axios";

import {
  createProductSchema,
  useCreateProduct,
  type CreateProductInput,
} from "./api";

// Form
export function CreateProductForm() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateProductInput>({
    resolver: zodResolver(createProductSchema),
    defaultValues: {
      name: "",
      price: 150000,
    },
  });

  // Mutation
  const createProduct = useCreateProduct({
    mutationConfig: {
      onSuccess: () => reset(),
    },
  });

  // Error Details
  const errorDetails = createProduct.isError
    ? getHttpErrorDetails(createProduct.error)
    : null;

  return (
    <section className="space-y-4 rounded-lg border p-5">
      <h2 className="text-2xl font-semibold">Create Product</h2>

      <form
        noValidate
        onSubmit={handleSubmit((values) => createProduct.mutate(values))}
      >
        <FieldGroup>
          {/* Name */}
          <Field data-invalid={!!errors.name}>
            <FieldLabel htmlFor="product-name">Product Name</FieldLabel>

            <Input
              id="product-name"
              type="text"
              placeholder="Parfum A"
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? "product-name-error" : undefined}
              {...register("name")}
            />

            {errors.name && (
              <FieldError id="product-name-error">
                {errors.name.message}
              </FieldError>
            )}
          </Field>

          {/* Price */}
          <Field data-invalid={!!errors.price}>
            <FieldLabel htmlFor="product-price">Price (IDR)</FieldLabel>

            <Input
              id="product-price"
              type="number"
              min={1}
              step={1}
              aria-invalid={!!errors.price}
              aria-describedby={
                errors.price ? "product-price-error" : undefined
              }
              {...register("price", { valueAsNumber: true })}
            />

            {errors.price && (
              <FieldError id="product-price-error">
                {errors.price.message}
              </FieldError>
            )}
          </Field>

          <Button type="submit" disabled={createProduct.isPending}>
            {createProduct.isPending ? "Creating..." : "Add Product"}
          </Button>
        </FieldGroup>
      </form>

      {/* Mutation Result */}
      {createProduct.isSuccess && (
        <p role="status" className="text-sm">
          Product created successfully.
        </p>
      )}

      {errorDetails && (
        <div role="alert" className="space-y-2">
          <p className="text-sm text-destructive">
            Failed to create product (HTTP {errorDetails.status ?? "N/A"}).
          </p>

          <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs whitespace-pre-wrap">
            {JSON.stringify(
              errorDetails.data ?? {
                message: createProduct.error?.message,
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
