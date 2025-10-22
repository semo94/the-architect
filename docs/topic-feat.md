# Technical Specification: Breadthwise Multi-Type Topic System

## Executive Summary
Transform Breadthwise from a "technology discovery" app to a comprehensive "architectural knowledge" platform by implementing a multi-type topic system where subcategories can contain multiple knowledge types (concepts, patterns, technologies, etc.). This design enables more accurate LLM generation, better user control, and reflects the reality that architectural domains naturally contain mixed content types.

---

## 1. Core Schema Design

### 1.1 TypeScript Interfaces

#### File: `src/types/index.ts`

```typescript
export type TopicType =
  | 'concepts'
  | 'patterns'
  | 'technologies'
  | 'strategies'
  | 'models'
  | 'frameworks'
  | 'protocols'
  | 'practices'
  | 'methodologies'
  | 'architectures';

export interface SubcategorySchema {
  description: string;
  topicTypes: TopicType[];  // Array of supported topic types

  // Dynamic properties - at least one must exist for each topicType
  concepts?: string[];
  patterns?: string[];
  technologies?: string[];
  strategies?: string[];
  models?: string[];
  frameworks?: string[];
  protocols?: string[];
  practices?: string[];
  methodologies?: string[];
  architectures?: string[];

  learningPath?: 'foundational' | 'intermediate' | 'advanced';
}

export interface CategorySchema {
  description: string;
  architectureLevel: 'foundational' | 'intermediate' | 'advanced';
  subcategories: Record<string, SubcategorySchema>;
}

export interface Topic {
  id: string;
  name: string;
  topicType: TopicType;  // The specific type of THIS topic
  category: string;
  subcategory: string;
  content: TopicContent;
  status: 'discovered' | 'learned';
  discoveryMethod: 'surprise' | 'guided';
  discoveredAt: string;
  learnedAt: string | null;
}

export interface TopicContent {
  what: string;
  why: string;
  pros: string[];
  cons: string[];
  compareToSimilar: Array<{
    topic: string;
    comparison: string;
  }>;
}

export interface Quiz {
  id: string;
  topicId: string;
  topicName: string;
  topicType: TopicType;  // Add this for context
  questions: QuizQuestion[];
  currentQuestionIndex: number;
  score: number;
  completed: boolean;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  userAnswer: number | null;
  explanation: string;
}
```

### 1.2 Schema Structure

#### File: `src/constants/categories.ts`

