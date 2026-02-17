let restartRequested = false;

export const markRestartRequested = (): void => {
  restartRequested = true;
};

export const consumeRestartRequest = (): boolean => {
  if (!restartRequested) return false;
  return (restartRequested = false);
};

