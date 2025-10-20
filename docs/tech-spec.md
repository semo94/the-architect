# Breadthwise - Technical Specification v3.0

## Executive Summary

A cross-platform mobile-first application that helps senior software engineers systematically expand their **technical breadth** (known unknowns) by discovering new technologies through LLM-powered content generation, validating understanding through quizzes, and tracking their journey toward becoming successful software architects based on Mark Richards' Triangle of Knowledge.

---

## 1. Product Vision & Goals

### Core Problem

Senior software engineers have **deep knowledge** (known knowns) in their specialized areas—for example, expertise in JavaScript/TypeScript, Node.js, and Angular—but lack the **breadth knowledge** (known unknowns) needed to transition into software architecture roles. 

The challenge isn't just learning more—it's knowing *what* to learn. Random consumption of tech articles, newsletters, and blogs creates a chaotic, unfocused learning journey that doesn't systematically expand breadth.

### The Knowledge Triangle - Clarified

```
┌─────────────────────────────────────────────────┐
│   UNKNOWN UNKNOWNS                              │  
│   (Technologies you've never heard of)          │  ← Infinite & unquantifiable
│   [Cannot be measured - dynamically infinite]   │     Our app helps you discover
├─────────────────────────────────────────────────┤     from this infinite space
│   KNOWN UNKNOWNS (BREADTH)                      │  
│   (Technologies you've discovered)              │  ← THIS IS OUR FOCUS
│   • Discovered: 15 (in bucket list)             │     We track your growth here
│   • Learned: 23 (quiz passed)                   │     Total breadth: 38 techs
├─────────────────────────────────────────────────┤
│   KNOWN KNOWNS (DEPTH)                          │  
│   (Your existing expertise)                     │  ← Out of scope
│   JS/TS, Node.js, Angular, etc.                 │     We don't track this
└─────────────────────────────────────────────────┘
```

**Key Principles**:
- The app transforms **Unknown Unknowns** → **Known Unknowns** (breadth expansion)
- Unknown unknowns are **infinite and dynamically generated** by the LLM—we cannot quantify them
- We measure **growth** (technologies discovered and learned), not reduction of unknowns
- Known knowns (depth) are outside our scope—we focus purely on breadth

### Technology Lifecycle States

```
UNDISCOVERED → DISCOVERED → LEARNED
     ↓             ↓            ↓
(Never heard)  (Populated)  (Quiz passed)
  [Infinite]   (In bucket)  (Breadth knowledge!)
```

**Status Definitions**:
- **Undiscovered**: Technologies the user has never encountered (infinite pool)
- **Discovered**: Technologies populated by the app and saved to bucket list (status: "discovered")
- **Learned**: Technologies where user passed the quiz (≥80% score, status: "learned")

### Solution

A personalized, LLM-powered learning system that:
- **Discovers** new technologies systematically through two modes: random ("Surprise Me") or guided ("Guide Me")
- **Tests** comprehension through AI-generated quizzes
- **Tracks** progress with growth-focused metrics and visualizations
- **Motivates** through milestones, streaks, and category exploration

### Success Metrics for MVP

- User discovers 20+ new technologies
- 60%+ learning rate (learned / discovered ratio)
- User completes both "Surprise Me" and "Guide Me" flows
- Profile accurately reflects breadth expansion journey
- Cross-platform experience feels native on iOS, Android, and Web
- Average quiz score ≥80%

---

## 2. Core Features Specification

### Feature 1: Discover Technology (Population Flow)

**Purpose**: Introduce technologies the user has **never discovered before**, expanding from unknown unknowns to known unknowns through LLM-generated content.

#### Two Discovery Modes

##### Mode 1: "Surprise Me" (Random Discovery)

**Description**: The LLM randomly selects and generates content for a technology the user hasn't discovered, providing a serendipitous learning experience.

**User Flow**:
1. User taps "Surprise Me" button on Discover screen
2. App shows loading state with encouraging message ("Finding something exciting for you...")
3. System calls Claude API with context:
   - List of already discovered technologies (to avoid duplicates)
   - List of dismissed technologies (to avoid immediate repeats)
   - Available categories and subcategories
4. LLM selects ONE undiscovered technology and generates structured content
5. Technology card displays with full content (What, Why, Pros, Cons, Comparisons)
6. User sees three action buttons at bottom of card
7. User chooses one action (see Action Buttons section below)

**LLM Context Requirements**:
- **Must Have**: Complete list of discovered technology names
- **Must Have**: List of dismissed technology names
- **Must Have**: Category/subcategory structure
- **Output**: Single technology with comprehensive content

**Content Structure Generated**:
```
Technology Name: [e.g., "Event Sourcing"]
Category: [e.g., "Architecture Patterns"]
Subcategory: [e.g., "Event-Driven Patterns"]

WHAT: 2-3 paragraphs explaining core concepts and how it works
WHY: 2-3 paragraphs on when/why architects use this, key use cases
PROS: 4-5 specific advantages with architectural context
CONS: 4-5 specific limitations or trade-offs
COMPARE TO SIMILAR: 2-3 technology comparisons with clear distinctions
```

