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

export function applyLastMediaQueryWins(mediaQuery: MediaQuery): MediaQuery {
  const queries = mediaQuery.queries.queries;

  if (queries.length <= 1) {
    return mediaQuery;
  }

  const transformedQueries = new Array<
    MediaQueryKeywords | MediaRule | NotMediaRule | AndSeparatedMediaRules,
  >(queries.length);
  const negations: Array<MediaQuery | MediaRule> = [];

  // iterate in reverse for single pass
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
        new OrSeparatedMediaRules([wrappedCurrent, ...negatedRules]),
      );
    }
    negations.push(current);
  }

  const newOrSeparatedRules = new OrSeparatedMediaRules(transformedQueries);
  return new MediaQuery(newOrSeparatedRules);
}

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

        const buildNegation = (str: string) => {
          let replaced = str.replace('@media ', '').trim();
          if (replaced.startsWith('(') && replaced.endsWith(')')) {
            replaced = replaced.slice(1, -1).trim();
          }
          return `(not (${replaced}))`;
        };

        const negations = mediaQueries
          .slice(i + 1)
          .map((q) => buildNegation(q))
          .join(' and ');

        const transformedQuery = negations
          ? `${currentQuery} and ${negations}`
          : currentQuery;

        transformedMediaQueries[transformedQuery] = styles[key][currentQuery];
      }

      transformedStyles[key] = {
        ...defaultValues.reduce((acc, val) => {
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
