import React from 'react';
import { Text } from 'react-native';
import { Card } from '../../common/Card';
import { SkeletonLoader } from '../../common/SkeletonLoader';
import { technologyCardStyles } from '../technologyCardStyles';

interface Props {
  category?: string;
  subcategory?: string;
  name?: string;
  isLoading?: boolean;
  LoadingWrapper?: React.FC<{ children: React.ReactNode }>;
}

export const HeaderSection: React.FC<Props> = ({
  category,
  subcategory,
  name,
  isLoading = false,
  LoadingWrapper,
}) => {
  const content = isLoading ? (
    <>
      <SkeletonLoader width="60%" height={14} style={{ marginBottom: 8 }} />
      <SkeletonLoader width="80%" height={28} />
    </>
  ) : (
    <>
      <Text style={technologyCardStyles.categoryLabel}>
        {category} › {subcategory}
      </Text>
      <Text style={technologyCardStyles.title}>{name}</Text>
    </>
  );

  return (
    <Card style={technologyCardStyles.headerCard}>
      {LoadingWrapper && !isLoading ? (
        <LoadingWrapper>{content}</LoadingWrapper>
      ) : (
        content
      )}
    </Card>
  );
};
