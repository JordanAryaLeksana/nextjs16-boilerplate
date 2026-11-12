import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { z } from "zod";

import { apiClient } from "@/lib/axios";
import type { MutationConfig, QueryConfig } from "@/lib/query-client";

// Types
export type Product = {
  id: number;
  name: string;
  price: number;
};

// Get Products
export async function getProducts(
  simulateError = false,
  signal?: AbortSignal,
): Promise<Product[]> {
  const { data } = await apiClient.get<Product[]>("/demo-products", {
    params: simulateError ? { fail: "true" } : undefined,
    signal,
  });

  return data;
}

export function getProductsQueryOptions(simulateError = false) {
  return queryOptions({
    queryKey: ["demo-products", { simulateError }],
    queryFn: ({ signal }) => getProducts(simulateError, signal),
  });
}

type UseProductsOptions = {
  simulateError?: boolean;
  queryConfig?: QueryConfig<typeof getProductsQueryOptions>;
};

export function useProducts({
  simulateError,
  queryConfig,
}: UseProductsOptions = {}) {
  return useQuery({
    ...getProductsQueryOptions(simulateError),
    ...queryConfig,
  });
}

// Create Product
export const createProductSchema = z.object({
  name: z.string().trim().min(2, "Name must contain at least 2 characters"),
  price: z.number().int().positive("Price must be greater than 0"),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;

export async function createProduct(
  payload: CreateProductInput,
): Promise<Product> {
  const { data } = await apiClient.post<Product>("/demo-products", payload);

  return data;
}

type UseCreateProductOptions = {
  mutationConfig?: MutationConfig<typeof createProduct>;
};

export function useCreateProduct({
  mutationConfig,
}: UseCreateProductOptions = {}) {
  const queryClient = useQueryClient();
  const { onSuccess, ...restConfig } = mutationConfig ?? {};

  return useMutation({
    ...restConfig,
    mutationFn: createProduct,
    onSuccess: async (...args) => {
      await queryClient.invalidateQueries({ queryKey: ["demo-products"] });
      await onSuccess?.(...args);
    },
  });
}
