// Lightweight localStorage-based store for applications, users, roles & settings

export type ApplicationStatus = 'pending' | 'approved' | 'rejected' | 'under_review';
export type UserRole = 'owner' | 'admin' | 'manager' | 'staff' | 'builder' | 'user';

export interface ApplicationEntry {
  id: string;
  userId: string;
  username: string;
  age: string;
  timezone: string;
  why: string;
  experience: string;
  status: ApplicationStatus;
  submittedAt: string;
  reviewedAt?: string;
  notes?: string;
  adminMessage?: string;
}

export interface UserAccount {
  id: string;
  discordId?: string;
  discordUsername?: string;
  discordAvatar?: string;
  email?: string;
  displayName: string;
  password?: string;
  authMethod: 'discord' | 'email';
  role: UserRole;
  createdAt: string;
  status?: 'active' | 'banned';
}

export interface SocialLink {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  icon: string;
  description: string;
  color: string;
}

export interface ServerInfo {
  gamemode: string;
  version: string;
  access: string;
  serverType: string;
  rules: string[];
}

export interface SeasonInfo {
  number: number;
  name: string;
  startDate: string;
  description: string;
  isActive: boolean;
  theme: string;
  bannerImage: string;
  bannerOverlay: number;
  heroBadgeText?: string;
}

export interface SiteSettings {
  socialLinks: SocialLink[];
  serverInfo: ServerInfo;
  seasonInfo?: SeasonInfo;
}

const STORAGE_KEY = 'dismine_applications';
const USERS_KEY = 'dismine_users';
const SESSION_KEY = 'dismine_session';
const SETTINGS_KEY = 'dismine_settings';

// Default owner credentials
const OWNER_EMAIL = 'owner@dismine.com';
const OWNER_PASSWORD = 'dismine2025';

// ─── ROLE HELPERS ───────────────────────────────────────

const ROLE_HIERARCHY: Record<UserRole, number> = {
  owner: 6,
  admin: 5,
  manager: 3,
  staff: 2,
  builder: 2,
  user: 1,
};

export function canAccessAdmin(role: UserRole): boolean {
  return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY.staff;
}

export function canManageRoles(role: UserRole): boolean {
  return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY.admin;
}

export function canDeleteUsers(role: UserRole): boolean {
  return role === 'owner';
}

export function canManageSettings(role: UserRole): boolean {
  return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY.admin;
}

export function canReviewApplications(role: UserRole): boolean {
  return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY.manager;
}

export function getRoleLabel(role: UserRole): string {
  const labels: Record<UserRole, string> = {
    owner: 'Owner',
    admin: 'Admin',
    manager: 'Manager',
    staff: 'Staff',
    builder: 'Builder',
    user: 'Member',
  };
  return labels[role];
}

