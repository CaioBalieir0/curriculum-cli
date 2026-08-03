import type { CliOverrides, CvData, GenerationConfig, GenerationData } from './schema.js';

const defaultPreservingArrayKeys = new Set(['skills', 'experience', 'education', 'languages']);

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function mergeValue(defaultValue: unknown, overrideValue: unknown, key?: string): unknown {
  if (overrideValue === undefined) {
    return defaultValue;
  }

  if (Array.isArray(defaultValue) || Array.isArray(overrideValue)) {
    if (key && defaultPreservingArrayKeys.has(key) && Array.isArray(overrideValue) && overrideValue.length === 0) {
      return defaultValue;
    }

    return overrideValue;
  }

  if (isObject(defaultValue) && isObject(overrideValue)) {
    const merged: Record<string, unknown> = { ...defaultValue };

    for (const [childKey, childValue] of Object.entries(overrideValue)) {
      merged[childKey] = mergeValue(merged[childKey], childValue, childKey);
    }

    return merged;
  }

  return overrideValue;
}

export type SelectedSections = {
  cv: boolean;
  coverLetter: boolean;
};

export function parseSkillsFlag(value: string): CvData['skills'] {
  return value
    .split(';')
    .map((group) => group.trim())
    .filter(Boolean)
    .map((group) => {
      const [category, ...itemsParts] = group.split(':');
      const itemsText = itemsParts.join(':');

      if (!category?.trim() || !itemsText.trim()) {
        throw new Error('Invalid --skills format. Use "Category: item, item; Category: item".');
      }

      const items = itemsText
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);

      if (items.length === 0) {
        throw new Error('Invalid --skills format. Each category must contain at least one item.');
      }

      return {
        category: category.trim(),
        items
      };
    });
}

export function buildFlagConfig(flags: CliOverrides): GenerationConfig {
  const config: GenerationConfig = {};

  if (flags.title || flags.summary || flags.skills) {
    config.cv = {};
  }

  if (flags.title) {
    config.cv = { ...config.cv, title: flags.title };
  }

  if (flags.summary) {
    config.cv = { ...config.cv, summary: flags.summary };
  }

  if (flags.skills) {
    config.cv = { ...config.cv, skills: parseSkillsFlag(flags.skills) };
  }

  return config;
}

export function mergeGenerationData(
  defaultData: GenerationData,
  configData: GenerationConfig,
  flagData: GenerationConfig,
  selected: SelectedSections
): GenerationData {
  const base: GenerationData = {
    profile: defaultData.profile
  };

  if (selected.cv && defaultData.cv) {
    base.cv = defaultData.cv;
  }

  if (selected.coverLetter && defaultData.coverLetter) {
    base.coverLetter = defaultData.coverLetter;
  }

  const configMerged = mergeValue(base, configData) as GenerationData;
  return mergeValue(configMerged, flagData) as GenerationData;
}
