import { ApiError, getApiErrorString } from '../api';

type FriendlyRule = {
  match: (input: { status: number; apiError?: string }) => boolean;
  message: string;
};

const RULES: FriendlyRule[] = [
  {
    match: ({ status, apiError }) => status === 409 && apiError === 'lawyer already registered with that email',
    message: 'Ya existe un abogado registrado con ese email.'
  },
  { match: ({ apiError }) => apiError === 'email is required', message: 'El email es obligatorio.' },
  { match: ({ apiError }) => apiError === 'fullName is required', message: 'El nombre es obligatorio.' },
  { match: ({ apiError }) => apiError === 'subject is required', message: 'El asunto es obligatorio.' },
  { match: ({ apiError }) => apiError === 'startsAtLocal is required', message: 'La fecha/hora de inicio es obligatoria.' }
];

export function getFriendlyErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    const apiError = getApiErrorString(err);

    for (const rule of RULES) {
      if (rule.match({ status: err.status, apiError })) return rule.message;
    }

    // Avoid showing "409 Conflict" / raw payloads.
    return 'No se pudo completar la operación. Intentalo de nuevo.';
  }

  // Fetch/network failures usually land here (TypeError in browsers).
  if (err instanceof Error && /fetch/i.test(err.message)) {
    return 'No se pudo conectar con el servidor.';
  }

  return 'Ocurrió un error.';
}

