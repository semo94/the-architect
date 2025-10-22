/**
 * SOFTWARE ARCHITECTURE KNOWLEDGE FRAMEWORK
 *
 * PURPOSE:
 * This schema defines the conceptual landscape of software architecture knowledge.
 * It serves as GUARDRAILS for LLM-powered topic discovery, NOT as a finite database.
 *
 * HOW IT WORKS:
 * - Domains and subcategories define the architectural knowledge space
 * - Each subcategory declares which topicTypes it contains (concepts, patterns, technologies, etc.)
 * - Examples illustrate the TYPES of topics that belong (not exhaustive)
 * - LLM uses this framework to generate relevant, novel topic suggestions
 *
 * TOPIC TYPES:
 * - concepts: Theoretical foundations and principles (CAP Theorem, Consistency Models)
 * - patterns: Reusable architectural solutions (Circuit Breaker, Saga Pattern)
 * - technologies: Specific tools and platforms (Redis, Kubernetes, Kafka)
 * - strategies: Approaches and methods (Blue-Green Deployment, Cache-Aside)
 * - models: Architectural paradigms (Pub/Sub, Client-Server, RBAC)
 * - frameworks: Structured methodologies (12-Factor App, Spring Framework)
 * - protocols: Standards and specifications (OAuth 2.0, HTTP/2, gRPC)
 * - practices: Development and operational practices (TDD, Chaos Engineering)
 * - methodologies: Comprehensive approaches (Domain-Driven Design, Event Storming)
 * - architectures: System-level designs (Microservices, Event-Driven, Serverless)
 *
 * IMPORTANT:
 * - The example arrays are NOT selection menus
 * - LLM can suggest ANY topic that fits the conceptual space
 * - Discovery potential is INFINITE, not limited to schema contents
 * - Schema provides context and boundaries, not a catalog
 */

import { TopicType } from '../types';

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

