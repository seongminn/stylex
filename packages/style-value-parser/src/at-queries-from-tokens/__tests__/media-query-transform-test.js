/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 */

import { transformMediaQueryStyles } from '../media-query-transform.js';

const stylex = {
  create: (styles) => styles,
};

describe('Media Query Transformer', () => {
  test('basic usage: multiple widths', () => {
    const originalStyles = stylex.create({
      gridColumn: {
        default: '1 / 2',
        '@media (max-width: 1440px)': '1 / 4',
        '@media (max-width: 1024px)': '1 / 3',
        '@media (max-width: 768px)': '1 / -1',
      },
    });

    const expectedStyles = {
      gridColumn: {
        default: '1 / 2',
        '@media (max-width: 1440px) and (not (max-width: 1024px)) and (not (max-width: 768px))':
          '1 / 4',
        '@media (max-width: 1024px) and (not (max-width: 768px))': '1 / 3',
        '@media (max-width: 768px)': '1 / -1',
      },
    };

    const result = transformMediaQueryStyles(originalStyles);
    expect(result).toEqual(expectedStyles);
  });

  test('single word condition', () => {
    const originalStyles = stylex.create({
      colorMode: {
        '@media (color)': 'colorful',
        '@media (monochrome)': 'grayscale',
      },
    });

    const expectedStyles = {
      colorMode: {
        '@media (color) and (not (monochrome))': 'colorful',
        '@media (monochrome)': 'grayscale',
      },
    };

    const result = transformMediaQueryStyles(originalStyles);
    expect(result).toEqual(expectedStyles);
  });

  test('not rule logic', () => {
    const originalStyles = stylex.create({
      layout: {
        default: 'grid',
        '@media not (max-width: 600px)': 'flex',
        '@media (max-width: 600px)': 'block',
      },
    });

    const expectedStyles = {
      layout: {
        default: 'grid',
        '@media not (max-width: 600px) and (not (max-width: 600px))': 'flex',
        '@media (max-width: 600px)': 'block',
      },
    };

    const result = transformMediaQueryStyles(originalStyles);
    expect(result).toEqual(expectedStyles);
  });

  test('combination of keywords and rules', () => {
    const originalStyles = stylex.create({
      container: {
        default: 'width:100%',
        '@media screen and (min-width: 900px)': 'width:80%',
        '@media print and (max-width: 500px)': 'width:50%',
      },
    });

    const expectedStyles = {
      container: {
        default: 'width:100%',
        '@media screen and (min-width: 900px) and (not (print and (max-width: 500px)))':
          'width:80%',
        '@media print and (max-width: 500px)': 'width:50%',
      },
    };

    const result = transformMediaQueryStyles(originalStyles);
    expect(result).toEqual(expectedStyles);
  });
});