##### Mode 2: "Guide Me" (Contextual Discovery)

**Description**: A conversational flow where the LLM asks 2-4 questions to understand user interests, then suggests the most relevant undiscovered technology.

**User Flow**:
1. User taps "Guide Me" button
2. App presents first question: "What area interests you most right now?"
3. User selects from category options (e.g., Data Storage, Architecture Patterns, Cloud Infrastructure)
4. App asks follow-up question based on selection (e.g., "Are you more curious about handling high traffic or managing distributed systems?")
5. User makes 2-3 more selections, progressively narrowing focus
6. LLM generates content for the most relevant technology matching preferences
7. Technology card displays with same structure as Surprise Me
8. User chooses action from three buttons

**Conversational Flow Example**:
```
Q1: "I'm your architect mentor! What area interests you most right now?"
    Options: [Data Storage] [Architecture Patterns] [Cloud Infrastructure] 
             [Observability] [Security] [API Design]

User selects: "Architecture Patterns"

Q2: "Great choice! Are you more curious about handling high traffic or 
     managing distributed systems?"
    Options: [High Traffic Handling] [Distributed Systems] [Both Interest Me]

User selects: "Distributed Systems"

Q3: "Perfect! Would you like to learn about coordination, communication, 
     or data consistency?"
    Options: [Coordination] [Communication] [Data Consistency]

User selects: "Data Consistency"

Result: LLM generates content for "Saga Pattern" or "Eventual Consistency"
```

**LLM Context Requirements**:
- **Must Have**: User's selection history in this session
- **Must Have**: List of discovered technologies (avoid duplicates)
- **Must Have**: Category tree matching user preferences
- **Output**: Technology most relevant to user's stated interests

#### Action Buttons on Discovery Card

After content is displayed, user must choose one of three actions:

**1. Dismiss (✕)**
- Technology is **NOT saved** to profile
- Disappears from current view
- Added to temporary "dismissed" list (prevents immediate reappearance)
- Can be re-discovered in future sessions
- Use case: User already knows this technology or isn't interested

**2. Add to Bucket List (📋)**
- Technology saved with status: "discovered"
- Appears in Profile's "Discovered Technologies" list
- Available for quiz later via "Test Knowledge" button
- Contributes to breadth expansion metrics
- Use case: Wants to learn but not ready to test immediately

**3. Acquire Now (🎯)**
- Technology saved with status: "discovered"
- Immediately launches quiz flow (no navigation)
- If quiz passed (≥80%), status changes to "learned"
- If quiz failed (<80%), remains "discovered", can retry later
- Use case: Confident about understanding, wants to validate immediately

---

### Feature 2: Test Knowledge (Quiz Flow)

**Purpose**: Validate understanding of discovered technologies and convert them into learned breadth knowledge through AI-generated assessments.

#### Entry Points

1. **Immediate**: Via "Acquire Now" button after discovery
2. **Deferred**: Via "Test Knowledge" button in Profile's discovered list

#### User Flow

1. **Quiz Generation**:
   - System calls Claude API with technology name and full content
   - LLM generates 4 multiple-choice questions
   - Questions designed to test architectural thinking, not memorization

2. **Taking Quiz**:
   - Display shows "Question X of 4" progress indicator
   - User sees one question at a time with 4 options
   - User selects answer, taps "Submit Answer"
   - Immediate feedback: "✓ Correct!" or "✗ Incorrect"
   - Brief explanation (2-3 sentences) appears below
   - User taps "Next Question" to continue
   - Repeat for all 4 questions

3. **Quiz Completion**:
   - Calculate score: (correct answers / 4) × 100
   - Display results screen with:
     - Final score percentage
     - Pass/fail status (pass = ≥80%)
     - Question-by-question breakdown
     - Option to review incorrect answers
   - If passed: Technology status → "learned"
   - If failed: Status remains "discovered", can retry anytime

4. **Post-Quiz**:
   - Statistics automatically update
   - Profile reflects new learned count (if passed)
   - User returns to Profile or can discover another technology

#### Quiz Question Types

**Type 1: Conceptual Understanding (2 questions)**
- Tests "What" and "Why" comprehension
- Example: "What is the primary characteristic of Event Sourcing?"
- Example: "Why would an architect choose Event Sourcing for a financial system?"

**Type 2: Practical Application (1 question)**
- Tests "When to use" knowledge
- Example: "In which scenario is Event Sourcing most beneficial?"

**Type 3: Trade-offs Analysis (1 question)**
- Tests understanding of pros/cons
- Example: "What is the main trade-off when implementing Event Sourcing?"

#### Scoring & Status Update

