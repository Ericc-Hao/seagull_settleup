import { ComponentType } from 'react';
import { ColorValue } from 'react-native';
import {
  ArrowDownCircleIcon,
  ArrowDownTrayIcon,
  ArrowPathIcon,
  ArrowUpCircleIcon,
  ArrowUpTrayIcon,
  ArrowUpIcon,
  BanknotesIcon,
  BellIcon,
  BriefcaseIcon,
  BuildingStorefrontIcon,
  CalendarIcon,
  CameraIcon,
  ChatBubbleLeftEllipsisIcon,
  CheckCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClipboardDocumentListIcon,
  Cog6ToothIcon,
  CurrencyDollarIcon,
  DocumentDuplicateIcon,
  DocumentPlusIcon,
  EllipsisHorizontalIcon,
  EnvelopeIcon,
  HomeIcon,
  HomeModernIcon,
  InformationCircleIcon,
  LockClosedIcon,
  MapIcon,
  PencilSquareIcon,
  PlusIcon,
  ScaleIcon,
  ShoppingBagIcon,
  ShoppingCartIcon,
  SparklesIcon,
  TagIcon,
  TicketIcon,
  TruckIcon,
  UserGroupIcon,
  UserIcon,
  UsersIcon,
  ViewfinderCircleIcon,
  WalletIcon,
  XMarkIcon,
} from 'react-native-heroicons/outline';
import {
  ArrowDownCircleIcon as ArrowDownCircleIconSolid,
  ArrowUpCircleIcon as ArrowUpCircleIconSolid,
  CheckCircleIcon as CheckCircleIconSolid,
  HomeIcon as HomeIconSolid,
  PlusIcon as PlusIconSolid,
} from 'react-native-heroicons/solid';

import { colors } from '../theme';

type HeroIconProps = { size?: number; color?: ColorValue; strokeWidth?: number };

export type IconName =
  | 'home'
  | 'bell'
  | 'chevron-left'
  | 'chevron-right'
  | 'chevron-up'
  | 'arrow-up-circle'
  | 'arrow-down-circle'
  | 'document-plus'
  | 'users'
  | 'user-group'
  | 'user'
  | 'viewfinder-circle'
  | 'arrow-path'
  | 'pencil-square'
  | 'clipboard-list'
  | 'plus'
  | 'wallet'
  | 'currency-dollar'
  | 'x-mark'
  | 'tag'
  | 'lock-closed'
  | 'calendar'
  | 'scale'
  | 'check-circle'
  | 'briefcase'
  | 'building-storefront'
  | 'map'
  | 'sparkles'
  | 'home-modern'
  | 'ellipsis'
  | 'banknotes'
  | 'camera'
  | 'arrow-up-tray'
  | 'arrow-down-tray'
  | 'truck'
  | 'ticket'
  | 'shopping-cart'
  | 'shopping-bag'
  | 'envelope'
  | 'chat-bubble'
  | 'document-duplicate'
  | 'information-circle'
  | 'cog-6-tooth';

const OUTLINE: Record<IconName, ComponentType<HeroIconProps>> = {
  home: HomeIcon,
  bell: BellIcon,
  'chevron-left': ChevronLeftIcon,
  'chevron-right': ChevronRightIcon,
  'chevron-up': ArrowUpIcon,
  'arrow-up-circle': ArrowUpCircleIcon,
  'arrow-down-circle': ArrowDownCircleIcon,
  'document-plus': DocumentPlusIcon,
  users: UsersIcon,
  'user-group': UserGroupIcon,
  user: UserIcon,
  'viewfinder-circle': ViewfinderCircleIcon,
  'arrow-path': ArrowPathIcon,
  'pencil-square': PencilSquareIcon,
  'clipboard-list': ClipboardDocumentListIcon,
  plus: PlusIcon,
  wallet: WalletIcon,
  'currency-dollar': CurrencyDollarIcon,
  'x-mark': XMarkIcon,
  tag: TagIcon,
  'lock-closed': LockClosedIcon,
  calendar: CalendarIcon,
  scale: ScaleIcon,
  'check-circle': CheckCircleIcon,
  briefcase: BriefcaseIcon,
  'building-storefront': BuildingStorefrontIcon,
  map: MapIcon,
  sparkles: SparklesIcon,
  'home-modern': HomeModernIcon,
  ellipsis: EllipsisHorizontalIcon,
  banknotes: BanknotesIcon,
  camera: CameraIcon,
  'arrow-up-tray': ArrowUpTrayIcon,
  'arrow-down-tray': ArrowDownTrayIcon,
  truck: TruckIcon,
  ticket: TicketIcon,
  'shopping-cart': ShoppingCartIcon,
  'shopping-bag': ShoppingBagIcon,
  envelope: EnvelopeIcon,
  'chat-bubble': ChatBubbleLeftEllipsisIcon,
  'document-duplicate': DocumentDuplicateIcon,
  'information-circle': InformationCircleIcon,
  'cog-6-tooth': Cog6ToothIcon,
};

const SOLID: Partial<Record<IconName, ComponentType<HeroIconProps>>> = {
  home: HomeIconSolid,
  plus: PlusIconSolid,
  'check-circle': CheckCircleIconSolid,
  'arrow-up-circle': ArrowUpCircleIconSolid,
  'arrow-down-circle': ArrowDownCircleIconSolid,
};

export function Icon({
  name,
  size = 22,
  color = colors.textPrimary,
  solid = false,
  strokeWidth = 1.75,
}: {
  name: IconName;
  size?: number;
  color?: ColorValue;
  solid?: boolean;
  strokeWidth?: number;
}) {
  const Comp = (solid && SOLID[name]) || OUTLINE[name];
  if (!Comp) {
    return null;
  }
  return <Comp size={size} color={color} strokeWidth={strokeWidth} />;
}
