import type { IconName } from '../components/Icon';

export const PROFILE_TAB_MOCK = {
  title: 'Profile',
  subtitle: 'Account & preferences',
  user: { id: 'A', name: 'Eric', email: 'eric@example.com' },
  sections: [
    {
      title: 'Account',
      rows: [
        { id: 'emt', label: 'EMT Email', value: 'eric@example.com', icon: 'envelope' as IconName },
        { id: 'phone', label: 'Phone', value: '647-111-2222', icon: 'wallet' as IconName },
        { id: 'currency', label: 'Default Currency', value: 'CAD', icon: 'currency-dollar' as IconName },
      ],
    },
    {
      title: 'Preferences',
      rows: [
        { id: 'notify', label: 'Notifications', value: 'On', icon: 'bell' as IconName },
        { id: 'settle', label: 'Default Settlement', value: 'Couple / Team', icon: 'user-group' as IconName },
        { id: 'export', label: 'Export Data', value: 'Coming soon', icon: 'arrow-down-tray' as IconName },
      ],
    },
    {
      title: 'Support',
      rows: [
        { id: 'help', label: 'Help & FAQ', value: '', icon: 'information-circle' as IconName },
        { id: 'feedback', label: 'Send Feedback', value: '', icon: 'chat-bubble' as IconName },
      ],
    },
  ],
};
