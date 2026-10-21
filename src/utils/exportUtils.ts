import { TranscriptionData, ExportFormat } from '../types/transcription';
import { formatTime, formatSrtTime, formatVttTime } from './audioUtils';

export function generateExportContent(data: TranscriptionData, format: ExportFormat): string {
  switch (format) {
    case 'txt-plain': {
      return data.segments
        .map((seg) => `${seg.speakerLabel || seg.speakerName}: ${seg.text}`)
        .join('\n\n');
    }

    case 'txt-timestamps': {
      return data.segments
        .map((seg) => {
          const spk = seg.speakerLabel && seg.speakerName !== seg.speakerLabel
            ? `${seg.speakerLabel} (${seg.speakerName})`
            : (seg.speakerLabel || seg.speakerName);
          return `[${formatTime(seg.start)} - ${formatTime(seg.end)}] ${spk}:\n${seg.text}`;
        })
        .join('\n\n');
    }

    case 'srt': {
      return data.segments
        .map((seg, idx) => {
          const spk = seg.speakerLabel || seg.speakerName;
          return `${idx + 1}\n${formatSrtTime(seg.start)} --> ${formatSrtTime(seg.end)}\n<font color="#ffff00"><b>${spk}:</b></font> ${seg.text}\n`;
        })
        .join('\n');
    }

    case 'vtt': {
      const cues = data.segments
        .map((seg, idx) => {
          const spk = seg.speakerLabel || seg.speakerName;
          return `${idx + 1}\n${formatVttTime(seg.start)} --> ${formatVttTime(seg.end)}\n<v ${spk}>${seg.text}`;
        })
        .join('\n\n');
      return `WEBVTT - ${data.title}\n\n${cues}\n`;
    }

    case 'json': {
      return JSON.stringify(data, null, 2);
    }

    case 'markdown': {
      let md = `# ${data.title}\n\n`;
      md += `**Language:** ${data.languageDetected} | **Speakers:** ${data.speakers.length} | **Segments:** ${data.segments.length}\n\n`;
      
      if (data.summary) {
        md += `## 📝 Executive Summary\n${data.summary}\n\n`;
      }

      if (data.keyTopics && data.keyTopics.length > 0) {
        md += `## 📌 Key Discussion Topics\n`;
        data.keyTopics.forEach((t) => {
          md += `- ${t}\n`;
        });
        md += '\n';
      }

      if (data.actionItems && data.actionItems.length > 0) {
        md += `## ✅ Action Items & Decisions\n`;
        data.actionItems.forEach((a) => {
          md += `- [ ] ${a}\n`;
        });
        md += '\n';
      }

      md += `## 👥 Detected Speakers\n`;
      data.speakers.forEach((s) => {
        md += `- **${s.label}**: ${s.name}${s.description ? ` - ${s.description}` : ''}\n`;
      });
      md += '\n';

      md += `## 🎙️ Full Transcript with Timestamps & Speaker Diarization\n\n`;
      data.segments.forEach((seg) => {
        const spk = seg.speakerLabel && seg.speakerName !== seg.speakerLabel
          ? `${seg.speakerLabel} (${seg.speakerName})`
          : (seg.speakerLabel || seg.speakerName);
        md += `**[${formatTime(seg.start)} - ${formatTime(seg.end)}] ${spk}**\n\n> ${seg.text}\n\n`;
      });

      return md;
    }

    default:
      return '';
  }
}

export function downloadFile(content: string, filename: string, mimeType: string = 'text/plain') {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