```
Score ≥ 80% → Status changes to "learned" → Breadth knowledge expanded! ✓
Score < 80% → Status remains "discovered" → Can retry later
```

**Retry Policy**:
- Unlimited retry attempts
- Each attempt generates new questions (to prevent memorization)
- All attempts are logged for statistics

---

### Feature 3: Profile & Progress Tracking

**Purpose**: Visualize breadth expansion journey with growth-focused metrics, provide motivation through milestones, and enable review of all discovered technologies.

#### Section 1: Breadth Expansion Dashboard

**Primary Metrics Display** (Top cards):

```
┌──────────────┐  ┌──────────────┐
│   LEARNED    │  │  DISCOVERED  │
│      23      │  │      15      │
│      ✓       │  │      📋      │
└──────────────┘  └──────────────┘

Total Breadth: 38 technologies
Learning Rate: 61%
📈 +7 this week
```

**What This Shows**:
- **Learned**: Technologies where quiz passed (≥80%)
- **Discovered**: Technologies in bucket list (not yet tested or failed quiz)
- **Total Breadth**: Sum of learned + discovered (total expansion)
- **Learning Rate**: (Learned / Total Breadth) × 100
- **This Week**: Number of technologies discovered in last 7 days

#### Section 2: Growth Metrics

**Time-Based Progress**:
- Technologies discovered this week
- Technologies discovered this month
- Monthly growth rate (comparison to previous month)
- Average discoveries per week
- Trend indicator (increasing/steady/decreasing)

**Performance Metrics**:
- Total quizzes taken
- Average quiz score (%)
- Pass rate (% of quizzes passed)
- First-time pass rate (% passed on first attempt)
- Current learning streak (consecutive days with activity)
- Longest streak achieved

**Example Display**:
```
📊 Quiz Performance
• Average Score: 82%
• Pass Rate: 88%
• First-Time Pass: 85%

🔥 Activity
• Current Streak: 7 days
• Longest Streak: 14 days
• Total Active Days: 45
```

#### Section 3: Milestones & Achievements

**Milestone Categories**:

1. **Discovery Milestones**:
   - First 10 Discovered 🎯
   - Quarter Century (25) 🎖️
   - Half Hundred (50) ⭐
   - Century Club (100) 💯

2. **Learning Milestones**:
   - 10 Technologies Mastered ✓
   - 25 Technologies Mastered ✓✓
   - 50 Technologies Mastered 🏆

3. **Performance Milestones**:
   - Excellent Learner (80%+ learning rate) 🎓
   - Quiz Master (90%+ average score) 🎯
   - Perfect Scorer (100% on any quiz) 💯

4. **Consistency Milestones**:
   - 7 Day Streak 🔥
   - 30 Day Streak 🔥🔥
   - 100 Day Streak 🔥🔥🔥

5. **Exploration Milestones**:
   - 5 Categories Explored 🗺️
   - All Categories Explored 🌟

**Display Format**:
```
🏆 Milestones
✓ First 10 Discovered (Sept 15)
✓ 20 Technologies Learned (Sept 28)
✓ 7 Day Streak (Today!)
⏳ Reach 50 Learned (27 to go)
⏳ All Categories Explored (2 remaining)
```

#### Section 4: Category Breakdown

**Shows breadth expansion across different knowledge areas**:

```
Architecture Patterns
████████░░ 8 learned / 12 discovered (67%)

Data Storage  
██████████ 6 learned / 8 discovered (75%)

Cloud Infrastructure
████░░░░░░ 4 learned / 10 discovered (40%)

Observability
██████░░░░ 3 learned / 5 discovered (60%)

API Design
████░░░░░░ 2 learned / 5 discovered (40%)

Security & Identity
███████░░░ 4 learned / 6 discovered (67%)
```

**Purpose**: 
- Identifies strong areas (high learning %)
- Highlights areas needing attention (low learning %)
- Encourages balanced exploration across categories

#### Section 5: Discovered Technologies List

**Display Options**:
- **Filters**: All | Learned | Discovered (bucket list only)
- **Search**: By technology name
- **Sort**: By date (newest/oldest) or by category

**List Item Structure**:
```
┌─────────────────────────────────────────┐
│ Event Sourcing              [Learned] ✓ │
│ Architecture Patterns • Score: 85%      │
│ Discovered 5 days ago                   │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Redis                        [Test 🎯]  │
│ Data Storage • Discovered               │
│ Discovered 2 days ago                   │
└─────────────────────────────────────────┘
```

**Interactions**:
- Tap any item → View full content again
- "Test Knowledge" button → Launch quiz (for discovered items)
- "Review" button → See content + past quiz results (for learned items)

#### Section 6: Learning Timeline (Optional Enhancement)

