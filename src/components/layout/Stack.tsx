import { Children, ReactElement, ReactNode, cloneElement, isValidElement } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';

type StackProps = {
  children: ReactNode;
  gap?: number;
  style?: StyleProp<ViewStyle>;
  align?: ViewStyle['alignItems'];
  justify?: ViewStyle['justifyContent'];
};

type StyledChild = ReactElement<{ style?: StyleProp<ViewStyle> }>;

function stackChildren(children: ReactNode, gap: number, axis: 'vertical' | 'horizontal'): ReactNode[] {
  const items = Children.toArray(children).filter(Boolean);

  return items.map((child, index) => {
    if (!isValidElement(child) || index === 0 || gap <= 0) {
      return child;
    }

    const spacingStyle =
      axis === 'vertical' ? ({ marginTop: gap } satisfies ViewStyle) : ({ marginLeft: gap } satisfies ViewStyle);

    const styledChild = child as StyledChild;
    return cloneElement(styledChild, {
      style: [styledChild.props.style, spacingStyle],
    });
  });
}

export function VStack({ children, gap = 0, style, align, justify }: StackProps) {
  return (
    <View style={[{ flexDirection: 'column', alignItems: align, justifyContent: justify }, style]}>
      {stackChildren(children, gap, 'vertical')}
    </View>
  );
}

export function HStack({ children, gap = 0, style, align, justify }: StackProps) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: align ?? 'center', justifyContent: justify }, style]}>
      {stackChildren(children, gap, 'horizontal')}
    </View>
  );
}
