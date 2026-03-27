const React = require('react');
const { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } = require('react-native');

const palette = {
  ink: '#191512',
  muted: '#6E655C',
  line: '#D8C4AA',
  surface: '#FFF7ED',
  surfaceAlt: '#FFFDFC',
  accent: '#B88A4A',
  accentSoft: '#F1E1CC',
  danger: '#9B2C2C',
  success: '#1F6F43'
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F6EFE6' },
  scroll: { paddingHorizontal: 16, paddingVertical: 18, gap: 14 },
  heroCard: { backgroundColor: palette.ink, borderRadius: 18, padding: 18, gap: 10 },
  heroTitle: { color: '#FFF6E8', fontSize: 24, fontWeight: '700' },
  heroSubtitle: { color: '#E5D0B4', fontSize: 13, lineHeight: 18 },
  card: { backgroundColor: palette.surfaceAlt, borderRadius: 16, borderWidth: 1, borderColor: palette.line, padding: 16, gap: 12 },
  sectionTitle: { color: palette.ink, fontSize: 20, fontWeight: '700' },
  sectionSubtitle: { color: palette.muted, fontSize: 13, lineHeight: 18 },
  fieldWrap: { gap: 6 },
  fieldLabel: { color: palette.ink, fontSize: 12, fontWeight: '600', letterSpacing: 0.4, textTransform: 'uppercase' },
  input: { borderWidth: 1, borderColor: palette.line, borderRadius: 12, backgroundColor: palette.surface, paddingHorizontal: 12, paddingVertical: 12, color: palette.ink },
  textarea: { minHeight: 96, textAlignVertical: 'top' },
  button: { backgroundColor: palette.accent, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  buttonSecondary: { backgroundColor: palette.ink },
  buttonGhost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: palette.line },
  buttonDisabled: { opacity: 0.55 },
  buttonText: { color: '#FFF9F1', fontWeight: '700' },
  buttonGhostText: { color: palette.ink },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tab: { borderWidth: 1, borderColor: palette.line, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: palette.surface },
  tabActive: { backgroundColor: palette.accentSoft, borderColor: palette.accent },
  tabText: { color: palette.ink, fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  notice: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: palette.accentSoft },
  noticeError: { backgroundColor: '#FBEAEA' },
  noticeSuccess: { backgroundColor: '#E6F5EC' },
  noticeText: { color: palette.ink, lineHeight: 18 },
  noticeTextError: { color: palette.danger },
  noticeTextSuccess: { color: palette.success },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metricCard: { minWidth: '47%', flexGrow: 1, borderRadius: 14, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.line, padding: 12, gap: 4 },
  metricValue: { color: palette.ink, fontSize: 22, fontWeight: '700' },
  metricLabel: { color: palette.muted, fontSize: 12, lineHeight: 16 },
  itemCard: { borderWidth: 1, borderColor: palette.line, borderRadius: 14, padding: 12, backgroundColor: palette.surface, gap: 6 },
  itemTitle: { color: palette.ink, fontSize: 16, fontWeight: '700' },
  itemMeta: { color: palette.muted, fontSize: 12 },
  itemBody: { color: palette.ink, lineHeight: 18 },
  emptyText: { color: palette.muted, lineHeight: 18 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: palette.line, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: palette.surface },
  chipActive: { backgroundColor: palette.accentSoft, borderColor: palette.accent },
  chipText: { color: palette.ink, fontSize: 12 }
});

function AppScreen({ title, subtitle, children }) {
  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>{title}</Text>
          {subtitle ? <Text style={styles.heroSubtitle}>{subtitle}</Text> : null}
        </View>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionCard({ title, subtitle, children }) {
  return (
    <View style={styles.card}>
      {title ? <Text style={styles.sectionTitle}>{title}</Text> : null}
      {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      {children}
    </View>
  );
}

function Field({ label, children }) {
  return (
    <View style={styles.fieldWrap}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      {children}
    </View>
  );
}

function InputField({ label, multiline = false, style, ...props }) {
  return (
    <Field label={label}>
      <TextInput {...props} multiline={multiline} style={[styles.input, multiline ? styles.textarea : null, style]} />
    </Field>
  );
}

function ActionButton({ label, secondary = false, ghost = false, disabled = false, ...props }) {
  return (
    <Pressable
      disabled={disabled}
      style={[styles.button, secondary ? styles.buttonSecondary : null, ghost ? styles.buttonGhost : null, disabled ? styles.buttonDisabled : null]}
      {...props}
    >
      <Text style={[styles.buttonText, ghost ? styles.buttonGhostText : null]}>{label}</Text>
    </Pressable>
  );
}

function TabBar({ tabs, activeKey, onChange }) {
  return (
    <View style={styles.tabs}>
      {tabs.map((tab) => (
        <Pressable key={tab.key} onPress={() => onChange(tab.key)} style={[styles.tab, activeKey === tab.key ? styles.tabActive : null]}>
          <Text style={styles.tabText}>{tab.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function Notice({ tone = 'info', text }) {
  if (!text) return null;
  return (
    <View style={[styles.notice, tone === 'error' ? styles.noticeError : null, tone === 'success' ? styles.noticeSuccess : null]}>
      <Text style={[styles.noticeText, tone === 'error' ? styles.noticeTextError : null, tone === 'success' ? styles.noticeTextSuccess : null]}>{text}</Text>
    </View>
  );
}

function MetricGrid({ items }) {
  return (
    <View style={styles.metricGrid}>
      {items.map((item) => (
        <View key={item.label} style={styles.metricCard}>
          <Text style={styles.metricValue}>{item.value}</Text>
          <Text style={styles.metricLabel}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

function ListCard({ title, meta, body, children }) {
  return (
    <View style={styles.itemCard}>
      <Text style={styles.itemTitle}>{title}</Text>
      {meta ? <Text style={styles.itemMeta}>{meta}</Text> : null}
      {body ? <Text style={styles.itemBody}>{body}</Text> : null}
      {children}
    </View>
  );
}

function EmptyState({ text }) {
  return <Text style={styles.emptyText}>{text}</Text>;
}

function ChoiceChipGroup({ options, values, onToggle }) {
  return (
    <View style={styles.chipRow}>
      {options.map((option) => {
        const active = values.includes(option.value);
        return (
          <Pressable key={option.value} onPress={() => onToggle(option.value)} style={[styles.chip, active ? styles.chipActive : null]}>
            <Text style={styles.chipText}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

module.exports = {
  AppScreen,
  SectionCard,
  Field,
  InputField,
  ActionButton,
  TabBar,
  Notice,
  MetricGrid,
  ListCard,
  EmptyState,
  ChoiceChipGroup,
  styles,
  palette
};

module.exports.default = module.exports;