**Visual representation of discovery journey**:
```
September 2025

Week 1  ●───●───●              3 discovered
Week 2  ●───●───●───●───●      5 discovered  
Week 3  ●───●                  2 discovered
Week 4  ●───●───●───●          4 discovered (so far)

● = Technology discovered
Green ● = Learned
Yellow ● = In bucket list
```

---

## 3. Technical Architecture

### Platform Strategy

**Primary Target**: Mobile-first (iOS + Android)
**Secondary Target**: Web (via React Native Web)

**Why Cross-Platform**:
- Learning happens everywhere (commute, breaks, evening)
- Single codebase reduces development time
- Consistent experience across devices

### Tech Stack

**Frontend Framework**:
- **React Native** with Expo
- Enables iOS, Android, and Web from single codebase
- Expo provides simplified build process and OTA updates
- React Native Web for responsive web experience

**Navigation**:
- **React Navigation**
- Bottom tabs for primary screens (Discover, Profile)
- Stack navigator for modal flows (Quiz, Technology Detail)

**State Management**:
- **Zustand** (lightweight, React Native friendly)
- Global state for technologies, quizzes, profile
- Automatic persistence to AsyncStorage

**Data Persistence**:
- **AsyncStorage** (cross-platform localStorage equivalent)
- JSON-stringified data structures
- No backend or authentication in MVP

**UI Components & Styling**:
- **React Native Paper** or **NativeBase** for Material Design
- Custom components for visualizations
- **React Native SVG** for charts and graphics
- Tailwind-inspired utility styles

**LLM Integration**:
- Direct fetch calls to **Anthropic Claude API**
- Claude Sonnet 4.5 model
- Streaming support for better UX during generation
- Environment variables via react-native-config
- Custom Custom prompt templates
- Zod (validation)


### Application Structure

```
/src
  /screens
    /Discover
      DiscoverScreen.jsx          # Main discovery hub
      SurpriseMeFlow.jsx          # Random discovery flow
      GuideMeFlow.jsx             # Guided question flow
      TechnologyCard.jsx          # Content display
      ActionButtons.jsx           # Dismiss/Bucket/Acquire
    
    /Quiz
      QuizScreen.jsx              # Quiz-taking interface
      QuestionCard.jsx            # Single question display
      QuizResults.jsx             # Score and results
      FeedbackCard.jsx            # Answer feedback
    
    /Profile
      ProfileScreen.jsx           # Main profile dashboard
      BreadthDashboard.jsx        # Top metrics cards
      CategoryBreakdown.jsx       # Category progress bars
      MilestonesSection.jsx       # Achievement display
      DiscoveredList.jsx          # Technology list
      TechnologyDetail.jsx        # Full content review
  
  /components
    /common
      Header.jsx
      LoadingSpinner.jsx
      Button.jsx
      Card.jsx
      EmptyState.jsx
  
  /navigation
    AppNavigator.jsx              # Root navigator
    TabNavigator.jsx              # Bottom tabs
  
  /services
    claudeService.js              # Claude API integration
    storageService.js             # AsyncStorage operations
  
  /store
    useAppStore.js                # Zustand global state
  
  /utils
    helpers.js
    validation.js
  
  /constants
    categories.js                 # Category tree
    milestones.js                 # Milestone definitions
    colors.js
    typography.js
  
  App.jsx                         # Root component
```

### Navigation Structure

```
Root Navigator
├── Bottom Tab Navigator (Main)
│   ├── Discover Tab (Home)
│   │   ├── Discover Screen
│   │   ├── Surprise Me Flow
│   │   └── Guide Me Flow
│   │
│   └── Profile Tab
│       ├── Profile Dashboard
│       ├── Discovered List
│       └── Technology Detail Screen
│
└── Modal Stack Navigator (Overlays)
    ├── Quiz Screen (full-screen modal)
    └── Technology Detail (can be modal or pushed)
```

---

## 4. Data Model

### Categories Schema

The category schema serves as **conceptual guardrails** that guide the LLM's understanding of software architecture knowledge domains. The examples provided are **illustrative, not exhaustive**—the LLM dynamically generates any architecturally relevant technology that fits within the category framework.

#### Schema Purpose

```javascript
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

{
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
```

---

#### Surprise Me Flow

**LLM Generation Process**:

1. **Domain Selection**: Randomly choose from top-level Architecture Knowledge Domains
2. **Subcategory Selection**: Randomly choose a subcategory within that domain
3. **Technology Generation**: 
   - LLM thinks of ANY architecturally significant technology/concept/pattern that legitimately belongs to this subcategory
   - Examples in schema serve as **inspiration and calibration**, not constraints
   - LLM can suggest technologies NOT listed in the schema
   - Must be a real, credible, architecturally relevant technology
4. **Novelty Check**: Verify generated technology is NOT in:
   - User's `alreadyDiscovered` list
   - User's `dismissed` list
5. **Content Generation**: Create comprehensive structured content (What, Why, Pros, Cons, Comparisons)

**LLM Reasoning Example**:

