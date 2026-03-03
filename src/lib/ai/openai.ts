import OpenAI from "openai";

function getOpenAI(): OpenAI {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error("Missing OPENAI_API_KEY");
  }
  return new OpenAI({ apiKey: key });
}

export const openai = {
  get chat() {
    return getOpenAI().chat;
  },
} as OpenAI;
