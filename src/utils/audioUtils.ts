import { TranscriptionData } from '../types/transcription';

export function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function formatSrtTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const millis = Math.floor((seconds % 1) * 1000);

  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${millis.toString().padStart(3, '0')}`;
}

export function formatVttTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const millis = Math.floor((seconds % 1) * 1000);

  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${millis.toString().padStart(3, '0')}`;
}

export const SPEAKER_COLORS = [
  {
    bg: 'bg-indigo-50 dark:bg-indigo-950/40',
    text: 'text-indigo-700 dark:text-indigo-300',
    border: 'border-indigo-200 dark:border-indigo-800',
    badge: 'bg-indigo-600 text-white',
    dot: 'bg-indigo-500',
    accent: '#6366f1',
  },
  {
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800',
    badge: 'bg-emerald-600 text-white',
    dot: 'bg-emerald-500',
    accent: '#10b981',
  },
  {
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800',
    badge: 'bg-amber-600 text-white',
    dot: 'bg-amber-500',
    accent: '#f59e0b',
  },
  {
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    text: 'text-rose-700 dark:text-rose-300',
    border: 'border-rose-200 dark:border-rose-800',
    badge: 'bg-rose-600 text-white',
    dot: 'bg-rose-500',
    accent: '#f43f5e',
  },
  {
    bg: 'bg-violet-50 dark:bg-violet-950/40',
    text: 'text-violet-700 dark:text-violet-300',
    border: 'border-violet-200 dark:border-violet-800',
    badge: 'bg-violet-600 text-white',
    dot: 'bg-violet-500',
    accent: '#8b5cf6',
  },
  {
    bg: 'bg-cyan-50 dark:bg-cyan-950/40',
    text: 'text-cyan-700 dark:text-cyan-300',
    border: 'border-cyan-200 dark:border-cyan-800',
    badge: 'bg-cyan-600 text-white',
    dot: 'bg-cyan-500',
    accent: '#06b6d4',
  },
];

export function getSpeakerColor(index: number) {
  return SPEAKER_COLORS[index % SPEAKER_COLORS.length];
}

// Generate realistic synthetic WAV audio so sample demos have audible, synchronized sound
export function createSyntheticAudioBlob(durationSeconds: number): Blob {
  const sampleRate = 22050;
  const numSamples = Math.floor(sampleRate * durationSeconds);
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  // RIFF identifier
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, 1, true); // Mono channel
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // ByteRate
  view.setUint16(32, 2, true); // BlockAlign
  view.setUint16(34, 16, true); // BitsPerSample
  writeString(view, 36, 'data');
  view.setUint32(40, numSamples * 2, true);

  // Generate pleasant human conversational cadence frequencies (formant hums + gentle harmonic shifts)
  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    // speech-like cadence modulation
    const speechCadence = (Math.sin(2 * Math.PI * 2.5 * t) + 1) * 0.4;
    // alternating pitches resembling two speakers conversing
    const isSpeakerOne = Math.floor(t / 4) % 2 === 0;
    const baseFreq = isSpeakerOne ? 180 : 240;
    
    // Slight vibrato / natural pitch variation
    const pitch = baseFreq + Math.sin(2 * Math.PI * 4 * t) * 8;
    const sample = Math.sin(2 * Math.PI * pitch * t) * speechCadence * 0.15;
    
    const intSample = Math.max(-1, Math.min(1, sample)) * 0x7fff;
    view.setInt16(offset, intSample, true);
    offset += 2;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

