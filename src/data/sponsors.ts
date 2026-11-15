export type SponsorCategory =
  | 'Cloud & Infra'
  | 'Developer Tools'
  | 'Security & Privacy'
  | 'Workspace & Media';

export interface SponsorItem {
  id: string;
  slotCode: string;
  name: string;
  category: SponsorCategory;
  tagline: string;
  ctaLabel: string;
  url: string;
}

export const SPONSOR_CATEGORIES: readonly SponsorCategory[] = [
  'Cloud & Infra',
  'Developer Tools',
  'Security & Privacy',
  'Workspace & Media'
];

export const SPONSOR_LINKS: readonly SponsorItem[] = [
  {
    id: 'sponsor-11226634',
    slotCode: '11226634',
    name: 'Cloud Compute & GPU Hosting',
    category: 'Cloud & Infra',
    tagline: 'Deploy full-stack applications, containers, and scalable compute instances with global availability.',
    ctaLabel: 'Explore Compute',
    url: 'https://uplcm.com/4/11226634'
  },
  {
    id: 'sponsor-11683565',
    slotCode: '11683565',
    name: 'Developer Studio & IDE Suite',
    category: 'Developer Tools',
    tagline: 'Streamlined coding environments, workflow automations, and productivity extensions for builders.',
    ctaLabel: 'View Tools',
    url: 'https://uplcm.com/4/11683565'
  },
  {
    id: 'sponsor-11242745',
    slotCode: '11242745',
    name: 'Global Edge DNS & Domains',
    category: 'Cloud & Infra',
    tagline: 'Fast domain registration, edge routing, and managed TLS certificates for modern web launches.',
    ctaLabel: 'Claim Domain',
    url: 'https://uplcm.com/4/11242745'
  },
  {
    id: 'sponsor-11242069',
    slotCode: '11242069',
    name: 'API Monitoring & Diagnostics',
    category: 'Developer Tools',
    tagline: 'Real-time endpoint checks, webhook inspection, and latency tracing for production services.',
    ctaLabel: 'Inspect APIs',
    url: 'https://uplcm.com/4/11242069'
  },
  {
    id: 'sponsor-11242067',
    slotCode: '11242067',
    name: 'Encrypted Privacy & Network Shield',
    category: 'Security & Privacy',
    tagline: 'Private browsing protection and encrypted network routing across desktop and mobile devices.',
    ctaLabel: 'Protect Traffic',
    url: 'https://uplcm.com/4/11242067'
  },
  {
    id: 'sponsor-11242742',
    slotCode: '11242742',
    name: 'Managed Storage & Backups',
    category: 'Cloud & Infra',
    tagline: 'Reliable object storage, automated snapshots, and cross-region data replication.',
    ctaLabel: 'View Storage',
    url: 'https://uplcm.com/4/11242742'
  },
  {
    id: 'sponsor-11230440',
    slotCode: '11230440',
    name: 'Technical Docs & Knowledge Hub',
    category: 'Workspace & Media',
    tagline: 'Organize engineering specs, markdown notes, and project wikis in one searchable hub.',
    ctaLabel: 'Open Workspace',
    url: 'https://uplcm.com/4/11230440'
  },
  {
    id: 'sponsor-11683560',
    slotCode: '11683560',
    name: 'Zero-Knowledge Secret Vault',
    category: 'Security & Privacy',
    tagline: 'Store passwords, API tokens, and team credentials safely with end-to-end encryption.',
    ctaLabel: 'Secure Keys',
    url: 'https://uplcm.com/4/11683560'
  },
  {
    id: 'sponsor-9912130',
    slotCode: '9912130',
    name: 'Creative Design & UI Assets',
    category: 'Workspace & Media',
    tagline: 'Curated vector kits, editorial typography packs, and clean UI templates for creators.',
    ctaLabel: 'Browse Assets',
    url: 'https://uplcm.com/4/9912130'
  },
  {
    id: 'sponsor-11242744',
    slotCode: '11242744',
    name: 'Focus & Research Companion',
    category: 'Workspace & Media',
    tagline: 'Stay organized during deep study sessions, sprint planning, and technical research.',
    ctaLabel: 'Try Companion',
    url: 'https://uplcm.com/4/11242744'
  }
];
