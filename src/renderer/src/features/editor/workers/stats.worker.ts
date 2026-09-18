type StatsMessage = {
  clientId: number;
  requestId: number;
  statsKey?: string;
  text: string;
};

type StatsResult = {
  clientId: number;
  requestId: number;
  statsKey?: string;
  wordCount: number;
  charCount: number;
};

const countWords = (text: string) => {
  let count = 0;
  let inWord = false;
  for (let i = 0; i < text.length; i += 1) {
    const isWhitespace = text[i] <= " ";
    if (!isWhitespace && !inWord) {
      count += 1;
      inWord = true;
    } else if (isWhitespace) {
      inWord = false;
    }
  }
  return count;
};

self.addEventListener("message", (event: MessageEvent<StatsMessage>) => {
  const text = event.data?.text ?? "";
  const result: StatsResult = {
    clientId: event.data.clientId,
    requestId: event.data.requestId,
    statsKey: event.data.statsKey,
    wordCount: countWords(text),
    charCount: text.length,
  };
  self.postMessage(result);
});