```typescript
import { CategorySchema, TopicType } from '../types';

const categorySchema: Record<string, CategorySchema> = {
  "System Design Fundamentals": {
    description: "Core principles and trade-offs in distributed systems",
    architectureLevel: "foundational",
    subcategories: {
      "Distributed Systems Theory": {
        description: "Theoretical foundations of distributed computing",
        topicTypes: ["concepts", "models"],  // Multiple types!
        concepts: [
          "CAP Theorem",
          "PACELC Theorem",
          "Consistency Models",
          "Vector Clocks",
          "Distributed Consensus",
          "Two-Phase Commit",
          "Quorum Systems"
        ],
        models: [
          "Shared-Nothing Architecture",
          "Shared-Disk Architecture",
          "Replicated State Machines"
        ],
        learningPath: "foundational"
      },

      "Scalability Principles": {
        description: "Fundamental approaches to system scaling",
        topicTypes: ["strategies", "concepts"],
        strategies: [
          "Horizontal vs Vertical Scaling",
          "Partitioning Strategies",
          "Load Distribution",
          "Stateless Design",
          "Caching Layers",
          "Read vs Write Scaling"
        ],
        concepts: [
          "Scalability Triangle",
          "Amdahl's Law",
          "Universal Scalability Law"
        ]
      },

      "Reliability & Fault Tolerance": {
        description: "Building resilient distributed systems",
        topicTypes: ["concepts", "patterns"],
        concepts: [
          "Failure Modes",
          "Blast Radius",
          "Mean Time Between Failures (MTBF)",
          "Recovery Time Objective (RTO)",
          "Recovery Point Objective (RPO)"
        ],
        patterns: [
          "Redundancy Patterns",
          "Graceful Degradation",
          "Bulkhead Pattern",
          "Timeout Pattern"
        ]
      }
    }
  },

  "Architecture Patterns & Styles": {
    description: "Proven architectural approaches and design patterns",
    architectureLevel: "intermediate",
    subcategories: {
      "Service Architecture Styles": {
        description: "Different approaches to structuring services",
        topicTypes: ["architectures", "concepts"],
        architectures: [
          "Microservices",
          "Service-Oriented Architecture (SOA)",
          "Modular Monolith",
          "Serverless Architecture",
          "Space-Based Architecture"
        ],
        concepts: [
          "Service Boundaries",
          "Bounded Context",
          "Service Mesh",
          "Conway's Law"
        ]
      },

      "Event-Driven Patterns": {
        description: "Patterns for event-based architectures",
        topicTypes: ["patterns", "architectures"],  // Mixed types
        patterns: [
          "Event Sourcing",
          "CQRS (Command Query Responsibility Segregation)",
          "Saga Pattern",
          "Event Notification",
          "Event-Carried State Transfer",
          "Transactional Outbox"
        ],
        architectures: [
          "Event-Driven Architecture (EDA)",
          "Reactive Architecture",
          "Actor Model"
        ]
      },

      "Data Management Patterns": {
        description: "Patterns for managing data in distributed systems",
        topicTypes: ["patterns", "strategies"],
        patterns: [
          "Database per Service",
          "Shared Database Anti-pattern",
          "API Composition",
          "Materialized View",
          "Change Data Capture (CDC)"
        ],
        strategies: [
          "Data Replication Strategies",
          "Data Partitioning",
          "Polyglot Persistence"
        ]
      },

      "Integration Patterns": {
        description: "Patterns for system integration",
        topicTypes: ["patterns"],  // Single type (still array)
        patterns: [
          "API Gateway",
          "Backend for Frontend (BFF)",
          "Service Registry",
          "Client-Side Discovery",
          "Server-Side Discovery",
          "Aggregator Pattern",
          "Proxy Pattern",
          "Gateway Routing"
        ]
      },

      "Resilience Patterns": {
        description: "Patterns for building fault-tolerant systems",
        topicTypes: ["patterns", "practices"],
        patterns: [
          "Circuit Breaker",
          "Retry Pattern",
          "Timeout",
          "Bulkhead",
          "Rate Limiting",
          "Throttling",
          "Fallback",
          "Hedged Requests"
        ],
        practices: [
          "Chaos Engineering",
          "Fault Injection Testing",
          "Game Days"
        ]
      }
    }
  },

  "Data Storage & Management": {
    description: "Database technologies and data management strategies",
    architectureLevel: "intermediate",
    subcategories: {
      "Database Paradigms": {
        description: "Different types of databases and their use cases",
        topicTypes: ["technologies", "concepts"],
        technologies: [
          "PostgreSQL",
          "MongoDB",
          "Cassandra",
          "Redis",
          "Neo4j",
          "Elasticsearch",
          "DynamoDB",
          "CockroachDB"
        ],
        concepts: [
          "Relational Model",
          "Document Model",
          "Key-Value Model",
          "Column-Family Model",
          "Graph Model",
          "Time-Series Model"
        ]
      },

      "Caching Strategies": {
        description: "Strategies for improving performance through caching",
        topicTypes: ["strategies", "patterns", "technologies"],
        strategies: [
          "Cache-Aside",
          "Read-Through",
          "Write-Through",
          "Write-Behind",
          "Refresh-Ahead"
        ],
        patterns: [
          "Distributed Caching",
          "Local Caching",
          "Multi-Level Caching"
        ],
        technologies: [
          "Redis",
          "Memcached",
          "Varnish",
          "CDN Caching"
        ]
      },

      "Data Replication": {
        description: "Strategies for replicating data across systems",
        topicTypes: ["strategies", "concepts"],
        strategies: [
          "Primary-Replica Replication",
          "Multi-Primary Replication",
          "Leaderless Replication",
          "Synchronous Replication",
          "Asynchronous Replication"
        ],
        concepts: [
          "Replication Lag",
          "Read Your Writes Consistency",
          "Monotonic Reads",
          "Causality Tracking"
        ]
      }
    }
  },

  "API Design & Management": {
    description: "Designing, building, and managing APIs",
    architectureLevel: "intermediate",
    subcategories: {
      "API Architectural Styles": {
        description: "Different approaches to API design",
        topicTypes: ["architectures", "protocols"],
        architectures: [
          "REST",
          "GraphQL",
          "gRPC",
          "SOAP",
          "WebSocket APIs",
          "Server-Sent Events (SSE)"
        ],
        protocols: [
          "HTTP/1.1",
          "HTTP/2",
          "HTTP/3",
          "WebSocket Protocol"
        ]
      },

      "API Design Principles": {
        description: "Best practices for designing APIs",
        topicTypes: ["concepts", "practices"],
        concepts: [
          "REST Maturity Model",
          "HATEOAS",
          "Idempotency",
          "API Versioning Strategies"
        ],
        practices: [
          "API-First Design",
          "Contract-First Development",
          "Backward Compatibility",
          "Pagination Strategies",
          "Error Handling Standards"
        ]
      },

      "API Security": {
        description: "Securing APIs and managing access",
        topicTypes: ["protocols", "patterns", "practices"],
        protocols: [
          "OAuth 2.0",
          "OpenID Connect",
          "JWT (JSON Web Tokens)",
          "API Keys",
          "SAML"
        ],
        patterns: [
          "Token-Based Authentication",
          "API Gateway Security",
          "Zero Trust APIs"
        ],
        practices: [
          "Rate Limiting",
          "IP Whitelisting",
          "CORS Configuration",
          "Input Validation"
        ]
      }
    }
  },

  "Messaging & Event Streaming": {
    description: "Message brokers and event streaming platforms",
    architectureLevel: "intermediate",
    subcategories: {
      "Message Brokers": {
        description: "Technologies for message-based communication",
        topicTypes: ["technologies", "patterns"],
        technologies: [
          "RabbitMQ",
          "Apache Kafka",
          "Amazon SQS",
          "Amazon SNS",
          "Google Pub/Sub",
          "Azure Service Bus",
          "NATS",
          "Apache Pulsar"
        ],
        patterns: [
          "Point-to-Point Messaging",
          "Publish-Subscribe",
          "Request-Reply",
          "Dead Letter Queue"
        ]
      },

      "Event Streaming Platforms": {
        description: "Platforms for real-time event streaming",
        topicTypes: ["technologies", "concepts"],
        technologies: [
          "Apache Kafka",
          "Amazon Kinesis",
          "Apache Pulsar",
          "Azure Event Hubs",
          "Confluent Platform"
        ],
        concepts: [
          "Event Log",
          "Stream Partitioning",
          "Consumer Groups",
          "Offset Management",
          "Exactly-Once Semantics"
        ]
      }
    }
  },

  "Domain-Driven Design": {
    description: "Strategic and tactical DDD patterns",
    architectureLevel: "advanced",
    subcategories: {
      "Strategic Design": {
        description: "High-level DDD patterns for system decomposition",
        topicTypes: ["concepts", "patterns"],
        concepts: [
          "Bounded Context",
          "Ubiquitous Language",
          "Context Mapping",
          "Domain",
          "Subdomain",
          "Core Domain",
          "Supporting Subdomain",
          "Generic Subdomain"
        ],
        patterns: [
          "Shared Kernel",
          "Customer-Supplier",
          "Conformist",
          "Anti-Corruption Layer",
          "Open Host Service",
          "Published Language",
          "Separate Ways"
        ]
      },

      "Tactical Design": {
        description: "Code-level DDD patterns",
        topicTypes: ["patterns", "practices"],
        patterns: [
          "Entity",
          "Value Object",
          "Aggregate",
          "Aggregate Root",
          "Repository Pattern",
          "Domain Service",
          "Application Service",
          "Factory Pattern",
          "Domain Event"
        ],
        practices: [
          "Anemic Domain Model (Anti-pattern)",
          "Rich Domain Model",
          "Persistence Ignorance"
        ]
      }
    }
  },

  "Cloud-Native Architecture": {
    description: "Building applications for cloud environments",
    architectureLevel: "intermediate",
    subcategories: {
      "Compute Models": {
        description: "Different cloud computing models",
        topicTypes: ["models", "technologies"],
        models: [
          "Infrastructure as a Service (IaaS)",
          "Platform as a Service (PaaS)",
          "Function as a Service (FaaS)",
          "Container as a Service (CaaS)",
          "Backend as a Service (BaaS)"
        ],
        technologies: [
          "AWS Lambda",
          "Azure Functions",
          "Google Cloud Run",
          "AWS EC2",
          "AWS ECS/EKS"
        ]
      },

      "Container Orchestration": {
        description: "Managing containerized applications",
        topicTypes: ["technologies", "concepts"],
        technologies: [
          "Kubernetes",
          "Docker Swarm",
          "Amazon ECS",
          "Nomad",
          "OpenShift"
        ],
        concepts: [
          "Pod",
          "Service",
          "Ingress",
          "ConfigMap",
          "Secret",
          "StatefulSet",
          "DaemonSet"
        ]
      }
    }
  },

  "Security & Identity": {
    description: "Authentication, authorization, and security patterns",
    architectureLevel: "intermediate",
    subcategories: {
      "Authentication": {
        description: "Verifying user identity",
        topicTypes: ["protocols", "technologies", "patterns"],
        protocols: [
          "OAuth 2.0",
          "OpenID Connect",
          "SAML 2.0",
          "Kerberos",
          "LDAP"
        ],
        technologies: [
          "Auth0",
          "Okta",
          "AWS Cognito",
          "Azure AD",
          "Keycloak"
        ],
        patterns: [
          "Single Sign-On (SSO)",
          "Multi-Factor Authentication (MFA)",
          "Passwordless Authentication",
          "Social Login"
        ]
      },

      "Authorization": {
        description: "Controlling access to resources",
        topicTypes: ["models", "patterns"],
        models: [
          "Role-Based Access Control (RBAC)",
          "Attribute-Based Access Control (ABAC)",
          "Policy-Based Access Control (PBAC)",
          "Access Control Lists (ACL)"
        ],
        patterns: [
          "Claims-Based Authorization",
          "Permission-Based Authorization",
          "Resource-Based Authorization"
        ]
      },

      "Security Patterns": {
        description: "Patterns for securing applications",
        topicTypes: ["patterns", "practices"],
        patterns: [
          "Defense in Depth",
          "Principle of Least Privilege",
          "Zero Trust Architecture",
          "Security by Design",
          "Fail Securely"
        ],
        practices: [
          "Security Auditing",
          "Penetration Testing",
          "Vulnerability Scanning",
          "Threat Modeling",
          "Security Code Review"
        ]
      }
    }
  },

  "DevOps & Continuous Delivery": {
    description: "Automation and operational practices",
    architectureLevel: "intermediate",
    subcategories: {
      "CI/CD Pipelines": {
        description: "Continuous integration and deployment",
        topicTypes: ["practices", "technologies"],
        practices: [
          "Continuous Integration",
          "Continuous Delivery",
          "Continuous Deployment",
          "Trunk-Based Development",
          "Feature Toggles"
        ],
        technologies: [
          "Jenkins",
          "GitLab CI",
          "GitHub Actions",
          "CircleCI",
          "Azure DevOps",
          "ArgoCD",
          "Spinnaker"
        ]
      },

      "Infrastructure as Code": {
        description: "Managing infrastructure through code",
        topicTypes: ["practices", "technologies"],
        practices: [
          "Declarative Configuration",
          "Immutable Infrastructure",
          "Infrastructure Testing",
          "Drift Detection"
        ],
        technologies: [
          "Terraform",
          "CloudFormation",
          "Pulumi",
          "Ansible",
          "Chef",
          "Puppet"
        ]
      }
    }
  },

  "Observability & Operations": {
    description: "Monitoring, logging, and system observability",
    architectureLevel: "intermediate",
    subcategories: {
      "Monitoring & Metrics": {
        description: "Collecting and analyzing system metrics",
        topicTypes: ["practices", "technologies", "concepts"],
        practices: [
          "Golden Signals",
          "RED Method",
          "USE Method",
          "SLI/SLO/SLA",
          "Alerting Strategies"
        ],
        technologies: [
          "Prometheus",
          "Grafana",
          "Datadog",
          "New Relic",
          "CloudWatch",
          "Splunk"
        ],
        concepts: [
          "Metrics vs Logs vs Traces",
          "Cardinality",
          "Time Series Data",
          "Aggregation Strategies"
        ]
      },

      "Distributed Tracing": {
        description: "Tracing requests across distributed systems",
        topicTypes: ["practices", "technologies", "concepts"],
        practices: [
          "Context Propagation",
          "Trace Sampling",
          "Service Dependency Mapping"
        ],
        technologies: [
          "Jaeger",
          "Zipkin",
          "OpenTelemetry",
          "AWS X-Ray",
          "Google Cloud Trace"
        ],
        concepts: [
          "Spans",
          "Traces",
          "Trace Context",
          "Baggage"
        ]
      }
    }
  }
};

// Runtime validation helper
export function validateSubcategorySchema(subcategory: SubcategorySchema): boolean {
  // Check that each topicType has a corresponding property
  for (const topicType of subcategory.topicTypes) {
    const examples = subcategory[topicType as keyof SubcategorySchema];
    if (!Array.isArray(examples)) {
      console.warn(`Subcategory declares topicType "${topicType}" but has no corresponding array property`);
      // Allow this - examples are optional
    }
  }
  return true;
}

// Helper to get all examples for a subcategory
export function getAllExamplesFromSubcategory(subcategory: SubcategorySchema): Array<{type: TopicType, name: string}> {
  const allExamples: Array<{type: TopicType, name: string}> = [];

  for (const topicType of subcategory.topicTypes) {
    const examples = subcategory[topicType as keyof SubcategorySchema];
    if (Array.isArray(examples)) {
      examples.forEach(name => {
        allExamples.push({ type: topicType, name });
      });
    }
  }

  return allExamples;
}

export default categorySchema;
```

