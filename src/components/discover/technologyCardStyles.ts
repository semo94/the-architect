import { StyleSheet } from 'react-native';

export const technologyCardStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerCard: {
    margin: 15,
    padding: 20,
    backgroundColor: '#4CAF50',
  },
  categoryLabel: {
    fontSize: 14,
    color: '#E8F5E9',
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  contentCard: {
    marginHorizontal: 15,
    marginBottom: 15,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  contentText: {
    fontSize: 15,
    color: '#666',
    lineHeight: 24,
  },
  listItem: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  bulletPoint: {
    fontSize: 16,
    color: '#4CAF50',
    marginRight: 10,
    width: 20,
  },
  listText: {
    flex: 1,
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
  },
  comparisonItem: {
    marginBottom: 15,
  },
  comparisonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  comparisonText: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
  },
});