export function getRoleColor(role: UserRole): { text: string; bg: string; border: string } {
  const colors: Record<UserRole, { text: string; bg: string; border: string }> = {
    owner: { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
    admin: { text: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
    manager: { text: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
    staff: { text: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
    builder: { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
    user: { text: 'text-neutral-400', bg: 'bg-neutral-500/10', border: 'border-neutral-500/20' },
  };
  return colors[role];
}

// ─── USER AUTH ──────────────────────────────────────────

export function getUsers(): UserAccount[] {
  try {
    const data = localStorage.getItem(USERS_KEY);
    if (!data) return [];
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function saveUsers(users: UserAccount[]): void {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

// Ensure owner account exists
export function ensureOwnerAccount(): void {
  const users = getUsers();
  const ownerExists = users.some((u) => u.role === 'owner');
  if (!ownerExists) {
    const owner: UserAccount = {
      id: 'owner-001',
      email: OWNER_EMAIL,
      displayName: 'Dismine',
      password: OWNER_PASSWORD,
      authMethod: 'email',
      role: 'owner',
      createdAt: new Date().toISOString(),
    };
    users.push(owner);
    saveUsers(users);
  }
}

export function registerUser(user: Omit<UserAccount, 'id' | 'createdAt' | 'role'>): { success: boolean; error?: string; user?: UserAccount } {
  const users = getUsers();

  if (user.authMethod === 'email' && user.email) {
    const exists = users.find((u) => u.email === user.email);
    if (exists) return { success: false, error: 'An account with this email already exists.' };
  }

  if (user.authMethod === 'discord' && user.discordId) {
    const exists = users.find((u) => u.discordId === user.discordId);
    if (exists) {
      setSession(exists);
      return { success: true, user: exists };
    }
  }

  const newUser: UserAccount = {
    ...user,
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    role: 'user',
    createdAt: new Date().toISOString(),
  };
  users.push(newUser);
  saveUsers(users);
  setSession(newUser);
  return { success: true, user: newUser };
}

export function loginUser(email: string, password: string): { success: boolean; error?: string; user?: UserAccount } {
  ensureOwnerAccount();
  const users = getUsers();
  const user = users.find((u) => u.email === email && u.authMethod === 'email');
  if (!user) return { success: false, error: 'No account found with this email.' };
  if (user.password !== password) return { success: false, error: 'Incorrect password.' };
  setSession(user);
  return { success: true, user };
}

export function setSession(user: UserAccount): void {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

export function getSession(): UserAccount | null {
  try {
    const data = sessionStorage.getItem(SESSION_KEY);
    if (!data) return null;
    const sessionUser = JSON.parse(data) as UserAccount;
    // Sync role from storage (in case an admin changed it)
    const users = getUsers();
    const current = users.find((u) => u.id === sessionUser.id);
    if (current) {
      const updated = { ...sessionUser, role: current.role };
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(updated));
      return updated;
    }
    return sessionUser;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
}

export function simulateDiscordOAuth(): UserAccount {
  const discordNames = [
    'BlockMaster', 'CreeperSlayer', 'DiamondHunter', 'EnderDragon', 'FrostWalker',
    'GhastHunter', 'HerobrineX', 'IronGolem', 'JungleLord', 'KnightBlade',
  ];
  const randomName = discordNames[Math.floor(Math.random() * discordNames.length)];
  const discriminator = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
  const discordId = Math.floor(Math.random() * 999999999).toString();

  const user: Omit<UserAccount, 'id' | 'createdAt' | 'role'> = {
    discordId,
    discordUsername: `${randomName}#${discriminator}`,
    discordAvatar: undefined,
    displayName: randomName,
    authMethod: 'discord',
  };

  const result = registerUser(user);
  return result.user!;
}

// ─── USER MANAGEMENT (ADMIN) ────────────────────────────

export function updateUserRole(userId: string, newRole: UserRole, actingUser: UserAccount): { success: boolean; error?: string } {
  if (!canManageRoles(actingUser.role)) {
    return { success: false, error: 'You do not have permission to manage roles.' };
  }

  const users = getUsers();
  const target = users.find((u) => u.id === userId);
  if (!target) return { success: false, error: 'User not found.' };

  // Can't change owner role
  if (target.role === 'owner') {
    return { success: false, error: "Cannot change the owner's role." };
  }

  // Admin can only assign manager, staff, builder or user (not admin or owner)
  if (actingUser.role === 'admin' && (newRole === 'admin' || newRole === 'owner')) {
    return { success: false, error: 'Admins can only assign Manager, Staff, Builder or Member roles.' };
  }

  // Only owner can assign admin
  if (newRole === 'admin' && actingUser.role !== 'owner') {
    return { success: false, error: 'Only the owner can assign Admin role.' };
  }

  // Never assign owner role
  if (newRole === 'owner') {
    return { success: false, error: 'Owner role cannot be assigned.' };
  }

  target.role = newRole;
  saveUsers(users);
  return { success: true };
}

export function deleteUser(userId: string, actingUser: UserAccount): { success: boolean; error?: string } {
  if (!canDeleteUsers(actingUser.role)) {
    return { success: false, error: 'Only the owner can delete users.' };
  }

  const users = getUsers();
  const target = users.find((u) => u.id === userId);
  if (!target) return { success: false, error: 'User not found.' };
  if (target.role === 'owner') return { success: false, error: 'Cannot delete the owner account.' };

  const filtered = users.filter((u) => u.id !== userId);
  saveUsers(filtered);
  return { success: true };
}

export function updateUserPassword(userId: string, newPassword: string, actingUser: UserAccount): { success: boolean; error?: string } {
  // Only admin or owner can change passwords
  if (!canManageRoles(actingUser.role)) {
    return { success: false, error: 'You do not have permission to change passwords.' };
  }

  const users = getUsers();
  const target = users.find((u) => u.id === userId);
  if (!target) return { success: false, error: 'User not found.' };

  // Can't change owner password unless acting user is the owner themselves
  if (target.role === 'owner' && actingUser.role !== 'owner') {
    return { success: false, error: "Cannot change the owner's password." };
  }

  target.password = newPassword;
  saveUsers(users);
  return { success: true };
}

export function updateUserInfo(userId: string, data: Partial<UserAccount>, actingUser: UserAccount): { success: boolean; error?: string } {
  if (!canManageRoles(actingUser.role)) {
    return { success: false, error: 'You do not have permission to update user info.' };
  }

  const users = getUsers();
  const target = users.find((u) => u.id === userId);
  if (!target) return { success: false, error: 'User not found.' };

  if (target.role === 'owner' && actingUser.role !== 'owner') {
    return { success: false, error: "Cannot modify owner details." };
  }

  // Update fields
  if (data.displayName) target.displayName = data.displayName;
  if (data.email) target.email = data.email;
  if (data.status) target.status = data.status;
  
  saveUsers(users);
  return { success: true };
}

// ─── SITE SETTINGS ──────────────────────────────────────

const defaultSocialLinks: SocialLink[] = [
  { 
    id: 'discord', 
    name: 'Discord', 
    url: 'https://discord.gg/dismine', 
    enabled: true,
    icon: 'discord',
    description: 'Join our primary community hub',
    color: 'indigo'
  },
  { 
    id: 'youtube', 
    name: 'YouTube', 
    url: 'https://youtube.com/@dismine', 
    enabled: true,
    icon: 'youtube',
    description: 'Watch highlights & content',
    color: 'red'
  },
  { 
    id: 'instagram', 
    name: 'Instagram', 
    url: 'https://instagram.com/dismine', 
    enabled: true,
    icon: 'instagram',
    description: 'Behind the scenes photos',
    color: 'pink'
  },
  { 
    id: 'tiktok', 
    name: 'TikTok', 
    url: 'https://tiktok.com/@dismine', 
    enabled: true,
    icon: 'tiktok',
    description: 'Short-form clips',
    color: 'neutral'
  },
];

const defaultServerInfo: ServerInfo = {
  gamemode: 'Survival SMP',
  version: 'Java 1.21+',
  access: 'Whitelisted / Private',
  serverType: 'Semi-Vanilla',
  rules: [
    'No griefing, stealing, or destroying builds',
    'No cheating, exploiting, or unfair advantages',
    'Respect all members — toxicity is not tolerated',
    'No hate speech, discrimination, or harassment',
    'Keep the environment and shared spaces clean',
    'Active communication in Discord is expected',
  ],
};

export function getSettings(): SiteSettings {
  try {
    const data = localStorage.getItem(SETTINGS_KEY);
    if (!data) return { socialLinks: defaultSocialLinks, serverInfo: defaultServerInfo };
    const parsed = JSON.parse(data);
    return {
      socialLinks: parsed.socialLinks || defaultSocialLinks,
      serverInfo: parsed.serverInfo || defaultServerInfo,
    };
  } catch {
    return { socialLinks: defaultSocialLinks, serverInfo: defaultServerInfo };
  }
}

export function updateSettings(settings: SiteSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function updateSocialLinks(links: SocialLink[]): void {
  const settings = getSettings();
  settings.socialLinks = links;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function getSocialLinks(): SocialLink[] {
  return getSettings().socialLinks;
}

export function getServerInfo(): ServerInfo {
  return getSettings().serverInfo;
}

export function updateServerInfo(info: ServerInfo): void {
  const settings = getSettings();
  settings.serverInfo = info;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

// ─── SEASON INFO ────────────────────────────────────────

const defaultSeasonInfo: SeasonInfo = {
  number: 1,
  name: 'New Beginnings',
  startDate: new Date().toISOString().split('T')[0],
  description: 'The first season of Dismine SMP — a fresh world full of possibilities. Build, explore, and create lasting memories with the community.',
  isActive: true,
  theme: 'emerald',
  bannerImage: '',
  bannerOverlay: 60,
  heroBadgeText: '',
};

export function getSeasonInfo(): SeasonInfo {
  try {
    const data = localStorage.getItem(SETTINGS_KEY);
    if (!data) return defaultSeasonInfo;
    const parsed = JSON.parse(data);
    return { ...defaultSeasonInfo, ...(parsed.seasonInfo || {}) };
  } catch {
    return defaultSeasonInfo;
  }
}

export function saveSeasonInfo(info: SeasonInfo): void {
  const data = localStorage.getItem(SETTINGS_KEY);
  const settings = data ? JSON.parse(data) : {};
  settings.seasonInfo = info;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

// ─── APPLICATIONS ───────────────────────────────────────

export interface AppField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'select';
  placeholder?: string;
  required: boolean;
  enabled: boolean;
  options?: string[]; // For select type
}

const defaultAppFields: AppField[] = [
  { id: 'username', label: 'Minecraft Username', type: 'text', placeholder: 'e.g. Steve', required: true, enabled: true },
  { id: 'discord', label: 'Discord Username', type: 'text', placeholder: 'e.g. username#1234', required: true, enabled: true },
  { id: 'age', label: 'Age', type: 'number', placeholder: 'e.g. 18', required: true, enabled: true },
  { 
    id: 'timezone', 
    label: 'Time Zone', 
    type: 'select', 
    required: true, 
    enabled: true,
    options: [
      'UTC-12:00 to UTC-08:00 (Pacific)',
      'UTC-07:00 to UTC-05:00 (Americas)',
      'UTC-04:00 to UTC-01:00 (Atlantic)',
      'UTC+00:00 to UTC+03:00 (Europe/Africa)',
      'UTC+04:00 to UTC+06:00 (Central Asia)',
      'UTC+07:00 to UTC+09:00 (East Asia)',
      'UTC+10:00 to UTC+12:00 (Oceania)'
    ]
  },
  { id: 'why', label: 'Why do you want to join?', type: 'textarea', placeholder: 'Tell us what excites you about Dismine SMP...', required: true, enabled: true },
  { id: 'experience', label: 'SMP Experience', type: 'textarea', placeholder: 'Describe your experience with Minecraft SMPs...', required: true, enabled: true },
];

export function getAppFields(): AppField[] {
  try {
    const data = localStorage.getItem(SETTINGS_KEY);
    if (!data) return defaultAppFields;
    const parsed = JSON.parse(data);
    return parsed.appFields || defaultAppFields;
  } catch {
    return defaultAppFields;
  }
}

export function saveAppFields(fields: AppField[]): void {
  const data = localStorage.getItem(SETTINGS_KEY);
  const settings = data ? JSON.parse(data) : {};
  settings.appFields = fields;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export type ApplicationStatusType = 'open' | 'closed' | 'coming_soon' | 'ending_soon';

export interface ApplicationSchedule {
  openDate?: string;
  closeDate?: string;
}

export function getApplicationSchedule(): ApplicationSchedule {
  try {
    const data = localStorage.getItem(SETTINGS_KEY);
    if (!data) return {};
    const parsed = JSON.parse(data);
    return parsed.applicationSchedule || {};
  } catch {
    return {};
  }
}

export function getApplicationStatus(): ApplicationStatusType {
  try {
    const data = localStorage.getItem(SETTINGS_KEY);
    if (!data) return 'open';
    const settings = JSON.parse(data);
    
    // Check schedule for auto-updates
    const schedule = settings.applicationSchedule as ApplicationSchedule | undefined;
    let currentStatus = settings.applicationStatus as ApplicationStatusType;
    let changed = false;

    if (schedule) {
      const now = new Date();
      
      // Auto-open
      if (schedule.openDate && new Date(schedule.openDate) <= now) {
        // Only switch if we are strictly 'coming_soon' or 'closed'? 
        // Or just force it? Let's force it to ensure the schedule works.
        if (currentStatus !== 'open' && currentStatus !== 'ending_soon') {
          currentStatus = 'open';
          settings.applicationStatus = 'open';
          changed = true;
        }
        // Clear the used date so it doesn't re-trigger if manually changed later
        delete settings.applicationSchedule.openDate;
        changed = true;
      }
      
      // Auto-close
      if (schedule.closeDate && new Date(schedule.closeDate) <= now) {
        if (currentStatus !== 'closed') {
          currentStatus = 'closed';
          settings.applicationStatus = 'closed';
          changed = true;
        }
        delete settings.applicationSchedule.closeDate;
        changed = true;
      }

      if (changed) {
        // Update legacy flag too
        settings.applicationsOpen = currentStatus === 'open' || currentStatus === 'ending_soon';
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      }
    }

    // Backward compatibility
    if (!currentStatus) {
      if (settings.applicationsOpen === false) return 'closed';
      return 'open';
    }
    return currentStatus;
  } catch {
    return 'open';
  }
}

export function saveApplicationStatus(status: ApplicationStatusType, schedule?: ApplicationSchedule): void {
  const data = localStorage.getItem(SETTINGS_KEY);
  const settings = data ? JSON.parse(data) : {};
  settings.applicationStatus = status;
  
  if (schedule) {
    settings.applicationSchedule = { 
      ...settings.applicationSchedule, 
      ...schedule 
    };
    // If setting a date to empty string/undefined, remove it
    if (!schedule.openDate) delete settings.applicationSchedule.openDate;
    if (!schedule.closeDate) delete settings.applicationSchedule.closeDate;
  }

  // Sync legacy boolean
  settings.applicationsOpen = status === 'open' || status === 'ending_soon';
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function getApplications(): ApplicationEntry[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export function getUserApplications(userId: string): ApplicationEntry[] {
  return getApplications().filter((a) => a.userId === userId);
}

export function saveApplication(app: Omit<ApplicationEntry, 'id' | 'status' | 'submittedAt'>): ApplicationEntry {
  const applications = getApplications();
  const newApp: ApplicationEntry = {
    ...app,
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    status: 'pending',
    submittedAt: new Date().toISOString(),
  };
  applications.unshift(newApp);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(applications));
  return newApp;
}

export function updateApplication(id: string, updates: Partial<ApplicationEntry>): void {
  const applications = getApplications();
  const index = applications.findIndex((a) => a.id === id);
  if (index !== -1) {
    applications[index] = { ...applications[index], ...updates };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(applications));
  }
}

export function deleteApplication(id: string): void {
  const applications = getApplications().filter((a) => a.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(applications));
}

export function getStats() {
  const apps = getApplications();
  return {
    total: apps.length,
    pending: apps.filter((a) => a.status === 'pending').length,
    approved: apps.filter((a) => a.status === 'approved').length,
    rejected: apps.filter((a) => a.status === 'rejected').length,
    underReview: apps.filter((a) => a.status === 'under_review').length,
  };
}

export function formatScheduleDate(dateString: string): string {
  if (!dateString) return '';
  return new Date(dateString).toLocaleString('en-US', { 
    month: 'long', 
    day: 'numeric', 
    year: 'numeric', 
    hour: 'numeric', 
    minute: '2-digit',
    timeZoneName: 'short' 
  });
}

export function seedDemoData(): void {
  if (getApplications().length > 0) return;

  const demoApps: Omit<ApplicationEntry, 'id' | 'status' | 'submittedAt'>[] = [
    {
      userId: 'demo-user-1',
      username: 'CraftMaster_X',
      age: '21',
      timezone: 'UTC-07:00 to UTC-05:00 (Americas)',
      why: "I've been looking for a tight-knit SMP community that values building and collaboration. Dismine sounds perfect.",
      experience: "I've played on 3 private SMPs over the past 4 years. I specialize in medieval-style builds and redstone farms.",
    },
    {
      userId: 'demo-user-2',
      username: 'LunaBuilder',
      age: '19',
      timezone: 'UTC+00:00 to UTC+03:00 (Europe/Africa)',
      why: "I love the idea of an application-only server. I'm a creative builder who loves making towns and community projects.",
      experience: "Been playing Minecraft since 2016. Joined my first SMP in 2020. I've been a moderator on two servers.",
    },
    {
      userId: 'demo-user-3',
      username: 'RedstoneKing99',
      age: '24',
      timezone: 'UTC-07:00 to UTC-05:00 (Americas)',
      why: 'Looking for a mature community where I can build complex redstone contraptions without worrying about griefing.',
      experience: '5+ years of SMP experience. Technical player focused on redstone, farms, and game mechanics.',
      adminMessage: 'Welcome to Dismine SMP! Check Discord for the IP.',
    },
    {
      userId: 'demo-user-4',
      username: 'PixelArtist_',
      age: '17',
      timezone: 'UTC+07:00 to UTC+09:00 (East Asia)',
      why: 'I saw the Dismine SMP announcement on Discord and the values really resonated with me.',
      experience: 'Relatively new to SMPs but played singleplayer for years. Looking for something permanent.',
    },
    {
      userId: 'demo-user-5',
      username: 'SurvivalPro',
      age: '28',
      timezone: 'UTC+00:00 to UTC+03:00 (Europe/Africa)',
      why: 'As an experienced player, I appreciate servers that prioritize quality over quantity.',
      experience: 'Veteran Minecraft player since beta. Ran my own SMP for 3 years with 30+ active members.',
      adminMessage: 'Unfortunately we are not accepting applications from your region at this time.',
    },
  ];

  const statuses: ApplicationStatus[] = ['pending', 'pending', 'approved', 'under_review', 'rejected'];
  const now = Date.now();

  const apps = demoApps.map((app, i) => ({
    ...app,
    id: crypto.randomUUID ? crypto.randomUUID() : `${now}-${i}-${Math.random().toString(36).slice(2)}`,
    status: statuses[i],
    submittedAt: new Date(now - (i * 86400000) - Math.random() * 43200000).toISOString(),
    ...(statuses[i] !== 'pending' ? { reviewedAt: new Date(now - (i * 43200000)).toISOString() } : {}),
    ...(statuses[i] === 'rejected' ? { notes: 'Insufficient SMP experience for current season.' } : {}),
    ...(statuses[i] === 'approved' ? { notes: 'Great application! Welcome aboard.' } : {}),
  }));

  localStorage.setItem(STORAGE_KEY, JSON.stringify(apps));
}