```
Step 1: Random domain selection
→ Selected: "Data Storage & Management"

Step 2: Random subcategory selection  
→ Selected: "Database Paradigms" → "Time-Series Databases"

Step 3: Understand the conceptual space
→ Schema description: "Optimized for time-stamped data"
→ Schema examples: ["InfluxDB", "TimescaleDB", "Prometheus"]
→ These examples show: purpose-built databases for temporal data

Step 4: Check what user has already discovered
→ User discovered: ["InfluxDB", "TimescaleDB"]
→ User dismissed: ["Prometheus"]

Step 5: Generate novel technology in this space
→ LLM thinks: "What OTHER time-series databases exist that are 
   architecturally significant and fit this category?"
   
   Potential options:
   - QuestDB (high-performance, SQL-compatible)
   - VictoriaMetrics (Prometheus alternative, better performance)
   - Apache IoTDB (IoT-focused time-series)
   - ClickHouse (can function as time-series DB)
   - Druid (real-time analytics, time-series capabilities)

Step 6: Select most relevant undiscovered option
→ Selected: "QuestDB"
→ Rationale: Real technology, architecturally significant, fits category,
   not in user's discovered list

Step 7: Generate comprehensive content for "QuestDB"
```

**Schema Context Payload**:

```javascript
{
  mode: "surprise",
  alreadyDiscovered: ["InfluxDB", "TimescaleDB", "Redis", "Event Sourcing"],
  dismissed: ["Prometheus"],
  categorySchema: {
    // Full schema provided as CONCEPTUAL REFERENCE
    // LLM uses this to understand domains, NOT to SELECT from
    "Data Storage & Management": {
      subcategories: {
        "Time-Series Databases": {
          description: "Optimized for time-stamped data",
          technologies: ["InfluxDB", "TimescaleDB", "Prometheus"]  
          // ↑ These are EXAMPLES showing what belongs here
          // LLM can suggest: QuestDB, VictoriaMetrics, Druid, etc.
        }
      }
    }
  },
  instruction: `
    TASK: Discover a new technology for a software architect
    
    PROCESS:
    1. Randomly select domain → subcategory from categorySchema
    2. Read the description to understand the conceptual space
    3. Note the examples (they show what TYPES of technologies fit)
    4. Think of ANY real, architecturally significant technology that belongs here
       - Can be from examples OR beyond examples (schema is NOT exhaustive)
       - Must be novel (not in alreadyDiscovered or dismissed)
       - Must be credible (no hallucinations)
       - Must be architecturally relevant (production-grade, not hobby projects)
    5. Generate comprehensive content following the required structure
    
    SELECTED PATH:
    - Domain: Data Storage & Management
    - Subcategory: Time-Series Databases
    - Description: Optimized for time-stamped data
    - Example technologies: InfluxDB, TimescaleDB, Prometheus
    
    YOUR TASK:
    Think of an architecturally relevant time-series database that the user 
    hasn't discovered yet. This can be from the examples OR any other 
    legitimate time-series database you know about.
  `
}
```

---

#### Guide Me Flow

**Conversational Discovery Process**:

**Phase 1: Domain Selection (Question 1)**
```
LLM: "I'm your architecture mentor! What area interests you most right now?"

Options (dynamically generated from top-level domains):
- System Design Fundamentals
- Architecture Patterns & Styles
- Data Storage & Management
- Cloud-Native Architecture
- Messaging & Event Streaming
- API Design & Management
- Observability & Operations
- Security & Identity
- [... all top-level domains]
```

**Phase 2: Subcategory Narrowing (Question 2)**
```
User selected: "Data Storage & Management"

LLM: "Great choice! Which aspect of data storage are you most curious about?"

Options (from selected domain's subcategories):
- Database Paradigms
- Caching Strategies
- Data Replication
- Data Partitioning
```

**Phase 3: Conceptual Refinement (Question 3)**
```
User selected: "Database Paradigms"

LLM: "Interesting! What type of database model are you curious about?"

Options (intelligently derived from subcategory structure):
- Relational Databases (RDBMS)
- Document Stores
- Key-Value Stores
- Column-Family Stores
- Graph Databases
- Time-Series Databases
- Vector Databases
```

**Phase 4: Technology Generation & Content Creation**
```
User selected: "Graph Databases"

Schema context for "Graph Databases":
{
  description: "Databases optimized for connected data and relationships",
  examples: ["Neo4j", "Amazon Neptune", "JanusGraph"]
}

LLM Reasoning:
"User interested in graph databases.
Already discovered: [checking alreadyDiscovered list]
Schema examples show: Neo4j, Amazon Neptune, JanusGraph

What graph databases should I consider?
- From schema: Neo4j, Amazon Neptune, JanusGraph
- Beyond schema: 
  * TigerGraph (high-performance, enterprise-grade)
  * ArangoDB (multi-model with graph capabilities)
  * OrientDB (distributed graph database)
  * Dgraph (distributed, GraphQL-native)
  * Memgraph (in-memory graph database)
  * RedisGraph (Redis module for graphs)

Checking novelty:
- If user hasn't discovered Neo4j → suggest Neo4j (canonical example)
- If Neo4j already discovered → suggest TigerGraph or ArangoDB
- Always prioritize architecturally significant, production-grade options

Selected: TigerGraph (assuming Neo4j already discovered)
Rationale: Enterprise-grade, strong performance characteristics, 
           different architecture from Neo4j"

Result: Generate comprehensive content for "TigerGraph"
```

