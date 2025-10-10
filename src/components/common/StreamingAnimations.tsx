import React, { useEffect, useState, useRef } from 'react';
import { Animated, Text } from 'react-native';

interface FadeInViewProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
}

/**
 * Fade-in animation wrapper
 */
export const FadeInView: React.FC<FadeInViewProps> = ({
  children,
  delay = 0,
  duration = 300,
}) => {
  const fadeAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration,
      delay,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim, delay, duration]);

  return (
    <Animated.View style={{ opacity: fadeAnim }}>
      {children}
    </Animated.View>
  );
};

interface TypewriterTextProps {
  text: string;
  speed?: number;
  style?: any;
  onComplete?: () => void;
  /**
   * If true, shows text immediately without animation (for final/complete state)
   */
  instant?: boolean;
}

/**
 * Typewriter text animation optimized for streaming
 * - During streaming: displays text immediately as it arrives (no re-typing)
 * - When instant=true: shows all text at once
 */
export const TypewriterText: React.FC<TypewriterTextProps> = ({
  text,
  speed = 20,
  style,
  onComplete,
  instant = false,
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevTextLengthRef = useRef(0);

  useEffect(() => {
    // If instant mode, show all text immediately
    if (instant) {
      setDisplayedText(text);
      setCurrentIndex(text.length);
      return;
    }

    // If text got shorter (new question), reset
    if (text.length < prevTextLengthRef.current) {
      setDisplayedText('');
      setCurrentIndex(0);
      prevTextLengthRef.current = 0;
    }

    // If text got longer (streaming update), just update the index to catch up
    if (text.length > prevTextLengthRef.current) {
      prevTextLengthRef.current = text.length;
      // Don't reset - let the typing animation catch up
    }
  }, [text, instant]);

  useEffect(() => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (currentIndex < text.length) {
      timeoutRef.current = setTimeout(() => {
        setDisplayedText(text.slice(0, currentIndex + 1));
        setCurrentIndex(currentIndex + 1);
      }, speed);
    } else if (currentIndex === text.length && currentIndex > 0 && onComplete) {
      onComplete();
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [currentIndex, text, speed, onComplete]);

  return <Text style={style}>{displayedText}</Text>;
};

interface FadeInItemWrapperProps {
  children: React.ReactNode;
  index: number;
  delay?: number;
}

/**
 * Fade-in wrapper for list items with staggered delays
 */
export const FadeInItemWrapper: React.FC<FadeInItemWrapperProps> = ({
  children,
  index,
  delay = 100,
}) => (
  <FadeInView delay={index * delay}>
    {children}
  </FadeInView>
);
