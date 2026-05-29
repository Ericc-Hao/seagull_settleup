import { createElement, Fragment, isValidElement } from 'react';
import { Text, View, type ViewStyle } from 'react-native';
import { describe, expect, it } from 'vitest';

import { buildStackChildren, flattenStackChildren } from '../Stack';

function elementStyle(node: unknown): ViewStyle | undefined {
  if (!isValidElement<{ style?: ViewStyle | ViewStyle[] }>(node)) {
    return undefined;
  }

  const { style } = node.props;
  if (Array.isArray(style)) {
    return style.reduce<ViewStyle>((merged, entry) => Object.assign(merged, entry ?? {}), {});
  }

  return style;
}

function elementKey(node: unknown): string | null {
  return isValidElement(node) ? node.key : null;
}

describe('flattenStackChildren', () => {
  it('flattens Fragment children into a keyed array', () => {
    const nodes = flattenStackChildren(
      createElement(
        Fragment,
        null,
        createElement(View, null),
        createElement(Text, null, 'inside fragment'),
      ),
    );

    expect(nodes).toHaveLength(2);
    nodes.forEach((node) => {
      expect(elementKey(node)).toBeTruthy();
    });
  });

  it('filters null and false siblings', () => {
    const nodes = flattenStackChildren([
      createElement(View, null),
      null,
      false,
      createElement(Text, null, 'visible'),
    ]);

    expect(nodes).toHaveLength(2);
  });
});

describe('buildStackChildren', () => {
  it('assigns stable keys to every stacked child', () => {
    const nodes = buildStackChildren(
      [
        createElement(View, null),
        createElement(Text, null, 'label'),
        createElement(View, null),
      ],
      12,
      'vertical',
    );

    expect(nodes).toHaveLength(3);
    const keys = nodes.map(elementKey);
    expect(keys.every(Boolean)).toBe(true);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('adds vertical spacing from the second child onward', () => {
    const nodes = buildStackChildren(
      [createElement(View, { style: { height: 10 } }), createElement(Text, null, 'spaced')],
      16,
      'vertical',
    );

    const firstStyle = elementStyle(nodes[0]);
    const secondStyle = elementStyle(nodes[1]);

    expect(firstStyle?.marginTop).toBeUndefined();
    expect(secondStyle?.marginTop).toBe(16);
  });

  it('adds horizontal spacing from the second child onward', () => {
    const nodes = buildStackChildren(
      [createElement(View, null), createElement(View, null)],
      8,
      'horizontal',
    );

    const secondStyle = elementStyle(nodes[1]);
    expect(secondStyle?.marginLeft).toBe(8);
  });

  it('flattens Fragment groups and keys flattened siblings', () => {
    const nodes = buildStackChildren(
      [
        createElement(View, null),
        createElement(
          Fragment,
          null,
          createElement(Text, null, 'one'),
          createElement(Text, null, 'two'),
        ),
      ],
      10,
      'vertical',
    );

    expect(nodes).toHaveLength(3);
    expect(elementStyle(nodes[1])?.marginTop).toBe(10);
    expect(elementStyle(nodes[2])?.marginTop).toBe(10);
    expect(new Set(nodes.map(elementKey)).size).toBe(3);
  });

  it('preserves explicit child keys when provided', () => {
    const nodes = buildStackChildren(
      [createElement(View, { key: 'logo' }), createElement(Text, { key: 'caption' }, 'Loading')],
      12,
      'vertical',
    );

    expect(String(elementKey(nodes[0]))).toContain('logo');
    expect(String(elementKey(nodes[1]))).toContain('caption');
  });
});
