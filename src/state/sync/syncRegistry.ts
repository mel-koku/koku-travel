export type SliceSerializer<State = unknown> = {
  key: string;
  serialize: (state: State) => unknown;
  deserialize: (raw: unknown) => State;
};

export type SyncRegistry = {
  register: <S>(serializer: SliceSerializer<S>) => void;
  get: (key: string) => SliceSerializer | undefined;
  keys: () => string[];
  all: () => SliceSerializer[];
};

export function createSyncRegistry(): SyncRegistry {
  const serializers = new Map<string, SliceSerializer>();

  return {
    register: (serializer) => {
      if (serializers.has(serializer.key)) {
        throw new Error(`Serializer for key "${serializer.key}" already registered`);
      }
      serializers.set(serializer.key, serializer as SliceSerializer);
    },
    get: (key) => serializers.get(key),
    keys: () => Array.from(serializers.keys()),
    all: () => Array.from(serializers.values()),
  };
}

// Module-level singleton. Slices register on import.
export const sliceRegistry = createSyncRegistry();