### 1.3 Schema Design Rationale

**Why this approach is superior:**

1. **Accurate Representation**: Subcategories like "Event-Driven Patterns" naturally contain both patterns (Saga, CQRS) and architectures (EDA, Reactive). Previous design forced artificial categorization.

2. **LLM Precision**: Prompts can now say "Generate a pattern from Event-Driven Patterns" instead of "Generate something from Event-Driven Patterns", reducing ambiguity.

3. **User Choice**: Users can express preferences: "I want to learn technologies in API Security" vs "I want to learn patterns in API Security"

4. **Maintainability**: As we expand, we can easily add new topic types to existing subcategories without restructuring.

5. **Flexibility**: Some subcategories are homogeneous (single type), others are heterogeneous (multiple types). This design handles both elegantly.

---

## 2. Updated Prompts

### 2.1 Unified Topic Generation

#### File: `src/utils/prompts.ts`

```typescript
import { Topic, TopicType, SubcategorySchema } from '../types';

export const promptTemplates = {
  /**
   * Unified topic generation for both Surprise Me and Guide Me flows
   */
  generateTopic: (
    mode: 'surprise' | 'guided',
    alreadyDiscovered: string[],
    dismissed: string[],
    categorySchema: any,
    constraints?: {
      category?: string;
      subcategory?: string;
      topicType?: TopicType;  // Now explicitly selected
      learningGoal?: 'discover_new' | 'popular_choice' | 'compare_options' | 'advanced_topic';
    }
  ): string => {
    const subcategory: SubcategorySchema | undefined =
      constraints?.category && constraints?.subcategory
        ? categorySchema[constraints.category]?.subcategories[constraints.subcategory]
        : undefined;

    // Get examples for the specific topic type if constrained
    const relevantExamples = subcategory && constraints?.topicType
      ? subcategory[constraints.topicType as keyof SubcategorySchema] || []
      : [];

    return `
