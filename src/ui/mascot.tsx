import { AppLogo } from '../components/common/AppLogo';

/** Brand logo mark for legacy UI headers */
export function Mascot({ size = 52 }: { size?: number }) {
  return <AppLogo size={size} />;
}
