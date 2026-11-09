
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { getHttpErrorDetails } from "@/lib/axios";

import { productMutations } from "./api";

// Schema
const productSchema = z.object({
  name: z.string().trim().min(2, "Name must contain at least 2 characters"),
  price: z.number().int().positive("Price must be greater than 0"),
});

type ProductFormValues = z.infer<typeof productSchema>;

// Form
export function CreateProductForm() {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      price: 150000,
    },
  });

  // Mutation
  const createProduct = useMutation({
    ...productMutations.create(),
    onSuccess: async () => {
      reset();

      await queryClient.invalidateQueries({
        queryKey: ["demo-products"],
      });
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
            <FieldLabel htmlFor="product-name">
              Product Name
            </FieldLabel>

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
            <FieldLabel htmlFor="product-price">
              Price (IDR)
            </FieldLabel>

            <Input
              id="product-price"
              type="number"
              min={1}
              step={1}
              aria-invalid={!!errors.price}
              aria-describedby={errors.price ? "product-price-error" : undefined}
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
          <p className="text-destructive text-sm">
            Failed to create product (HTTP {errorDetails.status ?? "N/A"}).
          </p>

          <pre className="bg-muted overflow-x-auto rounded-md p-3 text-xs whitespace-pre-wrap">
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