const categorySchema: Record<string, CategorySchema> = {
  "System Design Fundamentals": {
    description: "Core principles and trade-offs in distributed systems",
    architectureLevel: "foundational",
    subcategories: {
      "Distributed Systems Theory": {
        description: "Theoretical foundations of distributed computing",
        topicTypes: ["concepts"],
        concepts: [
          "CAP Theorem", "PACELC Theorem", "Consistency Models",
          "Vector Clocks", "Distributed Consensus", "Two-Phase Commit",
          "Quorum Systems", "Gossip Protocols"
        ],
        learningPath: "foundational"
      },
      "Scalability Principles": {
        description: "Fundamental approaches to system scaling",
        topicTypes: ["concepts", "strategies"],
        concepts: [
          "Horizontal vs Vertical Scaling", "Scalability Triangle",
          "Amdahl's Law", "Universal Scalability Law"
        ],
        strategies: [
          "Partitioning Strategies", "Load Distribution",
          "Stateless Design", "Caching Layers",
          "Read vs Write Scaling", "Shard Key Design"
        ]
      },
      "Reliability & Fault Tolerance": {
        description: "Building resilient distributed systems",
        topicTypes: ["concepts", "patterns"],
        concepts: [
          "Failure Modes", "Blast Radius Containment",
          "Mean Time Between Failures (MTBF)", "Recovery Time Objective (RTO)",
          "Recovery Point Objective (RPO)"
        ],
        patterns: [
          "Redundancy Strategies", "Graceful Degradation",
          "Disaster Recovery", "Bulkhead Pattern",
          "Timeout Pattern", "Self-Healing Systems"
        ]
      }
    }
  },

  "Architecture Patterns & Styles": {
    description: "Proven architectural approaches and their trade-offs",
    architectureLevel: "intermediate",
    subcategories: {
      "Service Architecture Styles": {
        description: "Different ways to structure services",
        topicTypes: ["architectures", "patterns"],
        architectures: [
          "Microservices", "Service-Oriented Architecture (SOA)",
          "Modular Monolith", "Serverless Architecture",
          "Space-Based Architecture"
        ],
        patterns: [
          "Hexagonal Architecture", "Clean Architecture",
          "Ports and Adapters"
        ]
      },
      "Event-Driven Patterns": {
        description: "Asynchronous, reactive architectures",
        topicTypes: ["patterns", "architectures"],
        patterns: [
          "Event Sourcing", "CQRS", "Saga Pattern",
          "Event Notification", "Event-Carried State Transfer",
          "Transactional Outbox", "Domain Events"
        ],
        architectures: [
          "Event-Driven Architecture (EDA)", "Reactive Architecture",
          "Actor Model"
        ]
      },
      "Data Management Patterns": {
        description: "Managing data in distributed systems",
        topicTypes: ["patterns", "strategies"],
        patterns: [
          "Database per Service", "Shared Database Anti-pattern",
          "API Composition", "Materialized View",
          "Change Data Capture (CDC)", "Outbox Pattern"
        ],
        strategies: [
          "Data Replication Strategies", "Data Partitioning",
          "Polyglot Persistence"
        ]
      },
      "Integration Patterns": {
        description: "Connecting systems and services",
        topicTypes: ["patterns"],
        patterns: [
          "API Gateway", "Backend for Frontend (BFF)",
          "Strangler Fig", "Anti-Corruption Layer",
          "Adapter Pattern", "Sidecar Pattern",
          "Ambassador Pattern", "Service Mesh",
          "Service Registry", "Client-Side Discovery"
        ]
      },
      "Resilience Patterns": {
        description: "Handling failures gracefully",
        topicTypes: ["patterns", "practices"],
        patterns: [
          "Circuit Breaker", "Bulkhead", "Retry Pattern",
          "Timeout", "Rate Limiting", "Throttling",
          "Fallback", "Health Check", "Backpressure"
        ],
        practices: [
          "Chaos Engineering", "Fault Injection Testing",
          "Game Days"
        ]
      }
    }
  },

  "Data Storage & Management": {
    description: "Persistence, retrieval, and data architecture",
    architectureLevel: "foundational",
    subcategories: {
      "Database Paradigms": {
        description: "Different database models and their use cases",
        topicTypes: ["technologies", "concepts"],
        technologies: [
          "PostgreSQL", "MongoDB", "Cassandra", "Redis",
          "Neo4j", "Elasticsearch", "DynamoDB", "CockroachDB",
          "InfluxDB", "TimescaleDB", "Pinecone", "Weaviate"
        ],
        concepts: [
          "Relational Model", "Document Model", "Key-Value Model",
          "Column-Family Model", "Graph Model", "Time-Series Model",
          "Vector Databases"
        ]
      },
      "Caching Strategies": {
        description: "Performance optimization through caching",
        topicTypes: ["strategies", "patterns", "technologies"],
        strategies: [
          "Cache-Aside", "Write-Through", "Write-Behind",
          "Read-Through", "Refresh-Ahead"
        ],
        patterns: [
          "Distributed Caching", "Local Caching",
          "Multi-Level Caching", "CDN Caching"
        ],
        technologies: ["Redis", "Memcached", "Varnish", "Hazelcast"]
      },
      "Data Replication": {
        description: "Ensuring data availability and durability",
        topicTypes: ["strategies", "concepts"],
        strategies: [
          "Primary-Replica Replication", "Multi-Primary Replication",
          "Leaderless Replication", "Synchronous Replication",
          "Asynchronous Replication"
        ],
        concepts: [
          "Replication Lag", "Read Your Writes Consistency",
          "Monotonic Reads", "Causality Tracking",
          "Conflict Resolution", "Eventual Consistency"
        ]
      },
      "Data Partitioning": {
        description: "Dividing data across multiple nodes",
        topicTypes: ["strategies", "concepts"],
        strategies: [
          "Horizontal Partitioning (Sharding)", "Vertical Partitioning",
          "Hash-Based Partitioning", "Range-Based Partitioning",
          "Directory-Based Partitioning"
        ],
        concepts: [
          "Consistent Hashing", "Shard Key Design",
          "Rebalancing", "Hotspots"
        ]
      }
    }
  },

  "Domain-Driven Design (DDD)": {
    description: "Modeling complex business domains in software",
    architectureLevel: "advanced",
    subcategories: {
      "Strategic Design": {
        description: "High-level domain modeling and boundaries",
        topicTypes: ["concepts", "patterns"],
        concepts: [
          "Bounded Context", "Ubiquitous Language",
          "Context Mapping", "Core Domain", "Supporting Subdomain",
          "Generic Subdomain"
        ],
        patterns: [
          "Shared Kernel", "Customer-Supplier", "Conformist",
          "Anti-Corruption Layer", "Open Host Service",
          "Published Language", "Separate Ways"
        ]
      },
      "Tactical Design": {
        description: "Building blocks within bounded contexts",
        topicTypes: ["patterns", "practices"],
        patterns: [
          "Entity", "Value Object", "Aggregate",
          "Aggregate Root", "Repository Pattern",
          "Domain Service", "Application Service",
          "Factory Pattern", "Domain Event"
        ],
        practices: [
          "Anemic Domain Model (Anti-pattern)",
          "Rich Domain Model", "Persistence Ignorance"
        ]
      }
    }
  },

  "Cloud-Native Architecture": {
    description: "Architecting for cloud platforms",
    architectureLevel: "intermediate",
    subcategories: {
      "Compute Models": {
        description: "Running application code in the cloud",
        topicTypes: ["models", "technologies"],
        models: [
          "Infrastructure as a Service (IaaS)",
          "Platform as a Service (PaaS)",
          "Function as a Service (FaaS)",
          "Container as a Service (CaaS)",
          "Backend as a Service (BaaS)"
        ],
        technologies: [
          "AWS Lambda", "Azure Functions", "Google Cloud Functions",
          "Kubernetes", "AWS ECS", "Google Cloud Run",
          "AWS EC2", "Azure VMs"
        ]
      },
      "Cloud Storage Services": {
        description: "Managed storage solutions",
        topicTypes: ["technologies", "concepts"],
        technologies: [
          "AWS S3", "Azure Blob Storage", "Google Cloud Storage",
          "AWS EBS", "AWS EFS", "AWS RDS",
          "BigQuery", "Snowflake", "Azure Data Lake"
        ],
        concepts: [
          "Object Storage", "Block Storage", "File Storage",
          "Managed Databases", "Data Warehouses", "Data Lakes"
        ]
      },
      "Cloud Networking": {
        description: "Connecting cloud resources",
        topicTypes: ["concepts", "technologies"],
        concepts: [
          "Virtual Private Cloud (VPC)", "Subnets",
          "Load Balancers", "Content Delivery Networks (CDN)",
          "Service Mesh", "Ingress Controllers"
        ],
        technologies: [
          "AWS VPC", "Azure Virtual Network",
          "AWS CloudFront", "Cloudflare",
          "Istio", "Linkerd"
        ]
      },
      "Multi-Cloud & Hybrid": {
        description: "Spanning multiple cloud providers",
        topicTypes: ["patterns", "strategies"],
        patterns: [
          "Cloud Portability", "Cloud Agnostic Design",
          "Disaster Recovery Across Clouds"
        ],
        strategies: [
          "Multi-Cloud Strategy", "Hybrid Cloud Architecture",
          "Cloud Migration Patterns"
        ]
      }
    }
  },

  "Messaging & Event Streaming": {
    description: "Asynchronous communication between services",
    architectureLevel: "intermediate",
    subcategories: {
      "Message Brokers": {
        description: "Traditional message queuing",
        topicTypes: ["patterns", "technologies"],
        patterns: [
          "Point-to-Point Messaging", "Publish-Subscribe",
          "Request-Reply", "Dead Letter Queue",
          "Message Routing", "Message Transformation"
        ],
        technologies: ["RabbitMQ", "ActiveMQ", "AWS SQS", "Azure Service Bus", "NATS"]
      },
      "Event Streaming Platforms": {
        description: "Distributed event logs for real-time processing",
        topicTypes: ["technologies", "concepts"],
        technologies: [
          "Apache Kafka", "AWS Kinesis", "Apache Pulsar",
          "Google Pub/Sub", "Confluent Platform"
        ],
        concepts: [
          "Event Log", "Stream Partitioning",
          "Consumer Groups", "Offset Management",
          "Exactly-Once Semantics", "Compacted Topics"
        ]
      },
      "Stream Processing": {
        description: "Real-time data processing pipelines",
        topicTypes: ["frameworks", "patterns"],
        frameworks: [
          "Apache Flink", "Apache Spark Streaming",
          "Kafka Streams", "AWS Kinesis Data Analytics",
          "Azure Stream Analytics"
        ],
        patterns: [
          "Windowing", "Watermarking",
          "Stateful Stream Processing"
        ]
      }
    }
  },

  "API Design & Management": {
    description: "Designing and governing application interfaces",
    architectureLevel: "foundational",
    subcategories: {
      "API Architectural Styles": {
        description: "Different paradigms for API design",
        topicTypes: ["architectures", "protocols"],
        architectures: [
          "REST", "GraphQL", "gRPC",
          "WebSocket APIs", "Server-Sent Events (SSE)",
          "SOAP", "HATEOAS"
        ],
        protocols: [
          "HTTP/1.1", "HTTP/2", "HTTP/3",
          "WebSocket Protocol"
        ]
      },
      "API Design Principles": {
        description: "Best practices for API design",
        topicTypes: ["concepts", "practices"],
        concepts: [
          "REST Maturity Model", "HATEOAS",
          "Idempotency", "API Versioning Strategies",
          "Resource Modeling", "Hypermedia"
        ],
        practices: [
          "API-First Design", "Contract-First Development",
          "Backward Compatibility", "Pagination Strategies",
          "Error Handling Standards"
        ]
      },
      "API Gateway Patterns": {
        description: "Managing API traffic and cross-cutting concerns",
        topicTypes: ["patterns", "technologies"],
        patterns: [
          "Single API Gateway", "Micro Gateway",
          "Backend for Frontend (BFF)",
          "API Composition", "API Aggregation",
          "Gateway Routing"
        ],
        technologies: ["Kong", "Apigee", "AWS API Gateway", "Azure API Management"]
      },
      "API Security": {
        description: "Securing APIs",
        topicTypes: ["protocols", "patterns", "practices"],
        protocols: [
          "OAuth 2.0", "OpenID Connect", "JWT",
          "API Keys", "SAML"
        ],
        patterns: [
          "Token-Based Authentication",
          "API Gateway Security", "Zero Trust APIs"
        ],
        practices: [
          "Rate Limiting", "IP Whitelisting",
          "CORS Configuration", "Input Validation"
        ]
      },
      "API Documentation & Contracts": {
        description: "Defining and documenting APIs",
        topicTypes: ["frameworks", "practices"],
        frameworks: [
          "OpenAPI (Swagger)", "AsyncAPI",
          "JSON Schema", "Protocol Buffers",
          "GraphQL SDL"
        ],
        practices: [
          "API Design-First", "Living Documentation",
          "Contract Testing"
        ]
      }
    }
  },

  "Observability & Operations": {
    description: "Understanding system behavior in production",
    architectureLevel: "foundational",
    subcategories: {
      "Monitoring & Metrics": {
        description: "Tracking system health and performance",
        topicTypes: ["practices", "technologies", "concepts"],
        practices: [
          "Golden Signals", "RED Method",
          "USE Method", "SLI/SLO/SLA",
          "Alerting Strategies"
        ],
        technologies: [
          "Prometheus", "Grafana", "Datadog",
          "New Relic", "CloudWatch", "Splunk"
        ],
        concepts: [
          "Metrics vs Logs vs Traces", "Cardinality",
          "Time Series Data", "Aggregation Strategies"
        ]
      },
      "Logging": {
        description: "Collecting and analyzing log data",
        topicTypes: ["patterns", "technologies"],
        patterns: [
          "Structured Logging", "Centralized Logging",
          "Log Aggregation", "Log Correlation",
          "Log Retention Policies"
        ],
        technologies: ["ELK Stack", "Splunk", "CloudWatch Logs", "Fluentd", "Loki"]
      },
      "Distributed Tracing": {
        description: "Following requests across microservices",
        topicTypes: ["practices", "technologies", "concepts"],
        practices: [
          "Context Propagation", "Trace Sampling",
          "Service Dependency Mapping"
        ],
        technologies: [
          "Jaeger", "Zipkin", "OpenTelemetry",
          "AWS X-Ray", "Google Cloud Trace"
        ],
        concepts: [
          "Spans", "Traces", "Trace Context", "Baggage"
        ]
      },
      "Alerting & Incident Response": {
        description: "Responding to system issues",
        topicTypes: ["practices"],
        practices: [
          "Alert Fatigue Prevention", "On-Call Rotation",
          "Runbooks", "Post-Mortems", "Blameless Culture",
          "Chaos Engineering", "Game Days"
        ]
      }
    }
  },

  "Security & Identity": {
    description: "Protecting systems and data",
    architectureLevel: "foundational",
    subcategories: {
      "Authentication": {
        description: "Verifying identity",
        topicTypes: ["protocols", "technologies", "patterns"],
        protocols: [
          "OAuth 2.0", "OpenID Connect", "SAML 2.0",
          "Kerberos", "LDAP", "WebAuthn/FIDO2"
        ],
        technologies: [
          "Auth0", "Okta", "AWS Cognito",
          "Azure AD", "Keycloak"
        ],
        patterns: [
          "Single Sign-On (SSO)", "Multi-Factor Authentication (MFA)",
          "Passwordless Authentication", "Social Login"
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
        description: "Architectural security practices",
        topicTypes: ["patterns", "practices"],
        patterns: [
          "Defense in Depth", "Principle of Least Privilege",
          "Zero Trust Architecture", "Security by Design",
          "Fail Securely"
        ],
        practices: [
          "Security Auditing", "Penetration Testing",
          "Vulnerability Scanning", "Threat Modeling",
          "Security Code Review", "Secrets Management"
        ]
      },
      "Encryption & Data Protection": {
        description: "Protecting data at rest and in transit",
        topicTypes: ["concepts", "practices"],
        concepts: [
          "Encryption at Rest", "Encryption in Transit",
          "End-to-End Encryption", "Key Management",
          "Certificate Management"
        ],
        practices: [
          "TLS/SSL Configuration", "Certificate Rotation",
          "Data Masking", "Tokenization"
        ]
      }
    }
  },

  "DevOps & Continuous Delivery": {
    description: "Automating delivery and operations",
    architectureLevel: "intermediate",
    subcategories: {
      "CI/CD Pipelines": {
        description: "Automated build, test, and deployment",
        topicTypes: ["practices", "technologies"],
        practices: [
          "Continuous Integration", "Continuous Delivery",
          "Continuous Deployment", "Trunk-Based Development",
          "Feature Toggles", "Blue-Green Deployment",
          "Canary Releases", "Rolling Deployment", "GitOps"
        ],
        technologies: ["Jenkins", "GitLab CI", "GitHub Actions", "CircleCI", "ArgoCD", "Spinnaker"]
      },
      "Infrastructure as Code": {
        description: "Managing infrastructure through code",
        topicTypes: ["practices", "technologies"],
        practices: [
          "Declarative Configuration", "Immutable Infrastructure",
          "Infrastructure Testing", "Drift Detection"
        ],
        technologies: [
          "Terraform", "CloudFormation", "Pulumi",
          "Ansible", "Chef", "Puppet"
        ]
      },
      "Container Orchestration": {
        description: "Managing containerized workloads",
        topicTypes: ["technologies", "concepts"],
        technologies: ["Kubernetes", "Docker Swarm", "Amazon ECS", "Nomad", "OpenShift"],
        concepts: [
          "Pod", "Service", "Ingress",
          "ConfigMap", "Secret", "StatefulSet",
          "DaemonSet", "Deployment"
        ]
      },
      "Configuration Management": {
        description: "Managing application configuration",
        topicTypes: ["patterns", "technologies"],
        patterns: [
          "Externalized Configuration", "Feature Toggles",
          "A/B Testing Infrastructure", "Configuration as Code"
        ],
        technologies: ["Spring Cloud Config", "Consul", "etcd", "Vault"]
      }
    }
  },

  "Data Engineering & Processing": {
    description: "Building data pipelines and analytics platforms",
    architectureLevel: "advanced",
    subcategories: {
      "Batch Processing": {
        description: "Processing large volumes of data at rest",
        topicTypes: ["frameworks", "patterns"],
        frameworks: ["Apache Hadoop", "Apache Spark", "AWS Glue", "Databricks"],
        patterns: ["ETL", "ELT", "Lambda Architecture"]
      },
      "Stream Processing": {
        description: "Real-time data processing",
        topicTypes: ["frameworks", "patterns"],
        frameworks: ["Apache Flink", "Apache Spark Streaming", "Kafka Streams"],
        patterns: ["Kappa Architecture", "Real-Time Analytics", "Event Time vs Processing Time"]
      },
      "Data Warehousing": {
        description: "Storing and querying analytical data",
        topicTypes: ["technologies", "concepts"],
        technologies: ["Snowflake", "BigQuery", "Redshift", "Databricks"],
        concepts: ["Star Schema", "Snowflake Schema", "Data Marts", "OLAP vs OLTP"]
      },
      "Data Lakes": {
        description: "Storing raw data at scale",
        topicTypes: ["technologies", "patterns"],
        technologies: ["AWS S3", "Azure Data Lake", "Delta Lake", "Apache Iceberg"],
        patterns: ["Data Lake Architecture", "Data Lakehouse", "Schema-on-Read"]
      }
    }
  },

  "Frontend Architecture": {
    description: "Client-side architectural patterns",
    architectureLevel: "intermediate",
    subcategories: {
      "Rendering Strategies": {
        description: "How and where to render UI",
        topicTypes: ["patterns"],
        patterns: [
          "Client-Side Rendering (CSR)",
          "Server-Side Rendering (SSR)",
          "Static Site Generation (SSG)",
          "Incremental Static Regeneration (ISR)",
          "Islands Architecture", "Streaming SSR"
        ]
      },
      "Micro-Frontends": {
        description: "Breaking frontends into smaller pieces",
        topicTypes: ["patterns", "practices"],
        patterns: [
          "Build-Time Integration", "Runtime Integration",
          "Server-Side Composition", "Module Federation"
        ],
        practices: [
          "Independent Deployment", "Technology Agnostic",
          "Team Autonomy"
        ]
      },
      "State Management": {
        description: "Managing client-side state",
        topicTypes: ["patterns", "frameworks"],
        patterns: [
          "Flux", "Server State vs Client State",
          "Optimistic Updates", "State Normalization"
        ],
        frameworks: [
          "Redux", "MobX", "Zustand", "Recoil",
          "React Query", "SWR"
        ]
      }
    }
  },

  "Testing & Quality Assurance": {
    description: "Ensuring system correctness and reliability",
    architectureLevel: "foundational",
    subcategories: {
      "Testing Strategies": {
        description: "Different levels of testing",
        topicTypes: ["practices", "concepts"],
        practices: [
          "Unit Testing", "Integration Testing",
          "Contract Testing", "End-to-End Testing",
          "Performance Testing", "Load Testing",
          "Chaos Engineering", "Security Testing"
        ],
        concepts: [
          "Test Coverage", "Test Doubles",
          "Mocking vs Stubbing", "Test Isolation"
        ]
      },
      "Testing Patterns": {
        description: "Patterns for testing distributed systems",
        topicTypes: ["patterns", "practices"],
        patterns: [
          "Test Pyramid", "Testing Trophy",
          "Consumer-Driven Contracts", "Synthetic Monitoring",
          "Shadow Traffic"
        ],
        practices: [
          "Canary Testing in Production",
          "A/B Testing", "Feature Flagging for Testing"
        ]
      }
    }
  },

  "Performance Engineering": {
    description: "Optimizing system performance",
    architectureLevel: "advanced",
    subcategories: {
      "Performance Patterns": {
        description: "Techniques for improving performance",
        topicTypes: ["patterns", "strategies"],
        patterns: [
          "Lazy Loading", "Eager Loading",
          "Connection Pooling", "Object Pooling",
          "Materialized Views"
        ],
        strategies: [
          "Asynchronous Processing", "Batch Processing",
          "Denormalization", "Query Optimization"
        ]
      },
      "Profiling & Optimization": {
        description: "Identifying and fixing bottlenecks",
        topicTypes: ["practices", "technologies"],
        practices: [
          "CPU Profiling", "Memory Profiling",
          "Database Query Optimization", "Network Optimization",
          "Benchmarking", "Load Testing"
        ],
        technologies: [
          "Chrome DevTools", "Java Flight Recorder",
          "Apache JMeter", "Gatling"
        ]
      }
    }
  },

  "Migration & Modernization": {
    description: "Evolving legacy systems",
    architectureLevel: "advanced",
    subcategories: {
      "Migration Strategies": {
        description: "Approaches to system migration",
        topicTypes: ["patterns", "practices"],
        patterns: [
          "Strangler Fig Pattern", "Branch by Abstraction",
          "Parallel Run", "Dark Launching",
          "Dual-Write Pattern", "Database Migration Patterns"
        ],
        practices: [
          "Feature Parity Validation", "Rollback Planning",
          "Data Migration Testing"
        ]
      },
      "Modernization Approaches": {
        description: "Updating legacy architectures",
        topicTypes: ["strategies"],
        strategies: [
          "Rehost (Lift and Shift)", "Replatform",
          "Refactor", "Rearchitect",
          "Rebuild", "Replace", "6 Rs of Cloud Migration"
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
export function getAllExamplesFromSubcategory(subcategory: SubcategorySchema): {type: TopicType; name: string}[] {
  const allExamples: {type: TopicType; name: string}[] = [];

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

// Helper to get examples for a specific topic type
export function getExamplesForTopicType(
  subcategory: SubcategorySchema,
  topicType: TopicType
): string[] | undefined {
  return subcategory[topicType as keyof SubcategorySchema] as string[] | undefined;
}

export default categorySchema;