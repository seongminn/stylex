/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type { MediaQueryKeywords } from './media-query';

import {
  AndSeparatedMediaRules,
  MediaQuery,
  MediaRule,
  NotMediaRule,
  OrSeparatedMediaRules,
} from './media-query';

/** ensures last media query overrides by negating subsequent queries */
export function applyLastMediaQueryWins(mediaQuery: MediaQuery): MediaQuery {
  const queries = mediaQuery.queries.queries;

  if (queries.length <= 1) {
    return mediaQuery;
  }

  const transformedQueries: Array<
    | MediaQuery
    | MediaRule
    | MediaQueryKeywords
    | NotMediaRule
    | AndSeparatedMediaRules,
  > = new Array(queries.length);
  const negations: Array<MediaQuery | MediaRule> = [];

  // iterate backwards for single pass
  for (let i = queries.length - 1; i >= 0; i--) {
    const isLastQuery = i === queries.length - 1;
    const current = queries[i];

    if (isLastQuery) {
      transformedQueries[i] = current;
    } else {
      const negatedRules = negations.map(
        (negQuery) =>
          new NotMediaRule(
            negQuery instanceof MediaRule ? negQuery.rules : negQuery,
          ),
      );

      const wrappedCurrent = new MediaRule(
        current instanceof MediaRule ? current.rules : current,
      );

      transformedQueries[i] = new MediaRule(
        new OrSeparatedMediaRules([
          wrappedCurrent,
          ...negatedRules.filter((rule) => rule instanceof MediaRule),
        ]),
      );
    }

    negations.push(current);
  }

  const newOrSeparatedRules = new OrSeparatedMediaRules(transformedQueries);
  return new MediaQuery(newOrSeparatedRules);
}

function stripOuterParens(str: string): string {
  const trimmed = str.trim();
  if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

/**
 * transformCommaSeparated:
 * splits a media query on commas and adds negation to each part then rejoins parts with comma
 */
function transformCommaSeparated(
  fullQueryNoPrefix: string,
  negation?: string,
): string {
  const parts = fullQueryNoPrefix.split(',');
  const transformedParts = parts.map((part) => {
    const stripped = stripOuterParens(part);
    if (!negation) {
      return `(${stripped})`;
    }
    return `${part} and ${negation}`;
  });

  return transformedParts.join(',');
}

/** transforms media query styles so the last query wins */
export function transformMediaQueryStyles(
  styles: Record<string, any>,
): Record<string, any> {
  const transformedStyles: Record<string, any> = {};

  for (const key in styles) {
    if (typeof styles[key] === 'object' && styles[key] !== null) {
      const mediaQueries = Object.keys(styles[key]).filter((k) =>
        k.startsWith('@media'),
      );
      const defaultValues = Object.keys(styles[key]).filter(
        (k) => !k.startsWith('@media'),
      );

      const transformedMediaQueries: Record<string, any> = {};

      for (let i = 0; i < mediaQueries.length; i++) {
        const currentQuery = mediaQueries[i];
        const fullQueryNoPrefix = currentQuery.replace('@media', '').trim();

        const negationStr = mediaQueries
          .slice(i + 1)
          .map((sub) => {
            const subNoPrefix = sub.replace('@media', '').trim();
            const subParts = subNoPrefix.split(',').map((p) => {
              const stripped = stripOuterParens(p);
              return `(not (${stripped}))`;
            });
            return subParts.join(' and ');
          })
          .filter((p) => p.length > 0)
          .join(' and ');

        const finalQuery = negationStr
          ? `@media ${transformCommaSeparated(fullQueryNoPrefix, negationStr)}`
          : `@media ${transformCommaSeparated(fullQueryNoPrefix)}`;

        transformedMediaQueries[finalQuery] = styles[key][currentQuery];
      }

      transformedStyles[key] = {
        // merge defaults
        ...defaultValues.reduce((acc: Record<string, any>, val) => {
          acc[val] = styles[key][val];
          return acc;
        }, {}),
        ...transformedMediaQueries,
      };
    } else {
      transformedStyles[key] = styles[key];
    }
  }

  return transformedStyles;
}
