/**
 * Format a model ID into a human-readable name.
 */
export function formatModelName(id, name) {
  if (typeof id !== 'string') id = String(id || '');
  if (typeof name !== 'string') name = String(name || '');
  if (!id) return 'Unknown';

  // Use name if it's a proper display name (not a prefixed ID)
  if (name && name !== id && !name.startsWith('openai/') && !name.startsWith('anthropic/') && !name.startsWith('google/')) {
    return name;
  }

  // Strip provider prefix
  let cleaned = id
    .replace(/^openai\//, '')
    .replace(/^anthropic\//, '')
    .replace(/^google\//, '')
    .replace(/^meta-llama\//, '')
    .replace(/^deepseek\//, '')
    .replace(/^qwen\//, '')
    .replace(/^mistral\//, '')
    .replace(/^cohere\//, '')
    .replace(/^x-ai\//, '');

  // Short names map
  const shortNames = {
    'gpt-4o': 'GPT-4o', 'gpt-4o-mini': 'GPT-4o Mini', 'gpt-4.1': 'GPT-4.1',
    'gpt-4-turbo': 'GPT-4 Turbo', 'o3-mini': 'o3 Mini',
    'claude-sonnet-4-20250514': 'Claude Sonnet 4', 'claude-3.5-sonnet': 'Claude 3.5 Sonnet',
    'claude-3-5-sonnet-20241022': 'Claude 3.5 Sonnet', 'claude-3-opus-20240229': 'Claude 3 Opus',
    'claude-3-haiku-20240307': 'Claude 3 Haiku',
    'gemini-2.5-pro': 'Gemini 2.5 Pro', 'gemini-2.0-flash': 'Gemini 2.0 Flash',
    'llama-4-maverick': 'Llama 4 Maverick',
    'deepseek-chat': 'DeepSeek V3', 'deepseek-r1': 'DeepSeek R1',
    'qwen-3-235b-a22b': 'Qwen 3 235B',
    'mistral-large': 'Mistral Large',
  };
  if (shortNames[cleaned]) return shortNames[cleaned];

  return cleaned.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}
