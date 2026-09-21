import { StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';

import { colors } from '@/constants/theme';

export const ICON_FONT = 'MaterialSymbols';

/**
 * Codepoints for the Material Symbols the designs use. Ligatures are unreliable
 * on Android, so glyphs are addressed directly.
 */
const GLYPHS = {
  add: '\ue145',
  add_a_photo: '\ue439',
  all_inclusive: '\ueb3d',
  alternate_email: '\ue0e6',
  apartment: '\uea40',
  arrow_back: '\ue5c4',
  arrow_forward: '\ue5c8',
  auto_awesome: '\ue65f',
  bolt: '\uea0b',
  business: '\ue0af',
  call: '\ue0b0',
  campaign: '\uef49',
  chat_bubble: '\ue0ca',
  check_circle: '\ue86c',
  checklist: '\ue6b1',
  chevron_left: '\ue5cb',
  chevron_right: '\ue5cc',
  close: '\ue5cd',
  cloud_done: '\ue2bf',
  cloud_sync: '\ueb5a',
  confirmation_number: '\ue638',
  contacts: '\ue0ba',
  content_copy: '\ue14d',
  credit_card: '\ue870',
  crop_free: '\ue3c2',
  dashboard: '\ue871',
  delete: '\ue872',
  document_scanner: '\ue5fa',
  domain: '\ue7ee',
  done: '\ue876',
  done_all: '\ue877',
  edit: '\ue3c9',
  edit_note: '\ue745',
  error: '\ue000',
  event_note: '\ue616',
  face: '\ue87c',
  file_upload: '\ue2c6',
  filter_list: '\ue152',
  folder: '\ue2c7',
  folder_shared: '\ue2c9',
  folder_special: '\ue617',
  group_add: '\ue7f0',
  groups: '\uf233',
  history_edu: '\uea3e',
  home: '\ue88a',
  hourglass_empty: '\ue88b',
  hub: '\ue9f4',
  image: '\ue3f4',
  info: '\ue88e',
  insights: '\uf092',
  ios_share: '\ue6b8',
  label: '\ue892',
  language: '\ue894',
  link: '\ue157',
  local_offer: '\ue54e',
  location_on: '\ue0c8',
  lock: '\ue897',
  logout: '\ue9ba',
  mail: '\ue158',
  monetization_on: '\ue263',
  more_vert: '\ue5d4',
  notifications: '\ue7f4',
  person: '\ue7fd',
  person_add: '\ue7fe',
  photo_camera: '\ue412',
  photo_library: '\ue413',
  qr_code_2: '\ue00a',
  refresh: '\ue5d5',
  restaurant: '\ue56c',
  schedule: '\ue8b5',
  sd_card: '\ue623',
  search: '\ue8b6',
  send: '\ue163',
  settings: '\ue8b8',
  share: '\ue80d',
  shield_with_heart: '\ue78f',
  smart_toy: '\uf06c',
  smartphone: '\ue32c',
  speed: '\ue9e4',
  star: '\ue838',
  star_border: '\ue83a',
  style: '\ue41d',
  swap_vert: '\ue8d5',
  sync: '\ue627',
  terminal: '\ueb8e',
  timer: '\ue425',
  tune: '\ue429',
  upload_file: '\ue9fc',
  verified: '\uef76',
  verified_user: '\ue8e8',
  vibration: '\ue62d',
  warning: '\ue002',
  workspace_premium: '\ue7af',
} as const;

export type IconName = keyof typeof GLYPHS;

type Props = {
  name: IconName;
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
};

export function Icon({ name, size = 22, color = colors.onSurfaceVariant, style }: Props) {
  return (
    <Text
      allowFontScaling={false}
      style={[styles.icon, { fontSize: size, lineHeight: size, width: size, color }, style]}
    >
      {GLYPHS[name]}
    </Text>
  );
}

const styles = StyleSheet.create({
  icon: { fontFamily: ICON_FONT, textAlign: 'center' },
});
