# Breadthwise

A cross-platform mobile app that helps senior software engineers systematically expand their technical breadth through LLM-powered content generation, quizzes, and progress tracking.

## 📱 About

Breadthwise is designed to help experienced engineers transition from deep specialists to well-rounded software architects by discovering and learning new technologies across various domains of software architecture.

### Key Features

- **🎲 Surprise Me**: Randomly discover new architecture technologies
- **🧭 Guide Me**: Answer questions to find relevant technologies
- **📋 Technology Cards**: Rich, architect-focused content for each technology
- **🎯 Knowledge Quizzes**: Test your understanding with generated quizzes
- **📊 Progress Tracking**: Visualize your breadth expansion journey
- **🏆 Milestones**: Celebrate your learning achievements

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- pnpm (or npm)
- iOS Simulator (Mac) or Android Emulator
- LLM API key - supports Anthropic Claude, OpenAI, or custom endpoints ([Get Anthropic key here](https://console.anthropic.com/))

### Installation

1. **Clone and install dependencies**:
   ```bash
   cd Breadthwise
   pnpm install
   ```

2. **Configure environment**:

   Create a `.env` file with your LLM configuration:
   ```env
   # LLM Configuration
   LLM_PROVIDER=anthropic  # or 'openai', 'custom'
   LLM_API_KEY=your_actual_api_key_here
   LLM_API_URL=https://api.anthropic.com/v1/messages
   LLM_MODEL=claude-3-5-sonnet-20241022
   LLM_ANTHROPIC_VERSION=2023-06-01
   LLM_MAX_TOKENS=4000
   LLM_TEMPERATURE=0.7

   # Web-specific: Proxy URL for CORS bypass (auto-configured for local dev)
   EXPO_PUBLIC_LLM_PROXY_URL=http://localhost:8787
   ```

3. **Start the app**:
   ```bash
   # Mobile (iOS/Android)
   pnpm start

   # Web (includes proxy for CORS handling)
   pnpm web
   ```

4. **Run on your device**:
   - Press `i` for iOS Simulator
   - Press `a` for Android Emulator
   - Press `w` for Web browser
   - Scan QR code with Expo Go app on your phone

## 📂 Project Structure

```
Breadthwise/
├── app/                        # Expo Router screens
│   ├── (tabs)/                 # Tab navigation
│   │   ├── index.tsx          # Root redirect
│   │   ├── discover.tsx       # Discover screen
│   │   ├── profile.tsx        # Profile screen
│   │   └── _layout.tsx        # Tab layout
│   ├── _layout.tsx            # Root layout
│   └── quiz.tsx               # Quiz modal screen
│
├── src/
│   ├── types/                 # TypeScript definitions
│   ├── store/                 # Zustand state management (persisted)
│   ├── services/              # LLM service (multi-provider)
│   │   ├── llmService.ts      # Unified LLM client
│   │   └── prompts.ts         # Prompt templates
│   ├── constants/             # Category schema & configs
│   └── components/            # Reusable components
│       ├── common/            # Shared UI components
│       ├── discover/          # Discovery flow components
│       │   ├── SurpriseMeFlow.tsx
│       │   ├── GuideMeFlow.tsx
│       │   ├── TechnologyCard.tsx
│       │   └── ActionButtons.tsx
│       ├── quiz/              # Quiz components
│       └── profile/           # Profile components
│
├── scripts/
│   └── llm-proxy.mjs          # CORS proxy for web platform
│
├── .env                       # Environment variables
├── app.config.js              # Expo configuration (dynamic)
└── package.json               # Dependencies
```

## 🎯 Current Implementation Status

### ✅ Completed
- ✅ Core infrastructure and dependencies
- ✅ State management (Zustand with AsyncStorage persistence)
- ✅ Multi-provider LLM service (Anthropic, OpenAI, Custom)
- ✅ Web platform support with CORS proxy
- ✅ Comprehensive category schema (10+ architecture domains)
- ✅ Discover screen with both discovery modes
- ✅ "Surprise Me" flow - random technology generation
- ✅ "Guide Me" flow - multi-step guided discovery
- ✅ Profile screen with comprehensive stats and progress tracking
- ✅ Technology card display with rich content
- ✅ Action buttons (Dismiss, Add to Bucket, Acquire Now)
- ✅ Quiz generation and display
- ✅ Quiz results and feedback
- ✅ Cross-platform (iOS, Android, Web)

### 🔄 Future Enhancements
- Enhanced error handling and offline support
- More quiz question types
- Learning path recommendations
- Social features and sharing

## 📖 Usage

### Discovering Technologies

#### Surprise Me Mode
1. Open the app and go to the **Discover** tab
2. Click **"Surprise Me"** to get a random technology you haven't learned
3. Read through the comprehensive content:
   - What it is and how it works
   - Why architects use it
   - Advantages and trade-offs
   - Comparisons to similar technologies
4. Choose an action:
   - **Dismiss**: Not interested (won't be shown again)
   - **Add to Bucket**: Save for later learning
   - **Acquire Now**: Take a quiz immediately

#### Guide Me Mode
1. Click **"Guide Me"** on the Discover tab
2. Answer 3 guided questions about your interests and context
3. Receive a personalized technology recommendation
4. Review the technology and choose your next action

### Tracking Progress

1. Navigate to the **Profile** tab (second tab)
2. View your statistics:
   - Technologies discovered and learned
   - Learning rate percentage
   - Quiz performance
   - Category breakdown
3. Check your milestones and achievements
4. Browse all discovered technologies

## 🔧 Development

### Tech Stack

- **Framework**: React Native 0.81 + Expo 54
- **Language**: TypeScript 5.9
- **Routing**: Expo Router 6 (file-based)
- **State Management**: Zustand 5 + AsyncStorage (persisted)
- **UI Components**: React Native Paper 5, custom components
- **LLM Integration**: Multi-provider service (Anthropic/OpenAI/Custom)
- **Validation**: Zod
- **Package Manager**: pnpm
- **Web Support**: Expo Web with custom CORS proxy

### Available Scripts

```bash
# Development
pnpm start          # Start Expo dev server
pnpm android        # Run on Android
pnpm ios            # Run on iOS
pnpm web            # Run on web with proxy
pnpm proxy          # Run CORS proxy only (for web)

# Code Quality
pnpm lint           # Run ESLint

# Utilities
pnpm reset-project  # Reset to clean state
```

### Running Tests

```bash
# Not yet implemented
pnpm test
```

### Building for Production

```bash
# iOS
eas build --platform ios

# Android
eas build --platform android

# Web (static export)
pnpm web
```

## 📚 Documentation

- [Technical Spec](./tech-spec.md) - Complete product specification

## 🐛 Known Issues

1. **Limited error boundaries** - Some API errors may cause crashes
2. **No offline mode** - Requires internet connection for LLM features
3. **Web CORS** - Requires proxy for direct API calls (automatically handled by `pnpm web`)

## 🔒 Security Notes

- API keys are loaded from `.env` and not committed to version control
- For web deployment, use the proxy server to avoid exposing API keys in client bundle
- The proxy server should be deployed separately and configured via `EXPO_PUBLIC_LLM_PROXY_URL`

## 🤝 Contributing

This is currently a solo project for learning purposes. Feel free to fork and experiment!

## 📝 License

Private project - All rights reserved

## 🙏 Acknowledgments

- Built with [Expo](https://expo.dev/)
- Powered by [Claude AI](https://www.anthropic.com/)
- Inspired by Mark Richards' Architecture Knowledge Triangle

## 📧 Contact

For questions or feedback, please open an issue in the repository.

---

**Status**: ✅ MVP Complete
**Last Updated**: September 2025