import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useAuth } from '../../src/contexts/AuthContext';
import { supabase } from '../../src/lib/supabase';
import { chatWithUstad, ChatMessage } from '../../src/lib/gemini';

interface Message {
  role: 'user' | 'assistant';
  text: string;
}

// Dynamic suggestion generator based on context
const getDynamicSuggestions = (
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night',
  remainingCalories?: number,
  waterCount?: number,
  goal?: string
): string[] => {
  const suggestions: string[] = [];

  // Time-based suggestions
  if (timeOfDay === 'morning') {
    suggestions.push("Nashta mein kya khana chahiye?");
    suggestions.push("Best breakfast for weight loss?");
  } else if (timeOfDay === 'afternoon') {
    suggestions.push("Lunch ideas for today?");
    suggestions.push("Office lunch kya healthy hai?");
  } else if (timeOfDay === 'evening') {
    suggestions.push("Light dinner suggestions?");
    suggestions.push("Evening snack ideas");
  } else {
    suggestions.push("Late night cravings ko kaise handle karein?");
    suggestions.push("Raat ko kya avoid karein?");
  }

  // Calorie-based suggestions
  if (remainingCalories !== undefined) {
    if (remainingCalories > 800) {
      suggestions.push("Zyada protein wala khaana suggest karo");
    } else if (remainingCalories > 400) {
      suggestions.push("500 calories ke andar kya kha sakta hoon?");
    } else if (remainingCalories > 0) {
      suggestions.push("Light snack options batao");
    } else {
      suggestions.push("Kal ke liye meal plan banao");
    }
  }

  // Water-based suggestions
  if (waterCount !== undefined && waterCount < 4) {
    suggestions.push("Pani peene ke fayde batao");
  }

  // Goal-based suggestions
  if (goal === 'lose') {
    suggestions.push("Weight loss tips for this week");
  } else if (goal === 'build') {
    suggestions.push("Muscle gain ke liye kya khaun?");
  }

  // Always add some general suggestions
  suggestions.push("Biryani kitni calories hoti hai?");
  suggestions.push("Desi food healthy kaise banayein?");

  // Return random 4 suggestions
  return suggestions.sort(() => Math.random() - 0.5).slice(0, 4);
};

const getTimeOfDay = (): 'morning' | 'afternoon' | 'evening' | 'night' => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
};

