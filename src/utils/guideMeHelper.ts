import categorySchema from '../constants/categories';
import { TopicType } from '../types';

export interface GuideOption {
  value: string;
  label: string;
  description?: string;
}

export interface GuideQuestion {
  question: string;
  options: GuideOption[];
}

export class GuideMeHelper {
  /**
   * Step 1: Select architectural domain (category)
   */
  static getStep1Question(): GuideQuestion {
    const categories = Object.entries(categorySchema);

    // Sort by architecture level: foundational -> intermediate -> advanced
    const sorted = categories.sort((a, b) => {
      const levelOrder = { foundational: 0, intermediate: 1, advanced: 2 };
      const levelA = a[1].architectureLevel;
      const levelB = b[1].architectureLevel;
      return (levelOrder[levelA] || 999) - (levelOrder[levelB] || 999);
    });

    return {
      question: "Which architectural domain interests you?",
      options: sorted.map(([key, value]) => ({
        value: key,
        label: key,
        description: `${value.description} (${value.architectureLevel})`
      }))
    };
  }

  /**
   * Step 2: Select subcategory within domain
   */
  static getStep2Question(selectedCategory: string): GuideQuestion {
    const category = categorySchema[selectedCategory];
    if (!category) {
      throw new Error(`Invalid category: ${selectedCategory}`);
    }

    const subcategories = Object.entries(category.subcategories);

    return {
      question: `Which aspect of ${selectedCategory} interests you?`,
      options: subcategories.map(([key, value]) => ({
        value: key,
        label: key,
        description: value.description
      }))
    };
  }

  /**
   * Step 3: Select topic type (CONDITIONAL - only if multiple types available)
   * Returns null if subcategory has only one topic type
   */
  static getStep3Question(
    selectedCategory: string,
    selectedSubcategory: string
  ): GuideQuestion | null {
    const subcategory = categorySchema[selectedCategory]?.subcategories[selectedSubcategory];
    if (!subcategory) {
      throw new Error(`Invalid subcategory: ${selectedSubcategory}`);
    }

    // CRITICAL: If only one topic type, skip this step
    if (subcategory.topicTypes.length === 1) {
      return null;  // No question needed
    }

    const typeLabels: Record<TopicType, {label: string, description: string}> = {
      concepts: {
        label: "Concepts & Theory",
        description: "Learn theoretical foundations and principles"
      },
      patterns: {
        label: "Patterns & Solutions",
        description: "Discover reusable architectural patterns"
      },
      technologies: {
        label: "Tools & Technologies",
        description: "Explore specific tools and platforms"
      },
      strategies: {
        label: "Strategies & Approaches",
        description: "Understand different approaches and methods"
      },
      models: {
        label: "Models & Paradigms",
        description: "Learn architectural models and paradigms"
      },
      frameworks: {
        label: "Frameworks",
        description: "Explore structured frameworks"
      },
      protocols: {
        label: "Protocols & Standards",
        description: "Understand protocols and specifications"
      },
      practices: {
        label: "Practices & Techniques",
        description: "Learn development and operational practices"
      },
      methodologies: {
        label: "Methodologies",
        description: "Comprehensive development approaches"
      },
      architectures: {
        label: "Architectures & Styles",
        description: "System-level architectural styles"
      }
    };

    return {
      question: `What type of knowledge would you like to explore in ${selectedSubcategory}?`,
      options: subcategory.topicTypes.map(type => ({
        value: type,
        label: typeLabels[type].label,
        description: typeLabels[type].description
      }))
    };
  }

  /**
   * Step 4: Select learning goal
   */
  static getStep4Question(
    selectedCategory: string,
    selectedSubcategory: string,
    selectedTopicType: TopicType
  ): GuideQuestion {
    const typeDescriptions: Record<TopicType, string> = {
      concepts: "concepts",
      patterns: "patterns",
      technologies: "technologies",
      strategies: "strategies",
      models: "models",
      frameworks: "frameworks",
      protocols: "protocols",
      practices: "practices",
      methodologies: "methodologies",
      architectures: "architectures"
    };

    const typeLabel = typeDescriptions[selectedTopicType];

    return {
      question: `How would you like to learn about ${typeLabel}?`,
      options: [
        {
          value: "discover_new",
          label: "Discover Something New",
          description: `Find ${typeLabel} you haven't encountered before`
        },
        {
          value: "popular_choice",
          label: "Popular & Widely Used",
          description: `Learn about commonly adopted ${typeLabel}`
        },
        {
          value: "compare_options",
          label: "Compare Alternatives",
          description: `Understand trade-offs between different ${typeLabel}`
        },
        {
          value: "advanced_topic",
          label: "Advanced Challenge",
          description: `Explore complex or cutting-edge ${typeLabel}`
        }
      ]
    };
  }

  /**
   * Build constraints for LLM based on selections
   */
  static buildConstraints(
    category: string,
    subcategory: string,
    topicType: TopicType,
    learningGoal: string
  ): {
    category: string;
    subcategory: string;
    topicType: TopicType;
    learningGoal: string;
  } {
    return {
      category,
      subcategory,
      topicType,
      learningGoal
    };
  }

  /**
   * Get the single topic type if subcategory has only one
   */
  static getSingleTopicType(category: string, subcategory: string): TopicType | null {
    const sub = categorySchema[category]?.subcategories[subcategory];
    if (!sub || sub.topicTypes.length !== 1) {
      return null;
    }
    return sub.topicTypes[0];
  }
}
