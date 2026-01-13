import { DiscoverMemo } from "@/hooks/useDiscoverMemos";

// Free sample audio URLs from various sources
const DEMO_AUDIO_URLS = [
  "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
  "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
  "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
  "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
  "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3",
];

export const DEMO_MEMOS: DiscoverMemo[] = [
  {
    id: "demo-1",
    title: "The power of morning routines",
    audioUrl: DEMO_AUDIO_URLS[0],
    transcript: "I've been experimenting with my morning routine for the past month. Waking up at 5:30 AM seemed crazy at first, but now it's my most productive time. The key is not the early wake-up itself, but having a consistent ritual that prepares your mind for the day ahead.",
    summary: "Reflections on building a consistent morning routine and how small rituals can transform your daily productivity and mindset.",
    categories: ["Ideas", "Goals"],
    tasks: ["Try waking up 30 minutes earlier", "Create morning ritual checklist"],
    isPublic: true,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    duration: 180,
    author: {
      id: "demo-author-1",
      name: "Alex Chen",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex",
    },
    likes: 47,
    viewCount: 234,
    language: "en-US",
  },
  {
    id: "demo-2",
    title: "Why creativity needs constraints",
    audioUrl: DEMO_AUDIO_URLS[1],
    transcript: "I used to think creativity meant complete freedom, but I've realized it's the opposite. When you give yourself constraints - a deadline, a limited palette, a specific format - your brain works harder to find solutions. Constraints force innovation.",
    summary: "Exploring the paradox of creativity: how limiting your options can actually spark more innovative and original ideas.",
    categories: ["Creative", "Nuggets"],
    tasks: [],
    isPublic: true,
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
    duration: 145,
    author: {
      id: "demo-author-2",
      name: "Maya Johnson",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Maya",
    },
    likes: 89,
    viewCount: 567,
    language: "en-US",
  },
  {
    id: "demo-3",
    title: "Gratitude for small moments",
    audioUrl: DEMO_AUDIO_URLS[2],
    transcript: "Today I'm grateful for the smell of fresh coffee, the way sunlight comes through my kitchen window in the morning, and that random text from an old friend. These tiny moments are what life is actually made of.",
    summary: "A gentle reminder to appreciate the small, everyday moments that often go unnoticed but make life beautiful.",
    categories: ["Gratitude", "Reflections"],
    tasks: [],
    isPublic: true,
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
    duration: 92,
    author: {
      id: "demo-author-3",
      name: "Sam Rivera",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sam",
    },
    likes: 156,
    viewCount: 892,
    language: "en-US",
  },
  {
    id: "demo-4",
    title: "Building in public changed everything",
    audioUrl: DEMO_AUDIO_URLS[3],
    transcript: "When I started sharing my work publicly before it was 'ready', something shifted. The fear of judgment was replaced by connection. People started reaching out, offering help, sharing their own struggles. Building in public isn't about showing off - it's about building community.",
    summary: "How sharing work-in-progress publicly creates unexpected connections and accelerates learning through community feedback.",
    categories: ["Ideas", "Goals"],
    tasks: ["Share one WIP project this week", "Write about my current learning journey"],
    isPublic: true,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    duration: 167,
    author: {
      id: "demo-author-4",
      name: "Jordan Park",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jordan",
    },
    likes: 203,
    viewCount: 1245,
    language: "en-US",
  },
  {
    id: "demo-5",
    title: "The art of saying no",
    audioUrl: DEMO_AUDIO_URLS[4],
    transcript: "I used to say yes to everything out of fear of missing out or disappointing people. But every yes to something is a no to something else. Learning to say no with kindness and clarity has been one of the most liberating skills I've developed.",
    summary: "Reflections on the importance of boundaries and how saying no to the wrong things creates space for the right ones.",
    categories: ["Reflections", "Nuggets"],
    tasks: ["Review current commitments", "Practice declining one request this week"],
    isPublic: true,
    createdAt: new Date(Date.now() - 36 * 60 * 60 * 1000),
    duration: 134,
    author: {
      id: "demo-author-5",
      name: "Taylor Kim",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Taylor",
    },
    likes: 178,
    viewCount: 1089,
    language: "en-US",
  },
];

export function getDemoMemoById(id: string): DiscoverMemo | undefined {
  return DEMO_MEMOS.find(memo => memo.id === id);
}

export function getRandomDemoMemo(): DiscoverMemo {
  const randomIndex = Math.floor(Math.random() * DEMO_MEMOS.length);
  return DEMO_MEMOS[randomIndex];
}
