import { resource, signal, type Signal, type WritableSignal } from '@angular/core';

interface EventHistoryRequest<Params> {
  readonly params: Params;
  readonly revision: number;
}

interface EventHistoryResourceOptions<Value, Params> {
  readonly active: () => boolean;
  readonly params: () => Params | undefined;
  readonly loader: (params: Params) => PromiseLike<Value>;
}

export interface EventHistoryResource<Value> {
  readonly value: WritableSignal<Value | undefined>;
  readonly error: Signal<unknown>;
  readonly isLoading: Signal<boolean>;
  readonly hasValue: () => boolean;
  readonly reload: () => boolean;
  readonly invalidate: () => void;
}

export const createEventHistoryResource = <Value, Params>(
  options: EventHistoryResourceOptions<Value, Params>,
): EventHistoryResource<Value> => {
  const revision = signal(0);
  const state = resource<Value, EventHistoryRequest<Params> | undefined>({
    params: () => {
      const params = options.params();
      return options.active() && params !== undefined
        ? { params, revision: revision() }
        : undefined;
    },
    loader: ({ params }) => options.loader(params!.params),
  });

  return {
    value: state.value,
    error: state.error,
    isLoading: state.isLoading,
    hasValue: () => state.hasValue(),
    reload: () => state.reload(),
    invalidate: () => revision.update((value) => value + 1),
  };
};
