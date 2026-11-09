import {
  QueryClient,
  isServer,
  type UseMutationOptions,
} from "@tanstack/react-query";
import { AxiosError } from "axios";

// Query Client
let browserQueryClient: QueryClient | undefined;

export function getQueryClient() {
  if (!isServer && browserQueryClient) {
    return browserQueryClient;
  }

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
        retry: (failureCount, error) => {
          if (
            error instanceof AxiosError &&
            error.response?.status &&
            error.response.status >= 400 &&
            error.response.status < 500
          ) {
            return false;
          }

          return failureCount < 3;
        },
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
      },
    },
  });

  if (!isServer) {
    browserQueryClient = queryClient;
  }

  return queryClient;
}

// Query & Mutation Types
type AsyncFn = (...args: never[]) => Promise<unknown>;

export type ApiFnReturnType<Fn extends AsyncFn> = Awaited<ReturnType<Fn>>;

export type QueryConfig<T extends (...args: never[]) => object> = Omit<
  ReturnType<T>,
  "queryKey" | "queryFn"
>;

export type MutationConfig<Fn extends AsyncFn> = UseMutationOptions<
  ApiFnReturnType<Fn>,
  Error,
  Parameters<Fn>[0]
>;
