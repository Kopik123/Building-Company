import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f4f4f4'
  },
  scroll: {
    padding: 16,
    gap: 12
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2d4be',
    padding: 16,
    gap: 10
  },
  item: {
    borderWidth: 1,
    borderColor: '#ececec',
    borderRadius: 8,
    padding: 10,
    marginTop: 8
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111'
  },
  subtitle: {
    color: '#5f5f5f'
  },
  line: {
    color: '#242424'
  },
  itemTitle: {
    fontWeight: '600',
    color: '#111'
  },
  muted: {
    color: '#666'
  },
  input: {
    borderWidth: 1,
    borderColor: '#d3d3d3',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff'
  },
  button: {
    backgroundColor: '#c6a46c',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center'
  },
  buttonSecondary: {
    backgroundColor: '#111',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center'
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600'
  },
  tabWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  tabBtn: {
    borderWidth: 1,
    borderColor: '#d8c3a2',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#fff'
  },
  tabBtnActive: {
    backgroundColor: '#ead0a8'
  },
  tabText: {
    fontSize: 12,
    textTransform: 'uppercase'
  },
  error: {
    color: '#9e2424'
  }
});
