import { mutationOptions, queryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/axios";

// Types
export type Product = {
  id: number;
  name: string;
  price: number;
};

// Queries
export const productQueries = {
  list: (simulateError = false) =>
    queryOptions({
      queryKey: ["demo-products", { simulateError }],
      queryFn: async ({ signal }): Promise<Product[]> => {
        const { data } = await apiClient.get<Product[]>("/demo-products", {
          params: simulateError ? { fail: "true" } : undefined,
          signal,
        });

        return data;
      },
    }),
};

// Mutations
export const productMutations = {
  create: () =>
    mutationOptions({
      mutationKey: ["demo-products", "create"],
      mutationFn: async (
        payload: Pick<Product, "name" | "price">,
      ): Promise<Product> => {
        const { data } = await apiClient.post<Product>(
          "/demo-products",
          payload,
        );

        return data;
      },
    }),
};
