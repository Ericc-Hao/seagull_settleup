import { Children, Fragment, ReactElement, ReactNode, cloneElement, isValidElement } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';

type StackProps = {
  children: ReactNode;
  gap?: number;
  style?: StyleProp<ViewStyle>;
  align?: ViewStyle['alignItems'];
  justify?: ViewStyle['justifyContent'];
};

type StyledChild = ReactElement<{ style?: StyleProp<ViewStyle> }>;

export function flattenStackChildren(children: ReactNode): ReactNode[] {
  const items: ReactNode[] = [];

  Children.toArray(children).forEach((child) => {
    if (isValidElement<{ children?: ReactNode }>(child) && child.type === Fragment) {
      items.push(...flattenStackChildren(child.props.children));
      return;
    }

    items.push(child);
  });

  return Children.toArray(items);
}

export function buildStackChildren(
  children: ReactNode,
  gap: number,
  axis: 'vertical' | 'horizontal',
): ReactNode[] {
  const items = flattenStackChildren(children);

  return items.map((child, index) => {
    const stackKey = isValidElement(child) && child.key != null ? String(child.key) : `stack-item-${index}`;

    if (!isValidElement(child)) {
      return child;
    }

    if (index === 0 || gap <= 0) {
      return child.key != null ? child : cloneElement(child, { key: stackKey });
    }

    if (child.type === Fragment) {
      return cloneElement(child, { key: stackKey });
    }

    const spacingStyle =
      axis === 'vertical' ? ({ marginTop: gap } satisfies ViewStyle) : ({ marginLeft: gap } satisfies ViewStyle);

    const styledChild = child as StyledChild;
    return cloneElement(styledChild, {
      key: stackKey,
      style: [styledChild.props.style, spacingStyle],
    });
  });
}

export function VStack({ children, gap = 0, style, align, justify }: StackProps) {
  return (
    <View style={[{ flexDirection: 'column', alignItems: align, justifyContent: justify }, style]}>
      {buildStackChildren(children, gap, 'vertical')}
    </View>
  );
}

export function HStack({ children, gap = 0, style, align, justify }: StackProps) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: align ?? 'center', justifyContent: justify }, style]}>
      {buildStackChildren(children, gap, 'horizontal')}
    </View>
  );
}
