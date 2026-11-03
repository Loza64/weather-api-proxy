export enum UnitSystem {
  METRIC = 'metric',
  IMPERIAL = 'imperial',
  STANDARD = 'standard',
}

export interface UnitLabels {
  system: UnitSystem;
  temperature: 'celsius' | 'fahrenheit' | 'kelvin';
  windSpeed: 'm/s' | 'mph';
  pressure: 'hPa';
  visibility: 'm';
  precipitation: 'mm/h';
}

const TEMPERATURE: Record<UnitSystem, UnitLabels['temperature']> = {
  [UnitSystem.METRIC]: 'celsius',
  [UnitSystem.IMPERIAL]: 'fahrenheit',
  [UnitSystem.STANDARD]: 'kelvin',
};

export const unitLabels = (system: UnitSystem): UnitLabels => ({
  system,
  temperature: TEMPERATURE[system],
  windSpeed: system === UnitSystem.IMPERIAL ? 'mph' : 'm/s',
  pressure: 'hPa',
  visibility: 'm',
  precipitation: 'mm/h',
});

export const SUPPORTED_LANGUAGES = [
  'sq', 'af', 'ar', 'az', 'eu', 'be', 'bg', 'ca', 'zh_cn', 'zh_tw', 'hr', 'cz', 'da', 'nl', 'en', 'fi', 'fr',
  'gl', 'de', 'el', 'he', 'hi', 'hu', 'is', 'id', 'it', 'ja', 'kr', 'ku', 'la', 'lt', 'mk', 'no', 'fa', 'pl',
  'pt', 'pt_br', 'ro', 'ru', 'sr', 'sk', 'sl', 'sp', 'es', 'sv', 'se', 'th', 'tr', 'ua', 'uk', 'vi', 'zu',
] as const;