// Pre-packaged samples with explicit speaker diarization labels
export const SAMPLE_TRANSCRIPTIONS: { id: string; name: string; description: string; duration: number; data: TranscriptionData }[] = [
  {
    id: 'sample-clfuncc-call',
    name: '20261020-140215 0745345282 CLFUNCC IN250508-all',
    description: 'Inbound customer inquiry call with Mikayla regarding funeral cover and policy assistance.',
    duration: 35,
    data: {
      title: '20261020-140215 0745345282 CLFUNCC IN250508-all',
      languageDetected: 'English',
      summary: 'Mikayla called inquiring to speak with Ms. Tiffany Coates regarding Plantell funeral cover policy options.',
      speakers: [
        { id: 'speaker_1', label: 'Speaker 1', name: 'Tiffany Coates', description: 'Call Recipient' },
        { id: 'speaker_2', label: 'Speaker 2', name: 'Mikayla', description: 'Plantell Representative' },
      ],
      segments: [
        { id: 's_1', speakerId: 'speaker_1', speakerLabel: 'Speaker 1', speakerName: 'Tiffany', start: 0, end: 2, text: 'Hello.' },
        { id: 's_2', speakerId: 'speaker_2', speakerLabel: 'Speaker 2', speakerName: 'Mikayla', start: 2, end: 4, text: 'Good day, how are you?' },
        { id: 's_3', speakerId: 'speaker_1', speakerLabel: 'Speaker 1', speakerName: 'Tiffany', start: 4, end: 6, text: 'Good, thank you.' },
        { id: 's_4', speakerId: 'speaker_1', speakerLabel: 'Speaker 1', speakerName: 'Tiffany', start: 6, end: 7, text: 'So, who is this?' },
        { id: 's_5', speakerId: 'speaker_2', speakerLabel: 'Speaker 2', speakerName: 'Mikayla', start: 7, end: 8, text: 'Very well.' },
        { id: 's_6', speakerId: 'speaker_2', speakerLabel: 'Speaker 2', speakerName: 'Mikayla', start: 8, end: 9, text: 'Thanks for asking.' },
        { id: 's_7', speakerId: 'speaker_2', speakerLabel: 'Speaker 2', speakerName: 'Mikayla', start: 9, end: 10, text: 'This is Mikayla speaking.' },
        { id: 's_8', speakerId: 'speaker_2', speakerLabel: 'Speaker 2', speakerName: 'Mikayla', start: 10, end: 12, text: 'Can I speak to Ms. Tiffany?' },
        { id: 's_9', speakerId: 'speaker_2', speakerLabel: 'Speaker 2', speakerName: 'Mikayla', start: 12, end: 14, text: 'Ms. Coates?' },
        { id: 's_10', speakerId: 'speaker_1', speakerLabel: 'Speaker 1', speakerName: 'Tiffany', start: 14, end: 16, text: 'What is this about?' },
        { id: 's_11', speakerId: 'speaker_2', speakerLabel: 'Speaker 2', speakerName: 'Mikayla', start: 16, end: 18, text: 'The call is for my baptism.' },
        { id: 's_12', speakerId: 'speaker_2', speakerLabel: 'Speaker 2', speakerName: 'Mikayla', start: 18, end: 20, text: 'Just regarding Plantell.' },
        { id: 's_13', speakerId: 'speaker_2', speakerLabel: 'Speaker 2', speakerName: 'Mikayla', start: 20, end: 23, text: 'Plantell would love to contact you at any time.' },
        { id: 's_14', speakerId: 'speaker_2', speakerLabel: 'Speaker 2', speakerName: 'Mikayla', start: 23, end: 25, text: "It's all about their funeral cover." },
        { id: 's_15', speakerId: 'speaker_2', speakerLabel: 'Speaker 2', speakerName: 'Mikayla', start: 25, end: 26, text: 'I wanted to help.' },
        { id: 's_16', speakerId: 'speaker_1', speakerLabel: 'Speaker 1', speakerName: 'Tiffany', start: 26, end: 27, text: 'Oh, no, thank you.' },
        { id: 's_17', speakerId: 'speaker_1', speakerLabel: 'Speaker 1', speakerName: 'Tiffany', start: 27, end: 29, text: 'But thank you.' },
        { id: 's_18', speakerId: 'speaker_2', speakerLabel: 'Speaker 2', speakerName: 'Mikayla', start: 29, end: 30, text: 'Thank you, though.' },
        { id: 's_19', speakerId: 'speaker_1', speakerLabel: 'Speaker 1', speakerName: 'Tiffany', start: 30, end: 35, text: 'But what can I do?' },
      ],
      speakerTransitionsCount: 8,
      keyTopics: ['Customer inquiry', 'Plantell funeral cover', 'Assistance call'],
      actionItems: ['Contact declined by customer', 'Log call status in CRM'],
      duration: 35,
    },
  },
  {
    id: 'sample-kickoff-meeting',
    name: 'Kick-Off Meeting',
    description: 'Design and brand alignment kick-off meeting with Jenny Wilson, Kate Walter, and Nixtio AI.',
    duration: 1147, // 19:07
    data: {
      title: 'Kick-Off Meeting',
      languageDetected: 'English',
      summary: 'The team aligned on maintaining the existing brand guidelines to protect the launch schedule. Kate will deliver the design prototype by Wednesday, after which Jenny will review comments against the style guide before finalizing the layout.',
      speakers: [
        { id: 'speaker_jenny', label: 'Speaker 1', name: 'Jenny Wilson', description: 'Design Lead' },
        { id: 'speaker_nixtio', label: 'Speaker 2', name: 'Nixtio', description: 'Product AI Facilitator' },
        { id: 'speaker_kate', label: 'Speaker 3', name: 'Kate Walter', description: 'Product Designer' },
      ],
      segments: [
        {
          id: 'seg_0',
          speakerId: 'speaker_jenny',
          speakerLabel: 'Speaker 1',
          speakerName: 'Jenny Wilson',
          start: 220.0,
          end: 248.0,
          text: 'with their combined business model concept.',
        },
        {
          id: 'seg_1',
          speakerId: 'speaker_jenny',
          speakerLabel: 'Speaker 1',
          speakerName: 'Jenny Wilson',
          start: 251.0, // 00:04:11
          end: 272.0,
          text: 'Wait — are we sticking to the current brand guide or making changes?',
        },
        {
          id: 'seg_2',
          speakerId: 'speaker_nixtio',
          speakerLabel: 'Speaker 2',
          speakerName: 'Nixtio',
          start: 275.0, // 00:04:35
          end: 314.0,
          text: 'For now, let’s stick with the current style. It’ll keep us on schedule. We can always adjust later. I’ll prepare a communication plan and timeline so everyone knows what’s expected.',
        },
        {
          id: 'seg_3',
          speakerId: 'speaker_kate',
          speakerLabel: 'Speaker 3',
          speakerName: 'Kate Walter',
          start: 317.0, // 00:05:17
          end: 345.0,
          text: 'Okay, I’ll send a prototype by Wednesday then.',
        },
        {
          id: 'seg_4',
          speakerId: 'speaker_jenny',
          speakerLabel: 'Speaker 1',
          speakerName: 'Jenny Wilson',
          start: 349.0, // 00:05:49
          end: 385.0,
          text: 'Great. Once I see the design, I’ll double-check it against the brand guide and share comments.',
        },
        {
          id: 'seg_5',
          speakerId: 'speaker_nixtio',
          speakerLabel: 'Speaker 2',
          speakerName: 'Nixtio',
          start: 389.0, // 00:06:29
          end: 420.0,
          text: "Perfect, then action items are clear: I'll finalize the layout, Olivia will handle the documentation, and we'll sync back up.",
        },
      ],
      speakerTransitionsCount: 5,
      keyTopics: ['Brand Guide Alignment', 'Prototype Delivery Schedule', 'Review Process', 'Timeline & Milestones'],
      actionItems: [
        'Stick with current brand guide to maintain schedule (Team)',
        'Send design prototype by Wednesday (Kate Walter)',
        'Double-check prototype against brand guide and share feedback (Jenny Wilson)',
        'Prepare communication plan and timeline (Nixtio/Lead)',
      ],
      duration: 1147,
    },
  },
  {
    id: 'sample-product-meeting',
    name: 'Q3 Product Strategy Alignment',
    description: 'Speaker 1 (Sarah) and Speaker 2 (David) discuss feature roadmap and mobile app launch.',
    duration: 38,
    data: {
      title: 'Q3 Product Strategy Alignment & Mobile Launch',
      languageDetected: 'English',
      summary: 'The team reviewed the upcoming mobile app release schedule, discussed edge cases around offline mode sync, and agreed to expand the beta testing pool before the public launch on Friday.',
      speakers: [
        { id: 'speaker_1', label: 'Speaker 1', name: 'Speaker 1 (Sarah Jenkins)', description: 'Product Lead, clear tone' },
        { id: 'speaker_2', label: 'Speaker 2', name: 'Speaker 2 (David Chen)', description: 'Engineering Director, deeper resonance' },
      ],
      segments: [
        {
          id: 'seg_1',
          speakerId: 'speaker_1',
          speakerLabel: 'Speaker 1',
          speakerName: 'Speaker 1 (Sarah Jenkins)',
          start: 0.0,
          end: 4.8,
          text: 'Good morning David. Thanks for jumping on. Are we still on track for the mobile release this coming Friday?',
        },
        {
          id: 'seg_2',
          speakerId: 'speaker_2',
          speakerLabel: 'Speaker 2',
          speakerName: 'Speaker 2 (David Chen)',
          start: 5.2,
          end: 11.5,
          text: "Morning Sarah! Yes, the backend API refactor finished yesterday, and our automated test suite is passing with ninety-eight percent coverage.",
        },
        {
          id: 'seg_3',
          speakerId: 'speaker_1',
          speakerLabel: 'Speaker 1',
          speakerName: 'Speaker 1 (Sarah Jenkins)',
          start: 12.0,
          end: 18.2,
          text: 'That is fantastic news. Did QA manage to reproduce the intermittent offline sync conflict we spotted during last week’s flight test?',
        },
        {
          id: 'seg_4',
          speakerId: 'speaker_2',
          speakerLabel: 'Speaker 2',
          speakerName: 'Speaker 2 (David Chen)',
          start: 18.8,
          end: 26.5,
          text: 'They did! It turned out to be an edge case in the timestamp comparison for cached drafts. Marcus pushed a fix last night, and we validated it this morning.',
        },
        {
          id: 'seg_5',
          speakerId: 'speaker_1',
          speakerLabel: 'Speaker 1',
          speakerName: 'Speaker 1 (Sarah Jenkins)',
          start: 27.0,
          end: 32.4,
          text: 'Excellent work. Let’s roll out the updated build to the TestFlight internal group by 2 PM today so the design team can do a quick visual pass.',
        },
        {
          id: 'seg_6',
          speakerId: 'speaker_2',
          speakerLabel: 'Speaker 2',
          speakerName: 'Speaker 2 (David Chen)',
          start: 33.0,
          end: 37.8,
          text: 'Sounds like a plan. I will trigger the CI deployment right after this standup and notify everyone in the releases channel.',
        },
      ],
      speakerTransitionsCount: 5,
      keyTopics: ['Mobile app release readiness', 'Offline synchronization bug fix', 'TestFlight internal deployment', 'CI/CD pipeline'],
      actionItems: [
        'Trigger TestFlight internal build by 2:00 PM (David Chen)',
        'Notify design team to conduct final visual verification (Sarah Jenkins)',
        'Sign off on release checklist by Thursday afternoon',
      ],
      duration: 38,
    },
  },
  {
    id: 'sample-tech-interview',
    name: 'Distributed Systems Tech Interview',
    description: 'Speaker 1 (Marcus) and Speaker 2 (Elena) discussing event-driven architecture and idempotency.',
    duration: 34,
    data: {
      title: 'Technical Interview: Event Driven Architecture & Idempotency',
      languageDetected: 'English',
      summary: 'Elena walks through her approach to handling distributed payment webhooks, explaining idempotency keys and dead-letter queues to guarantee at-least-once delivery without duplicate charges.',
      speakers: [
        { id: 'speaker_1', label: 'Speaker 1', name: 'Speaker 1 (Marcus Vance)', description: 'Staff Engineer (Interviewer)' },
        { id: 'speaker_2', label: 'Speaker 2', name: 'Speaker 2 (Elena Rostova)', description: 'Senior Backend Candidate' },
      ],
      segments: [
        {
          id: 'seg_1',
          speakerId: 'speaker_1',
          speakerLabel: 'Speaker 1',
          speakerName: 'Speaker 1 (Marcus Vance)',
          start: 0.0,
          end: 6.2,
          text: 'Welcome Elena. Let’s imagine we are building a payment ingestion gateway that receives webhook notifications from Stripe and PayPal. How would you handle duplicates?',
        },
        {
          id: 'seg_2',
          speakerId: 'speaker_2',
          speakerLabel: 'Speaker 2',
          speakerName: 'Speaker 2 (Elena Rostova)',
          start: 6.8,
          end: 15.0,
          text: 'Great question Marcus. Since webhooks operate on at-least-once delivery guarantees, I would first enforce strict idempotency by storing the provider event ID in Redis with a TTL.',
        },
        {
          id: 'seg_3',
          speakerId: 'speaker_1',
          speakerLabel: 'Speaker 1',
          speakerName: 'Speaker 1 (Marcus Vance)',
          start: 15.5,
          end: 20.4,
          text: 'Interesting. What happens if two concurrent requests with the identical event ID hit different application nodes simultaneously?',
        },
        {
          id: 'seg_4',
          speakerId: 'speaker_2',
          speakerLabel: 'Speaker 2',
          speakerName: 'Speaker 2 (Elena Rostova)',
          start: 21.0,
          end: 33.5,
          text: 'We would use Redis SETNX or a unique database constraint with a lock. The first request acquires the lease, while the second request yields and checks the final status to avoid double processing.',
        },
      ],
      speakerTransitionsCount: 3,
      keyTopics: ['Webhook idempotency', 'Distributed locking with Redis', 'Concurrency race conditions', 'At-least-once delivery semantics'],
      actionItems: ['Candidate passed system design round', 'Schedule debrief with hiring committee'],
      duration: 34,
    },
  },
  {
    id: 'sample-customer-support',
    name: 'Customer Support Billing Inquiry',
    description: 'Speaker 1 (Jordan) assisting Speaker 2 (Rachel) with team seat upgrades and invoicing.',
    duration: 30,
    data: {
      title: 'Customer Support: Enterprise Seat Upgrade & Prorated Billing',
      languageDetected: 'English',
      summary: 'Jordan assists Rachel in upgrading her workspace from 10 to 25 seats, explains prorated billing for the remainder of the billing cycle, and applies an annual discount.',
      speakers: [
        { id: 'speaker_1', label: 'Speaker 1', name: 'Speaker 1 (Jordan)', description: 'Customer Success Specialist' },
        { id: 'speaker_2', label: 'Speaker 2', name: 'Speaker 2 (Rachel Green)', description: 'Workspace Administrator' },
      ],
      segments: [
        {
          id: 'seg_1',
          speakerId: 'speaker_1',
          speakerLabel: 'Speaker 1',
          speakerName: 'Speaker 1 (Jordan)',
          start: 0.0,
          end: 4.5,
          text: 'Hello Rachel, thank you for reaching out to Acme Cloud Support. How can I help you today?',
        },
        {
          id: 'seg_2',
          speakerId: 'speaker_2',
          speakerLabel: 'Speaker 2',
          speakerName: 'Speaker 2 (Rachel Green)',
          start: 5.0,
          end: 11.2,
          text: 'Hi Jordan. Our engineering team just expanded and we need to add 15 more user licenses to our existing Pro workspace.',
        },
        {
          id: 'seg_3',
          speakerId: 'speaker_1',
          speakerLabel: 'Speaker 1',
          speakerName: 'Speaker 1 (Jordan)',
          start: 11.8,
          end: 19.5,
          text: 'I can certainly help with that right now. Since you are in the middle of your annual cycle, the remaining 7 months will be prorated automatically.',
        },
        {
          id: 'seg_4',
          speakerId: 'speaker_2',
          speakerLabel: 'Speaker 2',
          speakerName: 'Speaker 2 (Rachel Green)',
          start: 20.0,
          end: 24.2,
          text: 'That sounds perfect. Will the new members receive invitations immediately once we confirm?',
        },
        {
          id: 'seg_5',
          speakerId: 'speaker_1',
          speakerLabel: 'Speaker 1',
          speakerName: 'Speaker 1 (Jordan)',
          start: 24.8,
          end: 29.8,
          text: 'Yes! As soon as I press update, invite tokens are dispatched directly to their business emails.',
        },
      ],
      speakerTransitionsCount: 4,
      keyTopics: ['License expansion', 'Prorated annual billing', 'Automated invitation delivery'],
      actionItems: ['Confirmed addition of 15 seats', 'Sent updated invoice receipt to billing contact'],
      duration: 30,
    },
  },
];
