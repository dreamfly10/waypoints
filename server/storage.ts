import { 
  type Profile, 
  type InsertProfile, 
  type VaultItem, 
  type InsertVaultItem, 
  type Alert, 
  type InsertAlert, 
  type CommunityPost, 
  type InsertCommunityPost 
} from "@shared/schema";
import { addDays, isBefore, parseISO, differenceInDays } from "date-fns";

export interface IStorage {
  getProfile(): Promise<Profile>;
  updateProfile(updates: Partial<InsertProfile>): Promise<Profile>;
  getVaultItems(): Promise<VaultItem[]>;
  createVaultItem(item: InsertVaultItem): Promise<VaultItem>;
  getAlerts(): Promise<Alert[]>;
  createAlert(alert: InsertAlert): Promise<Alert>;
  clearAlerts(): Promise<void>;
  getCommunityPosts(): Promise<CommunityPost[]>;
  createCommunityPost(post: InsertCommunityPost): Promise<CommunityPost>;
  recalculateReadiness(): Promise<void>;
}

export class MemStorage implements IStorage {
  private profile: Profile;
  private vaultItems: Map<number, VaultItem>;
  private alerts: Map<number, Alert>;
  private communityPosts: Map<number, CommunityPost>;
  
  private vaultIdCounter = 1;
  private alertIdCounter = 1;
  private postIdCounter = 1;

  constructor() {
    this.vaultItems = new Map();
    this.alerts = new Map();
    this.communityPosts = new Map();
    
    this.profile = {
      id: 1,
      branch: "Marine Corps",
      rank: "O-3",
      mos: "0231",
      isPro: false,
      readinessScore: 40,
      pftScore: 0,
      vaultPassword: null,
      vaultLockEnabled: false,
    };
    
    this.seedData();
  }
  
  private async seedData() {
    await this.createVaultItem({
      profileId: 1,
      title: "Initial Cert",
      type: "cert",
      date: "2024-01-01",
      expiresAt: addDays(new Date(), 45).toISOString(),
      extractedFields: {}
    });
    
    await this.createCommunityPost({
      author: "CPT Miller",
      content: "Promotion list is out!",
      type: "milestone",
      milestoneCard: { title: "Promotion", icon: "Trophy" },
      likes: 12
    });

    await this.recalculateReadiness();
  }

  async getProfile(): Promise<Profile> {
    return this.profile;
  }

  async updateProfile(updates: Partial<InsertProfile>): Promise<Profile> {
    this.profile = { ...this.profile, ...updates };
    await this.recalculateReadiness();
    return this.profile;
  }

  async getVaultItems(): Promise<VaultItem[]> {
    return Array.from(this.vaultItems.values()).reverse();
  }

  async createVaultItem(insertItem: InsertVaultItem): Promise<VaultItem> {
    const id = this.vaultIdCounter++;
    const item: VaultItem = { ...insertItem, id };
    this.vaultItems.set(id, item);
    
    if (item.type === 'pft' && item.extractedFields && typeof item.extractedFields === 'object') {
      const score = (item.extractedFields as any).score;
      if (typeof score === 'number') {
        this.profile.pftScore = score;
      }
    }
    
    await this.recalculateReadiness();
    return item;
  }

  async getAlerts(): Promise<Alert[]> {
    return Array.from(this.alerts.values()).reverse();
  }

  async createAlert(insertAlert: InsertAlert): Promise<Alert> {
    const id = this.alertIdCounter++;
    const alert: Alert = { ...insertAlert, id };
    this.alerts.set(id, alert);
    return alert;
  }

  async clearAlerts(): Promise<void> {
    this.alerts.clear();
  }

  async getCommunityPosts(): Promise<CommunityPost[]> {
    return Array.from(this.communityPosts.values()).reverse();
  }

  async createCommunityPost(insertPost: InsertCommunityPost): Promise<CommunityPost> {
    const id = this.postIdCounter++;
    const post: CommunityPost = { 
      ...insertPost, 
      id, 
      createdAt: new Date() 
    };
    this.communityPosts.set(id, post);
    return post;
  }

  async recalculateReadiness(): Promise<void> {
    const items = Array.from(this.vaultItems.values());
    let score = 40;

    const hasPft = items.some(i => i.type === 'pft');
    const hasCert = items.some(i => i.type === 'cert');
    const hasPromo = items.some(i => i.type === 'promotion_letter');
    const hasOrders = items.some(i => i.type === 'orders');

    if (hasPft) score += 10;
    if (hasCert) score += 10;
    if (hasPromo) score += 5;
    if (hasOrders) score += 5;

    const pft = this.profile.pftScore;
    if (pft > 280) score += 20;
    else if (pft > 250) score += 10;
    else if (pft > 200) score += 5;

    const cap = this.profile.isPro ? 100 : 95;
    this.profile.readinessScore = Math.min(score, cap);

    await this.clearAlerts();
    
    if (!hasPft) {
      await this.createAlert({
        profileId: 1,
        severity: 'high',
        title: 'Missing PFT',
        message: 'No PFT record found in Vault. Upload your latest scorecard.',
        dueDate: null,
        actionType: 'upload',
        relatedVaultType: 'pft',
        isRead: false
      });
    }

    const now = new Date();
    for (const item of items) {
      if (item.expiresAt) {
        const expiry = parseISO(item.expiresAt);
        const daysToExpiry = differenceInDays(expiry, now);
        if (daysToExpiry > 0 && daysToExpiry <= 60) {
          await this.createAlert({
            profileId: 1,
            severity: 'medium',
            title: `${item.title} Expiring`,
            message: `Your ${item.type} expires in ${daysToExpiry} days.`,
            dueDate: item.expiresAt,
            actionType: 'renew',
            relatedVaultType: item.type,
            isRead: false
          });
        }
      }
    }

    if (!hasPromo) {
      await this.createAlert({
        profileId: 1,
        severity: 'low',
        title: 'Promotion Letter Missing',
        message: 'Consider uploading your latest promotion letter for better readiness tracking.',
        dueDate: null,
        actionType: 'upload',
        relatedVaultType: 'promotion_letter',
        isRead: false
      });
    }
  }
}

export const storage = new MemStorage();