export default function ChatScreen() {
  const { colors, accent, theme } = useTheme();
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const scrollRef = useRef<ScrollView>(null);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  // Fetch today's stats for context
  const today = new Date().toISOString().split('T')[0];
  const { data: todayStats } = useQuery({
    queryKey: ['todayStats', user?.id, today],
    queryFn: async () => {
      if (!user) return null;

      const [foodLogsRes, hydrationRes] = await Promise.all([
        supabase
          .from('food_logs')
          .select('calories, protein, carbs, fat')
          .eq('user_id', user.id)
          .gte('created_at', `${today}T00:00:00`)
          .lte('created_at', `${today}T23:59:59`),
        supabase
          .from('hydration_logs')
          .select('count')
          .eq('user_id', user.id)
          .eq('log_date', today)
          .single()
      ]);

      const logs = foodLogsRes.data || [];
      const totalCalories = logs.reduce((sum, log) => sum + log.calories, 0);
      const totalProtein = logs.reduce((sum, log) => sum + (log.protein || 0), 0);
      const totalCarbs = logs.reduce((sum, log) => sum + (log.carbs || 0), 0);
      const totalFat = logs.reduce((sum, log) => sum + (log.fat || 0), 0);
      const targetCalories = profile?.daily_target_kcal || 2000;

      return {
        remainingCalories: targetCalories - totalCalories,
        todaysMacros: { protein: totalProtein, carbs: totalCarbs, fat: totalFat },
        waterCount: hydrationRes.data?.count || 0,
      };
    },
    enabled: !!user,
  });

  // Fetch or create chat session
  const { data: session, isLoading } = useQuery({
    queryKey: ['chatSession', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('user_id', user.id)
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code === 'PGRST116') {
        // No active session, create one
        const { data: newSession, error: createError } = await supabase
          .from('chat_sessions')
          .insert({
            user_id: user.id,
            messages: [],
          })
          .select()
          .single();

        if (createError) throw createError;
        return newSession;
      }
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (session?.messages) {
      setMessages(session.messages as Message[]);
      // Convert to ChatMessage format for Gemini API
      const history: ChatMessage[] = (session.messages as Message[]).map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }],
      }));
      setChatHistory(history);
    }
  }, [session]);

  // Generate dynamic suggestions based on context
  useEffect(() => {
    const newSuggestions = getDynamicSuggestions(
      getTimeOfDay(),
      todayStats?.remainingCalories,
      todayStats?.waterCount,
      profile?.goal_type || undefined
    );
    setSuggestions(newSuggestions);
  }, [todayStats, profile?.goal_type]);

  // Handle suggestion tap
  const handleSuggestionTap = (suggestion: string) => {
    setInput(suggestion);
    sendMessage.mutate(suggestion);
  };

  // Use real Gemini API for Ustad responses
  const generateResponse = async (userMessage: string): Promise<string> => {
    const response = await chatWithUstad(
      userMessage,
      {
        userName: profile?.display_name || undefined,
        remainingCalories: todayStats?.remainingCalories,
        todaysMacros: todayStats?.todaysMacros,
        goal: profile?.goal_type || undefined,
        waterCount: todayStats?.waterCount,
      },
      chatHistory
    );

    // Update chat history for context in future messages
    setChatHistory(prev => [
      ...prev,
      { role: 'user', parts: [{ text: userMessage }] },
      { role: 'model', parts: [{ text: response }] },
    ]);

    return response;
  };

  const sendMessage = useMutation({
    mutationFn: async (text: string) => {
      const userMessage: Message = { role: 'user', text };
      const newMessages = [...messages, userMessage];
      setMessages(newMessages);
      setInput('');
      setIsTyping(true);

      const response = await generateResponse(text);
      const assistantMessage: Message = { role: 'assistant', text: response };
      const finalMessages = [...newMessages, assistantMessage];

      // Save to Supabase
      if (session && user) {
        await supabase
          .from('chat_sessions')
          .update({ messages: finalMessages })
          .eq('id', session.id);
      }

      setMessages(finalMessages);
      setIsTyping(false);

      return finalMessages;
    },
  });

  const handleSend = () => {
    if (input.trim() && !sendMessage.isPending) {
      sendMessage.mutate(input.trim());
    }
  };

  const handleNewChat = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('chat_sessions')
      .insert({
        user_id: user.id,
        messages: [],
      })
      .select()
      .single();

    if (!error) {
      setMessages([]);
      queryClient.invalidateQueries({ queryKey: ['chatSession', user.id] });
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.surface.primary }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: 20,
          paddingTop: 60,
          paddingBottom: 16,
          borderBottomWidth: 1,
          borderBottomColor: colors.surface.tertiary,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: accent + '20',
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 12,
            }}
          >
            <MaterialIcons name="smart-toy" size={24} color={accent} />
          </View>
          <View>
            <Text
              style={{
                fontFamily: 'PlusJakartaSans_600SemiBold',
                fontSize: 18,
                color: colors.text.primary,
              }}
            >
              Ustad
            </Text>
            <Text
              style={{
                fontFamily: 'PlusJakartaSans_400Regular',
                fontSize: 12,
                color: colors.text.tertiary,
              }}
            >
              Your nutrition coach
            </Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={handleNewChat}
          style={{
            padding: 8,
          }}
        >
          <MaterialIcons name="add-comment" size={24} color={colors.text.secondary} />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingVertical: 16,
          paddingBottom: 100,
        }}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.length === 0 && (
          <View style={{ alignItems: 'center', marginTop: 24 }}>
            <View
              style={{
                width: 100,
                height: 100,
                borderRadius: 50,
                backgroundColor: accent + '20',
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 20,
              }}
            >
              <MaterialIcons name="chat" size={48} color={accent} />
            </View>
            <Text
              style={{
                fontFamily: 'PlusJakartaSans_700Bold',
                fontSize: 24,
                color: colors.text.primary,
                marginBottom: 8,
              }}
            >
              Chat with Ustad
            </Text>
            <Text
              style={{
                fontFamily: 'PlusJakartaSans_500Medium',
                fontSize: 16,
                color: colors.text.secondary,
                textAlign: 'center',
                paddingHorizontal: 32,
                lineHeight: 24,
              }}
            >
              Ask about calories, nutrition, Pakistani food, or get personalized advice!
            </Text>

            {/* Dynamic Suggestions */}
            <View style={{ marginTop: 32, width: '100%' }}>
              <Text
                style={{
                  fontFamily: 'PlusJakartaSans_600SemiBold',
                  fontSize: 14,
                  color: colors.text.tertiary,
                  marginBottom: 12,
                  textAlign: 'center',
                }}
              >
                Try asking
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10 }}>
                {suggestions.map((suggestion, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => handleSuggestionTap(suggestion)}
                    style={{
                      backgroundColor: colors.surface.secondary,
                      borderRadius: 20,
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      borderWidth: 1,
                      borderColor: theme === 'light' ? colors.border : colors.surface.tertiary,
                      ...(theme === 'light' ? {
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.04,
                        shadowRadius: 4,
                        elevation: 1,
                      } : {}),
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: 'PlusJakartaSans_500Medium',
                        fontSize: 14,
                        color: colors.text.primary,
                      }}
                    >
                      {suggestion}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        )}

        {messages.map((message, index) => (
          <View
            key={index}
            style={{
              alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start',
              backgroundColor:
                message.role === 'user' ? accent : colors.surface.secondary,
              borderRadius: 16,
              borderBottomRightRadius: message.role === 'user' ? 4 : 16,
              borderBottomLeftRadius: message.role === 'user' ? 16 : 4,
              padding: 14,
              marginBottom: 12,
              maxWidth: '80%',
            }}
          >
            <Text
              style={{
                fontFamily: 'PlusJakartaSans_400Regular',
                fontSize: 15,
                color: message.role === 'user' ? '#fff' : colors.text.primary,
                lineHeight: 22,
              }}
            >
              {message.text}
            </Text>
          </View>
        ))}

        {isTyping && (
          <View
            style={{
              alignSelf: 'flex-start',
              backgroundColor: colors.surface.secondary,
              borderRadius: 16,
              padding: 14,
              marginBottom: 12,
            }}
          >
            <ActivityIndicator size="small" color={accent} />
          </View>
        )}
      </ScrollView>

      {/* Input */}
      <View
        style={{
          position: 'absolute',
          bottom: 100,
          left: 20,
          right: 20,
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.surface.secondary,
          borderRadius: 24,
          paddingHorizontal: 16,
          paddingVertical: 8,
          borderWidth: theme === 'light' ? 1 : 0,
          borderColor: theme === 'light' ? colors.border : 'transparent',
          ...(theme === 'light' ? {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.06,
            shadowRadius: 8,
            elevation: 3,
          } : {}),
        }}
      >
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Ask Ustad anything..."
          placeholderTextColor={colors.text.tertiary}
          style={{
            flex: 1,
            fontFamily: 'PlusJakartaSans_400Regular',
            fontSize: 16,
            color: colors.text.primary,
            paddingVertical: 8,
          }}
          onSubmitEditing={handleSend}
        />
        <TouchableOpacity
          onPress={handleSend}
          disabled={!input.trim() || sendMessage.isPending}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: input.trim() ? accent : colors.surface.tertiary,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <MaterialIcons
            name="send"
            size={20}
            color={input.trim() ? '#fff' : colors.text.tertiary}
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
