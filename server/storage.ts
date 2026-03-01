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

export interface IStorage {
  // Profile
  getProfile(): Promise<Profile>;
  updateProfile(updates: Partial<InsertProfile>): Promise<Profile>;
  
  // Vault
  getVaultItems(): Promise<VaultItem[]>;
  createVaultItem(item: InsertVaultItem): Promise<VaultItem>;
  
  // Alerts
  getAlerts(): Promise<Alert[]>;
  createAlert(alert: InsertAlert): Promise<Alert>;
  
  // Community
  getCommunityPosts(): Promise<CommunityPost[]>;
  createCommunityPost(post: InsertCommunityPost): Promise<CommunityPost>;
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
    
    // Seed Profile
    this.profile = {
      id: 1,
      branch: "Army",
      rank: "SGT",
      mos: "11B",
      isPro: false,
      readinessScore: 65,
      pftScore: 240,
    };
    
    // Seed initial data
    this.seedData();
  }
  
  private seedData() {
    this.createVaultItem({
      profileId: 1,
      title: "ACFT Scorecard 2023",
      type: "training",
      date: "2023-10-15",
      extractedFields: { score: 240, passed: true }
    });
    
    this.createAlert({
      profileId: 1,
      type: "warning",
      message: "Medical readiness evaluation due in 30 days.",
      date: "2024-05-15",
      isRead: false
    });
    
    this.createCommunityPost({
      author: "CPT Miller",
      content: "Just maxed out my ACFT! The new workout plan really helped.",
      date: "2024-05-20",
      likes: 12
    });
  }

  async getProfile(): Promise<Profile> {
    return this.profile;
  }

  async updateProfile(updates: Partial<InsertProfile>): Promise<Profile> {
    this.profile = { ...this.profile, ...updates };
    return this.profile;
  }

  async getVaultItems(): Promise<VaultItem[]> {
    return Array.from(this.vaultItems.values()).reverse();
  }

  async createVaultItem(insertItem: InsertVaultItem): Promise<VaultItem> {
    const id = this.vaultIdCounter++;
    const item: VaultItem = { ...insertItem, id };
    this.vaultItems.set(id, item);
    
    // Auto-update readiness score for demo purposes
    this.profile.readinessScore = Math.min(100, this.profile.readinessScore + 5);
    
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

  async getCommunityPosts(): Promise<CommunityPost[]> {
    return Array.from(this.communityPosts.values()).reverse();
  }

  async createCommunityPost(insertPost: InsertCommunityPost): Promise<CommunityPost> {
    const id = this.postIdCounter++;
    const post: CommunityPost = { ...insertPost, id };
    this.communityPosts.set(id, post);
    return post;
  }
}

export const storage = new MemStorage();
