import { computed, ref } from "vue";

enum FetchState {
  initial,
  loading,
  success,
  error
}

export function useAsyncOperation<TArgs extends unknown[], TResult = unknown>(
  asyncOperation: (...args: TArgs) => Promise<TResult>
) {
  const fetchState = ref<FetchState>(FetchState.initial);
  const data = ref<TResult | null>(null);
  const error = ref<unknown>(null);

  const execute = async (...args: TArgs): Promise<TResult | undefined> => {
    fetchState.value = FetchState.loading;
    error.value = null;
    data.value = null;

    try {
      const result = await asyncOperation(...args);
      data.value = result as TResult;
      fetchState.value = FetchState.success;
      return result;
    } catch (err) {
      error.value = err;
      fetchState.value = FetchState.error;
      return undefined;
    }
  };

  return {
    data,
    error,
    execute,
    fetchState,
    isLoading: computed(() => fetchState.value === FetchState.loading)
  };
}
