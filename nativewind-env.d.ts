/// <reference types="nativewind/types" />

declare module '*.css';

declare module '*.png' {
  import { ImageSourcePropType } from 'react-native';
  const value: ImageSourcePropType;
  export default value;
}
