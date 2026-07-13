import { createOpenAI } from '@ai-sdk/openai'

const deepseek = createOpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: process.env.DEEPSEEK_API_KEY ?? '',
})

export const DEEPSEEK_MODEL = 'deepseek-chat'

export function hasDeepSeekConfig(): boolean {
  return Boolean(process.env.DEEPSEEK_API_KEY)
}

export function getDeepSeekModel() {
  return deepseek(DEEPSEEK_MODEL)
}