**Adaptive Question Logic**:
- **If subcategory is broad** (10+ potential technologies): Ask 3-4 questions to narrow focus
- **If subcategory is narrow** (3-5 potential technologies): Ask 2 questions only
- **Final step**: Always LLM generation, not selection from a list

**Schema Context Payload**:

```javascript
{
  mode: "guided",
  conversationState: {
    step: 3,
    selections: [
      { question: "What area interests you?", answer: "Data Storage & Management" },
      { question: "Which aspect?", answer: "Database Paradigms" },
      { question: "What type?", answer: "Graph Databases" }
    ]
  },
  alreadyDiscovered: ["Neo4j", "MongoDB", "Redis"],
  dismissed: [],
  categorySchema: {
    "Data Storage & Management": {
      subcategories: {
        "Database Paradigms": {
          types: ["Relational", "Document", "Key-Value", "Graph", "..."],
          implementations: {
            "Graph": ["Neo4j", "Amazon Neptune", "JanusGraph"]
            // ↑ Examples, not exhaustive
          }
        }
      }
    }
  },
  instruction: `
    TASK: Based on user's guided selections, suggest most relevant undiscovered technology
    
    USER JOURNEY:
    1. Selected domain: Data Storage & Management
    2. Selected subcategory: Database Paradigms
    3. Selected type: Graph Databases
    
    SCHEMA CONTEXT:
    - Description: Databases optimized for connected data and relationships
    - Example technologies: Neo4j, Amazon Neptune, JanusGraph
    
    USER HISTORY:
    - Already discovered: Neo4j, MongoDB, Redis
    - Dismissed: (none)
    
    YOUR REASONING:
    1. What graph databases exist in the architecture landscape?
       - Consider schema examples (Neo4j, Neptune, JanusGraph)
       - Consider other legitimate options (TigerGraph, ArangoDB, Dgraph, etc.)
    2. Which are architecturally significant and production-grade?
    3. Which match the user's expressed interest in graph databases?
    4. Which has the user NOT discovered yet?
    
    SELECT: One technology that best matches user interest + is undiscovered
    GENERATE: Full comprehensive content for selected technology
    
    Remember: Schema examples are NOT the only options. Think of ANY 
    legitimate graph database that would be valuable for an architect to learn.
  `
}
```

---

#### Critical Rules for LLM (Both Flows)

##### 1. **Schema as Framework, Not Database**

```
✅ DO:
- Use schema to understand architectural knowledge domains
- Use examples to calibrate what "belongs" in each category
- Use descriptions to understand the conceptual space
- Generate ANY legitimate technology that fits the category

❌ DON'T:
- Treat example arrays as selection menus
- Limit suggestions only to technologies listed in schema
- Think the schema is exhaustive
- Select randomly from examples without reasoning
```

##### 2. **Novelty Enforcement**

```javascript
MUST verify before generation:
✓ Generated technology name NOT in alreadyDiscovered[]
✓ Generated technology name NOT in dismissed[]
✓ If user has discovered many technologies in a subcategory,
  think creatively about alternatives

✗ If genuinely cannot find novel technology:
  - Try adjacent subcategory within same domain
  - Inform user they've explored this area extensively
  - Suggest exploring different domain
```

##### 3. **Credibility & Relevance Check**

```
Before suggesting any technology, verify:

✓ REAL: Technology actually exists (no hallucinations)
✓ CREDIBLE: Used in production systems, not just hobby projects
✓ ARCHITECTURALLY SIGNIFICANT: Addresses real architectural concerns
✓ CATEGORY FIT: Legitimately belongs to selected subcategory
✓ PRODUCTION-GRADE: Enterprise-ready or widely adopted in industry

Examples of good suggestions:
✓ "QuestDB" (real, high-performance time-series database)
✓ "TigerGraph" (real, enterprise graph database)
✓ "Druid" (real, real-time analytics database)

Examples of bad suggestions:
✗ "TimeFlowDB" (made up, doesn't exist)
✗ "SQLite" (real but not architecturally significant for distributed systems)
✗ "TodoMVC" (real but not an architecture technology)
```

##### 4. **Category Flexibility & Creative Thinking**

