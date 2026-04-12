export type AgentKey = 'gp' | 'endo' | 'dietitian' | 'trainer' | 'panel';

export const AGENT_EMOJI: Record<AgentKey, string> = {
  gp: '🩺',
  endo: '🔬',
  dietitian: '🥗',
  trainer: '💪',
  panel: '👥',
};

export const AGENT_NAME: Record<AgentKey, string> = {
  gp: 'General Practitioner',
  endo: 'Endocrinologist',
  dietitian: 'Dietitian',
  trainer: 'Personal Trainer',
  panel: 'Medical Panel',
};

export const AGENTS: { value: AgentKey; emoji: string; name: string; description: string }[] = [
  { value: 'gp', emoji: AGENT_EMOJI.gp, name: AGENT_NAME.gp, description: 'Holistic health' },
  { value: 'endo', emoji: AGENT_EMOJI.endo, name: AGENT_NAME.endo, description: 'Labs & metabolic health' },
  { value: 'dietitian', emoji: AGENT_EMOJI.dietitian, name: AGENT_NAME.dietitian, description: 'Nutrition & meal plans' },
  { value: 'trainer', emoji: AGENT_EMOJI.trainer, name: AGENT_NAME.trainer, description: 'Exercise & fitness' },
  { value: 'panel', emoji: AGENT_EMOJI.panel, name: AGENT_NAME.panel, description: 'Full panel consultation' },
];
