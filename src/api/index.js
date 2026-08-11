import { createClient, ApiError } from './client';
import { createDemoClient } from './demo';

export { ApiError };

export function getAdapter(settings) {
  return settings.demo ? createDemoClient() : createClient({ url: settings.url, token: settings.token });
}