You are an expert software architecture mentor generating learning content.

GENERATION MODE: ${mode}

${mode === 'guided' ? `
GUIDED CONSTRAINTS:
- Category: ${constraints?.category}
- Subcategory: ${constraints?.subcategory}
- Topic Type: ${constraints?.topicType} (MUST generate this type)
- Learning Goal: ${constraints?.learningGoal}
${relevantExamples.length > 0 ? `
- Example ${constraints?.topicType}: ${JSON.stringify(relevantExamples)}
` : ''}
` : `
SURPRISE MODE:
- Randomly select from the entire category schema
- Randomly select topic type from the subcategory's topicTypes array
- Ensure variety across all topic types
`}

TOPIC TYPE DEFINITIONS:
- concepts: Theoretical foundations and principles (CAP Theorem, Consistency Models)
- patterns: Reusable architectural solutions (Circuit Breaker, Saga Pattern)
- technologies: Specific tools and platforms (Redis, Kubernetes, Kafka)
- strategies: Approaches and methods (Blue-Green Deployment, Cache-Aside)
- models: Architectural paradigms (Pub/Sub, Client-Server, RBAC)
- frameworks: Structured methodologies (12-Factor App, Spring Framework)
- protocols: Standards and specifications (OAuth 2.0, HTTP/2, gRPC)
- practices: Development and operational practices (TDD, Chaos Engineering)
- methodologies: Comprehensive approaches (Domain-Driven Design, Event Storming)
- architectures: System-level designs (Microservices, Event-Driven, Serverless)

CONTEXT:
- Already discovered topics: ${JSON.stringify(alreadyDiscovered)}
- Recently dismissed: ${JSON.stringify(dismissed)}
${mode === 'surprise' ? `- Available schema: ${JSON.stringify(categorySchema)}` : ''}

SELECTION REQUIREMENTS:
${mode === 'guided' ? `
1. MUST generate a topic of type: ${constraints?.topicType}
2. Topic should be from subcategory: ${constraints?.subcategory}
3. Align with learning goal: ${constraints?.learningGoal}
4. Can use examples as inspiration OR generate any valid ${constraints?.topicType} in this domain
` : `
1. Randomly select a category from the schema
2. Randomly select a subcategory within that category
3. Randomly select ONE topicType from that subcategory's topicTypes array
4. Generate a topic of that specific type
`}
5. Topic name must NOT be in discovered or dismissed lists
6. Ensure topic is real, recognized, and architecturally significant

