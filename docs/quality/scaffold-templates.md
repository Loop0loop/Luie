# Scaffold Templates

## Persist Store Skeleton

```ts
persist(createStore, {
  name: STORAGE_KEY_EXAMPLE,
  version: EXAMPLE_SCHEMA_VERSION,
  storage: createJSONStorage(() => localStorage),
  migrate: (persistedState, version) => migrateExampleState(persistedState, version),
  partialize: (state) => ({
    schemaVersion: EXAMPLE_SCHEMA_VERSION,
    // persist the minimum state only
  }),
  merge: (persistedState, currentState) => {
    // validate with strict Zod
    // reset on invalid payload
    return currentState;
  },
  onRehydrateStorage: () => (_state, error) => {
    // emit structured performance/recovery logs
  },
});
```

## IPC Handler Skeleton

```ts
registerIpcHandlers(logger, [
  {
    channel: IPC_CHANNELS.EXAMPLE_DO_THING,
    logTag: "EXAMPLE_DO_THING",
    failMessage: "Failed to do thing",
    argsSchema: exampleArgsSchema,
    handler: async (input) => {
      return exampleService.doThing(input);
    },
  },
]);
```

## Hook Skeleton

```ts
export function useExampleViewModel() {
  const value = useExampleStore((state) => state.value);
  const action = useExampleStore((state) => state.action);

  return { value, action };
}
```

## Review Reminder
- Logic sharing is a hook responsibility.
- State sharing is a store/provider responsibility.
- Persisted state must be versioned and recoverable.
- IPC must have strict request/response schemas.
