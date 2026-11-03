import { config } from 'dotenv';

config();

export const env = {
  PORT: Number(process.env.PORT) || 4400,
  ORIGIN: process.env.ORIGIN,
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  isDev: (process.env.NODE_ENV ?? 'development') === 'development',
  OPENWEATHER_API_KEY: process.env.OPENWEATHER_API_KEY?.trim() ?? '',
  OPENWEATHER_BASE_URL: process.env.OPENWEATHER_BASE_URL?.trim() || 'https://api.openweathermap.org',
  OPENWEATHER_TIMEOUT_MS: Number(process.env.OPENWEATHER_TIMEOUT_MS) || 5000,
};

export const assertEnv = (): void => {
  if (!env.OPENWEATHER_API_KEY) {
    throw new Error('OPENWEATHER_API_KEY es obligatorio');
  }

  try {
    new URL(env.OPENWEATHER_BASE_URL);
  } catch {
    throw new Error(`OPENWEATHER_BASE_URL no es una URL válida: ${env.OPENWEATHER_BASE_URL}`);
  }
};