CONTENT GENERATION GUIDELINES BY TYPE:

concepts:
- Focus on theoretical understanding, principles, trade-offs, implications
- Explain the foundational idea and why it matters
- Compare with related concepts

patterns:
- Describe the problem context and the solution structure
- Include when to use, implementation considerations, trade-offs
- Compare with alternative patterns

technologies:
- Explain how it works, architecture, ecosystem
- Cover use cases, operational aspects, maturity, adoption
- Compare with competing technologies

strategies:
- Explain the approach, methodology, steps involved
- When to apply, prerequisites, benefits, risks
- Compare with alternative strategies

models:
- Describe the paradigm, its characteristics, properties
- Use cases, strengths, limitations
- Compare with related models

frameworks:
- Explain the structure, philosophy, key components
- When to use, learning curve, ecosystem
- Compare with alternative frameworks

protocols:
- Cover specification, how it works, compatibility
- Use cases, security considerations, adoption
- Compare with related protocols

practices:
- Explain the methodology, how to implement, benefits
- Prerequisites, common pitfalls, maturity indicators
- Compare with related practices

methodologies:
- Cover philosophy, core principles, components
- Adoption process, organizational fit, benefits
- Compare with alternative methodologies

architectures:
- Describe structure, key characteristics, components
- When to use, evolution path, trade-offs
- Compare with alternative architectures

OUTPUT FORMAT (JSON - flat structure for streaming):
{
  "name": "Specific Topic Name",
  "topicType": "${constraints?.topicType || 'auto-detect from subcategory'}",
  "category": "${constraints?.category || 'from schema'}",
  "subcategory": "${constraints?.subcategory || 'from schema'}",
  "what": "2-3 substantial paragraphs explaining the topic in depth. Tailor explanation to the topic type. Be specific, technical, and comprehensive.",
  "why": "2-3 substantial paragraphs on architectural significance, when to use, problems it solves, strategic value.",
  "pro_0": "First key advantage/strength (contextualized to topic type)",
  "pro_1": "Second key advantage/strength",
  "pro_2": "Third key advantage/strength",
  "pro_3": "Fourth key advantage/strength",
  "pro_4": "Fifth key advantage/strength",
  "con_0": "First limitation/trade-off/challenge",
  "con_1": "Second limitation/trade-off/challenge",
  "con_2": "Third limitation/trade-off/challenge",
  "con_3": "Fourth limitation/trade-off/challenge",
  "con_4": "Fifth limitation/trade-off/challenge",
  "compare_0_tech": "Similar/Alternative Topic Name (same or related type)",
  "compare_0_text": "2-3 sentences comparing: key differences, when to choose one over the other",
  "compare_1_tech": "Another Similar/Alternative Topic",
  "compare_1_text": "2-3 sentences: different trade-offs, use case distinctions"
}

CRITICAL REQUIREMENTS:
- Name must be a real, widely-recognized topic in software architecture
- Content must be accurate, substantial, and architecturally relevant
- Comparisons must be with genuinely related topics of same or related types
- Return ONLY valid JSON without markdown code blocks or preamble
- topicType must exactly match ${constraints?.topicType ? `"${constraints.topicType}"` : 'the subcategory definition'}

Generate the topic now:`;
  },

  /**
   * Quiz generation (updated for topics)
   */
  generateQuizQuestions: (topic: Topic): string => `
You are creating a quiz to test understanding of ${topic.name}, which is a ${topic.topicType} in ${topic.category}.

TOPIC DETAILS:
- Name: ${topic.name}
- Type: ${topic.topicType}
- Category: ${topic.category}
- Subcategory: ${topic.subcategory}
- What: ${topic.content.what}
- Why: ${topic.content.why}

QUIZ REQUIREMENTS:
Create 4 multiple-choice questions appropriate for this topic type.

Question guidelines by type:
- concepts: Test theoretical understanding, implications, relationships
- patterns: Test problem recognition, solution application, trade-off analysis
- technologies: Test practical knowledge, use cases, operational aspects
- strategies: Test situational application, comparison, execution
- models: Test characteristics, use cases, properties
- protocols: Test specification knowledge, compatibility, security
- practices: Test implementation understanding, benefits, challenges
- methodologies: Test philosophy, components, adoption
- architectures: Test structural understanding, characteristics, evolution

Requirements:
- Questions must be clear, specific, and unambiguous
- All options should be plausible (avoid obvious wrong answers)
- Correct answer should be definitively correct based on the content provided
- Incorrect options should be reasonable but clearly distinguishable
- Include a brief explanation for each question

OUTPUT FORMAT (JSON):
{
  "question_0": "First question text?",
  "option_0_0": "Option A",
  "option_0_1": "Option B",
  "option_0_2": "Option C",
  "option_0_3": "Option D",
  "correct_0": 0,  // Index of correct answer (0-3)
  "explanation_0": "Brief explanation of why the answer is correct",

  "question_1": "Second question text?",
  "option_1_0": "Option A",
  "option_1_1": "Option B",
  "option_1_2": "Option C",
  "option_1_3": "Option D",
  "correct_1": 0,
  "explanation_1": "Explanation",

  "question_2": "Third question text?",
  "option_2_0": "Option A",
  "option_2_1": "Option B",
  "option_2_2": "Option C",
  "option_2_3": "Option D",
  "correct_2": 0,
  "explanation_2": "Explanation",

  "question_3": "Fourth question text?",
  "option_3_0": "Option A",
  "option_3_1": "Option B",
  "option_3_2": "Option C",
  "option_3_3": "Option D",
  "correct_3": 0,
  "explanation_3": "Explanation"
}