```
Schema examples provide INSPIRATION, not LIMITATIONS

Example reasoning:
"Schema shows: Apache Kafka, AWS Kinesis, Apache Pulsar

But I know of OTHER event streaming platforms:
- Redpanda (Kafka-compatible, C++)
- NATS Streaming (lightweight, cloud-native)
- Azure Event Hubs (Microsoft's offering)
- Confluent Cloud (managed Kafka)

If user discovered Kafka and Kinesis, I could suggest:
→ Redpanda (different implementation, performance benefits)
→ Azure Event Hubs (if they work in Azure ecosystem)
→ NATS Streaming (if they need lightweight option)"

The schema helps me understand WHAT BELONGS HERE, but doesn't
limit WHICH SPECIFIC TECHNOLOGIES I can suggest.
```

##### 5. **Content Generation Quality**

```javascript
ALL generated technology cards must include:
{
  name: "Technology Name (Generated by LLM)",
  category: "Top-Level Domain",
  subcategory: "Specific Subcategory",
  architectureLevel: "foundational|intermediate|advanced",
  content: {
    what: "2-3 paragraphs explaining core concepts and mechanics",
    why: "2-3 paragraphs on architectural value and use cases",
    pros: [
      "4-5 specific advantages with context",
      "Each should be substantial, not generic",
      "Focus on architectural benefits"
    ],
    cons: [
      "4-5 specific limitations or trade-offs",
      "Be honest about drawbacks",
      "Help architects make informed decisions"
    ],
    compareToSimilar: [
      {
        technology: "Similar Tech 1",
        comparison: "2-3 sentences on key distinctions and when to choose which"
      },
      {
        technology: "Similar Tech 2",
        comparison: "2-3 sentences highlighting trade-offs"
      }
    ]
  }
}
```

##### 6. **Fallback Strategy**

```
IF genuinely cannot find undiscovered technology in selected area:

1. Be transparent:
   "You've explored most of the mainstream technologies in [Category]! 
    Impressive breadth in this area."

2. Suggest alternatives:
   - "Would you like to explore [Adjacent Subcategory]?"
   - "Try 'Surprise Me' to discover from a different domain"
   - "You might enjoy exploring [Underexplored Category]"

3. NEVER:
   ✗ Generate duplicate content for already-discovered technology
   ✗ Hallucinate fake technologies to fill the gap
   ✗ Suggest irrelevant technologies just to have something
```

---

#### Example LLM Reasoning Logs

##### Example 1: Finding Beyond Schema

```
User: Surprise Me
Already discovered: ["InfluxDB", "TimescaleDB", "Prometheus", "PostgreSQL"]

LLM Process:
1. Random selection: Data Storage → Time-Series Databases
2. Schema examples: InfluxDB, TimescaleDB, Prometheus
3. User already discovered ALL schema examples
4. Think beyond schema:
   "What OTHER time-series databases exist?
   - QuestDB ✓ (high-performance, SQL-compatible)
   - VictoriaMetrics ✓ (Prometheus alternative)
   - Apache Druid ✓ (real-time analytics, time-series)
   - Apache IoTDB ✓ (IoT-focused)
   - ClickHouse ✓ (OLAP with time-series capabilities)"
5. Select: QuestDB (strong architectural differentiation from user's discoveries)
6. Generate comprehensive content

Result: User discovers QuestDB ✓
```

##### Example 2: Schema-Guided But Creative

```
User: Guide Me → Messaging → Event Streaming Platforms
Already discovered: ["Apache Kafka", "AWS Kinesis"]

LLM Process:
1. Schema context:
   - Description: "Distributed event logs for real-time processing"
   - Examples: Kafka, Kinesis, Pulsar, Google Pub/Sub
2. User discovered: Kafka, Kinesis
3. Consider options:
   - Schema: Pulsar ✓, Google Pub/Sub ✓
   - Beyond: Redpanda ✓, Azure Event Hubs ✓, Confluent Cloud ✓
4. Reasoning:
   "Apache Pulsar is canonical alternative to Kafka (good option)
   Redpanda is newer, Kafka-compatible but C++ (interesting differentiation)
   Azure Event Hubs is managed, Azure-native (depends on their stack)"
5. Select: Apache Pulsar (balance of relevance + architectural significance)
6. Generate content comparing to Kafka

Result: User discovers Apache Pulsar ✓
```

##### Example 3: When Schema Examples Are Novel

```
User: Surprise Me
Already discovered: ["Neo4j", "MongoDB", "Redis", "Event Sourcing"]

LLM Process:
1. Random selection: Security & Identity → Authentication
2. Schema examples: OAuth 2.0, OIDC, SAML, WebAuthn, etc.
3. Check user discoveries: None in this category!
4. Schema examples ARE novel to user
5. Select most foundational: "OAuth 2.0"
   (Rationale: Most fundamental auth protocol, architect must-know)
6. Generate comprehensive content

Result: User discovers OAuth 2.0 ✓
Note: Even though it's in schema, it's still dynamically selected
      based on architectural significance + novelty
```

