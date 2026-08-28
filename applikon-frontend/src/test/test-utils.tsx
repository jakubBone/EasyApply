import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Creates a fresh QueryClient for each test.
// retry: false, so a failing query fails fast instead of being retried in tests.
export const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

// Wrapper that wraps a component in QueryClientProvider.
// Use as `wrapper` in render() options from Testing Library.
export function QueryWrapper({ children }: { children: React.ReactNode }) {
  const queryClient = createTestQueryClient()
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
