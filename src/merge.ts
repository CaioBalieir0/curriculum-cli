import type { CliOverrides, ResumeConfig, ResumeData } from './schema.js';

const arrayKeys = new Set(['skills', 'experience', 'projects', 'education', 'languages']);

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function mergeValue(defaultValue: unknown, overrideValue: unknown, key?: string): unknown {
  if (overrideValue === undefined) {
    return defaultValue;
  }

  if (Array.isArray(defaultValue) || Array.isArray(overrideValue)) {
    if (key && arrayKeys.has(key) && Array.isArray(overrideValue) && overrideValue.length === 0) {
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

export function parseSkillsFlag(value: string): ResumeData['skills'] {
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

export function buildFlagConfig(flags: CliOverrides): ResumeConfig {
  const config: ResumeConfig = {};

  if (flags.title || flags.summary) {
    config.profile = {};
  }

  if (flags.title) {
    config.profile = { ...config.profile, title: flags.title };
  }

  if (flags.summary) {
    config.profile = { ...config.profile, summary: flags.summary };
  }

  if (flags.skills) {
    config.skills = parseSkillsFlag(flags.skills);
  }

  return config;
}

export function mergeResumeData(
  defaultData: ResumeData,
  configData: ResumeConfig,
  flagData: ResumeConfig
): ResumeData {
  const configMerged = mergeValue(defaultData, configData) as ResumeData;
  return mergeValue(configMerged, flagData) as ResumeData;
}