---

#### Schema Evolution & Learning

As the system evolves:

1. **Track Coverage**: Monitor which domains/subcategories are being explored
2. **Identify Patterns**: If LLM consistently suggests technologies outside schema, consider adding them as examples
3. **Update Examples**: Periodically refresh schema examples to reflect emerging technologies
4. **Maintain Flexibility**: Schema should always remain a GUIDE, never a CONSTRAINT

**The schema is a living framework that helps LLM think architecturally while maintaining infinite discovery potential.**

---

This approach ensures:
- ✅ **Infinite discovery** (not limited to schema contents)
- ✅ **Architectural grounding** (schema prevents irrelevant suggestions)
- ✅ **Novelty maintenance** (always undiscovered technologies)
- ✅ **Quality assurance** (credible, production-grade suggestions)
- ✅ **Genuine surprise** (even developers can't predict what's next)







### AsyncStorage Schema

**Key: `@architectApp_technologies`**
```javascript
[
  {
    id: "uuid-1",
    name: "Event Sourcing",
    category: "Architecture Patterns",
    subcategory: "Event-Driven Patterns",
    content: {
      what: "...",
      why: "...",
      pros: ["...", "...", "..."],
      cons: ["...", "...", "..."],
      compareToSimilar: [
        { technology: "CQRS", comparison: "..." },
        { technology: "CDC", comparison: "..." }
      ]
    },
    status: "learned",
    discoveryMethod: "surprise",
    discoveredAt: "2025-09-29T10:00:00Z",
    learnedAt: "2025-09-29T15:00:00Z"
  },
  {
    id: "uuid-2",
    name: "Redis",
    category: "Data Storage",
    subcategory: "In-Memory Stores",
    content: { ... },
    status: "discovered",
    discoveryMethod: "guided",
    discoveredAt: "2025-09-29T14:00:00Z",
    learnedAt: null
  }
]
```

**Key: `@architectApp_quizzes`**
```javascript
[
  {
    id: "quiz-uuid-1",
    technologyId: "uuid-1",
    technologyName: "Event Sourcing",
    questions: [
      {
        question: "What is the primary...",
        options: ["A", "B", "C", "D"],
        correctAnswer: 1,
        explanation: "...",
        userAnswer: 1
      }
    ],
    score: 85,
    passed: true,
    attemptNumber: 1,
    attemptedAt: "2025-09-29T15:00:00Z",
    completedAt: "2025-09-29T15:15:00Z"
  }
]
```

**Key: `@architectApp_profile`**
```javascript
{
  statistics: {
    breadthExpansion: {
      totalDiscovered: 38,
      totalLearned: 23,
      inBucketList: 15,
      learningRate: 61
    },
    
    growthMetrics: {
      technologiesThisWeek: 7,
      technologiesThisMonth: 28,
      monthlyGrowthRate: "+12 from last month",
      averagePerWeek: 3.5
    },
    
    discoveryStats: {
      surpriseMeCount: 22,
      guideMeCount: 16,
      dismissedCount: 8
    },
    
    quizPerformance: {
      totalQuizzesTaken: 25,
      averageScore: 82,
      passRate: 92,
      firstTimePassRate: 88
    },
    
    categoryBreakdown: {
      "Architecture Patterns": {
        discovered: 12,
        learned: 8,
        learningRate: 67
      },
      "Data Storage": {
        discovered: 8,
        learned: 6,
        learningRate: 75
      }
    },
    
    activity: {
      currentStreak: 7,
      longestStreak: 14,
      lastDiscovery: "2025-09-29T15:00:00Z",
      totalDaysActive: 45,
      categoriesExplored: ["Architecture Patterns", "Data Storage", ...]
    }
  },
  
  milestones: [
    {
      type: "discovered",
      threshold: 10,
      title: "First 10 Discovered",
      icon: "🎯",
      achievedAt: "2025-09-15T10:00:00Z"
    },
    {
      type: "learned",
      threshold: 20,
      title: "20 Technologies Mastered",
      icon: "✓✓",
      achievedAt: "2025-09-28T14:00:00Z"
    }
  ],
  
  createdAt: "2025-09-01T09:00:00Z",
  updatedAt: "2025-09-29T15:30:00Z"
}
```

**Key: `@architectApp_dismissed`**
```javascript
[
  "Cassandra",
  "ScyllaDB",
  "Apache Flink"
]
```
*Note: Dismissed technologies can reappear in future sessions to allow reconsideration*

---

## 5. User Interface Design

### Design Principles

1. **Mobile-First**: Optimize for thumb-friendly interactions
2. **Progress-Oriented**: Always show advancement and growth
3. **Encouraging**: Use positive, motivational language
4. **Scannable**: Clear hierarchy, whitespace, readable typography
5. **Native Feel**: Platform-appropriate patterns (iOS/Android)