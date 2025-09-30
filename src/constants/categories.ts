/**
 * SOFTWARE ARCHITECTURE KNOWLEDGE FRAMEWORK
 * 
 * PURPOSE:
 * This schema defines the conceptual landscape of software architecture knowledge.
 * It serves as GUARDRAILS for LLM-powered technology discovery, NOT as a finite database.
 * 
 * HOW IT WORKS:
 * - Domains and subcategories define the architectural knowledge space
 * - Descriptions explain what each area encompasses
 * - Examples illustrate the TYPES of technologies that belong (not exhaustive)
 * - LLM uses this framework to generate relevant, novel technology suggestions
 * 
 * IMPORTANT:
 * - The example arrays are NOT selection menus
 * - LLM can suggest ANY technology that fits the conceptual space
 * - Discovery potential is INFINITE, not limited to schema contents
 * - Schema provides context and boundaries, not a catalog
 */
const categorySchema = {
  "System Design Fundamentals": {
    description: "Core principles and trade-offs in distributed systems",
    architectureLevel: "foundational",
    subcategories: {
      "Distributed Systems Theory": {
        description: "Theoretical foundations of distributed computing",
        concepts: [
          "CAP Theorem", "PACELC Theorem", "Consistency Models",
          "Vector Clocks", "Distributed Consensus", "Two-Phase Commit",
          "Quorum Systems", "Gossip Protocols"
        ],
        learningPath: "foundational"
      },
      "Scalability Principles": {
        description: "Fundamental approaches to system scaling",
        concepts: [
          "Horizontal vs Vertical Scaling", "Partitioning Strategies",
          "Load Distribution", "Stateless Design", "Caching Layers",
          "Read vs Write Scaling", "Shard Key Design"
        ]
      },
      "Reliability & Fault Tolerance": {
        description: "Building resilient distributed systems",
        concepts: [
          "Failure Modes", "Redundancy Strategies", "Graceful Degradation",
          "Disaster Recovery", "Blast Radius Containment",
          "Failure Detection", "Self-Healing Systems"
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
        patterns: [
          "Microservices", "Service-Oriented Architecture (SOA)",
          "Modular Monolith", "Serverless Architecture",
          "Event-Driven Architecture", "Space-Based Architecture",
          "Hexagonal Architecture", "Clean Architecture"
        ]
      },
      "Event-Driven Patterns": {
        description: "Asynchronous, reactive architectures",
        patterns: [
          "Event Sourcing", "CQRS", "Saga Pattern",
          "Event Streaming", "Event Collaboration",
          "Event Notification", "Event-Carried State Transfer",
          "Domain Events", "Integration Events"
        ]
      },
      "Data Management Patterns": {
        description: "Managing data in distributed systems",
        patterns: [
          "Database per Service", "Shared Database",
          "API Composition", "CQRS with Read Replicas",
          "Materialized Views", "Change Data Capture (CDC)",
          "Outbox Pattern", "Polling Publisher"
        ]
      },
      "Integration Patterns": {
        description: "Connecting systems and services",
        patterns: [
          "API Gateway", "Backend for Frontend (BFF)",
          "Strangler Fig", "Anti-Corruption Layer",
          "Adapter Pattern", "Sidecar Pattern",
          "Ambassador Pattern", "Service Mesh"
        ]
      },
      "Resilience Patterns": {
        description: "Handling failures gracefully",
        patterns: [
          "Circuit Breaker", "Bulkhead", "Retry Pattern",
          "Timeout", "Rate Limiting", "Throttling",
          "Fallback", "Health Check", "Backpressure"
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
        types: [
          "Relational (RDBMS)", "Document Stores", "Key-Value Stores",
          "Column-Family Stores", "Graph Databases", "Time-Series Databases",
          "Vector Databases", "Multi-Model Databases"
        ],
        implementations: {
          "Relational": ["PostgreSQL", "MySQL", "Oracle", "SQL Server"],
          "Document": ["MongoDB", "CouchDB", "RavenDB"],
          "Key-Value": ["Redis", "DynamoDB", "Riak"],
          "Column-Family": ["Cassandra", "HBase", "ScyllaDB"],
          "Graph": ["Neo4j", "Amazon Neptune", "JanusGraph"],
          "Time-Series": ["InfluxDB", "TimescaleDB", "Prometheus"],
          "Vector": ["Pinecone", "Weaviate", "Milvus"]
        }
      },
      "Caching Strategies": {
        description: "Performance optimization through caching",
        patterns: [
          "Cache-Aside", "Write-Through", "Write-Behind",
          "Read-Through", "Refresh-Ahead",
          "Distributed Caching", "CDN Caching",
          "Application-Level Caching", "Database Query Caching"
        ],
        technologies: ["Redis", "Memcached", "Varnish", "Hazelcast"]
      },
      "Data Replication": {
        description: "Ensuring data availability and durability",
        concepts: [
          "Primary-Replica Replication", "Multi-Primary Replication",
          "Synchronous vs Asynchronous Replication",
          "Conflict Resolution", "Eventual Consistency",
          "Active-Active vs Active-Passive"
        ]
      },
      "Data Partitioning": {
        description: "Dividing data across multiple nodes",
        strategies: [
          "Horizontal Partitioning (Sharding)", "Vertical Partitioning",
          "Hash-Based Partitioning", "Range-Based Partitioning",
          "Directory-Based Partitioning", "Consistent Hashing"
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
        concepts: [
          "Bounded Context", "Ubiquitous Language",
          "Context Mapping", "Core Domain vs Supporting Domains",
          "Anti-Corruption Layer", "Shared Kernel",
          "Customer-Supplier", "Conformist"
        ]
      },
      "Tactical Design": {
        description: "Building blocks within bounded contexts",
        patterns: [
          "Entities", "Value Objects", "Aggregates",
          "Domain Events", "Domain Services",
          "Repositories", "Factories", "Specifications"
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
        models: [
          "Infrastructure as a Service (IaaS)",
          "Platform as a Service (PaaS)",
          "Function as a Service (FaaS/Serverless)",
          "Container as a Service (CaaS)",
          "Backend as a Service (BaaS)"
        ],
        technologies: {
          "Serverless": ["AWS Lambda", "Azure Functions", "Google Cloud Functions"],
          "Containers": ["Kubernetes", "ECS", "AKS", "GKE", "Cloud Run"],
          "VMs": ["EC2", "Azure VMs", "Compute Engine"]
        }
      },
      "Cloud Storage Services": {
        description: "Managed storage solutions",
        types: [
          "Object Storage", "Block Storage", "File Storage",
          "Managed Databases", "Data Warehouses", "Data Lakes"
        ],
        technologies: ["S3", "EBS", "EFS", "RDS", "BigQuery", "Snowflake"]
      },
      "Cloud Networking": {
        description: "Connecting cloud resources",
        concepts: [
          "Virtual Private Cloud (VPC)", "Subnets",
          "Load Balancers", "API Gateways",
          "Content Delivery Networks (CDN)",
          "Service Mesh", "Ingress Controllers"
        ]
      },
      "Multi-Cloud & Hybrid": {
        description: "Spanning multiple cloud providers",
        patterns: [
          "Multi-Cloud Strategy", "Cloud Portability",
          "Hybrid Cloud Architecture", "Cloud Agnostic Design",
          "Disaster Recovery Across Clouds"
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
        patterns: [
          "Point-to-Point Messaging", "Publish-Subscribe",
          "Request-Reply", "Dead Letter Queues",
          "Message Routing", "Message Transformation"
        ],
        technologies: ["RabbitMQ", "ActiveMQ", "AWS SQS", "Azure Service Bus"]
      },
      "Event Streaming Platforms": {
        description: "Distributed event logs for real-time processing",
        concepts: [
          "Event Logs", "Topics and Partitions",
          "Consumer Groups", "Stream Processing",
          "Exactly-Once Semantics", "Compacted Topics"
        ],
        technologies: ["Apache Kafka", "AWS Kinesis", "Apache Pulsar", "Google Pub/Sub"]
      },
      "Stream Processing": {
        description: "Real-time data processing pipelines",
        frameworks: [
          "Apache Flink", "Apache Spark Streaming",
          "Kafka Streams", "AWS Kinesis Data Analytics",
          "Azure Stream Analytics"
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
        styles: [
          "REST (Representational State Transfer)",
          "GraphQL", "gRPC", "WebSockets",
          "Server-Sent Events (SSE)", "WebHooks",
          "SOAP", "HATEOAS"
        ]
      },
      "API Design Principles": {
        description: "Best practices for API design",
        concepts: [
          "Resource Modeling", "URI Design",
          "HTTP Method Semantics", "Status Code Usage",
          "Pagination", "Filtering and Sorting",
          "API Versioning Strategies", "Hypermedia",
          "Error Handling", "Idempotency"
        ]
      },
      "API Gateway Patterns": {
        description: "Managing API traffic and cross-cutting concerns",
        patterns: [
          "Single API Gateway", "Micro Gateway",
          "Backend for Frontend (BFF)",
          "API Composition", "API Aggregation",
          "Rate Limiting", "Request Transformation"
        ],
        technologies: ["Kong", "Apigee", "AWS API Gateway", "Azure API Management"]
      },
      "API Security": {
        description: "Securing APIs",
        concepts: [
          "OAuth 2.0", "OpenID Connect", "JWT",
          "API Keys", "mTLS", "Token Introspection",
          "Scope-Based Authorization", "CORS"
        ]
      },
      "API Documentation & Contracts": {
        description: "Defining and documenting APIs",
        standards: [
          "OpenAPI (Swagger)", "AsyncAPI",
          "JSON Schema", "Protocol Buffers",
          "GraphQL Schema Definition Language (SDL)"
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
        concepts: [
          "Golden Signals (Latency, Traffic, Errors, Saturation)",
          "RED Method (Rate, Errors, Duration)",
          "USE Method (Utilization, Saturation, Errors)",
          "Service Level Indicators (SLIs)",
          "Service Level Objectives (SLOs)",
          "Service Level Agreements (SLAs)",
          "Dashboards and Visualizations"
        ],
        technologies: ["Prometheus", "Grafana", "Datadog", "New Relic"]
      },
      "Logging": {
        description: "Collecting and analyzing log data",
        patterns: [
          "Structured Logging", "Centralized Logging",
          "Log Aggregation", "Log Correlation",
          "Log Retention Policies", "Sampling"
        ],
        technologies: ["ELK Stack", "Splunk", "CloudWatch Logs", "Fluentd"]
      },
      "Distributed Tracing": {
        description: "Following requests across microservices",
        concepts: [
          "Trace Context Propagation", "Spans",
          "Trace Sampling", "Critical Path Analysis",
          "Dependency Mapping", "Latency Analysis"
        ],
        technologies: ["Jaeger", "Zipkin", "AWS X-Ray", "OpenTelemetry"]
      },
      "Alerting & Incident Response": {
        description: "Responding to system issues",
        practices: [
          "Alert Fatigue Prevention", "On-Call Rotation",
          "Runbooks", "Post-Mortems",
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
        protocols: [
          "OAuth 2.0", "OpenID Connect (OIDC)",
          "SAML 2.0", "Kerberos", "LDAP",
          "WebAuthn/FIDO2", "Passwordless Authentication",
          "Multi-Factor Authentication (MFA)"
        ]
      },
      "Authorization": {
        description: "Controlling access to resources",
        models: [
          "Role-Based Access Control (RBAC)",
          "Attribute-Based Access Control (ABAC)",
          "Policy-Based Access Control",
          "Claims-Based Authorization",
          "Fine-Grained Authorization"
        ]
      },
      "Security Patterns": {
        description: "Architectural security practices",
        patterns: [
          "Zero Trust Architecture", "Defense in Depth",
          "Least Privilege Principle", "Secrets Management",
          "Encryption at Rest", "Encryption in Transit",
          "API Security", "Supply Chain Security"
        ]
      },
      "Identity Providers": {
        description: "Centralized identity management",
        technologies: ["Auth0", "Okta", "AWS Cognito", "Azure AD", "Keycloak"]
      }
    }
  },

  "DevOps & Continuous Delivery": {
    description: "Automating delivery and operations",
    architectureLevel: "intermediate",
    subcategories: {
      "CI/CD Pipelines": {
        description: "Automated build, test, and deployment",
        concepts: [
          "Continuous Integration", "Continuous Delivery",
          "Continuous Deployment", "Trunk-Based Development",
          "Feature Flags", "Blue-Green Deployment",
          "Canary Releases", "Rolling Deployment",
          "GitOps"
        ],
        technologies: ["Jenkins", "GitLab CI", "GitHub Actions", "CircleCI"]
      },
      "Infrastructure as Code": {
        description: "Managing infrastructure through code",
        tools: [
          "Terraform", "AWS CloudFormation",
          "Ansible", "Pulumi", "Chef", "Puppet"
        ]
      },
      "Container Orchestration": {
        description: "Managing containerized workloads",
        platforms: ["Kubernetes", "Docker Swarm", "ECS", "Nomad"],
        concepts: [
          "Pods", "Services", "Deployments",
          "StatefulSets", "ConfigMaps", "Secrets",
          "Ingress", "Network Policies"
        ]
      },
      "Configuration Management": {
        description: "Managing application configuration",
        patterns: [
          "Externalized Configuration", "Environment Variables",
          "Configuration Servers", "Feature Toggles",
          "A/B Testing Infrastructure"
        ],
        technologies: ["Spring Cloud Config", "Consul", "etcd"]
      }
    }
  },

  "Data Engineering & Processing": {
    description: "Building data pipelines and analytics platforms",
    architectureLevel: "advanced",
    subcategories: {
      "Batch Processing": {
        description: "Processing large volumes of data at rest",
        frameworks: ["Apache Hadoop", "Apache Spark", "AWS Glue"],
        patterns: ["ETL", "ELT", "Lambda Architecture"]
      },
      "Stream Processing": {
        description: "Real-time data processing",
        frameworks: ["Apache Flink", "Apache Spark Streaming", "Kafka Streams"],
        patterns: ["Kappa Architecture", "Real-Time Analytics"]
      },
      "Data Warehousing": {
        description: "Storing and querying analytical data",
        technologies: ["Snowflake", "BigQuery", "Redshift", "Databricks"]
      },
      "Data Lakes": {
        description: "Storing raw data at scale",
        technologies: ["S3", "Azure Data Lake", "Delta Lake"]
      }
    }
  },

  "Frontend Architecture": {
    description: "Client-side architectural patterns",
    architectureLevel: "intermediate",
    subcategories: {
      "Rendering Strategies": {
        description: "How and where to render UI",
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
        approaches: [
          "Build-Time Integration", "Runtime Integration",
          "Server-Side Composition", "Edge-Side Includes (ESI)",
          "Module Federation"
        ]
      },
      "State Management": {
        description: "Managing client-side state",
        patterns: [
          "Flux", "Redux", "Context API",
          "MobX", "Zustand", "Recoil",
          "Server State vs Client State"
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
        levels: [
          "Unit Testing", "Integration Testing",
          "Contract Testing", "End-to-End Testing",
          "Performance Testing", "Load Testing",
          "Chaos Engineering", "Security Testing"
        ]
      },
      "Testing Patterns": {
        description: "Patterns for testing distributed systems",
        patterns: [
          "Test Pyramid", "Testing Trophy",
          "Consumer-Driven Contracts", "Synthetic Monitoring",
          "Canary Testing in Production", "Shadow Traffic"
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
        patterns: [
          "Lazy Loading", "Eager Loading",
          "Connection Pooling", "Object Pooling",
          "Asynchronous Processing", "Batch Processing",
          "Denormalization", "Materialized Views"
        ]
      },
      "Profiling & Optimization": {
        description: "Identifying and fixing bottlenecks",
        techniques: [
          "CPU Profiling", "Memory Profiling",
          "Database Query Optimization", "Network Optimization",
          "Benchmarking", "Load Testing"
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
        patterns: [
          "Strangler Fig Pattern", "Branch by Abstraction",
          "Parallel Run", "Dark Launching",
          "Feature Parity", "Dual-Write Pattern",
          "Database Migration Patterns"
        ]
      },
      "Modernization Approaches": {
        description: "Updating legacy architectures",
        strategies: [
          "Rehost (Lift and Shift)", "Replatform",
          "Refactor", "Rearchitect",
          "Rebuild", "Replace"
        ]
      }
    }
  }
}

export default categorySchema;