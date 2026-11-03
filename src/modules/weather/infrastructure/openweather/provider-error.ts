import axios from 'axios';
import { AppError } from '../../../../shared/errors/AppError';
import { providerLog } from '../../../../shared/logger/logger';

const TIMEOUT_CODES = new Set(['ECONNABORTED', 'ETIMEDOUT']);

const extractMessage = (data: unknown): string | null => {
  if (typeof data === 'object' && data !== null && typeof (data as { message?: unknown }).message === 'string') {
    return (data as { message: string }).message;
  }
  return null;
};

export const invalidResponse = (): AppError =>
  new AppError('El servicio meteorológico devolvió una respuesta inválida', 502);

export const translateProviderError = (err: unknown): AppError => {
  if (err instanceof AppError) return err;

  if (!axios.isAxiosError(err)) {
    providerLog('Unexpected error: %s', err instanceof Error ? err.message : 'unknown');
    return new AppError('Error inesperado al consultar el servicio meteorológico', 502);
  }

  const status = err.response?.status;
  providerLog(
    'Provider error status=%s code=%s message=%s',
    status ?? 'none',
    err.code ?? 'none',
    extractMessage(err.response?.data) ?? err.message,
  );

  if (status === undefined) {
    return TIMEOUT_CODES.has(err.code ?? '')
      ? new AppError('El servicio meteorológico tardó demasiado en responder', 504)
      : new AppError('No se pudo conectar con el servicio meteorológico', 502);
  }

  if (status === 404) {
    return new AppError('No se encontró información meteorológica para la ubicación indicada', 404);
  }
  if (status === 429) {
    return new AppError('Se alcanzó el límite de consultas del servicio meteorológico; intenta de nuevo más tarde', 429);
  }

  return new AppError('El servicio meteorológico no está disponible en este momento', 502);
};