Return ONLY valid JSON without markdown code blocks.
Generate the quiz now:`
};
```

---

## 3. Guide Me Flow - Conditional Topic Type Selection

### 3.1 Guide Me Configuration

#### New File: `src/constants/guideMeFlow.ts`

```typescript
import categorySchema, { getAllExamplesFromSubcategory } from './categories';
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

export class GuideMeFlow {
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
        label: "Frameworks & Methodologies",
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
```

### 3.2 Updated Guide Me Component

#### File: `src/components/discover/GuideMeFlow.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { GuideMeFlow, GuideQuestion } from '@/constants/guideMeFlow';
import { Topic, TopicType } from '@/types';
import { llmService } from '@/services/llmService';
import categorySchema from '@/constants/categories';
import { useAppStore } from '@/store/useAppStore';

interface Props {
  onComplete: (topic: Topic) => void;
  onCancel: () => void;
}

const GuideMeFlowComponent: React.FC<Props> = ({ onComplete, onCancel }) => {
  const { topics } = useAppStore();

  const [step, setStep] = useState(0);
  const [selections, setSelections] = useState({
    category: '',
    subcategory: '',
    topicType: '' as TopicType | '',
    learningGoal: ''
  });

  const [currentQuestion, setCurrentQuestion] = useState<GuideQuestion | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamedContent, setStreamedContent] = useState('');

  useEffect(() => {
    // Load first question immediately (no LLM call)
    setCurrentQuestion(GuideMeFlow.getStep1Question());
  }, []);

  const handleOptionSelect = async (value: string) => {
    if (step === 0) {
      // Step 1: Category selected
      setSelections({ ...selections, category: value });
      setCurrentQuestion(GuideMeFlow.getStep2Question(value));
      setStep(1);

    } else if (step === 1) {
      // Step 2: Subcategory selected
      setSelections({ ...selections, subcategory: value });

      // Check if this subcategory has multiple topic types
      const nextQuestion = GuideMeFlow.getStep3Question(selections.category, value);

      if (nextQuestion === null) {
        // Only one topic type - auto-select it and move to step 4
        const singleType = GuideMeFlow.getSingleTopicType(selections.category, value);
        if (singleType) {
          setSelections(prev => ({ ...prev, subcategory: value, topicType: singleType }));
          setCurrentQuestion(GuideMeFlow.getStep4Question(selections.category, value, singleType));
          setStep(3);  // Skip to step 3 (which is learning goal)
        }
      } else {
        // Multiple topic types - show selection
        setCurrentQuestion(nextQuestion);
        setStep(2);
      }

    } else if (step === 2) {
      // Step 3: Topic type selected (only shown if multiple types)
      setSelections({ ...selections, topicType: value as TopicType });
      setCurrentQuestion(GuideMeFlow.getStep4Question(
        selections.category,
        selections.subcategory,
        value as TopicType
      ));
      setStep(3);

    } else if (step === 3) {
      // Step 4: Learning goal selected - generate topic
      setSelections({ ...selections, learningGoal: value });
      await generateFinalTopic(value);
    }
  };

  const generateFinalTopic = async (learningGoal: string) => {
    setIsGenerating(true);
    setStreamedContent('');

    try {
      const constraints = GuideMeFlow.buildConstraints(
        selections.category,
        selections.subcategory,
        selections.topicType as TopicType,
        learningGoal
      );

      const alreadyDiscovered = topics.map(t => t.name);

      const newTopic = await llmService.generateGuidedTopic(
        constraints,
        alreadyDiscovered,
        categorySchema,
        (partial) => {
          setStreamedContent(partial);
        }
      );

      onComplete(newTopic);
    } catch (error) {
      console.error('Failed to generate topic:', error);
      // Handle error - show message, allow retry
    } finally {
      setIsGenerating(false);
    }
  };

  const handleBack = () => {
    if (step > 0) {
      // Handle back navigation, accounting for conditional step
      setStep(step - 1);
      // Reload previous question
      // ... implementation
    }
  };

  return (
    <div className="guide-me-flow">
      {/* Progress indicator */}
      <div className="progress">
        Step {step + 1} of {selections.subcategory &&
          GuideMeFlow.getStep3Question(selections.category, selections.subcategory) === null
          ? '3' : '4'}
      </div>

      {/* Current question */}
      {currentQuestion && !isGenerating && (
        <div className="question-container">
          <h3>{currentQuestion.question}</h3>
          <div className="options">
            {currentQuestion.options.map((option) => (
              <button
                key={option.value}
                onClick={() => handleOptionSelect(option.value)}
                className="option-button"
              >
                <div className="option-label">{option.label}</div>
                {option.description && (
                  <div className="option-description">{option.description}</div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Generation in progress */}
      {isGenerating && (
        <div className="generating">
          <div className="spinner" />
          <p>Generating your personalized topic...</p>
          {streamedContent && (
            <div className="preview">{streamedContent}</div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="navigation">
        {step > 0 && !isGenerating && (
          <button onClick={handleBack}>Back</button>
        )}
        <button onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
};

export default GuideMeFlowComponent;
```

---

## 4. Surprise Me Flow

### 4.1 Surprise Me Logic

#### File: `src/services/llmService.ts`

```typescript
import { Topic, TopicType } from '../types';
import categorySchema, { getAllExamplesFromSubcategory } from '../constants/categories';
import { promptTemplates } from '../utils/prompts';

class LLMService {
  /**
   * Generate a surprise topic
   * Randomly selects category, subcategory, and ONE topic type from available types
   */
  async generateSurpriseTopic(
    alreadyDiscovered: string[],
    dismissed: string[],
    onProgress?: (partialText: string) => void
  ): Promise<Topic> {
    // Build the prompt - LLM will handle random selection
    const prompt = promptTemplates.generateTopic(
      'surprise',
      alreadyDiscovered,
      dismissed,
      categorySchema
    );

    // Call LLM with streaming
    const rawTopic = await this.streamingGenerate(prompt, onProgress);

    // Validate and return
    return this.validateAndBuildTopic(rawTopic, 'surprise');
  }

  /**
   * Generate a guided topic with specific constraints
   */
  async generateGuidedTopic(
    constraints: {
      category: string;
      subcategory: string;
      topicType: TopicType;
      learningGoal: string;
    },
    alreadyDiscovered: string[],
    onProgress?: (partialText: string) => void
  ): Promise<Topic> {
    const prompt = promptTemplates.generateTopic(
      'guided',
      alreadyDiscovered,
      [],  // No dismissed list for guided
      categorySchema,
      constraints
    );

    const rawTopic = await this.streamingGenerate(prompt, onProgress);

    return this.validateAndBuildTopic(rawTopic, 'guided');
  }

  /**
   * Generate quiz questions for a topic
   */
  async generateQuizQuestions(topic: Topic): Promise<QuizQuestion[]> {
    const prompt = promptTemplates.generateQuizQuestions(topic);

    const rawQuiz = await this.streamingGenerate(prompt);

    return this.parseQuizQuestions(rawQuiz);
  }

  // ... rest of implementation
}
```

---

## 5. Store & Data Migration

### 5.1 Store Updates

#### File: `src/store/useAppStore.ts`

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Topic, Quiz, TopicType } from '../types';

interface AppState {
  topics: Topic[];
  dismissedTopics: string[];
  quizzes: Quiz[];

  // Actions
  addTopic: (topic: Topic) => void;
  updateTopicStatus: (topicId: string, status: 'discovered' | 'learned') => void;
  dismissTopic: (topicName: string) => void;
  deleteTopic: (topicId: string) => void;

  addQuiz: (quiz: Quiz) => void;
  updateQuiz: (quizId: string, updates: Partial<Quiz>) => void;
  deleteQuiz: (quizId: string) => void;
}

// Migration function for existing data
const migrateData = (persistedState: any) => {
  // If old 'technologies' field exists, migrate to 'topics'
  if (persistedState.technologies && !persistedState.topics) {
    console.log('Migrating technologies to topics...');

    return {
      ...persistedState,
      topics: persistedState.technologies.map((tech: any) => ({
        ...tech,
        // Default to 'technologies' type if not specified
        topicType: tech.topicType || 'technologies' as TopicType,
        content: {
          ...tech.content,
          compareToSimilar: tech.content.compareToSimilar?.map((item: any) => ({
            topic: item.technology || item.topic,
            comparison: item.comparison
          })) || []
        }
      })),
      dismissedTopics: persistedState.dismissedTechnologies || [],
      quizzes: persistedState.quizzes?.map((quiz: any) => ({
        ...quiz,
        topicId: quiz.technologyId || quiz.topicId,
        topicName: quiz.technologyName || quiz.topicName,
        topicType: quiz.topicType || 'technologies'
      })) || [],
      // Remove old fields
      technologies: undefined,
      dismissedTechnologies: undefined
    };
  }

  return persistedState;
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      topics: [],
      dismissedTopics: [],
      quizzes: [],

      addTopic: (topic) =>
        set((state) => ({
          topics: [...state.topics, topic]
        })),

      updateTopicStatus: (topicId, status) =>
        set((state) => ({
          topics: state.topics.map((t) =>
            t.id === topicId
              ? { ...t, status, learnedAt: status === 'learned' ? new Date().toISOString() : t.learnedAt }
              : t
          )
        })),

      dismissTopic: (topicName) =>
        set((state) => ({
          dismissedTopics: [...state.dismissedTopics, topicName]
        })),

      deleteTopic: (topicId) =>
        set((state) => ({
          topics: state.topics.filter((t) => t.id !== topicId),
          quizzes: state.quizzes.filter((q) => q.topicId !== topicId)
        })),

      addQuiz: (quiz) =>
        set((state) => ({
          quizzes: [...state.quizzes, quiz]
        })),

      updateQuiz: (quizId, updates) =>
        set((state) => ({
          quizzes: state.quizzes.map((q) =>
            q.id === quizId ? { ...q, ...updates } : q
          )
        })),

      deleteQuiz: (quizId) =>
        set((state) => ({
          quizzes: state.quizzes.filter((q) => q.id !== quizId)
        }))
    }),
    {
      name: 'breadthwise-storage',
      version: 2,  // Increment version for migration
      migrate: (persistedState: any, version: number) => {
        if (version < 2) {
          return migrateData(persistedState);
        }
        return persistedState;
      }
    }
  )
);
```

---

## 6. Critical Issues & Considerations

### Issue 1: Type Safety for Dynamic Properties
**Problem**: TypeScript can't enforce that `subcategory[topicType]` exists at compile time.

**Solution**:
```typescript
// Runtime helper
function getExamplesForTopicType(
  subcategory: SubcategorySchema,
  topicType: TopicType
): string[] | undefined {
  return subcategory[topicType as keyof SubcategorySchema] as string[] | undefined;
}

// Usage
const examples = getExamplesForTopicType(subcategory, 'patterns') || [];
```

### Issue 2: LLM Compliance
**Problem**: LLM might not respect the topicType constraint in guided mode.

**Mitigation**:
1. **Prompt engineering**: Emphasize "MUST generate type X" multiple times
2. **Validation**: Check returned topicType matches constraint
3. **Retry**: If mismatch, retry with more emphatic prompt
4. **Examples**: Provide examples of the desired type in the prompt

### Issue 3: Empty Examples Arrays
**Problem**: What if topicTypes declares a type but array is empty?

**Decision**: **Allow it**. Reasons:
- Examples are inspirational, not exhaustive
- LLM can generate valid topics without examples
- Forces us to trust LLM's domain knowledge
- Reduces maintenance burden

**Validation**: Warn in console but don't block.

### Issue 4: Guide Me UX Complexity
**Problem**: 4 steps might feel long.

**Mitigations**:
1. **Conditional step**: Skip topic type selection if only one type (implemented)
2. **Progress indicator**: Show "Step 2 of 3" or "Step 3 of 4"
3. **Back button**: Allow users to change previous selections
4. **Breadcrumb**: Show selections made so far

### Issue 5: Surprise Me Randomness
**Problem**: True randomness might repeatedly hit same categories.

**Enhancement** (future):
```typescript
// Weighted random selection
function selectRandomSubcategory(
  categorySchema: any,
  discoveredTopics: Topic[]
): { category: string; subcategory: string; topicType: TopicType } {
  // Weight toward categories with fewer discovered topics
  // This encourages exploration breadth
}
```

---

## 7. Implementation Phases

### Phase 1: Core Types & Schema (3 hours)
**Files**: `src/types/index.ts`, `src/constants/categories.ts`

1. Add new TopicType union
2. Update SubcategorySchema with topicTypes array and dynamic properties
3. Transform entire categorySchema with topicTypes
4. Add validation helpers
5. Write migration function in store

**Deliverable**: Type-safe schema with validation

### Phase 2: Prompt Engineering (2 hours)
**Files**: `src/utils/prompts.ts`, `src/services/llmService.ts`

1. Create unified generateTopic prompt with mode parameter
2. Update surprise topic generation to pass mode
3. Update guided topic generation with specific topicType constraint
4. Add validation for topicType compliance
5. Update quiz generation for topic types

**Deliverable**: Single prompt template for both flows

### Phase 3: Guide Me Flow (3 hours)
**Files**: `src/constants/guideMeFlow.ts`, `src/components/discover/GuideMeFlow.tsx`

1. Create GuideMeFlow class with step methods
2. Implement conditional topic type selection (null if single type)
3. Update component to handle 3-4 step flow
4. Add progress indicators and back navigation
5. Test all paths (single type and multiple types)

**Deliverable**: Hardcoded guided flow with conditional steps

### Phase 4: Store & Migration (1 hour)
**Files**: `src/store/useAppStore.ts`

1. Rename all technology references to topic
2. Implement migration function
3. Update all action methods
4. Test migration with mock old data
5. Increment persistence version

**Deliverable**: Backward-compatible store

### Phase 5: UI Updates (2 hours)
**Files**: All component files

1. Rename TechnologyCard → TopicCard
2. Update all text references
3. Update TypeScript imports
4. Add topic type badges/indicators to UI
5. Test all screens

**Deliverable**: Fully updated UI

### Phase 6: Testing (2 hours)

1. Test surprise flow generates varied topic types
2. Test guided flow with single-type subcategories (3 steps)
3. Test guided flow with multi-type subcategories (4 steps)
4. Test data migration
5. Test quiz generation for all topic types
6. E2E test on both flows

**Total**: ~13 hours

---

## 8. Testing Strategy

### Unit Tests
```typescript
describe('SubcategorySchema', () => {
  it('should have topicTypes array', () => {
    const sub = categorySchema['System Design Fundamentals'].subcategories['Distributed Systems Theory'];
    expect(sub.topicTypes).toEqual(['concepts', 'models']);
  });

  it('should have corresponding property for each topicType', () => {
    const sub = categorySchema['System Design Fundamentals'].subcategories['Distributed Systems Theory'];
    sub.topicTypes.forEach(type => {
      expect(sub[type]).toBeDefined();
      expect(Array.isArray(sub[type])).toBe(true);
    });
  });
});

describe('GuideMeFlow', () => {
  it('should return null for step 3 if subcategory has single type', () => {
    const question = GuideMeFlow.getStep3Question(
      'Architecture Patterns & Styles',
      'Integration Patterns'
    );
    expect(question).toBeNull();
  });

  it('should return question for step 3 if subcategory has multiple types', () => {
    const question = GuideMeFlow.getStep3Question(
      'System Design Fundamentals',
      'Distributed Systems Theory'
    );
    expect(question).not.toBeNull();
    expect(question?.options.length).toBe(2);  // concepts and models
  });
});
```

### Integration Tests
- Generate 10 surprise topics, verify all have valid topicTypes
- Generate 10 guided topics, verify topicType matches constraint
- Test migration with old data structure
- Test quiz generation for each topic type

---

## Summary

**Key Design Principles:**

✅ **Accurate Reality Modeling** - Subcategories naturally contain mixed types
✅ **Improved LLM Accuracy** - Specific type constraints in prompts
✅ **Enhanced User Control** - Choose what aspect to learn
✅ **Flexibility** - Handles single and multiple types elegantly
✅ **Simplified UX** - Conditional UI steps keep it simple

**Key Decisions:**
1. Always use `topicTypes: TopicType[]` (array even if length 1)
2. Dynamic properties optional - allow empty/missing examples
3. Guide Me: Skip topic type step if `topicTypes.length === 1`
4. Surprise Me: LLM randomly selects from available types
5. Runtime validation with console warnings, not blocking errors

**Estimated Effort**: 13 hours total implementation

This design provides long-term scalability and accurately reflects how architectural knowledge is naturally organized.