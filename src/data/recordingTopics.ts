export interface RecordingTopic {
  id: string;
  icon: string;
  text: string;
  category: "growth" | "ideas" | "reflection" | "creative" | "professional" | "daily";
}

export const RECORDING_TOPICS: RecordingTopic[] = [
  // Personal Growth
  { id: "1", icon: "🏆", text: "Share a recent win", category: "growth" },
  { id: "2", icon: "🙏", text: "What are you grateful for today?", category: "growth" },
  { id: "3", icon: "🎯", text: "What's your current goal?", category: "growth" },
  { id: "4", icon: "💪", text: "A challenge you overcame", category: "growth" },
  
  // Ideas & Insights
  { id: "5", icon: "💡", text: "A life hack you discovered", category: "ideas" },
  { id: "6", icon: "📚", text: "Something you learned recently", category: "ideas" },
  { id: "7", icon: "🔮", text: "A prediction about the future", category: "ideas" },
  { id: "8", icon: "🧠", text: "An idea that won't leave your head", category: "ideas" },
  
  // Reflections
  { id: "9", icon: "🌅", text: "How was your week?", category: "reflection" },
  { id: "10", icon: "💭", text: "What's on your mind right now?", category: "reflection" },
  { id: "11", icon: "🪞", text: "A moment of self-discovery", category: "reflection" },
  { id: "12", icon: "🌙", text: "End of day thoughts", category: "reflection" },
  
  // Creative
  { id: "13", icon: "📖", text: "A story idea", category: "creative" },
  { id: "14", icon: "✨", text: "Describe your dream project", category: "creative" },
  { id: "15", icon: "🎨", text: "Something that inspired you", category: "creative" },
  { id: "16", icon: "🎬", text: "If you could create anything...", category: "creative" },
  
  // Professional
  { id: "17", icon: "💼", text: "A work insight worth sharing", category: "professional" },
  { id: "18", icon: "🎓", text: "Advice for your younger self", category: "professional" },
  { id: "19", icon: "🤝", text: "A lesson from a mentor", category: "professional" },
  { id: "20", icon: "🚀", text: "Your next big move", category: "professional" },
  
  // Daily Life
  { id: "21", icon: "☀️", text: "Your morning routine", category: "daily" },
  { id: "22", icon: "🍳", text: "A recipe you love", category: "daily" },
  { id: "23", icon: "🏃", text: "How you stay energized", category: "daily" },
  { id: "24", icon: "📱", text: "An app that changed your life", category: "daily" },
  { id: "25", icon: "🎵", text: "What you're listening to", category: "daily" },
];

export function getRandomTopics(count: number = 3, exclude: string[] = []): RecordingTopic[] {
  const available = RECORDING_TOPICS.filter(t => !exclude.includes(t.id));
  const shuffled = [...available].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
