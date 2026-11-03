import axios, { AxiosInstance } from 'axios';
import { translateProviderError } from './provider-error';

export interface OpenWeatherClientOptions {
  baseURL: string;
  apiKey: string;
  timeoutMs: number;
}

export class OpenWeatherClient {
  private readonly http: AxiosInstance;
  private readonly apiKey: string;

  constructor({ baseURL, apiKey, timeoutMs }: OpenWeatherClientOptions) {
    this.apiKey = apiKey;
    this.http = axios.create({
      baseURL,
      timeout: timeoutMs,
      headers: { Accept: 'application/json' },
      maxRedirects: 0,
      maxContentLength: 1_000_000,
    });
  }

  async get(path: string, params: Record<string, string | number>): Promise<unknown> {
    try {
      const response = await this.http.get<unknown>(path, { params: { ...params, appid: this.apiKey } });
      return response.data;
    } catch (err) {
      throw translateProviderError(err);
    }
  }
}
