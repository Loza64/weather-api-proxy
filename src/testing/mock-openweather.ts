import { createServer, IncomingMessage, Server, ServerResponse } from 'http';
import { AddressInfo } from 'net';

export interface MockResponse {
  status?: number;
  body?: unknown;
  raw?: string;
  delayMs?: number;
  headers?: Record<string, string>;
}

export interface RecordedRequest {
  path: string;
  query: URLSearchParams;
}

export interface MockOpenWeather {
  url: string;
  requests: RecordedRequest[];
  respond(path: string, response: MockResponse | ((query: URLSearchParams) => MockResponse)): void;
  close(): Promise<void>;
}

export const startMockOpenWeather = async (): Promise<MockOpenWeather> => {
  const routes = new Map<string, MockResponse | ((query: URLSearchParams) => MockResponse)>();
  const requests: RecordedRequest[] = [];

  const server: Server = createServer((req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    requests.push({ path: url.pathname, query: url.searchParams });

    const route = routes.get(url.pathname);
    const response = typeof route === 'function' ? route(url.searchParams) : route;

    const send = () => {
      const payload = response?.raw ?? JSON.stringify(response?.body ?? { cod: '404', message: 'not found' });
      res.writeHead(response?.status ?? 404, { 'Content-Type': 'application/json', ...response?.headers });
      res.end(payload);
    };

    if (response?.delayMs) setTimeout(send, response.delayMs);
    else send();
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;

  return {
    url: `http://127.0.0.1:${port}`,
    requests,
    respond: (path, response) => routes.set(path, response),
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections();
        server.close(() => resolve());
      }),
  };
};

export const GEOCODE_PATH = '/geo/1.0/direct';
export const WEATHER_PATH = '/data/2.5/weather';

export const sanSalvadorLocation = { name: 'San Salvador', lat: 13.6989, lon: -89.1914, country: 'SV', state: 'San Salvador Department' };

export const sanSalvadorWeather = {
  coord: { lon: -89.1914, lat: 13.6989 },
  weather: [{ id: 801, main: 'Clouds', description: 'few clouds', icon: '02d' }],
  base: 'stations',
  main: { temp: 28.44, feels_like: 31.02, temp_min: 26.9, temp_max: 29.83, pressure: 1012, humidity: 62, sea_level: 1012, grnd_level: 955 },
  visibility: 10000,
  wind: { speed: 3.64, deg: 95, gust: 5.14 },
  clouds: { all: 20 },
  dt: Date.UTC(2026, 10, 1, 18, 0, 0) / 1000,
  sys: { type: 2, id: 2001, country: 'SV', sunrise: Date.UTC(2026, 10, 1, 11, 40, 0) / 1000, sunset: Date.UTC(2026, 10, 1, 23, 30, 0) / 1000 },
  timezone: -21600,
  id: 3583361,
  name: 'San Salvador',
  cod: 200,
};
